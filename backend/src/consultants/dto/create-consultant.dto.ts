import {IsEmail, IsString, IsNumber, IsArray, ValidateNested, Min, Max} from "class-validator";
import {Type} from "class-transformer";

export class CreateConsultantSkillDto {
    @IsString()
    skillName!: string;

    @IsNumber()
    @Min(1)
    @Max(50)
    yearsExperience!: number;

    @IsNumber()
    @Min(1)
    @Max(50)
    confidenceLevel!: number;
}

export class CreateCertificationDto {
    @IsString()
    certificationName!: string;

    @IsString()
    issuingBody!: string;
    }

    export class CreateConsultantDto {
    @IsString()
    fullName!: string;

    @IsEmail()
    email!: string;

    @IsString()
    location!: string;

    @IsNumber()
    costToCompanyRate!: number;

    @IsString()
    availabilityStatus!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateConsultantSkillDto)
    skills!: CreateConsultantSkillDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCertificationDto)
    certifications!: CreateCertificationDto[];
}