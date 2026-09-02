import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    BenchBySkillDto,
    BenchCountDto,
    CvParsingStatsDto,
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

    async getCvParsingStats(): Promise<CvParsingStatsDto> {
        const processedFiles = await this.prisma.cvFile.findMany({
            where: { extractionStatus: { in: ['REVIEW_REQUIRED', 'FAILED'] } },
            select: { parsingMethod: true, extractionStatus: true, parsedData: true },
        });

        const totalProcessed = processedFiles.length;
        const ruleBasedCount = processedFiles.filter((f) => f.parsingMethod === 'RULE_BASED').length;
        const aiAssistedCount = processedFiles.filter((f) => f.parsingMethod === 'AI_ASSISTED').length;
        const successCount = processedFiles.filter((f) => f.extractionStatus === 'REVIEW_REQUIRED').length;
        const failedCount = processedFiles.filter((f) => f.extractionStatus === 'FAILED').length;

        // Filtering to REVIEW_REQUIRED first, then guarding
        // with the type-predicate filter below, means a malformed or
        // unexpectedly-shaped row is silently excluded from the average rather
        // than corrupting it with NaN or crashing the whole query.
        const confidenceScores = processedFiles
            .filter((f) => f.extractionStatus === 'REVIEW_REQUIRED')
            .map((f) => (f.parsedData as { data?: ParsedCvData })?.data?.confidenceScores?.overall)
            .filter((score): score is number => typeof score === 'number');

        const averageConfidence = confidenceScores.length > 0
            ? Math.round((confidenceScores.reduce((sum, s) => sum + s, 0) / confidenceScores.length) * 100) / 100
            : 0;

        return { totalProcessed, ruleBasedCount, aiAssistedCount, successCount, failedCount, averageConfidence };
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
}
