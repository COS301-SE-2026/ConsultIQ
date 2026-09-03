import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { SkillGapService } from './skill-gap.service';
import { SkillGapModule } from '../skill-gap.module';
import { ConfigModule } from '@nestjs/config';  
import { RedisUtilityService } from 'src/common/services/redis-utility.service';
import {
  CompetencyLevel,
  ConsultantAvailability,
  ProjectStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('SkillGapService - Integration Test', () => {
  let moduleRef: TestingModule;
  let skillGapService: SkillGapService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({isGlobal: true}) ,
        SkillGapModule, 
        PrismaModule],
    })
    .overrideProvider(RedisUtilityService)
    .useValue({ invalidateCacheByPattern: jest.fn().mockResolvedValue(undefined) })
    .compile();

    skillGapService = moduleRef.get<SkillGapService>(SkillGapService);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    if(prisma){
      await prisma.$disconnect();
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  async function createTestSkill(name: string, category: string = 'Software') {
    return prisma.skill.create({
      data: { name, category },
    });
  }

  async function createTestProject(
    overrides: Partial<
      Parameters<typeof prisma.project.create>[0]['data']
    > = {},
  ) {
    return prisma.project.create({
      data: {
        projectName: 'Test Gap Project',
        clientName: 'BBD',
        addressLine1: '123 Tech Ave',
        city: 'Pretoria',
        province: 'Gauteng',
        postalCode: '0001',
        startDate: new Date(),
        teamSize: 2,
        allocation: 100,
        budget: 500000,
        status: ProjectStatus.OPEN,
        ...overrides,
      },
    });
  }

  async function createTestConsultant(
    availability: ConsultantAvailability = ConsultantAvailability.AVAILABLE,
    skills: { skillId: string; competencyLevel: CompetencyLevel }[] = [],
  ) {
    const user = await prisma.user.create({
      data: {
        email: `test-${randomUUID()}@example.com`,
        fullName: 'Test User',
        role: 'CONSULTANT',
      },
    });

    return prisma.consultant.create({
      data: {
        userId: user.id,
        addressLine1: '456 Dev Street',
        city: 'Pretoria',
        province: 'Gauteng',
        costToCompany: 450000,
        availability,
        skills: {
          create: skills.map((s) => ({
            skillId: s.skillId,
            competencyLevel: s.competencyLevel,
            yearsExperience: 3,
            confidenceLevel: 80,
          })),
        },
      },
    });
  }

  describe('getProjectSkillGapAnalysis', () => {
    it('should return 100% coverage (COVERED) when enough qualified consultants are available', async () => {
      const reactSkill = await createTestSkill('React');

      const project = await createTestProject({
        teamSize: 2,
        skills: {
          create: [
            {
              skillId: reactSkill.id,
              competency: CompetencyLevel.INTERMEDIATE,
              years: 2,
            },
          ],
        },
      });

      await createTestConsultant(ConsultantAvailability.AVAILABLE, [
        {
          skillId: reactSkill.id,
          competencyLevel: CompetencyLevel.INTERMEDIATE,
        },
      ]);
      await createTestConsultant(ConsultantAvailability.AVAILABLE, [
        { skillId: reactSkill.id, competencyLevel: CompetencyLevel.EXPERT },
      ]);

      const result = await skillGapService.getProjectSkillGapAnalysis(
        project.id,
      );

      expect(result.summary.overallCoveragePercent).toBe(100);
      expect(result.summary.adequatelyCoveredCount).toBe(1);

      const reactGap = result.skills.find((s) => s.skillId === reactSkill.id);
      expect(reactGap).toBeDefined();
      expect(reactGap?.requiredCount).toBe(2);
      expect(reactGap?.availableCount).toBe(2);
      expect(reactGap?.severity).toBe('COVERED');
    });

    it('should accurately calculate AT_RISK severity and ignore unqualified or unavailable consultants', async () => {
      const nodeSkill = await createTestSkill('NodeJS');

      const project = await createTestProject({
        teamSize: 2,
        skills: {
          create: [
            {
              skillId: nodeSkill.id,
              competency: CompetencyLevel.EXPERT,
              years: 5,
            },
          ],
        },
      });

      await createTestConsultant(ConsultantAvailability.AVAILABLE, [
        { skillId: nodeSkill.id, competencyLevel: CompetencyLevel.EXPERT },
      ]);

      await createTestConsultant(ConsultantAvailability.UNAVAILABLE, [
        { skillId: nodeSkill.id, competencyLevel: CompetencyLevel.EXPERT },
      ]);

      await createTestConsultant(ConsultantAvailability.AVAILABLE, [
        { skillId: nodeSkill.id, competencyLevel: CompetencyLevel.BEGINNER },
      ]);

      const result = await skillGapService.getProjectSkillGapAnalysis(
        project.id,
      );

      const nodeGap = result.skills[0];
      expect(nodeGap.requiredCount).toBe(2);
      expect(nodeGap.availableCount).toBe(1);
      expect(nodeGap.coveragePercent).toBe(50);
      expect(nodeGap.severity).toBe('AT_RISK');
    });
  });

  describe('getPortfolioSkillGapAnalysis', () => {
    it('should aggregate skills across all OPEN/IN_PROGRESS projects and generate correct alerts', async () => {
      const javaSkill = await createTestSkill('Java');
      const angularSkill = await createTestSkill('Angular');

      const projectA = await createTestProject({
        projectName: 'Backend Overhaul',
        status: ProjectStatus.OPEN,
        teamSize: 2,
        skills: {
          create: [
            {
              skillId: javaSkill.id,
              competency: CompetencyLevel.INTERMEDIATE,
              years: 3,
            },
          ],
        },
      });

      await createTestProject({
        projectName: 'Frontend Migration',
        status: ProjectStatus.IN_PROGRESS,
        teamSize: 1,
        skills: {
          create: [
            {
              skillId: javaSkill.id,
              competency: CompetencyLevel.EXPERT,
              years: 5,
            },
            {
              skillId: angularSkill.id,
              competency: CompetencyLevel.BEGINNER,
              years: 1,
            },
          ],
        },
      });

      await createTestProject({
        status: ProjectStatus.COMPLETED,
        teamSize: 5,
        skills: {
          create: [
            {
              skillId: angularSkill.id,
              competency: CompetencyLevel.EXPERT,
              years: 5,
            },
          ],
        },
      });

      await createTestConsultant(ConsultantAvailability.AVAILABLE, [
        { skillId: javaSkill.id, competencyLevel: CompetencyLevel.EXPERT },
      ]);

      const result = await skillGapService.getPortfolioSkillGapAnalysis();

      expect(result.skills.length).toBe(2);

      const aggregatedJava = result.skills.find(
        (s) => s.skillId === javaSkill.id,
      );
      expect(aggregatedJava?.requiredCount).toBe(3);
      expect(aggregatedJava?.availableCount).toBe(1);
      expect(aggregatedJava?.severity).toBe('CRITICAL'); // 33% coverage

      const aggregatedAngular = result.skills.find(
        (s) => s.skillId === angularSkill.id,
      );
      expect(aggregatedAngular?.requiredCount).toBe(1);
      expect(aggregatedAngular?.availableCount).toBe(0);
      expect(aggregatedAngular?.severity).toBe('CRITICAL'); // 0% coverage

      expect(result.alerts.length).toBe(2);

      const alertA = result.alerts.find((a) => a.projectId === projectA.id);
      expect(alertA?.projectName).toBe('Backend Overhaul');
      expect(alertA?.severity).toBe('AT_RISK');
      expect(['AT_RISK', 'CRITICAL']).toContain(alertA?.severity);
    });
  });
});
