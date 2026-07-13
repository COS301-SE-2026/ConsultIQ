import NotificationCard from "./notification-card";
import type { NotificationItems } from "../types/notification.types";
import { Pagination } from "../../../components/shared/pagination";



interface NotificationListTabProps {
  readonly searchQuery?: string;
  readonly notifications: NotificationItems[];
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly itemsPerPage?: number;
  readonly selectedIds: string[];
  readonly onToggleSelect:(id:string) => void;
  
}

function getStatus(notification: NotificationItems){
    if (notification.isArchived) return "archived";
    return notification.isRead ? "read" : "unread";

}


export default function NotificationListTab({notifications, searchQuery= "",currentPage =1,onPageChange,itemsPerPage=10,selectedIds,onToggleSelect}:NotificationListTabProps){
    const filtered = notifications.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const limit = itemsPerPage ?? 10;

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems/limit) || 1;

    const startIndex = (currentPage-1) * limit;
    const endIndex= Math.min(startIndex + limit,totalItems);
    const paginatedItems= filtered.slice(startIndex,endIndex);
    return(
        <div className="w-full flex flex-col">
            <div className="flex w-full flex-col ">
                {paginatedItems.map((notification) => (
                    <NotificationCard
                        key= {notification.id}
                        id={notification.id} 
                        title={notification.title}
                        body={notification.body}
                        createdAt={notification.createdAt}
                        link= {notification.link ?? ""}
                        status={getStatus(notification)}
                        checked={selectedIds.includes(notification.id)}
                        onCheckedChange={() => onToggleSelect(notification.id)}
                    />
                ))}
            </div>

            
        {totalItems > 0 && (
            <div className="flex flex-col items-center gap-4 mt-6">
              
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            </div>
        )}
      
        </div>
      

    );
}