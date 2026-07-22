import { Injectable } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';
import { COMPETENCY_RANK } from '../../enums/competency-level.enum';
import { ScoringFactor } from '../../enums/scoring-factor.enum';

@Injectable()
export class CompetencyMatchScorer {
  private readonly MANDATORY_WEIGHT = 2.0;
  private readonly OPTIONAL_WEIGHT = 1.0;
  private readonly SKILL_BONUS = 0.02;

  score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): FactorScoreResult {
    const { requiredSkills } = project;

    if (requiredSkills.length === 0) {
      return {
        score: 1,
        triggerHardExclusion: false,
        detail: {
          factor: ScoringFactor.COMPETENCY_LEVEL,
          perSkill: [],
        },
      };
    }

    const consultantRankByName = new Map<
      string,
      { rank: number; level: string }
    >();
    if (consultant.skills) {
      for (const s of consultant.skills) {
        consultantRankByName.set(s.skillName.trim().toLowerCase(), {
          rank: COMPETENCY_RANK[s.competencyLevel],
          level: s.competencyLevel,
        });
      }
    }

    let totalMarks = 0;
    let totalWeight = 0;
    let matchedRequiredSkills = 0;

    const perSkillDetails: Array<{
      skill: string;
      consultantLevel: string;
      requiredLevel: string;
      score: number;
      weight: number;
      isMandatory: boolean;
    }> = [];
    for (const req of requiredSkills) {
      const normalizedReqName = req.skillName.trim().toLowerCase();
      const consultantRank = consultantRankByName.get(normalizedReqName);
      const requiredRank = COMPETENCY_RANK[req.minimumCompetencyLevel] ?? 0;

      let skillScore = 0;
      let consultantLevel = 'NONE';

      if (consultantRank) {
        consultantLevel = consultantRank.level;
        matchedRequiredSkills++;

        if (requiredRank <= 0 || consultantRank.rank >= requiredRank) {
          skillScore = 1;
        } else {
          skillScore = consultantRank.rank / requiredRank;
        }
      }

      const isMandatory = req.isMandatory ?? false;
      const weight = isMandatory ? this.MANDATORY_WEIGHT : this.OPTIONAL_WEIGHT;

      totalMarks += skillScore * weight;
      totalWeight += weight;

      perSkillDetails.push({
        skill: req.skillName,
        consultantLevel: consultantLevel,
        requiredLevel: req.minimumCompetencyLevel,
        score: skillScore,
        weight: weight,
        isMandatory: isMandatory,
      });
    }

    const baseScore = totalWeight > 0 ? totalMarks / totalWeight : 0;

    // Bonus marks for consultants with extra set of skills
    const totalConsultantSkills = consultant.skills
      ? consultant.skills.length
      : 0;
    const extraSkillCount = Math.max(
      0,
      totalConsultantSkills - matchedRequiredSkills,
    );

    const skillCountBonus = extraSkillCount * this.SKILL_BONUS;
    const finalScore = Math.min(1, Math.max(0, skillCountBonus + baseScore));

    return {
      score: finalScore,
      triggerHardExclusion: false,

      detail: {
        factor: ScoringFactor.COMPETENCY_LEVEL,
        baseScore,
        bonusApplied: skillCountBonus,

        perSkill: perSkillDetails,
      },
    };
  }
}
