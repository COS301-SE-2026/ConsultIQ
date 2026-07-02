import { BadRequestException } from '@nestjs/common';
import { ScoringService } from './scoring-config.service';
import { ScoringRepository } from '../repositories/scoring-config.repository';
import { ScoringFactorName } from '@prisma/client';

const mockScoringRepository = {
  getScoringFactors: jest.fn(),
  updateScoringConfig: jest.fn(),
  createAuditRecord: jest.fn(),
};

const validFactors = [
  { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 40, active: true },
  { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true },
  { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true },
  { factorName: ScoringFactorName.LOCATION, weight: 10, active: true },
  { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: true },
];

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService(
      mockScoringRepository as unknown as ScoringRepository,
    );
    jest.clearAllMocks();
  });

  describe('validateWeights', () => {
    it('resolves when active weights sum to exactly 100', async () => {
      mockScoringRepository.getScoringFactors.mockResolvedValue(validFactors);
      mockScoringRepository.updateScoringConfig.mockResolvedValue(validFactors);
      mockScoringRepository.createAuditRecord.mockResolvedValue({});

      await expect(
        service.updateScoringConfig({ scoringFactors: validFactors }, 'user-1'),
      ).resolves.not.toThrow();
    });

    it('throws BadRequestException when active weights do not sum to 100', async () => {
      const invalidFactors = [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 50, active: true },
        { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true },
        { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true },
        { factorName: ScoringFactorName.LOCATION, weight: 10, active: true },
        { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: true },
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
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 40, active: true },
        { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true },
        { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true },
        { factorName: ScoringFactorName.LOCATION, weight: 10, active: true },
        { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: false },
      ];

      await expect(
        service.updateScoringConfig({ scoringFactors: mixedFactors }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes when inactive factors are excluded and active ones sum to 100', async () => {
      mockScoringRepository.getScoringFactors.mockResolvedValue(validFactors);
      mockScoringRepository.updateScoringConfig.mockResolvedValue(validFactors);
      mockScoringRepository.createAuditRecord.mockResolvedValue({});

      const mixedFactors = [
        { factorName: ScoringFactorName.SKILL_ALIGNMENT, weight: 45, active: true },
        { factorName: ScoringFactorName.COMPETENCY_LEVEL, weight: 30, active: true },
        { factorName: ScoringFactorName.AVAILABILITY, weight: 15, active: true },
        { factorName: ScoringFactorName.LOCATION, weight: 10, active: true },
        { factorName: ScoringFactorName.COST_TO_COMPANY, weight: 5, active: false },
      ];

      await expect(
        service.updateScoringConfig({ scoringFactors: mixedFactors }, 'user-1'),
      ).resolves.not.toThrow();
    });
  });

  describe('audit log payload', () => {
    it('calls createAuditRecord with correct adminUserId and previous/new values', async () => {
      mockScoringRepository.getScoringFactors.mockResolvedValue(validFactors);
      mockScoringRepository.updateScoringConfig.mockResolvedValue(validFactors);
      mockScoringRepository.createAuditRecord.mockResolvedValue({});

      await service.updateScoringConfig({ scoringFactors: validFactors }, 'admin-123');

      expect(mockScoringRepository.createAuditRecord).toHaveBeenCalledWith(
        'admin-123',
        validFactors,
        validFactors,
      );
    });

    it('does not call createAuditRecord when validation fails', async () => {
      const invalidFactors = validFactors.map((f) => ({ ...f, weight: 99 }));

      await expect(
        service.updateScoringConfig({ scoringFactors: invalidFactors }, 'admin-123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockScoringRepository.createAuditRecord).not.toHaveBeenCalled();
    });
  });
});