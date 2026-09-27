import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkModel } from '@prisma/client';
import { BaseLocationDto } from '../../common/dto/base-location.dto';
import { NoDuplicateSkills } from '../../common/validators/no-duplicate-skills.validator';

export class CreateProjectSkillDto {
  @IsString()
  name!: string;

  @IsString()
  competency!: string;

  @IsInt()
  @Min(0)
  years!: number;

  @IsBoolean()
  mandatory!: boolean;
}

export class CreateProjectDto extends BaseLocationDto {
  @IsString()
  projectName!: string;

  @IsString()
  clientName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate!: string;

  // @IsOptional()
  @IsDateString()
  endDate!: string;

  @IsInt()
  @Min(1)
  teamSize!: number;

  @IsInt()
  @Min(10)
  @Max(100)
  allocation!: number;

  @IsNumber()
  @Min(0)
  budget!: number;

  @IsEnum(WorkModel, {
    message: 'Work model must be one of: ONSITE, REMOTE, HYBRID'
  })
  workModel!: WorkModel;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectSkillDto)
  @NoDuplicateSkills()
  skills!: CreateProjectSkillDto[];

}
