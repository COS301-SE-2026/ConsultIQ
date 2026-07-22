import { apiClient } from "../../../lib/api-client";
import type {NotificationItems,ReadAllResponse} from "../types/notification.types"


    export const getNotifications= async () =>{
        return await apiClient.get<NotificationItems[]>("/notifications");
    }

    export const getArchivedNotifications= async () =>{
        return await apiClient.get<NotificationItems[]>("/notifications/archived");
    }

    export const markAsRead= async (id:string) =>{
        return await apiClient.patch<NotificationItems>(`/notifications/${id}/read`);
    }

    export const markAllAsRead= async () => {
        return await apiClient.patch<ReadAllResponse>(`/notifications/read-all`);

    }

    export const archiveNotification= async (id:string) =>{
        return await apiClient.patch<NotificationItems>(`/notifications/${id}/archive`);
    }




