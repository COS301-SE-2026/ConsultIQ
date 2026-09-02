@Controller('analytics')
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import {
  OverallUtilisationDto,
  UtilisationBySkillDto,
  BenchCountDto,
  BenchBySkillDto,
  PlacementsBySkillDto,
  CvParsingStatsDto,
  SkillDistributionDto,
  PlacementsYTDDto
} from '../../analytics/dto/analytics-response.dto';

@Controller('admin/analytics')
@Roles(Role.ADMIN)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('skill-distribution')
    @HttpCode(HttpStatus.OK)
    async getSkillDistribution(): Promise<SkillDistributionDto[]> {
        return this.analyticsService.getSkillDistribution();
    }

    @Get('placement-ytd')
    @HttpCode(HttpStatus.OK)
    async getPlacementYTD(): Promise<PlacementsYTDDto> {
        return this.analyticsService.getPlacementYTD();
    }
}
    @Get('utilisation')
    getOverallUtilisation(): Promise<OverallUtilisationDto> {
        return this.analyticsService.getOverallUtilisation();
    }

    @Get('utilisation/by-skill-category')
    getUtilisationBySkillCategory(): Promise<UtilisationBySkillDto[]> {
        return this.analyticsService.getUtilisationBySkillCategory();
    }

    @Get('bench')
    getOverallBenchCount(): Promise<BenchCountDto> {
        return this.analyticsService.getOverallBenchCount();
    }

    @Get('bench/by-skill-category')
    getBenchBySkillCategory(): Promise<BenchBySkillDto[]> {
        return this.analyticsService.getBenchBySkillCategory();
    }

    @Get('placements/by-skill-category')
    getPlacementsBySkillCategory(): Promise<PlacementsBySkillDto[]> {
        return this.analyticsService.getPlacementsBySkillCategory();
    }

    @Get('cv-parsing-stats')
    getCvParsingStats(): Promise<CvParsingStatsDto> {
        return this.analyticsService.getCvParsingStats();
    }
}
