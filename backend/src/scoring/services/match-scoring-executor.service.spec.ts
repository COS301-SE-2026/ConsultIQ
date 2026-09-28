import { Test, TestingModule } from '@nestjs/testing';
import { MatchScoringExecutorService } from './match-scoring-executor.service';
import { ScoringPipelineService } from './scoring-pipeline.service';
import { MatchRunAggregationService } from './match-run-aggregation.service';

describe('MatchScoringExecutorService', () => {
  let service: MatchScoringExecutorService;
  let scoringPipeline: { scoreConsultant: jest.Mock };
  let aggregation: { buildResults: jest.Mock };

  const projectDto = { projectId: 'draft-1' } as any;
  const scoringContext = { activeWeights: {}, activeFactors: new Set(), excludedFactors: new Set() } as any;
  const allocations = new Map<string, number>();

  const poolEntry = (id: string) => ({
    consultantId: id,
    consultantName: `Consultant ${id}`,
    consultantEmail: `${id}@test.com`,
    isPlaced: false,
    consultant: { consultantId: id, skills: [], costToCompany: 0 } as any,
  });

  beforeEach(async () => {
    scoringPipeline = { scoreConsultant: jest.fn() };
    aggregation = { buildResults: jest.fn().mockReturnValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchScoringExecutorService,
        { provide: ScoringPipelineService, useValue: scoringPipeline },
        { provide: MatchRunAggregationService, useValue: aggregation },
      ],
    }).compile();

    service = module.get(MatchScoringExecutorService);
  });

  it('scores every consultant in the pool', async () => {
    scoringPipeline.scoreConsultant.mockResolvedValue({ excluded: false, factorScores: {}, redistributedWeights: {}, factorDetails: {} });
    const pool = [poolEntry('c1'), poolEntry('c2'), poolEntry('c3')];

    await service.scorePool(projectDto, pool, scoringContext, allocations);

    expect(scoringPipeline.scoreConsultant).toHaveBeenCalledTimes(3);
  });

  it('passes aggregated scored inputs to MatchRunAggregationService', async () => {
    scoringPipeline.scoreConsultant.mockResolvedValue({ excluded: false, factorScores: {}, redistributedWeights: {}, factorDetails: {} });
    const pool = [poolEntry('c1')];

    await service.scorePool(projectDto, pool, scoringContext, allocations);

    expect(aggregation.buildResults).toHaveBeenCalledWith([
      expect.objectContaining({ consultantId: 'c1' }),
    ]);
  });

  it('counts consultants excluded by hard exclusion rules', async () => {
    scoringPipeline.scoreConsultant
      .mockResolvedValueOnce({ excluded: true })
      .mockResolvedValueOnce({ excluded: false, factorScores: {}, redistributedWeights: {}, factorDetails: {} });
    const pool = [poolEntry('c1'), poolEntry('c2')];

    const result = await service.scorePool(projectDto, pool, scoringContext, allocations);

    expect(result.excludedCount).toBe(1);
    expect(result.errorCount).toBe(0);
  });

  it('does not let one consultant scoring failure abort the whole pool', async () => {
    scoringPipeline.scoreConsultant
      .mockRejectedValueOnce(new Error('scoring blew up'))
      .mockResolvedValueOnce({ excluded: false, factorScores: {}, redistributedWeights: {}, factorDetails: {} });
    const pool = [poolEntry('c1'), poolEntry('c2')];

    const result = await service.scorePool(projectDto, pool, scoringContext, allocations);

    expect(result.errorCount).toBe(1);
    expect(scoringPipeline.scoreConsultant).toHaveBeenCalledTimes(2);
  });

  it('counts both errors and exclusions together in excludedCount', async () => {
    scoringPipeline.scoreConsultant
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ excluded: true })
      .mockResolvedValueOnce({ excluded: false, factorScores: {}, redistributedWeights: {}, factorDetails: {} });
    const pool = [poolEntry('c1'), poolEntry('c2'), poolEntry('c3')];

    const result = await service.scorePool(projectDto, pool, scoringContext, allocations);

    expect(result.excludedCount).toBe(2); // 1 error + 1 hard exclusion
    expect(result.errorCount).toBe(1);
  });

  it('handles an empty pool without error', async () => {
    const result = await service.scorePool(projectDto, [], scoringContext, allocations);

    expect(scoringPipeline.scoreConsultant).not.toHaveBeenCalled();
    expect(result.excludedCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it('respects concurrency limits without dropping any items on a large pool', async () => {
    scoringPipeline.scoreConsultant.mockResolvedValue({ excluded: false, factorScores: {}, redistributedWeights: {}, factorDetails: {} });
    const pool = Array.from({ length: 60 }, (_, i) => poolEntry(`c${i}`));

    await service.scorePool(projectDto, pool, scoringContext, allocations);

    expect(scoringPipeline.scoreConsultant).toHaveBeenCalledTimes(60);
  });
});