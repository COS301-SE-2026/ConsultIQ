import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsDateString,
  Matches
} from 'class-validator';

import { Type } from 'class-transformer';
import { IsSAIdentityNumber } from '../../common/validators/is-sa-id.validator';

export class UpdateConsultantSkillDto {
  @IsString()
  skillName!: string;

  @IsNumber()
  @Min(0)
  @Max(50)
  yearsExperience!: number;

  @IsNumber()
  @Min(1)
  @Max(4)
  confidenceLevel!: number;
}

export class UpdateConsultantExperienceDto {
  @IsString()
  jobTitle!: string;

  @IsString()
  companyName!: string;

  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'], {
    message:
      'Job type must be one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE.',
  })
  jobType!: string;

  @IsEnum(['ONSITE', 'REMOTE', 'HYBRID'], {
    message: 'Work model must be one of: ONSITE, REMOTE, HYBRID.',
  })
  workModel!: string;

  @IsDateString(
    {},
    { message: 'Start date must be a valid ISO 8601 date string.' },
  )
  startDate!: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'End date must be a valid ISO 8601 date string.' },
  )
  endDate?: string;

  @IsString()
  description!: string;
}

export class UpdateConsultantCertificationDto {
  @IsString()
  title!: string;

  @IsString()
  issuingBody!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateConsultantEducationDto {
  @IsString()
  @IsNotEmpty()
  institution!: string;

  @IsString()
  @IsNotEmpty()
  qualification!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class UpdateConsultantDto {

  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$/, { message: 'ID number must be exactly 13 digits' })
  @IsSAIdentityNumber()
  idNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Nationality must contain letters only' })
  nationality?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  suburb?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costToCompany?: number;

  @IsOptional()
  @IsEnum(['AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE'], {
    message: 'Availability status must be one of: AVAILABLE, UNAVAILABLE, ON_LEAVE.',
  })
  availability?: string;

  @IsOptional()
  @IsArray()
  @Type(() => UpdateConsultantSkillDto)
  skills?: UpdateConsultantSkillDto[];

  @IsOptional()
  @IsArray()
  @Type(() => UpdateConsultantExperienceDto)
  experiences?: UpdateConsultantExperienceDto[];

  @IsOptional()
  @IsArray()
  @Type(() => UpdateConsultantCertificationDto)
  certifications?: UpdateConsultantCertificationDto[];

  @IsOptional()
  @IsArray()
  @Type(() => UpdateConsultantEducationDto)
  education?: UpdateConsultantEducationDto[];
}
