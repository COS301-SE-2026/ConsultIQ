import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { useState } from "react";
import SearchBar from "../../../components/shared/search-bar";
import UsersTab from "../components/users-tab";
import AdminTabs from "../components/tabs/admin-tabs";
import ProjectsTab from "../components/projects-tab";
import CountCard from "../components/count-card";
import {Users,UserCheck,UserX,Folder} from "lucide-react";

export type adminTab = "Users" | "Projects";

function AdminPage(){
    const [searchQuery, setSearchQuery] = useState("");
      const [activeTab, setActiveTab] = useState<adminTab>("Users");

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        
    };
    return(
         <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
             <Sidebar items={adminSidebarItems} />

             <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header
                    className="shrink-0 z-20 bg-white border-b h-22.5 flex items-center justify-between w-full"
                    style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                >
                    <h1 className="font-bold" style={{ color: "var(--color-primary)", fontSize: "32px" }}>
                        Admin Dashboard
                    </h1>
                </header>
          


            <main className="flex-1 overflow-y-auto relative">

                <div className=" max-w-400 mx-auto w-full pb-8 mt-6">
                    <CountCard
                        title="Total Users"
                        count = {150}
                        icon = {Users}
                        iconBackgroundColour="#E7F0FE"
                        iconColour="#155AD5"
                    />

                     <CountCard
                        title="Active Users"
                        count = {120}
                        icon = {UserCheck}
                        iconBackgroundColour="#E6F7EB"
                        iconColour="#4EAC64"
                    />

                    <CountCard
                        title="Suspended Users"
                        count = {30}
                        icon = {UserX}
                        iconBackgroundColour="#FDF2E2"
                        iconColour="#F68F24"
                    />

                    <CountCard
                        title="Total Projects"
                        count = {44}
                        icon = {Folder}
                        iconBackgroundColour="#F0EDFD"
                        iconColour="#664CC8"
                    />
                         
                </div>
                <div
                    className="sticky top-0 w-full"
                    style={{ backgroundColor: "var(--color-surface, #ffffff)", zIndex: 9999 }}
                >

                    <div className="max-w-400 mx-auto w-full pb-8 mt-6" style={{ paddingLeft: "80px", paddingRight: "80px" }}>

                        {/* Search bar */}
                            <SearchBar
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search by name, skill, email..."
                            onFilterClick={() => { }}
                        />
                        <div className="h-6" />
                         <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                                
                    </div>
                </div>

                 <div className="max-w-400 mx-auto w-full pb-8 mt-6" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
                    {activeTab === "Users" && (
                        <UsersTab />
                    )}
                    {activeTab === "Projects" && (
                        <ProjectsTab />
                    )}
            
                 </div>
            </main>

         </div>
    </div>

    );
}

export default AdminPage;