import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScoringModule } from '../../scoring/scoring.module';
import { SimulationModule } from '../simulation.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MatchRunService } from '../../scoring/services/match-run.service';
import { SimulationService } from './simulation.service';
import { cleanDatabase } from '../../../prisma/prisma-test-utils';
import { ScoringFactorName, CompetencyLevel } from '@prisma/client';

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
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 6);

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

describe('SimulationService - Integration-e2e-tests', () => {
  let moduleRef: TestingModule;
  let matchRunService: MatchRunService;
  let simulationService: SimulationService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ScoringModule, SimulationModule, PrismaModule],
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

      const testUUID = '00000000-0000-0000-0000-000000000000';

      await expect(
        simulationService.simulate(consultant.id, testUUID, {
          skillName: 'Java',
          competencyLevel: CompetencyLevel.EXPERT,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('AC #4 — simulation determinism against a real match run', () => {
    it('produces a baselineScore identical to a real match run score, for the same consultant/project, when the candidate skill is one the consultant already has', async () => {
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
});