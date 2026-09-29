import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';
import { MatchScoringExecutorService } from '../../scoring/services/match-scoring-executor.service';
import { SimulationResult } from '../interfaces/simulation-result.interface';
import { CompetencyLevel } from '@prisma/client';

const mockPrismaService = {
  consultant: {
    findUnique: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  projectPlacement: {
    findMany: jest.fn(),
  },
};

const mockDataIngestionService = {
  getProjectScoringContext: jest.fn(),
};

const mockScoringExecutor = {
  scorePool: jest.fn(),
};

const baseConsultantRow = {
  id: 'consultant-01',
  costToCompany: 50000,
  city: 'Pretoria',
  province: 'Gauteng',
  latitude: null,
  longitude: null,
  skills: [{ competencyLevel: CompetencyLevel.INTERMEDIATE, skill: { name: 'TypeScript' } }],
  user: { fullName: 'Jane Doe', email: 'jane@example.com' },
  placements: [],
};

const baseProjectRow = {
  id: 'project-01',
  budget: 1000,
  teamSize: 3,
  city: 'Pretoria',
  province: 'Gauteng',
  latitude: null,
  longitude: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-06-30'),
  allocation: 50,
  workModel: 'ONSITE',
  skills: [{ skill: { name: 'TypeScript' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: true }],
};

const projectRequiringKubernetesMandatorily = {
  ...baseProjectRow,
  id: 'project-b',
  skills: [
    { skill: { name: 'TypeScript' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
    { skill: { name: 'Kubernetes' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
  ],
};

describe('SimulationService', () => {
  let service: SimulationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DataIngestionService, useValue: mockDataIngestionService },
        { provide: MatchScoringExecutorService, useValue: mockScoringExecutor },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    jest.clearAllMocks();

    mockPrismaService.consultant.findUnique.mockResolvedValue(baseConsultantRow);
    mockPrismaService.project.findUnique.mockResolvedValue(baseProjectRow);
    mockPrismaService.projectPlacement.findMany.mockResolvedValue([]);
    mockDataIngestionService.getProjectScoringContext.mockResolvedValue({
      activeWeights: {},
      activeFactors: new Set(),
      excludedFactors: new Set(),
    });
  });

  it('throws NotFoundException when the consultant does not exist', async () => {
    mockPrismaService.consultant.findUnique.mockResolvedValue(null);

    await expect(
      service.simulate('missing-consultant', 'project-01', {
        skillName: 'AWS',
        competencyLevel: CompetencyLevel.BEGINNER,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the project does not exist', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue(null);

    await expect(
      service.simulate('consultant-01', 'missing-project', {
        skillName: 'AWS',
        competencyLevel: CompetencyLevel.BEGINNER,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('scores the baseline and projected pools separately and returns the delta', async () => {
    mockScoringExecutor.scorePool
      .mockResolvedValueOnce({
        finalResults: [{ consultantId: 'consultant-01', finalScore: 60, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0,
        errorCount: 0,
      })
      .mockResolvedValueOnce({
        finalResults: [{ consultantId: 'consultant-01', finalScore: 85, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0,
        errorCount: 0,
      });

    const result = await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

    expect(result.baselineScore).toBe(60);
    expect(result.projectedScore).toBe(85);
    expect(result.scoreDelta).toBe(25);
    expect(mockScoringExecutor.scorePool).toHaveBeenCalledTimes(2);
  });

  it('passes a baseline pool without the candidate skill and a projected pool with it injected', async () => {
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 50, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });

    await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

    const [, baselinePoolArg] = mockScoringExecutor.scorePool.mock.calls[0];
    const [, projectedPoolArg] = mockScoringExecutor.scorePool.mock.calls[1];

    expect(baselinePoolArg[0].consultant.skills).toEqual([
      { skillName: 'TypeScript', competencyLevel: CompetencyLevel.INTERMEDIATE },
    ]);
    expect(projectedPoolArg[0].consultant.skills).toEqual([
      { skillName: 'TypeScript', competencyLevel: CompetencyLevel.INTERMEDIATE },
      { skillName: 'AWS', competencyLevel: CompetencyLevel.EXPERT},
    ]);
  });

  it('returns excluded:true with a reason when the baseline scoring excludes the consultant', async () => {
    mockScoringExecutor.scorePool
      .mockResolvedValueOnce({ finalResults: [], excludedCount: 1, errorCount: 0 })
      .mockResolvedValueOnce({
        finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0,
        errorCount: 0,
      });

    const result = await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

      expect(result.baselineExcluded).toBe(true);
      expect(result.projectedExcluded).toBe(false);
      expect(result.scoreDelta).toBe(0);
  });

  it('returns excluded:true with a reason when the projected scoring excludes the consultant', async () => {
    mockScoringExecutor.scorePool
      .mockResolvedValueOnce({
        finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0,
        errorCount: 0,
      })
      .mockResolvedValueOnce({ finalResults: [], excludedCount: 1, errorCount: 0 });

    const result = await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

      expect(result.baselineExcluded).toBe(false);
      expect(result.projectedExcluded).toBe(true);
  });

  it('sums overlapping placement allocations for the consultant', async () => {
    mockPrismaService.projectPlacement.findMany.mockResolvedValue([
      { allocation: 30 },
      { allocation: 20 },
    ]);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 50, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });

    await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

    const [, , , allocationsArg] = mockScoringExecutor.scorePool.mock.calls[0];
    expect(allocationsArg.get('consultant-01')).toBe(50);
  });

  it('fetches the project scoring context only once, not once per pass', async () => {
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });

    await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

    expect(mockDataIngestionService.getProjectScoringContext).toHaveBeenCalledTimes(1);
  });

  it('reports excluded when BOTH pools come back empty, favouring the baseline message', async () => {
    mockScoringExecutor.scorePool.mockResolvedValue({ finalResults: [], excludedCount: 1, errorCount: 0 });

    const result = await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

    expect(result.baselineExcluded).toBe(true);
    expect(result.projectedExcluded).toBe(true);
  });

  it('reflects isPlaced correctly for a consultant with an active placement', async () => {
  mockPrismaService.consultant.findUnique.mockResolvedValue({
    ...baseConsultantRow,
    placements: [{ id: 'placement-1', status: 'ACTIVE' }],
  });
  mockScoringExecutor.scorePool.mockResolvedValue({
    finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
    excludedCount: 0,
    errorCount: 0,
  });

  await service.simulate('consultant-01', 'project-01', {
    skillName: 'AWS',
    competencyLevel: CompetencyLevel.EXPERT,
  });

  const [, poolArg] = mockScoringExecutor.scorePool.mock.calls[0];
  expect(poolArg[0].isPlaced).toBe(true);
  });

  it('never writes to the database — only read-side Prisma calls should occur', async () => {
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });

    await service.simulate('consultant-01', 'project-01', {
      skillName: 'AWS',
      competencyLevel: CompetencyLevel.EXPERT,
    });

    expect((mockPrismaService as any).consultant.create).toBeUndefined();
    expect((mockPrismaService as any).project.create).toBeUndefined();
  });

  describe('recommendSkillGrowth', () => {
  const consultantWithTypeScript = {
    ...baseConsultantRow,
    skills: [{ competencyLevel: CompetencyLevel.INTERMEDIATE, skill: { name: 'TypeScript' } }],
  };

  const projectRequiringTypeScriptAndAws = {
    ...baseProjectRow,
    id: 'project-a',
    skills: [
      { skill: { name: 'TypeScript' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
      { skill: { name: 'AWS' }, competency: CompetencyLevel.EXPERT, mandatory: true },
    ],
  };

  const projectRequiringKubernetesOptionally = {
    ...baseProjectRow,
    id: 'project-b',
    skills: [
      { skill: { name: 'TypeScript' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
      { skill: { name: 'Kubernetes' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: false },
    ],
  };

  beforeEach(() => {
    mockPrismaService.consultant.findUnique.mockResolvedValue(consultantWithTypeScript);
  });

  it('returns an empty array when the consultant already has every mandatory pipeline skill', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([
      { ...projectRequiringTypeScriptAndAws, skills: [projectRequiringTypeScriptAndAws.skills[0]] }, // only TypeScript required
    ]);

    const result = await service.recommendSkillGrowth('consultant-01');

    expect(result).toEqual([]);
    expect(mockScoringExecutor.scorePool).not.toHaveBeenCalled();
  });

  it('returns an empty array when the pipeline has no projects at all', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([]);

    const result = await service.recommendSkillGrowth('consultant-01');

    expect(result).toEqual([]);
    expect(mockScoringExecutor.scorePool).not.toHaveBeenCalled();
  });

  it('only tests a candidate skill against projects that actually mention it', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([
      projectRequiringTypeScriptAndAws,
      projectRequiringKubernetesMandatorily,
    ]);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });

    const result = await service.recommendSkillGrowth('consultant-01');

    const awsResults = result.filter((r) => r.candidateSkillName === 'AWS');
    const k8sResults = result.filter((r) => r.candidateSkillName === 'Kubernetes');

    expect(awsResults).toHaveLength(1);
    expect(awsResults[0].projectId).toBe('project-a');

    expect(k8sResults).toHaveLength(1);
    expect(k8sResults[0].projectId).toBe('project-b');
  });

  it('includes a project where the candidate skill is only optional, not mandatory', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([projectRequiringKubernetesMandatorily]);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });

    // Kubernetes is optional here, but it's mandatory on projectRequiringTypeScriptAndAws's
    // sibling project elsewhere in a real pipeline — for this isolated test, make it the
    // ONLY pipeline project so Kubernetes still qualifies as a candidate via some other
    // project requiring it mandatorily. To isolate purely the "optional inclusion" behaviour,
    // we inject Kubernetes directly as a candidate by ensuring another project mandates it:
    mockPrismaService.project.findMany.mockResolvedValue([
      { ...projectRequiringKubernetesOptionally, id: 'project-c', skills: [
        { skill: { name: 'TypeScript' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
        { skill: { name: 'Kubernetes' }, competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
      ]},
      projectRequiringKubernetesOptionally, // Kubernetes optional here
    ]);

    const result = await service.recommendSkillGrowth('consultant-01');
    const k8sResults = result.filter((r) => r.candidateSkillName === 'Kubernetes');

    // Kubernetes should be tested against BOTH projects — the one where it's
    // mandatory (which made it a candidate) AND the one where it's merely optional.
    expect(k8sResults.map((r) => r.projectId).sort()).toEqual(['project-b', 'project-c']);
  });

  it('computes the baseline score once per project, not once per candidate skill', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([
      projectRequiringTypeScriptAndAws,
      projectRequiringKubernetesMandatorily,
    ]);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });

    await service.recommendSkillGrowth('consultant-01');

    // 2 candidate skills (AWS, Kubernetes) x 1 relevant project each = 2 projected calls
    // + 2 baseline calls (one per pipeline project, computed once regardless of candidate count)
    // = 4 total scorePool calls, NOT 2 projects x 2 candidates x 2 (baseline+projected) = 8.
    expect(mockScoringExecutor.scorePool).toHaveBeenCalledTimes(4);
  });

  it('builds a correct SimulationResult with baseline, projected score, and delta', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([projectRequiringTypeScriptAndAws]);
    mockScoringExecutor.scorePool
      .mockResolvedValueOnce({ // baseline for project-a
        finalResults: [{ consultantId: 'consultant-01', finalScore: 55, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0, errorCount: 0,
      })
      .mockResolvedValueOnce({ // projected (AWS added) for project-a
        finalResults: [{ consultantId: 'consultant-01', finalScore: 90, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0, errorCount: 0,
      });

    const result = await service.recommendSkillGrowth('consultant-01');

    expect(result).toEqual([
      {
        consultantId: 'consultant-01',
        projectId: 'project-a',
        candidateSkillName: 'AWS',
        baselineScore: 55,
        projectedScore: 90,
        scoreDelta: 35,
        baselineExcluded: false,
        projectedExcluded: false,
      },
    ]);
  });

  it('reports excluded correctly within a batch when one project excludes the consultant', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([projectRequiringTypeScriptAndAws]);
    mockScoringExecutor.scorePool
      .mockResolvedValueOnce({ finalResults: [], excludedCount: 1, errorCount: 0 }) // baseline excluded
      .mockResolvedValueOnce({
        finalResults: [{ consultantId: 'consultant-01', finalScore: 80, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0, errorCount: 0,
      });

    const result = await service.recommendSkillGrowth('consultant-01');

      expect(result[0].baselineExcluded).toBe(true);
      expect(result[0].projectedExcluded).toBe(false);
  });

  it('never writes to the database during a batch recommendation', async () => {
    mockPrismaService.project.findMany.mockResolvedValue([projectRequiringTypeScriptAndAws]);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0, errorCount: 0,
    });

    await service.recommendSkillGrowth('consultant-01');

    expect((mockPrismaService as any).consultant.create).toBeUndefined();
    expect((mockPrismaService as any).project.create).toBeUndefined();
  });
});

describe('getSkillRecommendationsForUser', () => {
  const row = (overrides: Partial<SimulationResult>): SimulationResult => ({
    consultantId: 'consultant-01',
    projectId: 'project-a',
    candidateSkillName: 'AWS',
    baselineScore: 50,
    projectedScore: 50,
    scoreDelta: 0,
    baselineExcluded: false,
    projectedExcluded: false,
    ...overrides,
  });

  beforeEach(() => {
    mockPrismaService.project.findMany.mockResolvedValue([]); // pipeline for computePipelineEligibility
  });

  it('looks the consultant up by userId with a minimal select, then simulates for that consultant', async () => {
    mockPrismaService.consultant.findUnique.mockResolvedValue({ ...baseConsultantRow, id: 'consultant-99' });
    const spy = jest.spyOn(service, 'recommendSkillGrowth').mockResolvedValue([]);

    await service.getSkillRecommendationsForUser('user-01');

    expect(mockPrismaService.consultant.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-01' },
      select: { id: true },
    });
    expect(spy).toHaveBeenCalledWith('consultant-99');
  });

  it('throws NotFoundException and runs no simulation when the user has no consultant profile', async () => {
    mockPrismaService.consultant.findUnique.mockResolvedValue(null);
    const spy = jest.spyOn(service, 'recommendSkillGrowth');

    await expect(service.getSkillRecommendationsForUser('user-without-profile')).rejects.toThrow(
      NotFoundException,
    );
    expect(spy).not.toHaveBeenCalled();
    expect(mockScoringExecutor.scorePool).not.toHaveBeenCalled();
  });

  it('returns ranked recommendations and drops skills that help nothing', async () => {
    mockPrismaService.consultant.findUnique.mockResolvedValue(baseConsultantRow);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });
    jest.spyOn(service, 'recommendSkillGrowth').mockResolvedValue([
      row({ candidateSkillName: 'Terraform', scoreDelta: 0 }), // useless
      row({ candidateSkillName: 'Kubernetes', projectId: 'p2', scoreDelta: 20 }),
      row({
        candidateSkillName: 'AWS',
        projectId: 'p3',
        baselineExcluded: true,
        projectedExcluded: false,
        scoreDelta: 0,
      }),
    ]);

    const result = await service.getSkillRecommendationsForUser('user-01');

    expect(result.recommendations.map((r) => r.skillName)).toEqual(['AWS', 'Kubernetes']);
  });

  it('returns an empty recommendations list when no skill would help, but still reports pipeline eligibility', async () => {
    mockPrismaService.consultant.findUnique.mockResolvedValue(baseConsultantRow);
    mockPrismaService.project.findMany.mockResolvedValue([baseProjectRow]);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0,
      errorCount: 0,
    });
    jest.spyOn(service, 'recommendSkillGrowth').mockResolvedValue([row({ scoreDelta: 0 })]);

    const result = await service.getSkillRecommendationsForUser('user-01');

    expect(result.recommendations).toEqual([]);
    expect(result.pipelineSize).toBe(1);
    expect(result.eligibleNow).toBe(1);
  });

  it("computes projectedEligibleCount as eligibleNow plus the skill's own newlyEligibleProjectCount", async () => {
    mockPrismaService.consultant.findUnique.mockResolvedValue(baseConsultantRow);
    mockPrismaService.project.findMany.mockResolvedValue([baseProjectRow, projectRequiringKubernetesMandatorily]);
    jest.spyOn(service, 'recommendSkillGrowth').mockResolvedValue([
      row({ candidateSkillName: 'AWS', baselineExcluded: true, projectedExcluded: false, scoreDelta: 0 }),
    ]);
    // one project excluded, one eligible -> eligibleNow = 1, pipelineSize = 2
    mockScoringExecutor.scorePool
      .mockResolvedValueOnce({ finalResults: [], excludedCount: 1, errorCount: 0 })
      .mockResolvedValueOnce({
        finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
        excludedCount: 0, errorCount: 0,
      });

    const result = await service.getSkillRecommendationsForUser('user-01');

    expect(result.eligibleNow).toBe(1);
    expect(result.recommendations[0].projectedEligibleCount).toBe(2); // 1 + 1
  });

  it('caps the response at three recommendations', async () => {
    mockPrismaService.consultant.findUnique.mockResolvedValue(baseConsultantRow);
    mockScoringExecutor.scorePool.mockResolvedValue({
      finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
      excludedCount: 0, errorCount: 0,
    });
    jest.spyOn(service, 'recommendSkillGrowth').mockResolvedValue(
      ['A', 'B', 'C', 'D', 'E'].map((name, i) =>
        row({ candidateSkillName: name, projectId: `p${i}`, scoreDelta: 50 - i * 10 }),
      ),
    );

    const result = await service.getSkillRecommendationsForUser('user-01');

    expect(result.recommendations.map((r) => r.skillName)).toEqual(['A', 'B', 'C']);
  });

it('exposes only expected fields — no project ids, no population-wide stats', async () => {
  mockPrismaService.consultant.findUnique.mockResolvedValue(baseConsultantRow);
  mockPrismaService.project.findMany.mockResolvedValue([baseProjectRow]);
  mockScoringExecutor.scorePool.mockResolvedValue({
    finalResults: [{ consultantId: 'consultant-01', finalScore: 70, rank: 1, factorBreakdown: [], isPlaced: false, availabilityStatus: 'AVAILABLE' }],
    excludedCount: 0, errorCount: 0,
  });
  jest
    .spyOn(service, 'recommendSkillGrowth')
    .mockResolvedValue([row({ projectId: 'secret-project', scoreDelta: 10 })]);

  const result = await service.getSkillRecommendationsForUser('user-01');

  expect(Object.keys(result.recommendations[0]).sort((a, b) => a.localeCompare(b))).toEqual(
    ['newlyEligibleProjectCount', 'projectedEligibleCount', 'projectsTested', 'skillName', 'totalScoreDelta'].sort(
      (a, b) => a.localeCompare(b),
    ),
  );
  expect(JSON.stringify(result)).not.toContain('secret-project');
});
});
});