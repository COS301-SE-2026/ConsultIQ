import { Injectable } from "@nestjs/common";
import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
import { FactorScoreResult } from "./factor-score-result.interface";
import { COMPETENCY_RANK } from "../enums/competency-level.enum";
import { ScoringFactor } from "../enums/scoring-factor.enum";


@Injectable()
export class CompetencyMatchScorer {

    score(consultant: RawConsultantDto, project: RawProjectDto): FactorScoreResult {
        const { requiredSkills } = project;

        if (requiredSkills.length === 0) {
            return {
                score: 1, triggerHardExclusion: false,
                detail: {
                    factor: ScoringFactor.COMPETENCY_MATCH,
                    perSkill: [],
                }
            };
        }

        const consultantRankByName = new Map<string, { rank: number, level: string }>();
        if (consultant.skills) {
            for (const s of consultant.skills) {
                consultantRankByName.set(
                    s.skillName.trim().toLowerCase(),
                    {
                        rank: COMPETENCY_RANK[s.competencyLevel],
                        level: s.competencyLevel
                    }
                );
            }

        }

        let totalMarks = 0;
        const perSkillDetails: Array<{
            skill: string;
            consultantLevel: string;
            requiredLevel: string;
            score: number;
        }> = [];
        for (const req of requiredSkills) {
            const normalizedReqName = req.skillName.trim().toLowerCase();
            const consultantRank = consultantRankByName.get(normalizedReqName);
            const requiredRank = COMPETENCY_RANK[req.minimumCompetencyLevel] ?? 0;

            let skillScore = 0;
            let consultantLevel = 'NONE'

            if (consultantRank) {
                consultantLevel = consultantRank.level;

                if (requiredRank <= 0 || consultantRank.rank >= requiredRank) {
                    skillScore = 1;

                } else {
                    skillScore = consultantRank.rank / requiredRank;


                }
            }

            totalMarks += skillScore;


            perSkillDetails.push({
                skill: req.skillName,
                consultantLevel: consultantLevel,
                requiredLevel: req.minimumCompetencyLevel,
                score: skillScore,
            })

        }

        const average = totalMarks / requiredSkills.length;
        const score = Math.min(1, Math.max(0, average));

        return {
            score, triggerHardExclusion: false,

            detail: {
                factor: ScoringFactor.COMPETENCY_MATCH,

                perSkill: perSkillDetails,

            }

        }
    }
}