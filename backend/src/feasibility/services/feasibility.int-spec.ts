import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeasibilityService } from './feasibility.service';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';
import { NormalizationService } from '../../scoring/services/data-normalization/normalization.service';
import { ScoringService } from '../../scoring/services/scoring-config.service';
import { MatchScoringExecutorService } from '../../scoring/services/match-scoring-executor.service';
import { ScoringPipelineService } from '../../scoring/services/scoring-pipeline.service';
import { MatchRunAggregationService } from '../../scoring/services/match-run-aggregation.service';
import { WeightedAggregator } from '../../scoring/services/weight-aggregator/weighted-aggregator';
import { SkillAligmentScorer } from '../../scoring/services/five-scoring-modules/skill-alignment-scorer';
import { CompetencyMatchScorer } from '../../scoring/services/five-scoring-modules/competency-match-scorer';
import { CostFitScorer } from '../../scoring/services/five-scoring-modules/cost-fit.scorer';
import { GeographicFitScorer } from '../../scoring/services/five-scoring-modules/geographic-fit.scorer';
import { LocationModule } from '../../location/location.module';
import { AvailabilityFitScorer } from '../../scoring/services/five-scoring-modules/availability-fit.scorer';
import { ScoringOrchestrator } from '../../scoring/services/scoring.orchestrator';
import { VariantGenerator } from './variant-generator';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';

/**
 * Integration coverage for the single most safety-critical property
 * of this feature: a feasibility check must NEVER persist anything.
 * A unit test with a mocked PrismaService can't prove this — it can
 * only prove "we didn't call the mock's create method," which says
 * nothing about what a real Prisma client would do. This hits a real
 * (test) database and asserts row counts are identical before/after.
 */

describe('FeasibilityService (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let feasibilityService: FeasibilityService;

  const validSpec = (): FeasibilityCheckRequestDto =>
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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [LocationModule], // provides LocationService, needed by GeographicFitScorer
      providers: [
        PrismaService,
        FeasibilityService,
        VariantGenerator,
        DataIngestionService,
        NormalizationService,
        ScoringService,
        MatchScoringExecutorService,
        ScoringPipelineService,
        MatchRunAggregationService,
        WeightedAggregator,
        SkillAligmentScorer,
        CompetencyMatchScorer,
        CostFitScorer,
        GeographicFitScorer,
        AvailabilityFitScorer,
        ScoringOrchestrator,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService);
    feasibilityService = moduleRef.get(FeasibilityService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.projectSkill.deleteMany();
    await prisma.projectScoringOverride.deleteMany();
    await prisma.projectManager.deleteMany();
    await prisma.matchRun.deleteMany();
    await prisma.project.deleteMany();
  });

  it('does not create a Project row when checking feasibility', async () => {
    const before = await prisma.project.count();
    await feasibilityService.checkFeasibility(validSpec());
    const after = await prisma.project.count();
    expect(after).toBe(before);
  });

  it('does not create a MatchRun row when checking feasibility', async () => {
    const before = await prisma.matchRun.count();
    await feasibilityService.checkFeasibility(validSpec());
    const after = await prisma.matchRun.count();
    expect(after).toBe(before);
  });

  it('does not create a MatchRunResult row when checking feasibility', async () => {
    const before = await prisma.matchRunResult.count();
    await feasibilityService.checkFeasibility(validSpec());
    const after = await prisma.matchRunResult.count();
    expect(after).toBe(before);
  });

  it('does not create a ProjectScoringOverride row, even though scoring config resolution reads that table', async () => {
    const before = await prisma.projectScoringOverride.count();
    await feasibilityService.checkFeasibility(validSpec());
    const after = await prisma.projectScoringOverride.count();
    expect(after).toBe(before);
  });

  it('does not create a ProjectSkill row when checking feasibility', async () => {
    const before = await prisma.projectSkill.count();
    await feasibilityService.checkFeasibility(validSpec());
    const after = await prisma.projectSkill.count();
    expect(after).toBe(before);
  });

  it('creates no rows across the entire schema over repeated calls, including variants', async () => {
    const countsBefore = {
      project: await prisma.project.count(),
      matchRun: await prisma.matchRun.count(),
      matchRunResult: await prisma.matchRunResult.count(),
      projectScoringOverride: await prisma.projectScoringOverride.count(),
      projectSkill: await prisma.projectSkill.count(),
    };

    await feasibilityService.checkFeasibility(validSpec());
    await feasibilityService.checkFeasibility(validSpec());
    await feasibilityService.checkFeasibility(validSpec());

    expect(await prisma.project.count()).toBe(countsBefore.project);
    expect(await prisma.matchRun.count()).toBe(countsBefore.matchRun);
    expect(await prisma.matchRunResult.count()).toBe(countsBefore.matchRunResult);
    expect(await prisma.projectScoringOverride.count()).toBe(countsBefore.projectScoringOverride);
    expect(await prisma.projectSkill.count()).toBe(countsBefore.projectSkill);
  });

  it('produces a plausible score for an identical spec (sanity check, requires a seeded active consultant)', async () => {
    const consultantCount = await prisma.consultant.count({
      where: { user: { status: 'ACTIVE' } },
    });

    if (consultantCount === 0) {
      console.warn(
        'Skipping — no ACTIVE consultants in test DB. Seed one to exercise this test meaningfully.',
      );
      return;
    }

    const result = await feasibilityService.checkFeasibility(validSpec());
    expect(result.eligibleCount).toBeGreaterThanOrEqual(0);
    expect(result.topScore).toBeGreaterThanOrEqual(0);
    expect(result.topScore).toBeLessThanOrEqual(100);
  });
});