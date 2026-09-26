import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';
import { MatchScoringExecutorService } from '../../scoring/services/match-scoring-executor.service';
import { RawConsultantDto } from '../../scoring/dto/raw-consultant.dto';
import { RawProjectDto } from '../../scoring/dto/raw-project.dto';
import { ConsultantPoolEntry } from '../../scoring/services/interfaces/consultant-pool-entry.interface';
import { injectHypotheticalSkill } from './inject-hypothetical-skill';
import {
  HypotheticalSkillInput,
  SimulationResult,
} from '../interfaces/simulation-result.interface';

@Injectable()
export class SimulationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly dataIngestion: DataIngestionService,
        private readonly scoringExecutor: MatchScoringExecutorService,
    ) {}

    async simulate (
        consultantId: string,
        projectId: string,
        candidateSkill: HypotheticalSkillInput,
    ): Promise<SimulationResult> {
        const [consultantRow, projectRow] =  await Promise.all([
            this.fetchConsultantRow(consultantId),
            this.fetchProjectRow(projectId),
        ]);

        const projectDto = this.mapProjectToDto(projectRow);
        const scoringContext = await this.dataIngestion.getProjectScoringContext(projectId);

        const allocationsByConsultant = await this.fetchAllocation(
            consultantId,
            projectRow,
        );

        const baselineConsultantDto = this.mapConsultantToDto(consultantRow);
        const projectConsultantDto = injectHypotheticalSkill(
            baselineConsultantDto,
            candidateSkill,
        );

        const isPlaced = consultantRow.placements && consultantRow.placements.length > 0;

        const baselinePool: ConsultantPoolEntry[] = [
            {
                consultantId,
                consultantName: consultantRow.user?.fullName || 'Unknown',
                consultantEmail: consultantRow.user?.email || 'Unknown',
                isPlaced,
                consultant: baselineConsultantDto,
            },
        ];

        const [baselineExecution, projectedExecution] = await Promise.all([
            this.scoringExecutor.scorePool(
                projectDto,
                baselinePool,
                scoringContext,
                allocationsByConsultant,
            ),
            this.scoringExecutor.scorePool(
                projectDto,
                baselinePool,
                scoringContext,
                allocationsByConsultant,
            ),
        ]);

        const baselineResult = baselineExecution.finalResults[0];
        const projectedResult = projectedExecution.finalResults[0];

        if(!baselineResult || !projectedResult) {
            return {
                consultantId,
                projectId,
                candidateSkillName: candidateSkill.skillName,
                baselineScore: baselineResult?.finalScore ?? 0,
                projectedScore: projectedResult?.finalScore ?? 0,
                scoreDelta: 0,
                excluded: true,
                excludedReason: !baselineResult
                    ?   'Consultant excluded from baseline scoring.'
                    :   'Consultant excluded from projected scoring.',
            };
        }

        return {
            consultantId,
            projectId,
            candidateSkillName: candidateSkill.skillName,
            baselineScore: baselineResult.finalScore,
            projectedScore: projectedResult.finalScore,
            scoreDelta: projectedResult.finalScore = baselineResult.finalScore,
            excluded: false,
        };
    }

    private async fetchConsultantRow(consultantId: string) {
        const consultant = await this.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: {
                id: true,
                costToCompany: true,
                city: true,
                province: true,
                latitude: true,
                longitude: true,
                skills: {
                    select: {
                        CompetencyLevel: true,
                        skill: { select: { name: true } },
                    },
                },
                user: { select: { fullName: true, email: true } },
                placements: {
                    where: { status: 'ACTIVE' },
                },
            },
        });

        if (!consultant) {
            throw new NotFoundException(
                `Consultant with IF ${consultantId} not found.`,
            );
        }

        return consultant;
    }

    private async fetchProjectRow(projectId: string) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { skills: { include: { skill: true } } },
        });

        if(!project){
            throw new NotFoundException(`Project with ID ${projectId} not found.`);
        }

        return project;
    }

    private async fetchAllocation(
        consultantId: string,
        project: { startDate: Date; endDate: Date | null },
    ): Promise<ReadonlyMap<string, number>> {
        const overlapping = await this.prisma.projectPlacement.findMany({
            where: {
                consultantId,
                status: { notIn: ['TERMINATED', 'CANCELLED'] },
                ...(project.endDate ? { startDate: { lte: project.endDate } } : {}),
                OR: [{ endDate: { gte: project.startDate } }, { endDate: null }],
            },
            select: { allocation: true },
        });

        const total = overlapping.reduce(
            (sum, p) => sum + (p.allocation ?? 0),
            0,
        );

        return new Map([[consultantId, total]]);
    }

    private mapProjectToDto(project: any): RawProjectDto {
        return {
            projectId: project.id,
            requiredSkills: project.skills.map((a: any) => ({
                skillName: a.skill.name,
                minimumCompetencyLevel: a.competency,
                isMandatory: a.mandatory,
            })),
            billingBudgetPerHour: project.budget,
            teamSize: project.teamSize || 1,
            city: project.city,
            province: project.province,
            latitude: project.latitude,
            longitude: project.longitude,
            startDate: project.startDate.toISOString(),
            endDate: project.endDate?.toISOString(),
            requiredAllocationPercentage: project.allocation,
            workModel: project.workModel,
        };
    }

    private mapConsultantToDto(consultant: any): RawConsultantDto {
        return {
        consultantId: consultant.id,
        skills: consultant.skills.map((a: any) => ({
            skillName: a.skill.name,
            competencyLevel: a.competencyLevel,
        })),
        costToCompany: consultant.costToCompany,
        city: consultant.city,
        province: consultant.province,
        latitude: consultant.latitude,
        longitude: consultant.longitude,
        };
    }
}