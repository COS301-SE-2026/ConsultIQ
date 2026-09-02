import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SkillDistributionDto,
  PlacementsYTDDto,
} from '../dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // TO DO:
  // getOverallUtilisation()
  // getUtilisationBySkillCategory()
  // getBenchBySkillCategory()
  // getPlacementsBySkillCategory()
  // getCvParsingStats()

  async getSkillDistribution(): Promise<SkillDistributionDto[]> {
    const totalConsultants = await this.prisma.consultant.count();

    const categories = await this.prisma.skill.findMany({
      distinct: ['category'],
      select: { category: true },
    });

    const results: SkillDistributionDto[] = [];

    for (const { category } of categories) {
      const consultantCount = await this.prisma.consultant.count({
        where: {
          skills: {
            some: {
              skill: { category },
            },
          },
        },
      });

      results.push({
        category,
        consultantCount,
        percentageOfPool:
          totalConsultants > 0
            ? Math.round((consultantCount / totalConsultants) * 100)
            : 0,
      });
    }
    return results;
  }

  async getPlacementYTD(): Promise<PlacementsYTDDto> {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const distinctConsultants = await this.prisma.projectPlacement.findMany({
      where: { createdAt: { gte: startOfYear } },
      distinct: ['consultantId'],
      select: { consultantId: true },
    });

    return { count: distinctConsultants.length };
  }
}
