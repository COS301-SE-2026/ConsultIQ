import { Injectable } from "@nestjs/common";
import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
import { FactorScoreResult } from './factor-score-result.interface'


@Injectable()
export class SkillAligmentScorer {

    score(consultant: RawConsultantDto, project: RawProjectDto): FactorScoreResult {

        const { requiredSkills } = project;
        //if project has no skills required
        if (requiredSkills.length === 0) {
            return { score: 1, triggerHardExclusion: false };
        }

        const normalizeSkills = (skill) => skill.skillName.trim().toLowerCase();

        const possessedSkillNames = new Set(consultant.skills.map(normalizeSkills));

        let possessedCount = 0;
        const missingMandatorySkills: string[] = [];


        for (const req of requiredSkills) {
            const normalizeReqName = req.skillName.trim().toLocaleLowerCase();

            if (possessedSkillNames.has(normalizeReqName)) {
                possessedCount++;

            } else if (req.isMandatory) {
                missingMandatorySkills.push(req.skillName);
            }
        }

        const rawScore = possessedCount / requiredSkills.length;
        const score = Math.min(1, Math.max(0, rawScore));

        return {
            score,
            triggerHardExclusion: missingMandatorySkills.length > 0,
            missingMandatorySkills: missingMandatorySkills.length > 0 ? missingMandatorySkills : undefined,
        };

    }
}