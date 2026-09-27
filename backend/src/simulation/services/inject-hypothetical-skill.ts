import { RawConsultantDto } from "../../scoring/dto/raw-consultant.dto";
import { HypotheticalSkillInput } from "../interfaces/simulation-result.interface";


/**
 * Returns a NEW RawConsultantDto with the hypothetical skill added,
 * replacing any existing entry for the same skill name (case-insensitive).
 * Never mutates the input — the real consultant's in-memory representation
 * is left untouched, and nothing here ever touches the database.
 */
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