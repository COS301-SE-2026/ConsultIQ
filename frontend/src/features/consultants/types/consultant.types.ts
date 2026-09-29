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

export interface ConsultantSummary {
  consultantId: string;
  fullName: string;
  email: string;
}

export interface TeamSkillDemandItem {
  skillName: string;
  supply: number;
  trainingGap: number;
  projectsRequiringSkill: number;
  uncoveredProjectCount: number;
  consultantsWithSkill: ConsultantSummary[];
  consultantsNeedingTraining: ConsultantSummary[];
}

/** `skills` arrives pre-sorted, most urgent first — the UI does not re-sort. */
export interface TeamSkillDemandResponse {
  teamSize: number;
  skills: TeamSkillDemandItem[];
}

const c = (consultantId: string, fullName: string): ConsultantSummary => ({
  consultantId,
  fullName,
  email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
});

export const fallbackTeamSkillDemand: TeamSkillDemandResponse = {
  teamSize: 12,
  skills: [
    {
      skillName: "Azure AI Fundamentals",
      supply: 2,
      trainingGap: 3,
      projectsRequiringSkill: 14,
      uncoveredProjectCount: 6,
      consultantsWithSkill: [c("c1", "Thandi Mokoena"), c("c2", "Pieter van Wyk")],
      consultantsNeedingTraining: [
        c("c3", "Sipho Dlamini"),
        c("c4", "Aisha Patel"),
        c("c5", "Liam Botha"),
      ],
    },
    {
      skillName: "Data Engineering",
      supply: 3,
      trainingGap: 4,
      projectsRequiringSkill: 11,
      uncoveredProjectCount: 4,
      consultantsWithSkill: [c("c3", "Sipho Dlamini"), c("c10", "Lerato Mahlangu"), c("c11", "Daniel Smit")],
      consultantsNeedingTraining: [
        c("c6", "Naledi Khumalo"),
        c("c7", "Johan Pretorius"),
        c("c8", "Zanele Ndlovu"),
        c("c9", "Ravi Naidoo"),
      ],
    },
    {
      skillName: "Power BI",
      supply: 4,
      trainingGap: 2,
      projectsRequiringSkill: 9,
      uncoveredProjectCount: 4,
      consultantsWithSkill: [
        c("c6", "Naledi Khumalo"),
        c("c8", "Zanele Ndlovu"),
        c("c9", "Ravi Naidoo"),
        c("c12", "Megan Jacobs"),
      ],
      consultantsNeedingTraining: [c("c1", "Thandi Mokoena"), c("c2", "Pieter van Wyk")],
    },
    {
      skillName: "Databricks",
      supply: 1,
      trainingGap: 2,
      projectsRequiringSkill: 5,
      uncoveredProjectCount: 2,
      consultantsWithSkill: [c("c7", "Johan Pretorius")],
      consultantsNeedingTraining: [c("c10", "Lerato Mahlangu"), c("c11", "Daniel Smit")],
    },
  ],
};