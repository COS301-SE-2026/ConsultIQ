import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    // TO DO:
    // getUtilisationBySkillCategory()
    // getBenchBySkillCategory()
    // getPlacementsBySkillCategory()
    // getCvParsingStats()
}
