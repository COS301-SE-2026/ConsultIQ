export interface Skill {
  readonly id: number;
  readonly name: string;
  readonly competency: string;
  readonly years: number;
  readonly mandatory: boolean;
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
  readonly id: number;
  readonly name: string;
  readonly clientName: string;
  readonly description: string;
  readonly teamSize: number;
  readonly allocation: number;
  readonly budget: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly location: ProjectLocation;
  readonly skills: readonly Skill[];
}