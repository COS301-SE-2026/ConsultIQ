import {
  IsArray,
  IsDateString,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequiredSkillDto } from './required-skill.dto';

export class RawProjectDto {
  @IsString()
  projectId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredSkillDto)
  requiredSkills!: RequiredSkillDto[];

  @IsNumber()
  @Min(0)
  billingBudgetPerHour!: number;

  @IsString()
  city!: string;

  @IsString()
  province!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  requiredAllocationPercentage!: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // @IsOptional()
  // @IsBoolean()
  // isRemote?: boolean;

  // @IsOptional()
  // @IsString()
  // @IsIn(['ON_SITE', 'HYBRID', 'REMOTE'])
  // workModel?: 'ON_SITE' | 'HYBRID' | 'REMOTE';
}
