export type FeasibilityCompetency = "BEGINNER" | "INTERMEDIATE" | "EXPERT" ;

export type FeasibilityWorkModel = "ONSITE" | "REMOTE" | "HYBRID";

export interface FeasibilitySkillDto {
    name: string;
    competency: FeasibilityCompetency;
    years: number;
    mandatory: boolean;
}

export interface FeasibilityRequestDto {
    startDate: string;
    endDate: string;
    teamSize: number;
    allocation: number;
    budget: number;
    skills: FeasibilitySkillDto[];
    city: string;
    province: string;
    workModel: FeasibilityWorkModel;
    latitude?: number;
    longitude?: number;
}


export interface FeasibilityResultDto {
  eligibleCount: number;
  topScore: number;
}

export interface FeasibilityVariantResultDto extends FeasibilityResultDto {
  label: string;
  kind: string;
  skillName?: string;
  fromLevel?: FeasibilityCompetency;
  toLevel?: FeasibilityCompetency;
  message?: string;
}

export interface FeasibilityResponseDto extends FeasibilityResultDto {
  variants: FeasibilityVariantResultDto[];
}