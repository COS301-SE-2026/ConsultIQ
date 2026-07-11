export interface NotificationItems{
    id:string;
    userId: string;
    title: string;
    body: string;
    createdAt:string;
    link?: string | null;
    isRead?: boolean;
    isArchived?: boolean;
    archivedAt?: string | null;
}

export interface ReadAllResponse{
    count: number;

}