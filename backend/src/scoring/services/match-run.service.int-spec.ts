import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScoringModule } from '../scoring.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { MatchRunService } from './match-run.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { ScoringFactorName, CompetencyLevel } from '@prisma/client';
import { PrismaModule } from 'src/prisma/prisma.module';

async function createAdmin(prisma: PrismaService) {
  return prisma.user.create({
    data: {
      email: 'admin@consultiq.com',
      fullName: 'IQ Admin',
      role: 'ADMIN',
    },
  });
}

async function createBackendSkill(prisma: PrismaService) {
  return prisma.skill.create({
    data: {
      name: 'Java',
      category: 'Backend',
    },
  });
}

async function createConsultant(
  prisma: PrismaService,
  email: string,
  costToCompany: number,
  city: string,
  province: string,
  skillId: string,
  competencyLevel: CompetencyLevel,
  yearsExperience: number,
  confidenceLevel: number,
) {
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'IQ Consultant',
      status: 'ACTIVE',
      role: 'CONSULTANT',
    },
  });

  return prisma.consultant.create({
    data: {
      userId: user.id,
      costToCompany,
      addressLine1: '123 Main street',
      city,
      province,
      skills: {
        create: [
          {
            skillId,
            competencyLevel,
            yearsExperience,
            confidenceLevel,
          },
        ],
      },
    },
  });
}

async function createProject(
  prisma: PrismaService,
  budget: number,
  teamSize: number,
  skillId: string,
  overrides: { factorName: ScoringFactorName; overrideWeight: number }[],
  extraData: any = {},
) {
  const project = await prisma.project.create({
    data: {
      status: 'OPEN',
      projectName: 'Consultants Project',
      clientName: 'BBD',
      addressLine1: '122 Business Street',
      province: 'Gauteng',
      city: 'Pretoria',
      postalCode: '1234',
      teamSize,
      budget,
      startDate: new Date(),
      allocation: 100,
      ...extraData,
      skills: {
        create: [
          {
            skillId,
            competency: CompetencyLevel.INTERMEDIATE,
            years: 5,
            mandatory: true,
          },
        ],
      },
    },
  });

  if (overrides.length > 0) {
    await prisma.projectScoringOverride.createMany({
      data: overrides.map((o) => ({
        projectId: project.id,
        factorName: o.factorName,
        overrideWeight: o.overrideWeight,
      })),
    });
  }
  return project;
}
describe('Scoring Engine (MatchRunService) - Integration-e2e-tests', () => {
  let moduleRef: TestingModule;
  let matchRunService: MatchRunService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ScoringModule, PrismaModule],
    }).compile();

    matchRunService = moduleRef.get<MatchRunService>(MatchRunService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('executeMatchRun function validation', () => {
    it('should throw exception if project does not exist', async () => {
      const testUUID = '00000000-0000-0000-0000-000000000000';

      await expect(
        matchRunService.executeMatchRun(testUUID, 'user-1-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project status is not OPEN or IN_PROGRESS', async () => {
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
      const adminUser = await createAdmin(prisma);
      const backendSkill = await createBackendSkill(prisma);
      const consultant = await createConsultant(
        prisma,
        'consultant@consultiq.com',
        400,
        'Pretoria',
        'State',
        backendSkill.id,
        CompetencyLevel.EXPERT,
        5,
        90,
      );

      // Project level weight configurations
      const project = await createProject(prisma, 600, 5, backendSkill.id, [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, overrideWeight: 0.4 },
        { factorName: ScoringFactorName.COST_TO_COMPANY, overrideWeight: 0.6 },
      ]);

      const { runId, results } = await matchRunService.executeMatchRun(
        project.id,
        adminUser.id,
      );

      expect(results).toBeDefined();
      expect(runId).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].consultantId).toBe(consultant.id);

      // verify that the match run was persisted
      const saveMatchRun = await prisma.matchRun.findFirst({
        where: { projectId: project.id },
        include: { results: true },
      });

      expect(saveMatchRun).toBeDefined();
      expect(saveMatchRun?.id).toBe(runId);
      expect(saveMatchRun?.status).toBe('COMPLETED');
      expect(saveMatchRun?.totalConsultantsScored).toBe(1);
      expect(saveMatchRun?.executedByUserId).toBe(adminUser.id);

      expect(saveMatchRun?.results.length).toBe(1);
      expect(saveMatchRun?.results[0].consultantId).toBe(consultant.id);
    });

    it('successfully rank multiple consultants based on their fit score', async () => {
      // Seed Test DB
      const adminUser = await createAdmin(prisma);

      const backendSkill = await prisma.skill.create({
        data: { name: 'Java', category: 'Backend' },
      });

      const consultantA = await createConsultant(
        prisma,
        'consultantA@consultIq.com',
        400,
        'Pretoria',
        'State',
        backendSkill.id,
        CompetencyLevel.EXPERT,
        5,
        90,
      );
      const consultantB = await createConsultant(
        prisma,
        'consultantB@consultIq.com',
        1100,
        'Johannesburg',
        'Cape Town',
        backendSkill.id,
        CompetencyLevel.BEGINNER,
        2,
        60,
      );
      const consultantC = await createConsultant(
        prisma,
        'consultantC@consultIq.com',
        1200,
        'Johannesburg',
        'Cape Town',
        backendSkill.id,
        CompetencyLevel.BEGINNER,
        1,
        40,
      );

      // Project level weight configurations
      const project = await createProject(prisma, 1000, 5, backendSkill.id, [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, overrideWeight: 0.4 },
        { factorName: ScoringFactorName.COST_TO_COMPANY, overrideWeight: 0.6 },
      ]);

      const { results } = await matchRunService.executeMatchRun(
        project.id,
        adminUser.id,
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(3);

      expect(results[0].finalScore).toBeGreaterThan(results[1].finalScore);
      expect(results[1].finalScore).toBeGreaterThan(results[2].finalScore);

      expect(results[0].consultantId).toBe(consultantA.id);
      expect(results[1].consultantId).toBe(consultantB.id);
      expect(results[2].consultantId).toBe(consultantC.id);

      // verify that the match run was persisted
      const savedResults = await prisma.matchRunResult.findMany({
        where: { matchRun: { projectId: project.id } },
        orderBy: { rank: 'asc' },
      });

      expect(savedResults.length).toBe(3);
      expect(savedResults[0].consultantId).toBe(consultantA.id);
      expect(savedResults[0].rank).toBe(1);
    });

    it('successfully scores consultants, and aggregates their results, saves transaction', async () => {
      // Seed Test DB
      const adminUser = await createAdmin(prisma);

      const backendSkill = await prisma.skill.create({
        data: { name: 'Java', category: 'Backend' },
      });

      const consultant = await createConsultant(
        prisma,
        'consultant2@consultIq.com',
        400,
        'Cape Town',
        'Western Cape',
        backendSkill.id,
        CompetencyLevel.EXPERT,
        8,
        95,
      );

      // Project level weight configurations
      const project = await createProject(prisma, 100, 1, backendSkill.id, [
        {
          factorName: ScoringFactorName.SKILL_ALIGNMENT,
          overrideWeight: 0.2,
        },
        {
          factorName: ScoringFactorName.COST_TO_COMPANY,
          overrideWeight: 0.2,
        },
        {
          factorName: ScoringFactorName.COMPETENCY_LEVEL,
          overrideWeight: 0.2,
        },
        {
          factorName: ScoringFactorName.LOCATION,
          overrideWeight: 0.2,
        },
        {
          factorName: ScoringFactorName.AVAILABILITY,
          overrideWeight: 0.2,
        },
      ]);

      const { results } = await matchRunService.executeMatchRun(
        project.id,
        adminUser.id,
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(1);

      const matchResult = results[0];
      expect(matchResult.consultantId).toBe(consultant.id);

      const scoredFactors = matchResult.factorBreakdown.map((f) => f.factor);
      expect(scoredFactors).toContain('SKILL_ALIGNMENT');
      expect(scoredFactors).toContain('COST_TO_COMPANY');
      expect(scoredFactors).toContain('COMPETENCY_LEVEL');
      expect(scoredFactors).toContain('LOCATION');
      expect(scoredFactors).toContain('AVAILABILITY');
    });
  });
});
