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
import { BaseLocationDto } from '../../common/dto/base-location.dto';

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

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsInt()
  @Min(1)
  teamSize!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  allocation!: number;

  @IsNumber()
  @Min(0)
  budget!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectSkillDto)
  skills!: CreateProjectSkillDto[];
}
