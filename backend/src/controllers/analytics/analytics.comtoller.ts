import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { SkillDistributionDto, PlacementsBySkillDto, PlacementsYTDDto } from 'src/analytics/dto/analytics-response.dto';

@Controller('analytics')
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
    async geyPlacementsYTD(): Promise<PlacementsYTDDto> {
        return this.analyticsService.getPlacementYTD();
    }
}