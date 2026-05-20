
export interface ProjectSkillData {
  id?: string;
  name: string;
  competency: string;
  years: number;
  mandatory: boolean;
}

export interface ProjectLocation {
  readonly addressLine1: string;
  readonly addressLine2: string;
  readonly suburb: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;
}

export interface Project {
  readonly id: string;
  readonly projectName: string;
  readonly clientName: string;
  readonly description: string;
  readonly teamSize: number;
  readonly allocation: number;
  readonly budget: number;
  readonly startDate: string;
  readonly endDate: string;

  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly suburb?: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;

  readonly skills: readonly ProjectSkillData[];
}
