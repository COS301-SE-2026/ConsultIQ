import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectSkillDto {
  @IsString()
  skillName!: string;

  @IsString()
  minimumCompetency!: string;

  @IsBoolean()
  isMandatory!: boolean;
}

export class CreateProjectDto {
  @IsString()
  projectName!: string;

  @IsString()
  clientName!: string;

  @IsString()
  city!: string;

  @IsString()
  province!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsInt()
  @Min(1)
  teamSize!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  requiredAllocationPercentage!: number;

  @IsNumber()
  @Min(0)
  clientBillingBudget!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectSkillDto)
  skills!: CreateProjectSkillDto[];
}

export class CreateProjectResponseDto {
  message!: string;
  projectId!: string;
}