type GapSeverity = "COVERED" | "AT_RISK" | "CRITICAL";

export interface SkillGapItem {
    skillId?: string;
    skillName: string;
    requiredCount: number;
    availableCount: number;
    coveragePercent: number;
    severity: GapSeverity;
}

export interface SkillGapSummary {
    overallCoveragePercent: number;
    adequatelyCoveredCount: number;
    atRiskCount: number;
    criticalCount : number;
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