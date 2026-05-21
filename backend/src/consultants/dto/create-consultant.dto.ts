import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsDateString,
  IsUUID,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsSAIdentityNumber } from '../../common/validators/is-sa-id.validator';

export class CreateConsultantSkillDto {
  @IsString()
  skillName!: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'EXPERT'], {
    message: 'competencyLevel must be BEGINNER, INTERMEDIATE, or EXPERT',
  })
  competencyLevel!: string;

  @IsNumber()
  @Min(0)
  @Max(50)
  yearsExperience!: number;

  @IsNumber()
  @Min(1)
  @Max(4)
  confidenceLevel!: number;
}

export class CreateConsultantExperienceDto {
  @IsString()
  jobTitle!: string;

  @IsString()
  companyName!: string;

  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'], {
    message:
      'jobType must be FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, or FREELANCE',
  })
  jobType!: string;

  @IsEnum(['ONSITE', 'REMOTE', 'HYBRID'], {
    message: 'workModel must be ONSITE, REMOTE, or HYBRID',
  })
  workModel!: string;

  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate?: string;

  @IsString()
  description!: string;
}

export class CreateCertificationDto {
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

export class CreateConsultantDto {
  @IsUUID('4', { message: 'consultantUserId must be a valid UUID' })
  consultantUserId!: string;

  @IsString()
  @Matches(/^\d{13}$/, { message: 'ID number must be exactly 13 digits' })
  @IsSAIdentityNumber()
  idNumber!: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone!: string;

  @IsString()
  nationality!: string;

  @IsString()
  location!: string;

  @IsNumber()
  @Min(0)
  costToCompany!: number;

  @IsEnum(['AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE'], {
    message: 'availability must be AVAILABLE, UNAVAILABLE, or ON_LEAVE',
  })
  availability!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConsultantSkillDto)
  skills!: CreateConsultantSkillDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConsultantExperienceDto)
  experiences!: CreateConsultantExperienceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCertificationDto)
  certifications?: CreateCertificationDto[];
}

export class ConsultantListItemDto {
  id!: string;
  fullName!: string;
  email!: string;
  location!: string;
  availabilityStatus!: string;
  primarySkills!: string[];
  costToCompanyRate?: number;
  phone?: string | null;
  idNumber?: string | null;
  experienceYears?: number;
  certifications?: string[];
}

export class PaginatedConsultantsResponseDto {
  page!: number;
  total!: number;
  consultants!: ConsultantListItemDto[];
}

export class PendingProfileUserDto {
  userId!: string;
  fullName!: string;
  email!: string;
  createdAt!: Date;
}
