type GapSeverity = "ADEQUATELY_COVERED" | "PARTIALLY_COVERED" | "NOT_COVERED";

interface SkillGapItem {
    skillName: string;
    requiredCount: number;
    availableCount: number;
    coveragePercentage: number;
    severity: GapSeverity;
}

interface SkillGapSummary {
    overallCoveragePercentage: number;
    adequatelyCoveredCount: number;
    partiallyCoveredCount: number;
    notCoveredCount : number;
}

interface ProjectSkillGapResponse {
    projectId: string;
    projectName: string;
    summary: SkillGapSummary;
    skills: SkillGapItem[];
}

interface PortfolioSkillGapResponse {
    summary: SkillGapSummary;
    skills: SkillGapItem[];
    alerts: ProjectGapAlert[];
}

interface ProjectGapAlert {
    projectId: string;
    projectName: string;
    severity: GapSeverity;
    gappedSkills: Pick<SkillGapItem, "skillName" | "requiredCount" | "availableCount">[];
}