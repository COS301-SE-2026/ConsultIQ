import {IsEmail, IsString, IsNumber, IsArray, ValidateNested, Min, Max, IsBoolean} from "class-validator";
import {Type} from "class-transformer";

export class CreateConsultantSkillDto {
    @IsString()
    skillName!: string;

    @IsString()
    experience!: string;

    @IsString()
    competencyLevel!: string;
}

export class CreateCertificationDto {
    @IsString()
    title!: string;
    }

    export class CreateConsultantDto {
    @IsString()
    name!: string;

    @IsString()
    surname!: string;

    @IsString()
    idNumber!: string;

    @IsString()
    phoneNumber!: string;

    @IsEmail()
    email!: string;

    @IsString()
    location!: string;

    @IsBoolean()
    availability!: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateConsultantSkillDto)
    skills!: CreateConsultantSkillDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCertificationDto)
    certifications!: CreateCertificationDto[];
}

export class ConsultantListItemDto {
    id!: string;
    fullName!: string;
    email!: string;
    location!: string;
    availabilityStatus!: string;
    primarySkills!: string[];
}

export class PaginatedConsultantsResponseDto {
  page!: number;
  total!: number;
  consultants!: ConsultantListItemDto[];
}