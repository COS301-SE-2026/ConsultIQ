import { Injectable } from "@nestjs/common";
import { RawConsultantDto } from "../dto/raw-consultant.dto";
import { RawProjectDto } from "../dto/raw-project.dto";
import { FactorScoreResult } from "./factor-score-result.interface";
import { COMPETENCY_RANK } from "../enums/competency-level.enum";


@Injectable()
export class CompetencyMatchScorer {

    score(consultant: RawConsultantDto, project: RawProjectDto): FactorScoreResult {
        const { requiredSkills } = project;

        if (requiredSkills.length === 0) {
            return { score: 1, triggerHardExclusion: false };
        }

        const consultantRankByName = new Map<string, number>(
            consultant.skills.map((s) => [
                s.skillName.trim().toLowerCase(),
                COMPETENCY_RANK[s.competencyLevel]
            ] as [string, number])
        );

        let totalMarks = 0;
        for (const req of requiredSkills) {
            const normalizedReqName = req.skillName.trim().toLowerCase();
            const consultantRank = consultantRankByName.get(normalizedReqName);

            if (consultantRank === undefined) {
                continue;
            }
            const requiredRank = COMPETENCY_RANK[req.minimumCompetencyLevel] ?? 0;
            if (requiredRank <= 0) {
                totalMarks += 1;
                continue;
            }
            if (consultantRank >= requiredRank) {
                totalMarks += 1;
            } else {
                totalMarks += consultantRank / requiredRank;
            }

        }

        const average = totalMarks / requiredSkills.length;
        const score = Math.min(1, Math.max(0, average));

        return { score, triggerHardExclusion: false }
    }
}