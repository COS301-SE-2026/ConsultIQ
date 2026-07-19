import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScoringModule } from '../scoring.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { MatchRunService } from './match-run.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { ScoringFactorName, CompetencyLevel } from '@prisma/client';

describe('Scoring Engine (MatchRunService) - Integration-e2e-tests', () => {
  let matchRunService: MatchRunService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ScoringModule],
    }).compile();

    matchRunService = moduleRef.get<MatchRunService>(MatchRunService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('executeMatchRun function validation', () => {
    it('should throw exception if project does not exist', async () => {
      const testUUID = '00000000-0000-0000-0000-000000000000';

      await expect(
        matchRunService.executeMatchRun(testUUID, 'user-1-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project status is not OPEN or IN_PROGRESS', async () => {
      //   const testUUID = '00000000-0000-0000-0000-000000000000';

      const project = await prisma.project.create({
        data: {
          projectName: 'Dependency Injection',
          clientName: 'Infra Scan',
          status: 'CLOSED',
          addressLine1: '123 New street',
          province: 'Pretoria',
          city: 'Tech City',
          postalCode: '0000',
          teamSize: 1,
          budget: 100,
          startDate: new Date(),
          allocation: 100,
        },
      });

      await expect(
        matchRunService.executeMatchRun(project.id, 'user-1-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('executeMatchRun execution test', () => {
    it('successfully scores consultants, and aggregates their results, saves transaction', async () => {
      // Seed Test DB
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@consultIq.com',
          fullName: 'IQ Admin',
          role: 'ADMIN',
        },
      });

      const consultantUser = await prisma.user.create({
        data: {
          email: 'conultant@consultIq.com',
          fullName: 'IQ conultant',
          status: 'ACTIVE',
          role: 'CONSULTANT',
        },
      });

      const backendSkill = await prisma.skill.create({
        data: { name: 'Java', category: 'Backend' },
      });

      const consultant = await prisma.consultant.create({
        data: {
          userId: consultantUser.id,
          costToCompany: 400,
          city: 'Pretoria',
          addressLine1: '123 Main St',
          province: 'State',
          skills: {
            create: [
              {
                skillId: backendSkill.id,
                competencyLevel: CompetencyLevel.EXPERT,
                yearsExperience: 5,
                confidenceLevel: 90,
              },
            ],
          },
        },
      });

      const project = await prisma.project.create({
        data: {
          status: 'OPEN',
          projectName: 'Consultancy Project',
          clientName: 'BBD',
          addressLine1: '123 Business Street',
          province: 'Gauteng',
          city: 'Pretoria',
          postalCode: '1234',
          teamSize: 5,
          budget: 600,
          startDate: new Date(),
          allocation: 100,
          skills: {
            create: [
              {
                skillId: backendSkill.id,
                competency: CompetencyLevel.INTERMEDIATE,
                years: 5,
                mandatory: true,
              },
            ],
          },
        },
      });

      // Project level weight configurations
      await prisma.projectScoringOverride.createMany({
        data: [
          {
            projectId: project.id,
            factorName: ScoringFactorName.SKILL_ALIGNMENT,
            overrideWeight: 0.4,
          },
          {
            projectId: project.id,
            factorName: ScoringFactorName.COST_TO_COMPANY,
            overrideWeight: 0.6,
          },
        ],
      });

      const result = await matchRunService.executeMatchRun(
        project.id,
        adminUser.id,
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].consultantId).toBe(consultant.id);

      // verify that the match run was persisted
      const saveMatchRun = await prisma.matchRun.findFirst({
        where: { projectId: project.id },
        include: { results: true },
      });

      expect(saveMatchRun).toBeDefined();
      expect(saveMatchRun?.status).toBe('COMPLETED');
      expect(saveMatchRun?.totalConsultantsScored).toBe(1);
      expect(saveMatchRun?.executedByUserId).toBe(adminUser.id);

      expect(saveMatchRun?.results.length).toBe(1);
      expect(saveMatchRun?.results[0].consultantId).toBe(consultant.id);
    });

    it('successfully rank multiple consultants based on their fit score', async () => {
      // Seed Test DB
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@consultIq.com',
          fullName: 'IQ Admin',
          role: 'ADMIN',
        },
      });

      const consultantUserA = await prisma.user.create({
        data: {
          email: 'conultantA@consultIq.com',
          fullName: 'IQ conultant A',
          status: 'ACTIVE',
          role: 'CONSULTANT',
        },
      });

      const consultantUserB = await prisma.user.create({
        data: {
          email: 'conultantB@consultIq.com',
          fullName: 'IQ conultant B',
          status: 'ACTIVE',
          role: 'CONSULTANT',
        },
      });

      const consultantUserC = await prisma.user.create({
        data: {
          email: 'conultantC@consultIq.com',
          fullName: 'IQ conultant C',
          status: 'ACTIVE',
          role: 'CONSULTANT',
        },
      });
      const backendSkill = await prisma.skill.create({
        data: { name: 'Java', category: 'Backend' },
      });

      const consultantA = await prisma.consultant.create({
        data: {
          userId: consultantUserA.id,
          costToCompany: 400,
          city: 'Pretoria',
          addressLine1: '123 Main St',
          province: 'State',
          skills: {
            create: [
              {
                skillId: backendSkill.id,
                competencyLevel: CompetencyLevel.EXPERT,
                yearsExperience: 5,
                confidenceLevel: 90,
              },
            ],
          },
        },
      });

      const consultantB = await prisma.consultant.create({
        data: {
          userId: consultantUserB.id,
          costToCompany: 1100,
          city: 'Johannsesburg',
          addressLine1: '123 main',
          province: 'Cape Town',
          skills: {
            create: [
              {
                skillId: backendSkill.id,
                competencyLevel: CompetencyLevel.BEGINNER,
                yearsExperience: 2,
                confidenceLevel: 60,
              },
            ],
          },
        },
      });

      const consultantC = await prisma.consultant.create({
        data: {
          userId: consultantUserC.id,
          costToCompany: 1200,
          city: 'Johannsesburg',
          addressLine1: '123 main',
          province: 'Cape Town',
          skills: {
            create: [
              {
                skillId: backendSkill.id,
                competencyLevel: CompetencyLevel.BEGINNER,
                yearsExperience: 1,
                confidenceLevel: 40,
              },
            ],
          },
        },
      });

      const project = await prisma.project.create({
        data: {
          status: 'OPEN',
          projectName: 'Consultancy Project',
          clientName: 'BBD',
          addressLine1: '123 Business Street',
          province: 'Gauteng',
          city: 'Pretoria',
          postalCode: '1234',
          teamSize: 5,
          budget: 1000,
          startDate: new Date(),
          allocation: 100,
          skills: {
            create: [
              {
                skillId: backendSkill.id,
                competency: CompetencyLevel.INTERMEDIATE,
                years: 5,
                mandatory: true,
              },
            ],
          },
        },
      });

      // Project level weight configurations
      await prisma.projectScoringOverride.createMany({
        data: [
          {
            projectId: project.id,
            factorName: ScoringFactorName.SKILL_ALIGNMENT,
            overrideWeight: 0.4,
          },
          {
            projectId: project.id,
            factorName: ScoringFactorName.COST_TO_COMPANY,
            overrideWeight: 0.6,
          },
        ],
      });

      const result = await matchRunService.executeMatchRun(
        project.id,
        adminUser.id,
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(3);

      expect(result[0].finalScore).toBeGreaterThan(result[1].finalScore);
      expect(result[1].finalScore).toBeGreaterThan(result[2].finalScore);

      expect(result[0].consultantId).toBe(consultantA.id);
      expect(result[1].consultantId).toBe(consultantB.id);
      expect(result[2].consultantId).toBe(consultantC.id);

      // verify that the match run was persisted
      const savedResults = await prisma.matchRunResult.findMany({
        where: { matchRun: { projectId: project.id } },
        orderBy: { rank: 'asc' },
      });

      expect(savedResults.length).toBe(3);
      expect(savedResults[0].consultantId).toBe(consultantA.id);
      expect(savedResults[0].rank).toBe(1);
    });
  });
});
