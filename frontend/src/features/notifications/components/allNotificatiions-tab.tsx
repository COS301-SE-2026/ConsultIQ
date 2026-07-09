import NotificationItem from "../components/notification-item";
import { Pagination } from "../../../components/shared/pagination";


export interface Notification{
    id:string;
    userId: string;
    title: string;
    body: string;
    createdAt:string;
    link?: string;
    isRead?: boolean;
    isArchived?: boolean;
}

interface AllNotificationProps {
  readonly searchQuery?: string;
  readonly notifications: Notification[];
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly itemsPerPage?: number;
}

function getStatus(notification: Notification){
    if (notification.isArchived) return "archived";
    return notification.isRead ? "read" : "unread";

}


export default function AllTab({notifications, searchQuery= "",currentPage =1,onPageChange,itemsPerPage}:AllNotificationProps){
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
                    <NotificationItem 
                        key= {notification.id}
                        id={notification.id} 
                        title={notification.title}
                        body={notification.body}
                        createdAt={notification.createdAt}
                        link= {notification.link}
                        status={getStatus(notification)}
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