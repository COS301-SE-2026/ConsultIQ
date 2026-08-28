import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ScoringService } from './scoring-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringFactorName } from '@prisma/client';

const validFactors = [
  { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 40, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.LOCATION, weight: 10, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: true, hardExclusionEnabled: false },
];

const validOverrideFactors = [
  { factorName: ScoringFactorName.SKILL_ALIGNMENT, overrideWeight: 40, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.COMPETENCY_LEVEL, overrideWeight: 30, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.AVAILABILITY, overrideWeight: 15, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.LOCATION, overrideWeight: 10, active: true, hardExclusionEnabled: false },
  { factorName: ScoringFactorName.COST_TO_COMPANY, overrideWeight: 5, active: true, hardExclusionEnabled: false },
];

const buildMockPrisma = () => ({
  consultancyScoringConfig: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    upsert: jest.fn(),
  },
  scoringConfigAudit: {
    create: jest.fn(),
  },
  projectScoringOverride: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  projectManager: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('ScoringService', () => {
  let service: ScoringService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(() => {
    mockPrisma = buildMockPrisma();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    service = new ScoringService(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  // -------------------- Firm-Wide Config -----------------------------

  describe('validateWeights', () => {
    it('resolves when active weights sum to exactly 100', async () => {
      mockPrisma.consultancyScoringConfig.findMany.mockResolvedValue(validFactors);
      mockPrisma.consultancyScoringConfig.upsert.mockResolvedValue({});
      mockPrisma.scoringConfigAudit.create.mockResolvedValue({});

      await expect(
        service.updateScoringConfig({ scoringFactors: validFactors }, 'user-1'),
      ).resolves.not.toThrow();
    });

    it('throws BadRequestException when active weights do not sum to 100', async () => {
      const invalidFactors = [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 50, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.LOCATION, weight: 10, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: true, hardExclusionEnabled: false },
      ];

      await expect(
        service.updateScoringConfig({ scoringFactors: invalidFactors }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateScoringConfig({ scoringFactors: invalidFactors }, 'user-1'),
      ).rejects.toThrow(/110/);
    });

    it('throws BadRequestException when no factors are active', async () => {
      const allInactive = validFactors.map((f) => ({ ...f, active: false }));

      await expect(
        service.updateScoringConfig({ scoringFactors: allInactive }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateScoringConfig({ scoringFactors: allInactive }, 'user-1'),
      ).rejects.toThrow(/At least one/);
    });

    it('excludes inactive factors from weight sum validation', async () => {
      const mixedFactors = [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 40, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.LOCATION, weight: 10, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: false, hardExclusionEnabled: false },
      ];

      await expect(
        service.updateScoringConfig({ scoringFactors: mixedFactors }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes when inactive factors excluded and active ones sum to 100', async () => {
      mockPrisma.consultancyScoringConfig.findMany.mockResolvedValue(validFactors);
      mockPrisma.consultancyScoringConfig.upsert.mockResolvedValue({});
      mockPrisma.scoringConfigAudit.create.mockResolvedValue({});

      const mixedFactors = [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 45, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.LOCATION, weight: 10, active: true, hardExclusionEnabled: false },
        { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: false, hardExclusionEnabled: false },
      ];

      await expect(
        service.updateScoringConfig({ scoringFactors: mixedFactors }, 'user-1'),
      ).resolves.not.toThrow();
    });
  });

  describe('audit log payload', () => {
    it('creates audit record with correct adminUserId and values', async () => {
      mockPrisma.consultancyScoringConfig.findMany.mockResolvedValue(validFactors);
      mockPrisma.consultancyScoringConfig.upsert.mockResolvedValue({});
      mockPrisma.scoringConfigAudit.create.mockResolvedValue({});

      await service.updateScoringConfig({ scoringFactors: validFactors }, 'admin-123');

      expect(mockPrisma.scoringConfigAudit.create).toHaveBeenCalledWith({
        data: {
          adminUserId: 'admin-123',
          previousValues: validFactors,
          newValues: validFactors,
        },
      });
    });

    it('does not create audit record when validation fails', async () => {
      const invalidFactors = validFactors.map((f) => ({ ...f, weight: 99 }));

      await expect(
        service.updateScoringConfig({ scoringFactors: invalidFactors }, 'admin-123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.scoringConfigAudit.create).not.toHaveBeenCalled();
    });
  });

  // ------------------ Project Scoring Override --------------------

  describe('updateProjectScoringOverride', () => {
    it('throws ForbiddenException when user is not assigned PM', async () => {
      mockPrisma.projectManager.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProjectScoringOverride(
          'project-1',
          { factors: validOverrideFactors },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when active weights do not sum to 100', async () => {
      mockPrisma.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });

      const invalidFactors = validOverrideFactors.map((f) => ({
        ...f,
        overrideWeight: 99,
      }));

      await expect(
        service.updateProjectScoringOverride(
          'project-1',
          { factors: invalidFactors },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('saves override when PM is assigned and weights are valid', async () => {
      mockPrisma.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });
      mockPrisma.projectScoringOverride.upsert.mockResolvedValue({});
      mockPrisma.projectScoringOverride.findMany.mockResolvedValue(validOverrideFactors);

      const result = await service.updateProjectScoringOverride(
        'project-1',
        { factors: validOverrideFactors },
        'user-1',
      );

      expect(result).toEqual(validOverrideFactors);
    });
  });

  describe('deleteProjectScoringOverride', () => {
    it('throws ForbiddenException when user is not assigned PM', async () => {
      mockPrisma.projectManager.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteProjectScoringOverride('project-1', { confirm: true }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.projectScoringOverride.deleteMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when confirm is false', async () => {
      mockPrisma.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });

      await expect(
        service.deleteProjectScoringOverride('project-1', { confirm: false }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.projectScoringOverride.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes override when PM is assigned and confirm is true', async () => {
      mockPrisma.projectManager.findUnique.mockResolvedValue({ id: 'pm-1' });
      mockPrisma.projectScoringOverride.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.deleteProjectScoringOverride(
        'project-1',
        { confirm: true },
        'user-1',
      );

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.projectScoringOverride.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
    });
  });

  describe('resolveProjectWeights - fallback chain', () => {
    it('returns project overrides when they exist', async () => {
      mockPrisma.projectScoringOverride.findMany.mockResolvedValue(validOverrideFactors);

      const result = await service.resolveProjectWeights('project-1');

      expect(result).toEqual(validOverrideFactors);
    });

    it('falls back to firm-wide defaults when no project overrides exist', async () => {
      mockPrisma.projectScoringOverride.findMany.mockResolvedValue([]);
      mockPrisma.consultancyScoringConfig.findMany.mockResolvedValue(validFactors);

      const result = await service.resolveProjectWeights('project-1');

      expect(result).toEqual(validFactors);
    });

    it('coalesces concurrent project configuration cache misses', async () => {
      let releaseLoad!: (value: typeof validOverrideFactors) => void;
      const pendingLoad = new Promise<typeof validOverrideFactors>((resolve) => {
        releaseLoad = resolve;
      });
      mockPrisma.projectScoringOverride.findMany.mockReturnValue(pendingLoad);

      const firstRequest = service.resolveProjectWeights('project-1');
      const secondRequest = service.resolveProjectWeights('project-1');

      await Promise.resolve();
      expect(mockPrisma.projectScoringOverride.findMany).toHaveBeenCalledTimes(1);

      releaseLoad(validOverrideFactors);
      await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
        validOverrideFactors,
        validOverrideFactors,
      ]);
    });
  });
});