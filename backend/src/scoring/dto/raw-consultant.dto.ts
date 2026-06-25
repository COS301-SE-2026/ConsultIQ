import { IsArray, IsNumber, IsString, Min, ValidateNested } from "class-validator";
import { ConsultantSkillDto } from "./consultant-skill.dto";
import { Type } from "class-transformer";

export class RawConsultantDto {
    @IsString()
    consultantId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConsultantSkillDto)
    skills!: ConsultantSkillDto[];

    @IsNumber()
    @Min(0)
    costToCompanyRate!: number;


    @IsString()
    city!: string

    @IsString()
    province!: string;
}