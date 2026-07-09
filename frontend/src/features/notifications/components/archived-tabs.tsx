import { Pagination } from "../../../components/shared/pagination";

export interface Notification{
    userId: string;
    title: string;
    body: string;
    link?: string;
}

interface ArchivedNotificaitionProps {
  readonly searchQuery?: string;
  readonly notifications: Notification[];
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly itemsPerPage?: number;
}



export default function ArchivedTab({}:ArchivedNotificaitionProps){
    return(
    <div></div>
        
    );
}