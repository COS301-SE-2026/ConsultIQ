import { Test, TestingModule } from '@nestjs/testing';
import { ScoringModule } from '../scoring.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScoringService } from './scoring-config.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { ScoringFactorName } from '@prisma/client';
import { PrismaModule } from 'src/prisma/prisma.module';

describe('ScoringService - Two-Tier Config Integration Test', () => {
  let scoringService: ScoringService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ScoringModule, PrismaModule],
    }).compile();

    scoringService = moduleRef.get<ScoringService>(ScoringService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function createTestProject(
    overrides: Partial<
      Parameters<typeof prisma.project.create>[0]['data']
    > = {},
  ) {
    return prisma.project.create({
      data: {
        projectName: 'Test Project',
        clientName: 'BBD',
        addressLine1: '123 Good St',
        city: 'Pretoria',
        province: 'Gauteng',
        postalCode: '0001',
        startDate: new Date(),
        teamSize: 3,
        budget: 500000,
        allocation: 100,
        status: 'OPEN',
        ...overrides,
      },
    });
  }

  function seedFirmWideConfig() {
    return prisma.consultancyScoringConfig.createMany({
      data: [
        {
          factorName: ScoringFactorName.SKILL_ALIGNMENT,
          weight: 40,
          active: true,
        },
        {
          factorName: ScoringFactorName.COMPETENCY_LEVEL,
          weight: 30,
          active: true,
        },
        {
          factorName: ScoringFactorName.AVAILABILITY,
          weight: 15,
          active: true,
        },
        { factorName: ScoringFactorName.LOCATION, weight: 10, active: true },
        {
          factorName: ScoringFactorName.COST_TO_COMPANY,
          weight: 5,
          active: true,
        },
      ],
    });
  }

  describe('resolveProjectWeights - two-tier fallback chain', () => {
    it('should return project-level overrides when they exist for the project', async () => {
      const project = await createTestProject({
        projectName: 'Override Project',
        allocation: 10,
      });
      await seedFirmWideConfig();

      await prisma.projectScoringOverride.createMany({
        data: [
          {
            projectId: project.id,
            factorName: ScoringFactorName.SKILL_ALIGNMENT,
            overrideWeight: 60,
            active: true,
          },
          {
            projectId: project.id,
            factorName: ScoringFactorName.COST_TO_COMPANY,
            overrideWeight: 40,
            active: true,
          },
        ],
      });

      const result = await scoringService.resolveProjectWeights(project.id);

      expect(result).toHaveLength(2);
      expect(result.every((r: any) => r.projectId === project.id)).toBe(true);
      expect(result.every((r: any) => 'overrideWeight' in r)).toBe(true);
    });

    it('should fall back to firm-wide ConsultancyScoringConfig when no project overrides exist', async () => {
      const project = await createTestProject({
        projectName: 'No Override Project',
      });
      await seedFirmWideConfig();

      const result = await scoringService.resolveProjectWeights(project.id);

      expect(result).toHaveLength(5);
      expect(result.every((r: any) => 'weight' in r)).toBe(true);
      expect(
        result.every((r: any) => !('projectId' in r) || r.projectId === null),
      ).toBe(true);
    });

    it('should ignore inactive project overrides and fall back to firm-wide config', async () => {
      const project = await createTestProject({
        projectName: 'Inactive Override Project',
      });
      await seedFirmWideConfig();

      await prisma.projectScoringOverride.createMany({
        data: [
          {
            projectId: project.id,
            factorName: ScoringFactorName.SKILL_ALIGNMENT,
            overrideWeight: 60,
            active: false,
          },
        ],
      });

      const result = await scoringService.resolveProjectWeights(project.id);

      expect(result).toHaveLength(5);
      expect(result.every((r: any) => 'weight' in r)).toBe(true);
      expect(
        result.every((r: any) => !('projectId' in r) || r.projectId === null),
      ).toBe(true);
    });

    it('should return an empty array when neither overrides nor firm-wide config are seeded', async () => {
      const project = await createTestProject({
        projectName: 'Empty Config Project',
      });

      const result = await scoringService.resolveProjectWeights(project.id);

      expect(result).toHaveLength(0);
    });
  });
});
