import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';
import { MatchScoringExecutorService } from '../../scoring/services/match-scoring-executor.service';
import { RawConsultantDto } from '../../scoring/dto/raw-consultant.dto';
import { RawProjectDto } from '../../scoring/dto/raw-project.dto';
import { ConsultantPoolEntry } from '../../scoring/services/interfaces/consultant-pool-entry.interface';
import { injectHypotheticalSkill } from './inject-hypothetical-skill';
import { deriveCandidateSkills } from './derive-candidate-skills';
import { ProjectStatus } from '@prisma/client';
import { ProjectScoringContext } from '../interfaces/project-scoring-context.interface';
import { ConsultantScoreOutcome } from '../interfaces/consultant-score-outcome.interface';
import {
  HypotheticalSkillInput,
  SimulationResult,
} from '../interfaces/simulation-result.interface';
import { PipelineProject } from '../interfaces/candidates-skills.interface';

@Injectable()
export class SimulationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly dataIngestion: DataIngestionService,
        private readonly scoringExecutor: MatchScoringExecutorService,
    ) {}
    
    /**
   * Re-scores a consultant against a project with one hypothetical skill
   * added in-memory. Never writes to the consultant record. Deterministic:
   * calling this twice with unchanged underlying data returns identical
   * results, since it performs only reads plus pure in-memory computation.
   */
    async simulate(
    consultantId: string,
    projectId: string,
    candidateSkill: HypotheticalSkillInput,
  ): Promise<SimulationResult> {
    const [consultantRow, projectRow] = await Promise.all([
      this.fetchConsultantRow(consultantId),
      this.fetchProjectRow(projectId),
    ]);

    const projectContext = await this.resolveProjectScoringContext(
      consultantId,
      projectId,
      projectRow,
    );

    const baselineConsultantDto = this.mapConsultantToDto(consultantRow);
    const projectedConsultantDto = injectHypotheticalSkill(
      baselineConsultantDto,
      candidateSkill,
    );

    const isPlaced = consultantRow.placements && consultantRow.placements.length > 0;

    const [baselineOutcome, projectedOutcome] = await Promise.all([
      this.scoreConsultantOnProject(
        consultantRow, projectContext, baselineConsultantDto, isPlaced,
      ),
      this.scoreConsultantOnProject(
        consultantRow, projectContext, projectedConsultantDto, isPlaced,
      ),
    ]);

    return this.buildSimulationResult(
      consultantId, projectId, candidateSkill.skillName,
      baselineOutcome, projectedOutcome,
    );
    }

    /**
     * For one consultant, tests every skill missing from the active
     * pipeline's mandatory requirements, and returns the raw scoring
     * comparison for each (project, candidate skill) pair where that
     * skill is actually relevant to the project. Does not rank or
     * summarize — see the aggregator for turning this into a ranked
     * recommendation.
     *
     * Baseline scores are computed ONCE per pipeline project and reused
     * across every candidate skill — not recomputed per skill, since the
     * baseline (no hypothetical change) never varies by candidate.
     */
    async recommendSkillGrowth(consultantId: string): Promise<SimulationResult[]> {
    const [consultantRow, pipelineProjects] = await Promise.all([
        this.fetchConsultantRow(consultantId),
        this.fetchPipelineProjects(),
    ]);

    const baselineConsultantDto = this.mapConsultantToDto(consultantRow);
    const candidateSkills = deriveCandidateSkills(
        baselineConsultantDto.skills,
        pipelineProjects,
    );

    if (candidateSkills.length === 0) {
        return []; // consultant already has every mandatory skill the pipeline needs
    }

    const isPlaced = consultantRow.placements && consultantRow.placements.length > 0;

    // Resolve each project's context + baseline ONCE, up front.
    const perProjectData = await Promise.all(
        pipelineProjects.map(async (projectRow) => {
        const projectContext = await this.resolveProjectScoringContext(
            consultantId,
            projectRow.id,
            projectRow,
        );
        const baselineOutcome = await this.scoreConsultantOnProject(
            consultantRow,
            projectContext,
            baselineConsultantDto,
            isPlaced,
        );
        return { projectRow, projectContext, baselineOutcome };
        }),
    );

    const results: SimulationResult[] = [];

    for (const candidateSkill of candidateSkills) {
        const relevantProjects = perProjectData.filter(({ projectRow }) =>
        this.projectRequiresSkill(projectRow, candidateSkill.skillName),
        );

        const projectedOutcomes = await Promise.all(
        relevantProjects.map(({ projectContext }) => {
            const projectedConsultantDto = injectHypotheticalSkill(
            baselineConsultantDto,
            candidateSkill,
            );
            return this.scoreConsultantOnProject(
            consultantRow,
            projectContext,
            projectedConsultantDto,
            isPlaced,
            );
        }),
        );

        relevantProjects.forEach(({ projectRow, baselineOutcome }, index) => {
        results.push(
            this.buildSimulationResult(
            consultantId,
            projectRow.id,
            candidateSkill.skillName,
            baselineOutcome,
            projectedOutcomes[index],
            ),
        );
        });
    }

    return results;
    }


    private async resolveProjectScoringContext(
        consultantId: string,
        projectId: string,
        projectRow: Awaited<ReturnType<SimulationService['fetchProjectRow']>>,
    ): Promise<ProjectScoringContext> {
        const [scoringContext, allocationsByConsultant] = await Promise.all([
        this.dataIngestion.getProjectScoringContext(projectId),
        this.fetchAllocation(consultantId, projectRow),
        ]);

        return {
        projectDto: this.mapProjectToDto(projectRow),
        scoringContext,
        allocationsByConsultant,
        };
    }

    private async scoreConsultantOnProject(
        consultantRow: Awaited<ReturnType<SimulationService['fetchConsultantRow']>>,
        projectContext: ProjectScoringContext,
        consultantDto: RawConsultantDto,
        isPlaced: boolean,
    ): Promise<ConsultantScoreOutcome> {
        const pool: ConsultantPoolEntry[] = [
        {
            consultantId: consultantRow.id,
            consultantName: consultantRow.user?.fullName || 'Unknown',
            consultantEmail: consultantRow.user?.email || 'Unknown',
            isPlaced,
            consultant: consultantDto,
        },
        ];

        const { finalResults } = await this.scoringExecutor.scorePool(
        projectContext.projectDto,
        pool,
        projectContext.scoringContext,
        projectContext.allocationsByConsultant,
        );

        const result = finalResults[0];
        return result
        ? { score: result.finalScore, excluded: false }
        : { score: 0, excluded: true };
    }

    private buildSimulationResult(
    consultantId: string,
    projectId: string,
    candidateSkillName: string,
    baseline: ConsultantScoreOutcome,
    projected: ConsultantScoreOutcome,
    ): SimulationResult {
    return {
        consultantId,
        projectId,
        candidateSkillName,
        baselineScore: baseline.score,
        projectedScore: projected.score,
        scoreDelta: baseline.excluded || projected.excluded ? 0 : projected.score - baseline.score,
        baselineExcluded: baseline.excluded,
        projectedExcluded: projected.excluded,
    };
    }

    private projectRequiresSkill(
    projectRow: PipelineProject,
    skillName: string,
    ): boolean {
    const normalised = skillName.trim().toLowerCase();
    return projectRow.skills.some(
        (s) => s.skill.name.trim().toLowerCase() === normalised,
    );
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
                        competencyLevel: true,
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
                `Consultant with ID ${consultantId} not found.`,
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
            requiredSkills: this.mapRequiredSkills(project.skills),
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
        skills: this.mapConsultantSkills(consultant.skills),
        costToCompany: consultant.costToCompany,
        city: consultant.city,
        province: consultant.province,
        latitude: consultant.latitude,
        longitude: consultant.longitude,
        };
    }

    private mapRequiredSkills(skills: any[]): RawProjectDto['requiredSkills'] {
        return skills.map((skill) => ({
            skillName: skill.skill.name,
            minimumCompetencyLevel: skill.competency,
            isMandatory: skill.mandatory,
        }));
    }

    private mapConsultantSkills(skills: any[]): RawConsultantDto['skills'] {
        return skills.map((skill) => ({
            skillName: skill.skill.name,
            competencyLevel: skill.competencyLevel,
        }));
    }

    private async fetchPipelineProjects() {
        return this.prisma.project.findMany({
            where: { status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] } },
            include: { skills: { include: { skill: true } } },
        });
    }
}