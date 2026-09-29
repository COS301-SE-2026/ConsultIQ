const competencyMap: Record<string, string> = {
  "BEGINNER": "Beginner",
  "INTERMEDIATE": "Intermediate",
  "EXPERT": "Expert"
};

export const normalizeCompetency = (text: string): string => {
  return competencyMap[text] || text;

};

export const normalizeJobType = (text: string): string => {
  return jobTypeMap[text] || text;

};

export const normalizeWorkModel = (text: string): string => {
  return workModelMap[text] || text;

};

const jobTypeMap: Record<string, string> = {
  "FULL_TIME": "Full time",
  "PART_TIME": "Part time",
  "CONTRACT": "Contract",
  "INTERNSHIP": "Internship",
  "FREELANCE": "Freelance"
};

const workModelMap: Record<string, string> = {
  "ONSITE": "Onsite",
  "REMOTE": "Remote",
  "HYBRID": "Hybrid",
};

export interface SkillRecommendation {
  skillName: string;
  newlyEligibleProjectCount: number;
  totalScoreDelta: number;
  projectsTested: number;
  projectedEligibleCount: number;
}

export interface SkillGrowthResponse {
  eligibleNow: number;
  pipelineSize: number;
  recommendations: SkillRecommendation[];
}

export const fallbackEligibility = { eligibleNow: 8, pipelineSize: 24 };

export const fallbackRecommendations: SkillRecommendation[] = [
  {
    skillName: "Azure AI Fundamentals",
    newlyEligibleProjectCount: 8,
    totalScoreDelta: 12,
    projectsTested: 24,
    projectedEligibleCount: 16,
  },
  {
    skillName: "Data Engineering",
    newlyEligibleProjectCount: 6,
    totalScoreDelta: 9,
    projectsTested: 24,
    projectedEligibleCount: 14,
  },
  {
    skillName: "Power BI",
    newlyEligibleProjectCount: 4,
    totalScoreDelta: 7,
    projectsTested: 24,
    projectedEligibleCount: 12,
  },
];