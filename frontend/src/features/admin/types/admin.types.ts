export type UserRole = 
  'ADMIN' | 
  'PROJECT_MANAGER' |
  'CONSULTANT_MANAGER'|
  'CONSULTANT' 
;

export type ProjectStatus =
  'OPEN' |
  'IN_PROGRESS' |
  'CLOSED' |
  'ARCHIVED' |
  'COMPLETED'
;


export interface AdminUserItem{
    id:string;
    fullName: string;
    email: string;
    role: UserRole;
    status: 'ACTIVE' | 'SUSPEND' | 'ARCHIVED';
    createdAt: string;
}

export interface PaginationMeta{
    totalRecords: number;
    currentPage: number;
    totalPages: number;
}

export interface UserMeta{
    totalRecords: number;
    absoluteTotalRecords: number;
    activeUsers: number;
    suspendedUsers: number;
    currentPage: number;
    totalPages: number;
}


export interface GetAllUsersResponse{
    data: AdminUserItem[];
    meta: UserMeta;
}



export interface AdminProjectItem{
    id:string;
    projectName: string;
    status:  ProjectStatus;
    clientName: string;
    createdAt: string;
    budget: number;

}

export interface ProjectMeta{
    totalRecords: number;
    absoluteTotalRecords: number;
    currentPage: number;
    totalPages: number;
}

export interface GetAllProjectsResponse{
    data: AdminProjectItem[];
    meta: ProjectMeta;
}


export interface MessageResponse{
    message:string;
}
