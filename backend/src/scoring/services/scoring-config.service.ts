import { BadRequestException, Injectable } from '@nestjs/common';
import { ScoringRepository } from '../repositories/scoring-config.repository';
import { UpdateScoringConfigDto } from '../dto/update-scoring-config.dto';

@Injectable()
export class ScoringService {
  constructor(private readonly scoringRepository: ScoringRepository) {}

  async getScoringConfig() {
    return this.scoringRepository.getScoringFactors();
  }

  async updateScoringConfig(dto: UpdateScoringConfigDto, userId: string) {
    this.validateWeights(dto);
    const previousValues = await this.scoringRepository.getScoringFactors();
    const newValues = await this.scoringRepository.updateScoringConfig(
      dto.scoringFactors,
    );

    await this.scoringRepository.createAuditRecord(
      userId,
      previousValues,
      newValues,
    );
    return newValues;
  }

  private validateWeights(dto: UpdateScoringConfigDto): void {
    const activeFactors = dto.scoringFactors.filter((f) => f.active);

    if (activeFactors.length === 0) {
      throw new BadRequestException(
        'At least one scoring factor must be active.',
      );
    }

    const total = activeFactors.reduce((sum, f) => sum + f.weight, 0);

    if (total !== 100) {
      throw new BadRequestException(
        `Active factors weights must sum to 100. Current sum: ${total}`,
      );
    }
  }
}
