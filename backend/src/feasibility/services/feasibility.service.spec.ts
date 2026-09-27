import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CompetencyLevel } from '@prisma/client';
import { FeasibilityService } from './feasibility.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';
import { MatchScoringExecutorService } from '../../scoring/services/match-scoring-executor.service';
import { VariantGenerator } from './variant-generator';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';

describe('FeasibilityService', () => {
  let service: FeasibilityService;
  let prisma: any;
  let dataIngestion: { getProjectScoringContext: jest.Mock };
  let scoringExecutor: { scorePool: jest.Mock };
  let variantGenerator: { generate: jest.Mock };

  const baseSpec = (): FeasibilityCheckRequestDto =>
    ({
      startDate: '2026-10-01',
      endDate: '2026-12-01',
      teamSize: 2,
      allocation: 100,
      budget: 100000,
      city: 'Johannesburg',
      province: 'Gauteng',
      latitude: -26.2041,
      longitude: 28.0473,
      skills: [{ name: 'React', competency: 'INTERMEDIATE', years: 3, mandatory: true }],
    }) as FeasibilityCheckRequestDto;

  const mockConsultant = (id: string) => ({
    id,
    costToCompany: 50000,
    city: 'Johannesburg',
    province: 'Gauteng',
    latitude: -26.2,
    longitude: 28.0,
    skills: [{ competencyLevel: CompetencyLevel.INTERMEDIATE, skill: { name: 'React' } }],
    user: { fullName: 'Test Consultant', email: 'test@test.com' },
  });

  beforeEach(async () => {
    prisma = {
      consultant: { findMany: jest.fn().mockResolvedValue([mockConsultant('c1')]) },
      projectPlacement: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    dataIngestion = {
      getProjectScoringContext: jest.fn().mockResolvedValue({
        activeWeights: {}, activeFactors: new Set(), excludedFactors: new Set(),
      }),
    };
    scoringExecutor = {
      scorePool: jest.fn().mockResolvedValue({
        finalResults: [{ consultantId: 'c1', finalScore: 82 }],
        excludedCount: 0,
        errorCount: 0,
      }),
    };
    variantGenerator = { generate: jest.fn().mockReturnValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeasibilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: DataIngestionService, useValue: dataIngestion },
        { provide: MatchScoringExecutorService, useValue: scoringExecutor },
        { provide: VariantGenerator, useValue: variantGenerator },
      ],
    }).compile();

    service = module.get(FeasibilityService);
  });

  describe('checkFeasibility — base check', () => {
    it('returns the eligible count and top score from the scoring executor', async () => {
      const result = await service.checkFeasibility(baseSpec());

      expect(result.eligibleCount).toBe(1);
      expect(result.topScore).toBe(82);
    });

    it('returns 0 count and 0 score when no consultants are eligible', async () => {
      scoringExecutor.scorePool.mockResolvedValue({ finalResults: [], excludedCount: 1, errorCount: 0 });

      const result = await service.checkFeasibility(baseSpec());

      expect(result.eligibleCount).toBe(0);
      expect(result.topScore).toBe(0);
    });

    it('takes the maximum score, not the first result, when multiple consultants are eligible', async () => {
      scoringExecutor.scorePool.mockResolvedValue({
        finalResults: [
          { consultantId: 'c1', finalScore: 60 },
          { consultantId: 'c2', finalScore: 91 },
          { consultantId: 'c3', finalScore: 74 },
        ],
        excludedCount: 0,
        errorCount: 0,
      });

      const result = await service.checkFeasibility(baseSpec());

      expect(result.topScore).toBe(91);
      expect(result.eligibleCount).toBe(3);
    });

    it('fetches only active consultants', async () => {
      await service.checkFeasibility(baseSpec());

      expect(prisma.consultant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { status: 'ACTIVE' } },
        }),
      );
    });

    it('queries allocations excluding TERMINATED and CANCELLED placements', async () => {
      await service.checkFeasibility(baseSpec());

      expect(prisma.projectPlacement.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ['TERMINATED', 'CANCELLED'] },
          }),
        }),
      );
    });

    it('never creates, updates, or deletes any persisted record', async () => {
      await service.checkFeasibility(baseSpec());

      // Only read-side Prisma calls should ever appear on this service.
      expect(prisma.consultant.findMany).toHaveBeenCalled();
      expect(prisma.projectPlacement.groupBy).toHaveBeenCalled();
      expect(prisma.consultant.create).toBeUndefined();
      expect(prisma.projectPlacement.create).toBeUndefined();
    });

    it('rejects an invalid competency string with a clear error', async () => {
      const spec = baseSpec();
      spec.skills = [{ name: 'React', competency: 'GODLIKE', years: 3, mandatory: true }] as any;

      await expect(service.checkFeasibility(spec)).rejects.toThrow(BadRequestException);
    });

    it('generates a fresh, unique synthetic project id per call (no persisted id reuse)', async () => {
      await service.checkFeasibility(baseSpec());
      const [projectDtoArg] = scoringExecutor.scorePool.mock.calls[0];

      expect(projectDtoArg.projectId).toMatch(/^draft-/);
    });

    it('resolves scoring config via the synthetic draft id, which falls through to firm-wide defaults', async () => {
      await service.checkFeasibility(baseSpec());

      expect(dataIngestion.getProjectScoringContext).toHaveBeenCalledWith(
        expect.stringMatching(/^draft-/),
      );
    });
  });

  describe('checkFeasibility — with variants', () => {
    it('scores the base spec and every generated variant', async () => {
      variantGenerator.generate.mockReturnValue([
        { label: 'Budget +15%', spec: { ...baseSpec(), budget: 115000 } },
      ]);

      await service.checkFeasibility(baseSpec());

      expect(scoringExecutor.scorePool).toHaveBeenCalledTimes(2); // base + 1 variant
    });

    it('attaches the correct label to each variant result, in order', async () => {
      variantGenerator.generate.mockReturnValue([
        { label: 'Budget +15%', spec: { ...baseSpec(), budget: 115000 } },
        { label: 'Minimum competency −1 level', spec: baseSpec() },
      ]);
      scoringExecutor.scorePool
        .mockResolvedValueOnce({ finalResults: [{ consultantId: 'c1', finalScore: 80 }], excludedCount: 0, errorCount: 0 }) // base
        .mockResolvedValueOnce({ finalResults: [{ consultantId: 'c1', finalScore: 88 }], excludedCount: 0, errorCount: 0 }) // budget variant
        .mockResolvedValueOnce({ finalResults: [], excludedCount: 0, errorCount: 0 }); // competency variant

      const result = await service.checkFeasibility(baseSpec());

      expect(result.variants).toEqual([
        { label: 'Budget +15%', eligibleCount: 1, topScore: 88 },
        { label: 'Minimum competency −1 level', eligibleCount: 0, topScore: 0 },
      ]);
    });

    it('returns an empty variants array when the generator produces no applicable variants', async () => {
      variantGenerator.generate.mockReturnValue([]);

      const result = await service.checkFeasibility(baseSpec());

      expect(result.variants).toEqual([]);
      expect(scoringExecutor.scorePool).toHaveBeenCalledTimes(1); // base only
    });

    it('fetches the consultant pool only once regardless of variant count', async () => {
      variantGenerator.generate.mockReturnValue([
        { label: 'Variant A', spec: baseSpec() },
        { label: 'Variant B', spec: baseSpec() },
      ]);

      await service.checkFeasibility(baseSpec());

      expect(prisma.consultant.findMany).toHaveBeenCalledTimes(1);
    });
  });
});