import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OverallUtilisationDto } from '../dto/analytics-response.dto';

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

    private toPercent(part: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((part / total) * 1000) / 10; // one decimal place, matches the 83.5% style in the reference dashboard
    }
    
    // getUtilisationBySkillCategory()
    // getBenchBySkillCategory()
    // getPlacementsBySkillCategory()
    // getCvParsingStats()
}
