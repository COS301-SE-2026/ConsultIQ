import { Pagination } from "../../../components/shared/pagination";

export interface Notification{
    userId: string;
    title: string;
    body: string;
    link?: string;
}

interface UnreadNotificaitionProps {
  readonly searchQuery?: string;
  readonly notifications: Notification[];
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly itemsPerPage?: number;
}



export default function UnreadTab({}:UnreadNotificaitionProps){
    return(
        <div></div>
    );
}