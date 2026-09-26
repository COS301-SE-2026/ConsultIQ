import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from '../../scoring/services/data-normalization/data-ingestion.service';
import { MatchScoringExecutorService } from '../../scoring/services/match-scoring-executor.service';

const mockPrismaService = {
  consultant: {
    findUnique: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
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
  skills: [{ competencyLevel: 'INTERMEDIATE', skill: { name: 'TypeScript' } }],
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
  skills: [{ skill: { name: 'TypeScript' }, competency: 'INTERMEDIATE', mandatory: true }],
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
        competencyLevel: 'BEGINNER',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the project does not exist', async () => {
    mockPrismaService.project.findUnique.mockResolvedValue(null);

    await expect(
      service.simulate('consultant-01', 'missing-project', {
        skillName: 'AWS',
        competencyLevel: 'BEGINNER',
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
      competencyLevel: 'EXPERT',
    });

    expect(result.baselineScore).toBe(60);
    expect(result.projectedScore).toBe(85);
    expect(result.scoreDelta).toBe(25);
    expect(result.excluded).toBe(false);
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
      competencyLevel: 'EXPERT',
    });

    const [, baselinePoolArg] = mockScoringExecutor.scorePool.mock.calls[0];
    const [, projectedPoolArg] = mockScoringExecutor.scorePool.mock.calls[1];

    expect(baselinePoolArg[0].consultant.skills).toEqual([
      { skillName: 'TypeScript', competencyLevel: 'INTERMEDIATE' },
    ]);
    expect(projectedPoolArg[0].consultant.skills).toEqual([
      { skillName: 'TypeScript', competencyLevel: 'INTERMEDIATE' },
      { skillName: 'AWS', competencyLevel: 'EXPERT' },
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
      competencyLevel: 'EXPERT',
    });

    expect(result.excluded).toBe(true);
    expect(result.excludedReason).toBe('Consultant excluded from baseline scoring.');
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
      competencyLevel: 'EXPERT',
    });

    expect(result.excluded).toBe(true);
    expect(result.excludedReason).toBe('Consultant excluded from projected scoring.');
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
      competencyLevel: 'EXPERT',
    });

    const [, , , allocationsArg] = mockScoringExecutor.scorePool.mock.calls[0];
    expect(allocationsArg.get('consultant-01')).toBe(50);
  });
});