import { apiClient } from "../../../lib/api-client";
import  { type AssignedConsultants, mapToAssignedConsultant , type ProjectConsultantsResponseDto, type UnassignResponse} from "../types/project.types";

export interface ApiProject {
  id: string;
  projectName: string;
  clientName: string;
  teamSize: number;
  requiredAllocationPercentage: number;
  clientBillingBudget: number;
  startDate: string;
  endDate?: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "COMPLETED";
  city: string;
  province: string;
  gapSeverity?: "COVERED" | "AT_RISK" | "CRITICAL";
}
 
export interface ProjectPlacementContext{
    id: string;
    projectName: string;
    allocation: number;
    startDate: string;
    endDate: string | null;
}
export interface PaginatedProjectsResponse{
    page: number;
    total: number;
    projects: ApiProject[];
}

export const getProjects= async(page=1, limit=50)=>{
    return await apiClient.get<PaginatedProjectsResponse>(`/projects?page=${page}&limit=${limit}`);
}

export const getProjectById = async(projectId: string): Promise<ProjectPlacementContext> =>{
    return apiClient.get<ProjectPlacementContext>(`/projects/${projectId}`);
}

export const getConsultantsByProject = async (projectId: string): Promise<AssignedConsultants[]> =>{
    const response= await apiClient.get<ProjectConsultantsResponseDto>(`/consultants/project/${projectId}`);
    return response.consultants.map(consultant => mapToAssignedConsultant(consultant));
}

export const unassignConsultant = async (projectID :string, consultantID: string)=>{
    return await apiClient.patch<UnassignResponse>(`/consultants/project/${projectID}/unassign/${consultantID}`);
}