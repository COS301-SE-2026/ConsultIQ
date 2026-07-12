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

export class ProjectScoringFactorDto {
  @IsEnum(ScoringFactorName)
  factorName!: ScoringFactorName;

  @IsNumber()
  @Min(0)
  @Max(100)
  overrideWeight!: number;

  @IsBoolean()
  active!: boolean;
}

export class UpdateProjectScoringOverrideDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectScoringFactorDto)
  factors!: ProjectScoringFactorDto[];
}

export class DeleteProjectScoringOverrideDto {
  @IsBoolean()
  confirm!: boolean;
}
