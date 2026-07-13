import {consultantSidebarItems,consultantManagerSidebarItems, 
    projectManagerSidebarItems,adminSidebarItems,} from "../../../components/layout/sidebar/sidebar.config";
import { useAuth } from "../../../hooks/useAuth";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import SearchBar from "../../../components/shared/search-bar";
import {useState, useEffect} from "react";
import { Button } from "../../../components/ui/button";
import { CheckCheck } from "lucide-react";
import  NotificationTabs  from "../components/notifications-tab";
import AllTab from "../components/allNotificatiions-tab";
import UnreadTab from "../components/unread-tab";
import ArchivedTab from "../components/archived-tabs";
import {Card} from "../../../components/ui/card"
import { getNotifications,getArchivedNotifications,markAsRead, markAllAsRead, archiveNotification } from "../services/notification.services";
import type { NotificationItems } from "../types/notification.types";
import {toast} from "sonner";

export type notificationTab = "All" | "Unread" | "Archived";


function NotificationPage(){
    const { user } = useAuth();
    
    const roleSidebar ={
        CONSULTANT_MANAGER: consultantManagerSidebarItems,
        CONSULTANT: consultantSidebarItems,
        PROJECT_MANAGER: projectManagerSidebarItems,
        ADMIN: adminSidebarItems,
    };


    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAction, setSelectedAction] = useState("");
    const [activeTab, setActiveTab] = useState<notificationTab>("All");
    const [currentPage,setCurrentPage] = useState(1);
    const [Sort,setSort] = useState<"new" | "old" | "">("");
    const [selectedIds,setSelectedIds]= useState<string[]>([]);
    
    const [notifications,setNotifications] = useState<NotificationItems[]>([]);
    const [notificationError,setNotificationError]= useState<string | null>(null);
    const [unreadNotifications,setUnreadNotifications] = useState<NotificationItems[]>([]);
    const [archivedNotificationError,setArchivedNotificationError]= useState<string | null>(null);
    const [archivedNotifications,setArchivedNotifications]= useState<NotificationItems[]>([]);
    const [isNotificationLoading,setIsNotificationLoading] = useState(false);
    const [isArchivedLoading,setIsArchivedLoading] = useState(false);
   
   
       useEffect(() =>{
            const isUnread= (notification:NotificationItems) => !notification.isRead;
            const loadNotifications = async () =>{
                setIsNotificationLoading(true);
                
                try{
                    const res = await getNotifications();

                    setNotifications(res);

                    const UnreadNotifications= res.filter(isUnread);
                   

                    setUnreadNotifications(UnreadNotifications);
                    
                }catch (err){
                    setNotificationError(err instanceof Error ? err.message: "Failed to load notifications");
    
                }finally{
                    setIsNotificationLoading(false);
    
                }
            };
    
             loadNotifications();
    
        
    
        },[]);

    
        
        useEffect(() =>{
    
            const loadArchivedNotifications = async () =>{
             
            setIsArchivedLoading(true);
            setArchivedNotificationError(null);
        
            try{
                const res = await getArchivedNotifications();
                setArchivedNotifications(res);
            }catch (err){
                setArchivedNotificationError(err instanceof Error ? err.message: "Failed to archived Notifications");
        
            }finally{
                setIsArchivedLoading(false);
        
            }
      
            };
    
            loadArchivedNotifications();
    
        },[]);

        const getSortedNotifications = (n: NotificationItems[])=> {
            if(Sort === "new"){
                return [...n].sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
            if(Sort === "old"){
                return  [...n].sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }
            return n;
        };
     const currentTabNotification: NotificationItems[]= activeTab === "All" ? notifications: activeTab === "Unread" ? unreadNotifications : archivedNotifications;
    
    const refreshNotifications = async () => {
        try{
            const notiRes = await getNotifications();
            const archRes = await getArchivedNotifications();
            setNotifications(notiRes);
            setUnreadNotifications(notiRes.filter(n => !n.isRead));
            setArchivedNotifications(archRes);
        }catch (err){
            toast.error(err instanceof Error ? err.message :"Failed to sync Notifications");
        }
    };

    
    const handleMarkAsRead = async (ids: string | string[]) => {
         const ChosenIds = Array.isArray(ids) ? ids : [ids];
        if (ChosenIds.length === 0) return;

        const promiseToast = toast.loading(
            ChosenIds.length === 1 ? "Marking notification as read..." : `Marking ${ChosenIds.length} notifications as read...`
        );

         try{
              await Promise.all(ChosenIds.map(id => markAsRead(id)));
              toast.success( ChosenIds.length === 1 ? "Marked notification as read" : "Selected notifications marked as read",{id:promiseToast});
              setSelectedIds(prev => prev.filter(id=>!ChosenIds.includes(id)));
              await refreshNotifications();
 
            }catch (err){
                toast.error(err instanceof Error ? err.message :"Failed to mark  as read",{id:promiseToast});
        
            }

    }

    const handleReadAll = async () =>{
        try{
            await markAllAsRead();
            toast.success("All notifications marked as read");
            await refreshNotifications();
        }catch(err){
            toast.error(err instanceof Error ? err.message :"Failed to mark all as read");
        }
        
    }

    const handleArchive = async (ids: string | string []) =>{
           const ChosenIds = Array.isArray(ids) ? ids : [ids];
        if (ChosenIds.length === 0) return;

        const promiseToast = toast.loading(
            ChosenIds.length === 1 ? "Archiving notification ..." : `Archiving ${ChosenIds.length} notifications ...`
        );

        try {
            await Promise.all(ChosenIds.map(id => archiveNotification(id)));
            toast.success( ChosenIds.length === 1 ? "Notification archived" : "Selected notifications archived",{id:promiseToast});
            setSelectedIds(prev => prev.filter(id=>!ChosenIds.includes(id)));
            await refreshNotifications();
        } catch (err) {
           toast.error(err instanceof Error ? err.message :"Failed to archive notification",{id:promiseToast});
        }
       

    }



     const handleSelectedDropdown = async (action:string) =>{
        if(selectedIds.length === 0){
            toast.error("Please select at least one notification.");
            setSelectedAction("");
            return;
        }

        if(action === "read"){
            await handleMarkAsRead(selectedIds);
        }else if(action === "archive"){
            await handleArchive(selectedIds);

        }

        setSelectedAction("");

    }

    const handleToggleSelect= (id:string)=>{
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev,id]
        );
    }

     const handleTabChange = (tab: notificationTab) => {
            setActiveTab(tab);
            setSearchQuery("");
            setCurrentPage(1);
            setSelectedIds([]);
        }

    

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        
    };

    const handleCheckAll = () =>{
        if(selectedIds.length === currentTabNotification.length){
            setSelectedIds([]);
        }else{
            setSelectedIds(currentTabNotification.map(n=>n.id));
        }

    };

    const sidebarItems = roleSidebar[user?.role as keyof typeof roleSidebar] || adminSidebarItems;

    return(
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={sidebarItems} />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto  gap-4">
                <header
                    className="shrink-0 z-20 bg-white border-b h-22.5 flex items-center justify-between w-full"
                    style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                >
                    <h1 className="font-bold" style={{ color: "var(--color-primary)", fontSize: "32px" }}>
                        Notifications
                    </h1>
                </header>

                {(notificationError || archivedNotificationError) &&(
                    <div className="px-8 mt-2">
                        <p className="px-8 text-red-600 text-sm">{notificationError ?? archivedNotificationError}</p>     
                    </div>
                   
                )}

                <main className="flex-1 overflow-y-auto  overscroll-none relative ">
                    {isNotificationLoading || isArchivedLoading ? (
                        <div className="flex absolute inset-0 items-center justify-center font-medium" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>
                         Loading notifications...
                        </div>
                    ): (
                        <div className=" flex flex-col gap-4  max-w-[1600px] mx-auto w-full pb-8 mt-6" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
                        <SearchBar
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder={"Search notifications..."}
                        /> 

                   
                            <Card className="rounded-md">
                                <div className="flex gap-6 w-full items-center " style={{ backgroundColor:"#F5F9FF",  padding: "20px"}}>
                                
                                    <div className="flex gap-4 items-center  mr-auto">
                                        <input 
                                            type="checkbox" 
                                            name="check-all" 
                                            className="w-4 h-4" 
                                            checked={currentTabNotification.length > 0 && selectedIds.length === currentTabNotification.length}
                                            onChange={handleCheckAll}
                                        />
                                        <h2 style={{color: "var(--color-primary)", fontSize: "24px"}}>Notifications</h2>
                                    </div>


                                    <div className="flex justify-end gap-4 w-full">
                                        <select
                                            value= {selectedAction}
                                            onChange={(e) => handleSelectedDropdown(e.target.value)}
                                            className=" w-32 border bg-white px-4 py-1.5 leading-normal font-bold text-xs   hover:bg-slate-100 "
                                            style={{
                                                    borderColor: "var(--color-text-primary)",
                                                    color: "var(--color-text-primary)",
                                                    borderRadius: "9999px",
                                                }}
                                            >
                                                <option value="" disabled hidden>Selected</option>
                                                <option value="read">Mark as read</option>
                                                <option value="archive">Archive</option>
                                        </select>

                                        <Button
                                            variant="outline"
                                            className="bg-white px-4 gap-2 h-10 w-36 font-bold text-base flex items-center justify-center"
                                            style={{
                                                    border: "1px solid #002D62",
                                                    color: "var(--color-text-primary)",
                                                    borderRadius: "9999px",
                                                    padding: "5px",
                                                }}
                                            onClick={handleReadAll}
                                        >
                                            <CheckCheck size={16}/>
                                            Mark  all as read
                                        </Button>  
                                        

                                        <select
                                            className=" w-32 border bg-white px-4 py-1.5 leading-normal font-bold text-xs   hover:bg-slate-100 "
                                            style={{
                                                    borderColor: "var(--color-text-primary)",
                                                    color: "var(--color-text-primary)",
                                                    borderRadius: "9999px",
                                                }}
                                            onChange={(e) => setSort(e.target.value as "new" | "old" | "" )}
                                            value={Sort}
                                        >
                                                <option value="" >Sort by:</option>
                                                <option value="new">Newest </option>
                                                <option value="old">Oldest</option>
                                        </select>
                                    </div>
                                    

                            </div>

                            <div className="mt-2" style={{backgroundColor: "#ffffff",}}>
                                <NotificationTabs activeTab={activeTab} setActiveTab={handleTabChange} counts={{all:notifications.length,unread:unreadNotifications.length,archived:archivedNotifications.length}} />
                            </div>


                            <div className=" flex w-full flex-col  pb-8 mt-6" >
                                {activeTab === "All" && (
                                    <AllTab 
                                        searchQuery={searchQuery}
                                        notifications={getSortedNotifications(notifications)}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={10}
                                        selectedIds={selectedIds}
                                        onToggleSelect={handleToggleSelect}
                                       
                                    />
                                )}
                                {activeTab === "Unread" && (
                                    <UnreadTab 
                                        searchQuery={searchQuery}
                                        notifications={getSortedNotifications(unreadNotifications)}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={10}
                                        selectedIds={selectedIds}
                                        onToggleSelect={handleToggleSelect}
                                      
                        
                                    />
                                )}
                                {activeTab === "Archived" && (
                                    <ArchivedTab 
                                        searchQuery={searchQuery}
                                        notifications={getSortedNotifications(archivedNotifications)}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={10}
                                        selectedIds={selectedIds}
                                        onToggleSelect={handleToggleSelect}
                                        
                        
                                    />
                                )}
                            
                            </div>  
                            </Card>
                          
                    </div>   
                    )}
                </main>

             


            </div>
        
        </div>      
    );
    

  


    

}

export default NotificationPage;