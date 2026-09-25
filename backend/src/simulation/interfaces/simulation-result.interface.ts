import { CompetencyLevel } from '@prisma/client';

export interface HypotheticalSkillInput {
    skillName: string;
    competencyLevel: CompetencyLevel;
}

export interface SimulationResult {
    consultantId: string;
    projectSkillName: string;
    candidateSkillNmae: string;
    baselineScore: number;
    projectedScore: number;
    scoreDelta: number;
    excluded: boolean;
    excludedReason?: string;
}