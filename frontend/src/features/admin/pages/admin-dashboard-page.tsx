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
    const [roleFilter,setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [budgetSort,setBudgetSort] = useState<"asc" | "desc" | "">("");
    const [showFilters, setShowFilters] = useState(false);

    const handleTabChange = (tab: adminTab) => {
        setActiveTab(tab);
        setSearchQuery("");
        setRoleFilter("");
        setStatusFilter("");
        setBudgetSort("");
        setShowFilters(false);
    }

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        
    };
    return(
         <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
             <Sidebar items={adminSidebarItems} />

             <div className="flex-1 flex flex-col h-screen overflow-y-auto  gap-4">
                <header
                    className="shrink-0 z-20 bg-white border-b h-22.5 flex items-center justify-between w-full"
                    style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                >
                    <h1 className="font-bold" style={{ color: "var(--color-primary)", fontSize: "32px" }}>
                        Admin Dashboard
                    </h1>
                </header>
          


            <main className="flex-1 overflow-y-auto  overscroll-none relative ">
                <div className=" flex flex-col gap-4  max-w-[1600px] mx-auto w-full pb-8 mt-6" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
                <div className="flex flex-wrap  max-w-[1600px] mx-auto w-full pb-8 mt-6 gap-4">
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
                    className="sticky top-0 w-full "
                    style={{ backgroundColor: "var(--color-surface, #ffffff)", zIndex: 9999 }}
                >   

                        {/* Search bar */}
                            <SearchBar
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder={activeTab === "Users" ? "Search by name, email..." : "Search by project or client name..."}
                            onFilterClick={() => setShowFilters((prev) => !prev)}
                        />
                        <div className="h-6" />

                         {showFilters && activeTab === "Users" && (
                            <div 
                                className="flex gap-3  mt-3"
                                style={{
                                    padding:"8px",
                                }}
                            >

                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className=" h-12 w-full rounded-xl border bg-white px-4 py-2 text-sm "
                                    style={{
                                        borderColor: "var(--color-border)",
                                        color: "var(--color-text-primary)",
                                    }}
                                >
                                    <option value="">All roles</option>
                                    <option value="consultant">Consultant</option>
                                    <option value="admin">Admin</option>
                                    <option value="consultant_manager">Consultant manager</option>
                                    <option value="project_manager">Project manager</option>
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="flex h-12 w-full rounded-xl border bg-white px-4 py-2 text-sm "
                                    style={{
                                        borderColor: "var(--color-border)",
                                        color: "var(--color-text-primary)",
                                    }}
                                >
                                    <option value="">All statuses</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="SUSPENDED">Suspended</option>
                                    <option value="PENDING">Pending</option>
                                </select>
                            </div>
     
                         )}

                          { showFilters && activeTab === "Projects" && (
                                <div 
                                    className="flex gap-3 mt-3"
                                    style={{
                                        padding:"8px",
                                    }}
                                >
                                     <select
                                        value={budgetSort}
                                        onChange={(e) => setBudgetSort(e.target.value as "asc" | "desc" | "" )}
                                        className=" h-12 w-full rounded-xl border bg-white px-4 py-2 text-sm "
                                        style={{
                                            borderColor: "var(--color-border)",
                                            color: "var(--color-text-primary)",
                                        }}
                                    >
                                    <option value="">Sort by budget</option>
                                    <option value="desc">Highest to Lowest</option>
                                    <option value="asc">Lowest to Highest</option>
                                </select>
                                </div>
                            
                          )}
                           

                         <AdminTabs activeTab={activeTab} setActiveTab={handleTabChange} />
                                
                    </div>
             

                 <div className=" max-w-[1600px] mx-auto w-full pb-8 mt-6" >
                    {activeTab === "Users" && (
                        <UsersTab 
                            searchQuery={searchQuery}
                            roleFilter={roleFilter}
                            statusFilter={statusFilter}
                        />
                    )}
                    {activeTab === "Projects" && (
                        <ProjectsTab 
                            searchQuery={searchQuery}
                            budgetSort={budgetSort}
                        />
                    )}
            
                 </div>
                 </div>
            </main>

         </div>
    </div>

    );
}

export default AdminPage;