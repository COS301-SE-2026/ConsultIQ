import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  consultant: { count: jest.fn() },
  consultantSkill: { findMany: jest.fn() },
  projectPlacement: { findMany: jest.fn() },
  cvFile: { findMany: jest.fn() },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(AnalyticsService);
    jest.clearAllMocks();
  });

  describe('getOverallUtilisation', () => {
    it('computes the correct percent, rounded to one decimal', async () => {
      mockPrisma.consultant.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // utilised (capacity < 100)

      const result = await service.getOverallUtilisation();

      expect(mockPrisma.consultant.count).toHaveBeenNthCalledWith(2, { where: { capacity: { lt: 100 } } });
      expect(result).toEqual({ totalConsultants: 10, utilisedConsultants: 3, utilisationPercent: 30.0 });
    });

    it('returns 0% rather than dividing by zero when there are no consultants', async () => {
      mockPrisma.consultant.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await service.getOverallUtilisation();

      expect(result.utilisationPercent).toBe(0);
    });

    it('rounds a non-terminating percentage to one decimal place', async () => {
      mockPrisma.consultant.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1); // 33.333...%

      const result = await service.getOverallUtilisation();

      expect(result.utilisationPercent).toBe(33.3);
    });
  });

  describe('getUtilisationBySkillCategory', () => {
    it('groups by category and computes utilisation per category', async () => {
      mockPrisma.consultantSkill.findMany.mockResolvedValue([
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
      mockPrisma.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 40 } },
        { consultantId: 'c1', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 40 } }, // AWS + Docker, same consultant
      ]);

      const result = await service.getUtilisationBySkillCategory();

      expect(result).toEqual([
        { category: 'Cloud & DevOps', totalConsultants: 1, utilisedConsultants: 1, utilisationPercent: 100.0 },
      ]);
    });

    it('counts a consultant fully in every category they hold a skill in (intentional double attribution)', async () => {
      mockPrisma.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Cloud & DevOps' }, consultant: { capacity: 60 } },
        { consultantId: 'c1', skill: { category: 'Backend Development' }, consultant: { capacity: 60 } },
      ]);

      const result = await service.getUtilisationBySkillCategory();

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.utilisedConsultants === 1)).toBe(true);
    });

    it('returns an empty array when no ConsultantSkill rows exist', async () => {
      mockPrisma.consultantSkill.findMany.mockResolvedValue([]);
      const result = await service.getUtilisationBySkillCategory();
      expect(result).toEqual([]);
    });
  });

  describe('getOverallBenchCount', () => {
    it('counts only consultants at exactly capacity 100', async () => {
      mockPrisma.consultant.count.mockResolvedValue(7);

      const result = await service.getOverallBenchCount();

      expect(mockPrisma.consultant.count).toHaveBeenCalledWith({ where: { capacity: 100 } });
      expect(result).toEqual({ count: 7 });
    });
  });

  describe('getBenchBySkillCategory', () => {
    it('counts only capacity === 100 within each category, excluding partial allocation', async () => {
      mockPrisma.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Databases' }, consultant: { capacity: 100 } },
        { consultantId: 'c2', skill: { category: 'Databases' }, consultant: { capacity: 80 } }, // partially allocated, not bench
      ]);

      const result = await service.getBenchBySkillCategory();

      expect(result).toEqual([{ category: 'Databases', benchCount: 1 }]);
    });

    it('does not double-count a consultant with two skills in the same category', async () => {
      mockPrisma.consultantSkill.findMany.mockResolvedValue([
        { consultantId: 'c1', skill: { category: 'Frontend Development' }, consultant: { capacity: 100 } },
        { consultantId: 'c1', skill: { category: 'Frontend Development' }, consultant: { capacity: 100 } },
      ]);

      const result = await service.getBenchBySkillCategory();

      expect(result).toEqual([{ category: 'Frontend Development', benchCount: 1 }]);
    });
  });

  describe('getPlacementsBySkillCategory', () => {
    it('filters to placements starting this year, from the 1st of January', async () => {
      mockPrisma.projectPlacement.findMany.mockResolvedValue([]);

      await service.getPlacementsBySkillCategory();

      const callArg = mockPrisma.projectPlacement.findMany.mock.calls[0][0];
      const gte: Date = callArg.where.startDate.gte;
      const now = new Date();
      expect(gte.getFullYear()).toBe(now.getFullYear());
      expect(gte.getMonth()).toBe(0);
      expect(gte.getDate()).toBe(1);
    });

    it('counts a placement toward a category when a mandatory skill in that category is required', async () => {
      mockPrisma.projectPlacement.findMany.mockResolvedValue([
        { project: { skills: [{ skill: { category: 'Cloud & DevOps' } }] } },
      ]);

      const result = await service.getPlacementsBySkillCategory();

      expect(result).toEqual([{ category: 'Cloud & DevOps', placementCount: 1 }]);
    });

    it('does not count a placement toward a category from a non-mandatory skill', async () => {

      mockPrisma.projectPlacement.findMany.mockResolvedValue([]);

      await service.getPlacementsBySkillCategory();

      const callArg = mockPrisma.projectPlacement.findMany.mock.calls[0][0];
      expect(callArg.select.project.select.skills.where).toEqual({ mandatory: true });
    });

    it('counts one placement only once per category, even with two mandatory skills in that category', async () => {
      mockPrisma.projectPlacement.findMany.mockResolvedValue([
        {
          project: {
            skills: [
              { skill: { category: 'Cloud & DevOps' } }, // e.g. AWS
              { skill: { category: 'Cloud & DevOps' } }, // e.g. Docker
            ],
          },
        },
      ]);

      const result = await service.getPlacementsBySkillCategory();

      expect(result).toEqual([{ category: 'Cloud & DevOps', placementCount: 1 }]);
    });

    it('counts one placement toward every distinct category its mandatory skills span', async () => {
      mockPrisma.projectPlacement.findMany.mockResolvedValue([
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
      mockPrisma.projectPlacement.findMany.mockResolvedValue([]);
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
      mockPrisma.cvFile.findMany.mockResolvedValue([]);

      await service.getCvParsingStats();

      expect(mockPrisma.cvFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { extractionStatus: { in: ['REVIEW_REQUIRED', 'FAILED'] } } }),
      );
    });

    it('splits counts correctly by parsing method and outcome', async () => {
      mockPrisma.cvFile.findMany.mockResolvedValue([
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
      mockPrisma.cvFile.findMany.mockResolvedValue([successRow(1.0), successRow(0.5), failedRow()]);

      const result = await service.getCvParsingStats();

      expect(result.averageConfidence).toBe(0.75);
    });

    it('returns 0 average confidence when there are no successful rows to average', async () => {
      mockPrisma.cvFile.findMany.mockResolvedValue([failedRow(), failedRow()]);

      const result = await service.getCvParsingStats();

      expect(result.averageConfidence).toBe(0);
    });

    it('silently excludes a successful row with a malformed or missing confidenceScores shape, rather than crashing or corrupting the average', async () => {
      mockPrisma.cvFile.findMany.mockResolvedValue([
        successRow(1.0),
        { parsingMethod: 'AI_ASSISTED', extractionStatus: 'REVIEW_REQUIRED', parsedData: { data: {} } }, // missing confidenceScores
        { parsingMethod: 'AI_ASSISTED', extractionStatus: 'REVIEW_REQUIRED', parsedData: null }, // malformed entirely
      ]);

      const result = await service.getCvParsingStats();

      expect(result.successCount).toBe(3); // still counted as successful outcomes
      expect(result.averageConfidence).toBe(1.0); // but only the one valid score entered the average
    });
  });
});