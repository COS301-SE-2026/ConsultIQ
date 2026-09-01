import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    BenchBySkillDto,
    BenchCountDto,
    OverallUtilisationDto,
    PlacementsBySkillDto,
    UtilisationBySkillDto,
} from '../dto/analytics-response.dto';
import { ParsedCvData } from '../../cv-parsing/types/parsed-cv.types';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    async getOverallUtilisation(): Promise<OverallUtilisationDto> {
        const totalConsultants = await this.prisma.consultant.count();
        const utilisedConsultants = await this.prisma.consultant.count({
            where: { capacity: { lt: 100 } },
        });

        return {
            totalConsultants,
            utilisedConsultants,
            utilisationPercent: this.toPercent(utilisedConsultants, totalConsultants),
        };
    }

    async getUtilisationBySkillCategory(): Promise<UtilisationBySkillDto[]> {

        const byCategory = await this.groupConsultantsByCategory();

        return Array.from(byCategory.entries()).map(([category, consultants]) => {
            const totalConsultants = consultants.size;
            const utilisedConsultants = Array.from(consultants.values()).filter((c) => c < 100).length;
            return {
            category,
            totalConsultants,
            utilisedConsultants,
            utilisationPercent: this.toPercent(utilisedConsultants, totalConsultants),
            };
        });
    }

    async getOverallBenchCount(): Promise<BenchCountDto> {
        const count = await this.prisma.consultant.count({
            where: { capacity: 100 },
        });
        return { count };
    }

    async getBenchBySkillCategory(): Promise<BenchBySkillDto[]> {
        
        const byCategory = await this.groupConsultantsByCategory();

        return Array.from(byCategory.entries()).map(([category, consultants]) => ({
            category,
            benchCount: Array.from(consultants.values()).filter((c) => c === 100).length,
        }));
    }

    async getPlacementsBySkillCategory(): Promise<PlacementsBySkillDto[]> {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);

        const placements = await this.prisma.projectPlacement.findMany({
            where: { startDate: { gte: startOfYear } },
            select: {
            project: {
                select: {
                skills: {
                    where: { mandatory: true },
                    select: { skill: { select: { category: true } } },
                },
                },
            },
            },
        });

        const counts = new Map<string, number>();

        for (const placement of placements) {
            // A Set, dedupes categories within a single placement, so a project mandating both AWS and Docker (both
            // "Cloud & DevOps") doesn't count that one placement twice toward
            // the same category. 
            const categories = new Set(placement.project.skills.map((s) => s.skill.category));
            for (const category of categories) {
            counts.set(category, (counts.get(category) ?? 0) + 1);
            }
        }

        return Array.from(counts.entries()).map(([category, placementCount]) => ({
            category,
            placementCount,
        }));
    }

    private toPercent(part: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((part / total) * 1000) / 10;
    }

    private async groupConsultantsByCategory(): Promise<Map<string, Map<string, number>>> {
        const rows = await this.prisma.consultantSkill.findMany({
            select: {
            consultantId: true,
            skill: { select: { category: true } },
            consultant: { select: { capacity: true } },
            },
        });

        const byCategory = new Map<string, Map<string, number>>();

        for (const row of rows) {
            const category = row.skill.category;
            if (!byCategory.has(category)) byCategory.set(category, new Map());
            byCategory.get(category)!.set(row.consultantId, row.consultant.capacity);
        }

        return byCategory;
    }

    // getPlacementsBySkillCategory()
    // getCvParsingStats()
}
