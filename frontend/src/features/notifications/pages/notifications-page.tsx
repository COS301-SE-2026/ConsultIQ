import {consultantSidebarItems,consultantManagerSidebarItems, 
    projectManagerSidebarItems,adminSidebarItems,} from "../../../components/layout/sidebar/sidebar.config";
import { useAuth } from "../../../hooks/useAuth";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import SearchBar from "../../../components/shared/search-bar";
import {useState} from "react";
import { Button } from "../../../components/ui/button";
import { CheckCheck } from "lucide-react";
import  NotificationTabs  from "../components/notifications-tab";
import AllTab from "../components/allNotificatiions-tab";
import UnreadTab from "../components/unread-tab";
import ArchivedTab from "../components/archived-tabs";
import {Card} from "../../../components/ui/card"

export type notificationTab = "All" | "Unread" | "Archived";

export interface Notification{
    userId: string;
    title: string;
    body: string;
    link?: string;
}

const MockNotifications = [
  {
    "id": "n1",
    "userId": "user123",
    "title": "New Message",
    "body": "You have a new message from your project manager.",
    "link": "/messages/456",
    "isRead": false,
    "createdAt": "2026-07-07T12:00:00Z"
  },
  {
    "id": "n2",
    "userId": "user123",
    "title": "System Update",
    "body": "The platform will undergo maintenance tonight at 10 PM.",
    "link": "/system/updates",
    "isRead": true,
    "createdAt": "2026-07-06T09:00:00Z"
  },
  {
    "id": "n3",
    "userId": "user123",
    "title": "Task Assigned",
    "body": "You’ve been assigned to Project Alpha.",
    "link": "/projects/alpha",
    "isRead": false,
    "createdAt": "2026-07-05T15:30:00Z"
  },
  {
    "id": "n4",
    "userId": "user123",
    "title": "Reminder",
    "body": "Don’t forget to submit your weekly report.",
    "link": "/reports/weekly",
    "isRead": true,
    "createdAt": "2026-07-04T08:45:00Z"
  },
  {
    "id": "n5",
    "userId": "user123",
    "title": "New Comment",
    "body": "A consultant left a comment on your project.",
    "link": "/projects/alpha/comments",
    "isRead": false,
    "createdAt": "2026-07-03T17:20:00Z"
  }
]

function NotificationPage(){
    const { user } = useAuth();
    
    const roleSidebar ={
        CONSULTANT_MANAGER: consultantManagerSidebarItems,
        CONSULTANT: consultantSidebarItems,
        PROJECT_MANAGER: projectManagerSidebarItems,
        ADMIN: adminSidebarItems,
    };


    const [searchQuery, setSearchQuery] = useState("");
    const [selected, setSelected] = useState("");
    const [activeTab, setActiveTab] = useState<notificationTab>("All");
    const [currentPage,setCurrentPage] = useState(1);

     const handleSelectedDropdown = () =>{
        setSelected("");

    }

     const handleTabChange = (tab: notificationTab) => {
            setActiveTab(tab);
            setSearchQuery("");
            setCurrentPage(1);
        }

    

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        
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

                <main className="flex-1 overflow-y-auto  overscroll-none relative ">
                  <div className=" flex flex-col gap-4  max-w-[1600px] mx-auto w-full pb-8 mt-6" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
                        <SearchBar
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder={"Search notifications..."}
                        /> 

                   
                            <Card className="rounded-md">
                                <div className="flex gap-6 w-full items-center " style={{ backgroundColor:"#F5F9FF",  padding: "20px"}}>
                                
                                    <div className="flex gap-4 items-center  mr-auto">
                                        <input type="checkbox" name="checkbox" className="w-4 h-4" />
                                        <h2 style={{color: "var(--color-primary)", fontSize: "24px"}}>Notifications</h2>
                                    </div>


                                    <div className="flex justify-end gap-4 w-full">
                                        <select
                                            value= {selected}
                                            onChange={(e) => setSelected(e.target.value)}
                                            className=" w-32 border bg-white px-4 py-1.5 leading-normal font-bold text-xs   hover:bg-slate-100 "
                                            style={{
                                                    borderColor: "var(--color-text-primary)",
                                                    color: "var(--color-text-primary)",
                                                    borderRadius: "9999px",
                                                }}
                                            >
                                                <option value="" disabled hidden>Selected</option>
                                                <option value="read">Mark as read</option>
                                                <option value="arachive">Archive</option>
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
                                        >
                                            <CheckCheck size={16}/>
                                            Mark as read
                                        </Button>   

                                        <select
                                            className=" w-32 border bg-white px-4 py-1.5 leading-normal font-bold text-xs   hover:bg-slate-100 "
                                            style={{
                                                    borderColor: "var(--color-text-primary)",
                                                    color: "var(--color-text-primary)",
                                                    borderRadius: "9999px",
                                                }}
                                            >
                                                <option value="" >Sort by:</option>
                                                <option value="read">Mark as read</option>
                                                <option value="arachive">Archive</option>
                                        </select>
                                    </div>
                                    

                            </div>

                            <div className="mt-2" style={{backgroundColor: "#ffffff",}}>
                                <NotificationTabs activeTab={activeTab} setActiveTab={handleTabChange} counts={{all:5,unread:0,archived:0}} />
                            </div>


                            <div className=" flex w-full flex-col  pb-8 mt-6" >
                                {activeTab === "All" && (
                                    <AllTab 
                                        searchQuery={searchQuery}
                                        notifications={MockNotifications}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={2}
                                    />
                                )}
                                {activeTab === "Unread" && (
                                    <UnreadTab 
                                        searchQuery={searchQuery}
                                        notifications={MockNotifications}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={2}
                        
                                    />
                                )}
                                {activeTab === "Archived" && (
                                    <ArchivedTab 
                                        searchQuery={searchQuery}
                                        notifications={MockNotifications}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={2}
                        
                                    />
                                )}
                            
                            </div>  
                            </Card>
                          
                    </div>                  
                        
                            
                   
             
                </main>

             


            </div>
        
        </div>      
    );
    

  


    

}

export default NotificationPage;