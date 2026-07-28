import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { useState, useEffect } from "react";
import SearchBar from "../../../components/shared/search-bar";
import UsersTab from "../components/users-tab";
import AdminTabs from "../components/tabs/admin-tabs";
import ProjectsTab from "../components/projects-tab";
import CountCard from "../components/count-card";
import { Users, UserCheck, UserX, Folder } from "lucide-react";
import type { AdminUserItem, UserMeta, AdminProjectItem, ProjectMeta } from "../types/admin.types";
import { getAllUsers, getAllProjects } from "../services/admin.service";
import useUnreadNotificationCount from "../../../hooks/useUnreadNotificationsCount";

export type adminTab = "Users" | "Projects";

function AdminPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<adminTab>("Users");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [budgetSort, setBudgetSort] = useState<"asc" | "desc" | "">("");
    const [showFilters, setShowFilters] = useState(false);

    const [users, setUsers] = useState<AdminUserItem[]>([]);
    const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
    const [userPage, setUserPage] = useState(1);
    const [isUserLoading, setIsUserLoading] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);
    const [userRefreshKey, setUserRefreshKey] = useState(0);

    const [projects, setProjects] = useState<AdminProjectItem[]>([]);
    const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
    const [projectPage, setProjectPage] = useState(1);
    const [isProjectLoading, setIsProjectLoading] = useState(false);
    const [projectError, setProjectError] = useState<string | null>(null);
    const [projectRefreshKey, setProjectRefreshKey] = useState(0);

    const { count: unreadCount } = useUnreadNotificationCount();

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


    useEffect(() => {

        const loadUsers = async () => {
            setIsUserLoading(true);
            try {
                const res = await getAllUsers(userPage, 10);
                setUsers(res.data);
                setUserMeta(res.meta);

            } catch (err) {
                setUserError(err instanceof Error ? err.message : "Failed to load users");

            } finally {
                setIsUserLoading(false);

            }
        };

        loadUsers();



    }, [userPage, userRefreshKey]);



    useEffect(() => {

        const loadProjects = async () => {

            setIsProjectLoading(true);
            setProjectError(null);

            try {
                const res = await getAllProjects(projectPage, 10);
                setProjects(res.data);
                setProjectMeta(res.meta);
            } catch (err) {
                setProjectError(err instanceof Error ? err.message : "Failed to load projects");

            } finally {
                setIsProjectLoading(false);

            }

        };

        loadProjects();

    }, [projectPage, projectRefreshKey]);




    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={adminSidebarItems} notificationCount={unreadCount} />

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
                                count={userMeta?.totalRecords ?? 0}
                                icon={Users}
                                iconBackgroundColour="#E7F0FE"
                                iconColour="#155AD5"
                            />

                            <CountCard
                                title="Active Users"
                                count={userMeta?.activeUsers ?? 0}
                                icon={UserCheck}
                                iconBackgroundColour="#E6F7EB"
                                iconColour="#4EAC64"
                            />

                            <CountCard
                                title="Suspended Users"
                                count={userMeta?.suspendedUsers ?? 0}
                                icon={UserX}
                                iconBackgroundColour="#FDF2E2"
                                iconColour="#F68F24"
                            />

                            <CountCard
                                title="Total Projects"
                                count={projectMeta?.absoluteTotalRecords ?? 0}
                                icon={Folder}
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
                                        padding: "8px",
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
                                        <option value="CONSULTANT">Consultant</option>
                                        <option value="ADMIN">Admin</option>
                                        <option value="CONSULTANT_MANAGER">Consultant manager</option>
                                        <option value="PROJECT_MANAGER">Project manager</option>
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

                            {showFilters && activeTab === "Projects" && (
                                <div
                                    className="flex gap-3 mt-3"
                                    style={{
                                        padding: "8px",
                                    }}
                                >
                                    <select
                                        value={budgetSort}
                                        onChange={(e) => setBudgetSort(e.target.value as "asc" | "desc" | "")}
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
                                    users={users}
                                    meta={userMeta}
                                    loading={isUserLoading}
                                    currentPage={userPage}
                                    onPageChange={setUserPage}
                                    refresh={() => setUserRefreshKey((k) => k + 1)}
                                    error={userError}

                                />
                            )}
                            {activeTab === "Projects" && (
                                <ProjectsTab
                                    key={projectPage}
                                    searchQuery={searchQuery}
                                    budgetSort={budgetSort}
                                    projects={projects}
                                    meta={projectMeta}
                                    loading={isProjectLoading}
                                    currentPage={projectPage}
                                    onPageChange={setProjectPage}
                                    refresh={() => setProjectRefreshKey((k) => k + 1)}
                                    error={projectError}
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