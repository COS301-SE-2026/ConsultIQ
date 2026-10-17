import { Injectable } from '@nestjs/common';
import { RawConsultantDto } from '../../dto/raw-consultant.dto';
import { RawProjectDto } from '../../dto/raw-project.dto';
import { FactorScoreResult } from '../interfaces/factor-score-result.interface';
import { COMPETENCY_RANK } from '../../enums/competency-level.enum';

@Injectable()
export class CompetencyMatchScorer {
  private readonly MANDATORY_WEIGHT = 2.0;
  private readonly OPTIONAL_WEIGHT = 1.0;
  private readonly SKILL_BONUS = 0.02;
  private readonly OVER_QUALIFIED_PENALTY = 0.15;

  score(
    consultant: RawConsultantDto,
    project: RawProjectDto,
  ): FactorScoreResult {
    const { requiredSkills } = project;

    if (requiredSkills.length === 0) {
      return {
        score: 1,
        triggerHardExclusion: false,
        details: 'No specific competency levels required by project.',
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
    const missingMandatorySkills: string[] = [];

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
      const isMandatory = req.isMandatory ?? false;

      let skillScore = 0;
      let consultantLevel = 'NONE';

      if (consultantRank) {
        consultantLevel = consultantRank.level;
        matchedRequiredSkills++;

        if (requiredRank <= 0) {
          skillScore = 1;
        } else {
          const rankDifference = consultantRank.rank - requiredRank;

          if (rankDifference === 0) {
            skillScore = 1.0;
          } else if (rankDifference > 0) {
            //overqualified consultants are pernalized by their level of qualification
            const penalty = rankDifference * this.OVER_QUALIFIED_PENALTY;
            skillScore = Math.max(0.7, 1.0 - penalty);
          } else {
            skillScore = consultantRank.rank / requiredRank;
          }
        }
      } else if(isMandatory) {
        // completely absent mandatory skill results in a hard exclusion
          missingMandatorySkills.push(req.skillName);
        }
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
      const baseFormatted = (baseScore * 100).toFixed(1);

      const bonusFormatted = (skillCountBonus * 100).toFixed(1);
      let detailString = `Competency Match: ${baseFormatted}%.`;

      if (extraSkillCount > 0) {
        detailString += ` Bonus applied for ${extraSkillCount} extra skill(s): +${bonusFormatted}%.`;
      }

      if( missingMandatorySkills.length > 0) {
        detailString += ` Missing mandatory skill(s): ${missingMandatorySkills.join(', ')}.`;
      }

    return {
      score: finalScore,
      triggerHardExclusion: missingMandatorySkills.length > 0,
      missingMandatorySkills,
      details: detailString,
    };
  }
}
