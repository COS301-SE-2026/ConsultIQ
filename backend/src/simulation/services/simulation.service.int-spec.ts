import { Test, TestingModule } from '@nestjs/testing';
import { Global, Module, NotFoundException } from '@nestjs/common';
import { ScoringModule } from '../../scoring/scoring.module';
import { SimulationModule } from '../simulation.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MatchRunService } from '../../scoring/services/match-run.service';
import { SimulationService } from './simulation.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import {
  ScoringFactorName,
  CompetencyLevel,
  ProjectStatus,
} from '@prisma/client';
import { ThrottlerModule } from '@nestjs/throttler';

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
  data: {
    email: string;
    costToCompany: number;
    city: string;
    province: string;
    skillId: string;
    competencyLevel: CompetencyLevel;
    yearsExperience: number;
    confidenceLevel: number;
  },
) {
  const user = await prisma.user.create({
    data: {
      email: data.email,
      fullName: 'IQ Consultant',
      status: 'ACTIVE',
      role: 'CONSULTANT',
    },
  });

  return prisma.consultant.create({
    data: {
      userId: user.id,
      costToCompany: data.costToCompany,
      addressLine1: '123 Main street',
      city: data.city,
      province: data.province,
      skills: {
        create: [
          {
            skillId: data.skillId,
            competencyLevel: data.competencyLevel,
            yearsExperience: data.yearsExperience,
            confidenceLevel: data.confidenceLevel,
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
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 6);

  const projectIdentity = {
    status: 'OPEN',
    projectName: 'Consultants Project',
    clientName: 'BBD',
    addressLine1: '122 Business Street',
    province: 'Gauteng',
    city: 'Pretoria',
    postalCode: '1234',
  };

  return prisma.project.create({
    data: {
      ...projectIdentity,
      teamSize,
      budget,
      startDate,
      endDate,
      allocation: 100,
      ...extraData,
      skills: {
        create: [
          {
            skillId,
            competency: CompetencyLevel.EXPERT,
            years: 5,
            mandatory: true,
          },
        ],
      },
      ...(overrides.length > 0 && {
        scoringOverrides: {
          create: overrides.map(({ factorName, overrideWeight }) => ({
            factorName,
            overrideWeight,
          })),
        },
      }),
    },
  });
}

async function createTestConsultant(prisma: PrismaService) {
  const backendSkill = await createBackendSkill(prisma);

  const consultant = await createConsultant(prisma, {
    email: 'consultant@consultiq.com',
    costToCompany: 400,
    city: 'Pretoria',
    province: 'State',
    skillId: backendSkill.id,
    competencyLevel: CompetencyLevel.EXPERT,
    yearsExperience: 5,
    confidenceLevel: 90,
  });

  return { backendSkill, consultant };
}

async function createProjectRequiring(
  prisma: PrismaService,
  skills: { skillId: string; competency: CompetencyLevel }[],
  status: ProjectStatus = ProjectStatus.OPEN,
) {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 6);

  const project = await prisma.project.create({
    data: {
      status,
      projectName: 'Pipeline Project',
      clientName: 'BBD',
      addressLine1: '122 Business Street',
      province: 'Gauteng',
      city: 'Pretoria',
      postalCode: '1234',
      teamSize: 5,
      budget: 600,
      startDate,
      endDate,
      allocation: 100,
      skills: {
        create: skills.map((s) => ({
          skillId: s.skillId,
          competency: s.competency,
          years: 3,
          mandatory: true,
        })),
      },
    },
  });

  await prisma.projectScoringOverride.create({
    data: {
      projectId: project.id,
      factorName: ScoringFactorName.SKILL_ALIGNMENT,
      overrideWeight: 1.0,
    },
  });

  return project;
}

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
class FakeRedisModule {}

describe('SimulationService - Integration-e2e-tests', () => {
  let moduleRef: TestingModule;
  let matchRunService: MatchRunService;
  let simulationService: SimulationService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
        FakeRedisModule,
        ScoringModule,
        SimulationModule,
        PrismaModule,
      ],
    }).compile();

    matchRunService = moduleRef.get<MatchRunService>(MatchRunService);
    simulationService = moduleRef.get<SimulationService>(SimulationService);
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

  describe('simulate function validation', () => {
    it('throws NotFoundException when the consultant does not exist', async () => {
      const backendSkill = await createBackendSkill(prisma);
      const project = await createProject(prisma, 600, 5, backendSkill.id, []);
      const testUUID = '00000000-0000-0000-0000-000000000000';

      await expect(
        simulationService.simulate(testUUID, project.id, {
          skillName: 'Java',
          competencyLevel: CompetencyLevel.EXPERT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the project does not exist', async () => {
      const { consultant } = await createTestConsultant(prisma);

      const testUUID = '00000000-0000-0000-0000-000000000000';

      await expect(
        simulationService.simulate(consultant.id, testUUID, {
          skillName: 'Java',
          competencyLevel: CompetencyLevel.EXPERT,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('simulation determinism against a real match run', () => {
    it('produces a baselineScore identical to a real match run score, for the same consultant/project, when the candidate skill is one the consultant already has', async () => {
      const adminUser = await createAdmin(prisma);
      const { backendSkill, consultant } = await createTestConsultant(prisma);

      const project = await createProject(prisma, 600, 5, backendSkill.id, [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, overrideWeight: 0.4 },
        { factorName: ScoringFactorName.COST_TO_COMPANY, overrideWeight: 0.6 },
      ]);

      const { results } = await matchRunService.executeMatchRun(
        project.id,
        adminUser.id,
      );

      expect(results.length).toBe(1);
      const realFinalScore = results[0].finalScore;

      const simulation = await simulationService.simulate(
        consultant.id,
        project.id,
        {
          skillName: 'Java',
          competencyLevel: CompetencyLevel.EXPERT,
        },
      );

      expect(simulation.baselineScore).toBe(realFinalScore);
    });

    it('returns an identical result when run twice with unchanged inputs (determinism)', async () => {
      const { backendSkill, consultant } = await createTestConsultant(prisma);

      const project = await createProject(prisma, 600, 5, backendSkill.id, [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, overrideWeight: 0.4 },
        { factorName: ScoringFactorName.COST_TO_COMPANY, overrideWeight: 0.6 },
      ]);

      const candidateSkill = {
        skillName: 'AWS',
        competencyLevel: CompetencyLevel.BEGINNER,
      };

      const first = await simulationService.simulate(
        consultant.id,
        project.id,
        candidateSkill,
      );

      const second = await simulationService.simulate(
        consultant.id,
        project.id,
        candidateSkill,
      );

      expect(second).toEqual(first);
    });

    it('does not write anything to the consultant record', async () => {
      const { backendSkill, consultant } = await createTestConsultant(prisma);

      const project = await createProject(prisma, 600, 5, backendSkill.id, []);

      await simulationService.simulate(consultant.id, project.id, {
        skillName: 'AWS',
        competencyLevel: CompetencyLevel.EXPERT,
      });

      const skillsAfter = await prisma.consultantSkill.findMany({
        where: { consultantId: consultant.id },
      });

      expect(skillsAfter.length).toBe(1);
      expect(skillsAfter[0].skillId).toBe(backendSkill.id);
    });

    it('produces a higher projectedScore than baselineScore when the injected skill is genuinely mandatory and missing', async () => {
      const backendSkill = await createBackendSkill(prisma);
      const awsSkill = await prisma.skill.create({
        data: { name: 'AWS', category: 'Cloud' },
      });

      const consultant = await createConsultant(prisma, {
        email: 'consultant@consultiq.com',
        costToCompany: 400,
        city: 'Pretoria',
        province: 'State',
        skillId: backendSkill.id,
        competencyLevel: CompetencyLevel.EXPERT,
        yearsExperience: 5,
        confidenceLevel: 90,
      });

      // -----Project requires BOTH Java and AWS as mandatory skills---------
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + 6);

      const project = await prisma.project.create({
        data: {
          status: 'OPEN',
          projectName: 'Multi-skill project',
          clientName: 'BBD',
          addressLine1: '122 Business Street',
          province: 'Gauteng',
          city: 'Pretoria',
          postalCode: '1234',
          teamSize: 5,
          budget: 600,
          startDate,
          endDate,
          allocation: 100,
          skills: {
            create: [
              {
                skillId: backendSkill.id,
                competency: CompetencyLevel.EXPERT,
                years: 5,
                mandatory: true,
              },
              {
                skillId: awsSkill.id,
                competency: CompetencyLevel.EXPERT,
                years: 3,
                mandatory: true,
              },
            ],
          },
        },
      });

      await prisma.projectScoringOverride.createMany({
        data: [
          {
            projectId: project.id,
            factorName: ScoringFactorName.SKILL_ALIGNMENT,
            overrideWeight: 1.0,
          },
        ],
      });

      const simulation = await simulationService.simulate(
        consultant.id,
        project.id,
        { skillName: 'AWS', competencyLevel: CompetencyLevel.EXPERT },
      );

      expect(simulation.projectedScore).toBeGreaterThan(
        simulation.baselineScore,
      );

      expect(simulation.scoreDelta).toBeGreaterThan(0);
    });
  });

  describe('getSkillRecommendationsForUser', () => {
    const snapshotCounts = async () => ({
      user: await prisma.user.count(),
      consultant: await prisma.consultant.count(),
      consultantSkill: await prisma.consultantSkill.count(),
      skill: await prisma.skill.count(),
      project: await prisma.project.count(),
      projectSkill: await prisma.projectSkill.count(),
      projectScoringOverride: await prisma.projectScoringOverride.count(),
      projectPlacement: await prisma.projectPlacement.count(),
      matchRun: await prisma.matchRun.count(),
      matchRunResult: await prisma.matchRunResult.count(),
    });

    async function seedMissingAwsScenario() {
      const { backendSkill, consultant } = await createTestConsultant(prisma);
      const awsSkill = await prisma.skill.create({
        data: { name: 'AWS', category: 'Cloud' },
      });
      const project = await createProjectRequiring(prisma, [
        { skillId: backendSkill.id, competency: CompetencyLevel.EXPERT },
        { skillId: awsSkill.id, competency: CompetencyLevel.EXPERT },
      ]);
      return { backendSkill, awsSkill, consultant, project };
    }

    it('recommends a mandatory pipeline skill the consultant lacks, with a positive score gain', async () => {
      const { consultant } = await seedMissingAwsScenario();

      const { recommendations } =
        await simulationService.getSkillRecommendationsForUser(
          consultant.userId,
        );

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toMatchObject({
        skillName: 'AWS',
        projectsTested: 1,
      });
      expect(recommendations[0].totalScoreDelta).toBeGreaterThan(0);
    });

    it('returns no recommendations when the consultant already has every mandatory pipeline skill', async () => {
      const { backendSkill, consultant } = await createTestConsultant(prisma);
      await createProjectRequiring(prisma, [
        { skillId: backendSkill.id, competency: CompetencyLevel.EXPERT },
      ]);

      const result = await simulationService.getSkillRecommendationsForUser(
        consultant.userId,
      );

      expect(result).toEqual({ recommendations: [] });
    });

    it('ignores projects that are not in the active pipeline (COMPLETED, CLOSED, ARCHIVED)', async () => {
      const { backendSkill, consultant } = await createTestConsultant(prisma);
      const awsSkill = await prisma.skill.create({
        data: { name: 'AWS', category: 'Cloud' },
      });

      for (const status of [
        ProjectStatus.COMPLETED,
        ProjectStatus.CLOSED,
        ProjectStatus.ARCHIVED,
      ]) {
        await createProjectRequiring(
          prisma,
          [
            { skillId: backendSkill.id, competency: CompetencyLevel.EXPERT },
            { skillId: awsSkill.id, competency: CompetencyLevel.EXPERT },
          ],
          status,
        );
      }

      const result = await simulationService.getSkillRecommendationsForUser(
        consultant.userId,
      );

      expect(result).toEqual({ recommendations: [] });
    });

    it('throws NotFoundException for a user with no consultant profile, and writes nothing', async () => {
      const admin = await createAdmin(prisma);
      const before = await snapshotCounts();

      await expect(
        simulationService.getSkillRecommendationsForUser(admin.id),
      ).rejects.toThrow(NotFoundException);

      expect(await snapshotCounts()).toEqual(before);
    });

    it('creates and modifies no rows across repeated runs against a real pipeline', async () => {
      const { consultant } = await seedMissingAwsScenario();
      const before = await snapshotCounts();

      await simulationService.getSkillRecommendationsForUser(consultant.userId);
      await simulationService.getSkillRecommendationsForUser(consultant.userId);
      await simulationService.getSkillRecommendationsForUser(consultant.userId);

      expect(await snapshotCounts()).toEqual(before);

      const skillsAfter = await prisma.consultantSkill.findMany({
        where: { consultantId: consultant.id },
      });
      expect(skillsAfter).toHaveLength(1);
    });

    it('gives each consultant only their own recommendations, resolved from the user id', async () => {
      const {
        backendSkill,
        awsSkill,
        consultant: lacksAws,
      } = await seedMissingAwsScenario();

      const hasAws = await createConsultant(prisma, {
        email: 'has-aws@consultiq.com',
        costToCompany: 400,
        city: 'Pretoria',
        province: 'State',
        skillId: backendSkill.id,
        competencyLevel: CompetencyLevel.EXPERT,
        yearsExperience: 5,
        confidenceLevel: 90,
      });
      await prisma.consultantSkill.create({
        data: {
          consultantId: hasAws.id,
          skillId: awsSkill.id,
          competencyLevel: CompetencyLevel.EXPERT,
          yearsExperience: 3,
          confidenceLevel: 90,
        },
      });

      const forLacksAws =
        await simulationService.getSkillRecommendationsForUser(lacksAws.userId);
      const forHasAws = await simulationService.getSkillRecommendationsForUser(
        hasAws.userId,
      );

      expect(forLacksAws.recommendations.map((r) => r.skillName)).toEqual([
        'AWS',
      ]);
      expect(forHasAws.recommendations).toEqual([]);
    });

    it('exposes only aggregate fields, with no project identifiers', async () => {
      const { consultant, project } = await seedMissingAwsScenario();

      const result = await simulationService.getSkillRecommendationsForUser(
        consultant.userId,
      );

      expect(Object.keys(result.recommendations[0]).sort()).toEqual([
        'newlyEligibleProjectCount',
        'projectsTested',
        'skillName',
        'totalScoreDelta',
      ]);
      expect(JSON.stringify(result)).not.toContain(project.id);
    });
  });
});
