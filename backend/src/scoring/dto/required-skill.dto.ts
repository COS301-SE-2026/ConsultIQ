import { CompetencyLevel } from "@prisma/client";
import { IsEnum, IsString, IsBoolean } from "class-validator";


export class RequiredSkillDto {
    @IsString()
    skillName!: string;

    @IsEnum(CompetencyLevel)
    minimumCompetencyLevel!: CompetencyLevel;

    @IsBoolean()
    isMandatory!: boolean;
}