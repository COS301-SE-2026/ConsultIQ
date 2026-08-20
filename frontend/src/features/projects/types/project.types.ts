
export interface ProjectSkillData {
  id?: string;
  name: string;
  competency: string;
  years: number;
  mandatory: boolean;
}

export interface ProjectLocation {
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly suburb: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly location: ProjectLocation;
  readonly projectName: string;
  readonly clientName: string;
  readonly description: string;
  readonly teamSize: number;
  readonly allocation: number;
  readonly budget?: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "COMPLETED" | "ARCHIVED";

  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly suburb?: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;

  readonly skills: readonly ProjectSkillData[];
}


export interface AssignedConsultants{
  id: string,
  fullName: string;
  email: string;
  phoneNum:string | null;
  skills: string[];
  placementStatus: "ACTIVE" | "COMPLETED" | "CANCELLED" | "TERMINATED";
}

export function mapToAssignedConsultant(data: any): AssignedConsultants{
  return{
    id: data.consultantId,
    fullName: data.fullName,
    email: data.email,
    phoneNum: data.phone,
    skills: data.primarySkills ?? [],
    placementStatus: data.placementStatus,

  };
}

export interface ProjectConsultantDto {
    consultantId: string;
    placementId: string;
    fullName: string;
    email: string;
    phone: string | null;
    city: string;
    primarySkills: string[];
    placementStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED';
    allocation: number;
    startDate: Date;
    endDate: Date | null;
    costToCompany?: number;
}

export interface ProjectConsultantsResponseDto {
    projectId: string;
    totalPlacements: number;
    consultants: ProjectConsultantDto[];
}

export interface UnassignResponse{
  message: string;
  placementId: string;
}
