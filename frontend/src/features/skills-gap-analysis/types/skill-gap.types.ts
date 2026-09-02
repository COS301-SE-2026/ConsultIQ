type GapSeverity = "ADEQUATELY_COVERED" | "PARTIALLY_COVERED" | "NOT_COVERED";

export interface SkillGapItem {
    skillName: string;
    requiredCount: number;
    availableCount: number;
    coveragePercentage: number;
    severity: GapSeverity;
}

export interface SkillGapSummary {
    overallCoveragePercentage: number;
    adequatelyCoveredCount: number;
    partiallyCoveredCount: number;
    notCoveredCount : number;
}

export interface ProjectSkillGapResponse {
    projectId: string;
    projectName: string;
    summary: SkillGapSummary;
    skills: SkillGapItem[];
}

export interface PortfolioSkillGapResponse {
    summary: SkillGapSummary;
    skills: SkillGapItem[];
    alerts: ProjectGapAlert[];
}

export interface ProjectGapAlert {
    projectId: string;
    projectName: string;
    severity: GapSeverity;
    gappedSkills: Pick<SkillGapItem, "skillName" | "requiredCount" | "availableCount">[];
}