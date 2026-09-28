import { apiClient } from "../../../lib/api-client";
import type { GetAllUsersResponse,GetAllProjectsResponse,MessageResponse } from "../types/admin.types";

export const getAllUsers = async (
    page =1,
    limit= 10,
    search = "",
    role = "",
    status = "",
) => {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    if (search) {
        params.set("search", search);
    };

    if (role) {
        params.set("role", role);
    };

    if (status) {
        params.set("status", status);
    };
    
    return await apiClient.get<GetAllUsersResponse>(
        `/admin/users?${params.toString()}`
    ); 
};

export const deleteUser = async (userId: string) =>{
   return await apiClient.delete<MessageResponse>(`/admin/users/${userId}`);

}

export const activateUser = async (userId:string) =>{
   return await apiClient.patch<MessageResponse>(`/admin/users/${userId}/activate`);
    
}


export const suspendUser = async (userId:string) =>{
    return await apiClient.patch<MessageResponse>(`/admin/users/${userId}/suspend`);

}


export const getAllProjects = async (
    page =1,
    limit= 10,
    search = "",
    budgetSort: "asc" | "desc" | "" = "",
) => {

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    if (search) {
        params.set("search", search);
    };

    if (budgetSort) {
        params.set("budgetSort", budgetSort);
    };
    
    return await apiClient.get<GetAllProjectsResponse>(
        `/admin/projects?${params.toString()}`
    );
};

export const archiveProject = async (projectId: string) =>{
    return await apiClient.patch<MessageResponse>(`/admin/projects/${projectId}/archive`);

    
}

export const unarchiveProject = async (projectId: string) =>{
  return await apiClient.patch<MessageResponse>(`/admin/projects/${projectId}/unarchive`);
}



