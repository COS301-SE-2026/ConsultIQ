import { CompetencyLevel } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";


export class ConsultantSkillDto {
    @IsString()
    skillName!: string;

    @IsEnum(CompetencyLevel)
    competencyLevel!: CompetencyLevel;
}