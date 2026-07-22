import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScoringFactorName } from '@prisma/client';

export class ScoringFactorDto {
  @IsEnum(ScoringFactorName)
  factorName!: ScoringFactorName;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsBoolean()
  active!: boolean;

  @IsBoolean()
  hardExclusionEnabled!: boolean;
}

export class UpdateScoringConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoringFactorDto)
  scoringFactors!: ScoringFactorDto[];
}
