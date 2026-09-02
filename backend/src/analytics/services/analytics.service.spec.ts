import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  consultant: { count: jest.fn() },
  skill: { findMany: jest.fn() },
  consultantSkill: { findMany: jest.fn() },
  projectPlacement: { findMany: jest.fn() },
  cvFile: { findMany: jest.fn() },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  // -------------------------  Skill Distribution  -----------------------------------------

  describe('getSkillDistribution', () => {
    it('return an empty array when there are not skill categories', async () => {
      mockPrismaService.consultant.count.mockResolvedValue(10);
      mockPrismaService.skill.findMany.mockResolvedValue([]);

      const result = await service.getSkillDistribution();
      expect(result).toEqual([]);
    });

    it('returns one entry per distinct skill category', async () => {
      mockPrismaService.consultant.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(8);

      mockPrismaService.skill.findMany.mockResolvedValueOnce([
        { category: 'Cloud' },
        { category: 'Data & Analytics' },
      ]);

      const result = await service.getSkillDistribution();

      expect(result).toEqual([
        { category: 'Cloud', consultantCount: 5, percentageOfPool: 25 },
        { category: 'Data & Analytics', consultantCount: 8, percentageOfPool: 40 },
      ]);
    });

    it('queries distinct categories from the skill table', async () => {
      mockPrismaService.consultant.count.mockResolvedValue(0);
      mockPrismaService.skill.findMany.mockResolvedValue([]);

      await service.getSkillDistribution();

      expect(mockPrismaService.skill.findMany).toHaveBeenCalledWith({
        distinct: ['category'],
        select: { category: true },
      });
    });

    it('counts consultants who have at least one skill in the category, via the skill relation', async () => {
      mockPrismaService.consultant.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);
      mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'Cloud' }]);

      await service.getSkillDistribution();

      expect(mockPrismaService.consultant.count).toHaveBeenNthCalledWith(2, {
        where: {
          skills: {
            some: {
              skill: { category: 'Cloud' },
            },
          },
        },
      });
    });

    it('does not double-count a consultant with two skill in the same category (Prisma `some` naturally dedupes)', async () => {
      mockPrismaService.consultant.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(1);
      mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'Cloud' }]);

      const result = await service.getSkillDistribution();

      expect(result[0].consultantCount).toBe(1);
    });

    it('rounds percentageOfPool to the nearest whole number', async () => {
      mockPrismaService.consultant.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);
      mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'UX/UI Design' }]);

      const result = await service.getSkillDistribution();

      expect(result[0].percentageOfPool).toBe(33);
    });

    it('returns 0% for every category when the consultant pool is empty', async () => {
      mockPrismaService.consultant.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'Cloud' }]);

      const result = await service.getSkillDistribution();
      expect(result[0]).toEqual({
        category: 'Cloud',
        consultantCount: 0,
        percentageOfPool: 0,
      });
    });
  });

    // ----------------------- Placements YTD ------------------------------

  describe('getPlacementYTD', () => {
    it('returns the count of distinct consultants placed since the start of this year', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([
        { consultantId: 'consultant-1' },
        { consultantId: 'consultant-2' },
      ]);

      const result = await service.getPlacementYTD();
      expect(result).toEqual({ count: 2 });
    });

    it('returns 0 when no placements have occurred this year', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);

      const result = await service.getPlacementYTD();
      expect(result).toEqual({ count: 0 });
    });

    it('queries with distinct consultantId and a createdAt filter from Jan 1st of the current year', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);

      await service.getPlacementYTD();

      const callArg = mockPrismaService.projectPlacement.findMany.mock.calls[0][0];
      const expectedStartOfYear = new Date(new Date().getFullYear(), 0, 1);

      expect(callArg.distinct).toEqual(['consultantId']);
      expect(callArg.select).toEqual({ consultantId: true });
      expect(callArg.where.createdAt.gte).toEqual(expectedStartOfYear);
    });
  });


  // Utilisation / Bench / CV Parsing stats


  describe('getOverallUtilisation', () => {
    it('computes the correct percent, rounded to one decimal', async () => {
      mockPrismaService.consultant.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);

      const result = await service.getOverallUtilisation();

      expect(mockPrismaService.consultant.count).toHaveBeenNthCalledWith(2, { where: { capacity: { lt: 100 } } });
      expect(result).toEqual({ totalConsultants: 10, utilisedConsultants: 3, utilisationPercent: 30.0 });
    });

    it('returns 0% rather than dividing by zero when there are no consultants', async () => {
      mockPrismaService.consultant.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await service.getOverallUtilisation();

      expect(result.utilisationPercent).toBe(0);
    });

    it('rounds a non-terminating percentage to one decimal place', async () => {
      mockPrismaService.consultant.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

      const result = await service.getOverallUtilisation();

      expect(result.utilisationPercent).toBe(33.3);
    });
  });

  describe('getUtilisationBySkillCategory', () => {
    it('groups by category and computes utilisation per category', async () => {
      mockPrismaService.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 50 } },
        { consultantId: 'c2', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 100 } },
        { consultantId: 'c3', skill: { category: 'Backend Development' }, consultant: { capacity: 70 } },
      ]);

      const result = await service.getUtilisationBySkillCategory();

      expect(result).toEqual(
        expect.arrayContaining([
          { category: 'Cloud & DevOps', totalConsultants: 2, utilisedConsultants: 1, utilisationPercent: 50.0 },
          { category: 'Backend Development', totalConsultants: 1, utilisedConsultants: 1, utilisationPercent: 100.0 },
        ]),
      );
    });

    it('does not double-count a consultant with two skills in the same category', async () => {
      mockPrismaService.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 40 } },
        { consultantId: 'c1', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 40 } },
      ]);

      const result = await service.getUtilisationBySkillCategory();

      expect(result).toEqual([
        { category: 'Cloud & DevOps', totalConsultants: 1, utilisedConsultants: 1, utilisationPercent: 100.0 },
      ]);
    });

    it('counts a consultant fully in every category they hold a skill in (intentional double attribution)', async () => {
      mockPrismaService.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 60 } },
        { consultantId: 'c1', skill: { category: 'Backend Development' }, consultant: { capacity: 60 } },
      ]);

      const result = await service.getUtilisationBySkillCategory();

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.utilisedConsultants === 1)).toBe(true);
    });

    it('returns an empty array when no ConsultantSkill rows exist', async () => {
      mockPrismaService.consultantSkill.findMany.mockResolvedValue([]);
      const result = await service.getUtilisationBySkillCategory();
      expect(result).toEqual([]);
    });
  });

  describe('getOverallBenchCount', () => {
    it('counts only consultants at exactly capacity 100', async () => {
      mockPrismaService.consultant.count.mockResolvedValue(7);

      const result = await service.getOverallBenchCount();

      expect(mockPrismaService.consultant.count).toHaveBeenCalledWith({ where: { capacity: 100 } });
      expect(result).toEqual({ count: 7 });
    });
  });

  describe('getBenchBySkillCategory', () => {
    it('counts only capacity === 100 within each category, excluding partial allocation', async () => {
      mockPrismaService.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Databases' }, consultant: { capacity: 100 } },
        { consultantId: 'c2', skill: { category: 'Databases' }, consultant: { capacity: 80 } },
      ]);

      const result = await service.getBenchBySkillCategory();

      expect(result).toEqual([{ category: 'Databases', benchCount: 1 }]);
    });

    it('does not double-count a consultant with two skills in the same category', async () => {
      mockPrismaService.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Frontend Development' }, consultant: { capacity: 100 } },
        { consultantId: 'c1', skill: { category: 'Frontend Development' }, consultant: { capacity: 100 } },
      ]);

      const result = await service.getBenchBySkillCategory();

      expect(result).toEqual([{ category: 'Frontend Development', benchCount: 1 }]);
    });
  });

  describe('getPlacementsBySkillCategory', () => {
    it('filters to placements starting this year, from the 1st of January', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);

      await service.getPlacementsBySkillCategory();

      const callArg = mockPrismaService.projectPlacement.findMany.mock.calls[0][0];
      const gte: Date = callArg.where.startDate.gte;
      const now = new Date();
      expect(gte.getFullYear()).toBe(now.getFullYear());
      expect(gte.getMonth()).toBe(0);
      expect(gte.getDate()).toBe(1);
    });

    it('counts a placement toward a category when a mandatory skill in that category is required', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([
        { project: { skills: [{ skill: { category: 'Cloud & DevOps' } }] } },
      ]);

      const result = await service.getPlacementsBySkillCategory();

      expect(result).toEqual([{ category: 'Cloud & DevOps', placementCount: 1 }]);
    });

    it('does not count a placement toward a category from a non-mandatory skill', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);

      await service.getPlacementsBySkillCategory();

      const callArg = mockPrismaService.projectPlacement.findMany.mock.calls[0][0];
      expect(callArg.select.project.select.skills.where).toEqual({ mandatory: true });
    });

    it('counts one placement only once per category, even with two mandatory skills in that category', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([
        {
          project: {
            skills: [
              { skill: { category: 'Cloud & DevOps' } },
              { skill: { category: 'Cloud & DevOps' } },
            ],
          },
        },
      ]);

      const result = await service.getPlacementsBySkillCategory();

      expect(result).toEqual([{ category: 'Cloud & DevOps', placementCount: 1 }]);
    });

    it('counts one placement toward every distinct category its mandatory skills span', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([
        {
          project: {
            skills: [
              { skill: { category: 'Cloud & DevOps' } },
              { skill: { category: 'Backend Development' } },
            ],
          },
        },
      ]);

      const result = await service.getPlacementsBySkillCategory();

      expect(result).toEqual(
        expect.arrayContaining([
          { category: 'Cloud & DevOps', placementCount: 1 },
          { category: 'Backend Development', placementCount: 1 },
        ]),
      );
    });

    it('returns an empty array when no placements exist this year', async () => {
      mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);
      const result = await service.getPlacementsBySkillCategory();
      expect(result).toEqual([]);
    });
  });

  describe('getCvParsingStats', () => {
    const successRow = (overall: number) => ({
      parsingMethod: 'AI_ASSISTED',
      extractionStatus: 'REVIEW_REQUIRED',
      parsedData: { data: { confidenceScores: { overall } } },
    });
    const failedRow = () => ({
      parsingMethod: 'RULE_BASED',
      extractionStatus: 'FAILED',
      parsedData: { error: 'Template has no name filled in.' },
    });

    it('only queries CvFile rows in a terminal status', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([]);

      await service.getCvParsingStats();

      expect(mockPrismaService.cvFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { extractionStatus: { in: ['REVIEW_REQUIRED', 'FAILED'] } } }),
      );
    });

    it('splits counts correctly by parsing method and outcome', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([
        successRow(0.9),
        { ...successRow(0.8), parsingMethod: 'RULE_BASED' },
        failedRow(),
      ]);

      const result = await service.getCvParsingStats();

      expect(result.totalProcessed).toBe(3);
      expect(result.aiAssistedCount).toBe(1);
      expect(result.ruleBasedCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
    });

    it('computes average confidence from successful rows only, ignoring failed rows entirely', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([successRow(1.0), successRow(0.5), failedRow()]);

      const result = await service.getCvParsingStats();

      expect(result.averageConfidence).toBe(0.75);
    });

    it('returns 0 average confidence when there are no successful rows to average', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([failedRow(), failedRow()]);

      const result = await service.getCvParsingStats();

      expect(result.averageConfidence).toBe(0);
    });

    it('silently excludes a successful row with a malformed or missing confidenceScores shape, rather than crashing or corrupting the average', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([
        successRow(1.0),
        { parsingMethod: 'AI_ASSISTED', extractionStatus: 'REVIEW_REQUIRED', parsedData: { data: {} } },
        { parsingMethod: 'AI_ASSISTED', extractionStatus: 'REVIEW_REQUIRED', parsedData: null },
      ]);

      const result = await service.getCvParsingStats();

      expect(result.successCount).toBe(3);
      expect(result.averageConfidence).toBe(1.0);
    });
  });
});
