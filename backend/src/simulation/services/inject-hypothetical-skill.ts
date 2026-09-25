import { RawConsultantDto } from "../../scoring/dto/raw-consultant.dto";
import { HypotheticalSkillInput } from "../interfaces/simulation-result.interface";

export function injectHypotheticalSkill(
 consultant: RawConsultantDto,
 candidateSkill: HypotheticalSkillInput,
): RawConsultantDto {
    const normaliseedName = candidateSkill.skillName.trim().toLowerCase();

    const skillWithoutExisting = consultant.skills.filter(
        (s) => s.skillName.trim().toLowerCase() !== normaliseedName,
    );

    return {
        ...consultant,
        skills: [
            ...skillWithoutExisting,
            {
                skillName: candidateSkill.skillName,
                competencyLevel: candidateSkill.competencyLevel,
            },
        ],
    };
}