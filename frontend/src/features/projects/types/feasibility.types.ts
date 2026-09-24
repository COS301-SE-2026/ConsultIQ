export type FeasibilityCompetency = "BEGINNER" | "INTERMEDIATE" | "EXPERT" ;

export interface FeasibilityRange {
    min: number;
    max: number;
}

export type FeasibilityValue = number | FeasibilityRange;

export interface FeasibilitySkillDto {
    name: string;
    competency: FeasibilityCompetency;
    years: number;
    mandatory: boolean;
}

export interface FeasibilityRequestDto {
    projectName?: string;
    clientName?: string;
    description?: string;
    addressLine1?: string;
    addressLine2?: string;
    suburb?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    startDate: string;
    endDate: string;
    teamSize: number;
    allocation: number;
    budget: number;
    minimumCompetency: FeasibilityCompetency;
    skills: FeasibilitySkillDto[];
}

export interface FeasibilitySummaryDto {
  eligibleCount: FeasibilityValue;
  topScore: FeasibilityValue | null;
}

export interface FeasibilityVariantDto {
  label: string;
  result: FeasibilitySummaryDto;
}

export interface FeasibilityResponseDto {
  base: FeasibilitySummaryDto;
  variants: FeasibilityVariantDto[];
}