import { apiClient } from "../../../lib/api-client";
import type { GetAllUsersResponse,GetAllProjectsResponse,MessageResponse } from "../types/admin.types";

export const getAllUsers = async (page =1, limit= 10) => {
    return await apiClient.get<GetAllUsersResponse>(
        `/admin/users?page=${page}&limit=${limit}`
    ); 

}

export const deleteUser = async (userId: string) =>{
   return await apiClient.delete<MessageResponse>(`/admin/users/${userId}`);

}

export const activateUser = async (userId:string) =>{
   return await apiClient.patch<MessageResponse>(`/admin/users/${userId}/activate`);
    
}


export const suspendUser = async (userId:string) =>{
    return await apiClient.patch<MessageResponse>(`/admin/users/${userId}/suspend`);

}


export const getAllProjects = async (page =1, limit= 10) => {
   return await apiClient.get<GetAllProjectsResponse>(
        `/admin/projects?page=${page}&limit=${limit}`
    );

    
}

export const archiveProject = async (projectId: string) =>{
    return await apiClient.patch<MessageResponse>(`/admin/projects/${projectId}/archive`);

    
}

export const unarchiveProject = async (projectId: string) =>{
  return await apiClient.patch<MessageResponse>(`/admin/projects/${projectId}/unarchive`);
}



