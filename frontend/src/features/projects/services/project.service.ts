import { apiClient } from "../../../lib/api-client";
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
}
 
export interface PaginatedProjectsResponse{
    page: number;
    total: number;
    projects: ApiProject[];
}
export const getProjects= async(page=1, limit=50)=>{
    return await apiClient.get<PaginatedProjectsResponse>(`/projects?page=${page}&limit=${limit}`);
}