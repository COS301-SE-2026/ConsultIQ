import type { SidebarItem } from "./sidebar.types";
import { Users, Briefcase, UserCheck, Settings, LayoutDashboard} from "lucide-react";
export const adminSidebarItems: SidebarItem[] = [
    {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard
    },
    {
        label: "Users",
        path: "/users",
        icon: Users
    },
    {
        label: "Projects",
        path: "/projects",
        icon: Briefcase
    },
    {
        label: "Configurations",
        path: "/configurations",
        icon: Settings
    },
]

export const consultantManagerSidebarItems: SidebarItem[] = [
    {
        label: "Consultants",
        path: "/consultants-manager",
        icon: Users
    },

]

export const projectManagerSidebarItems: SidebarItem[] = [
    {
        label: "Projects",
        path: "/projects",
        icon: Briefcase
    },

] 

export const consultantSidebarItems: SidebarItem[] = [
    {
        label: "Profile",
        path: "/profile",
        icon: UserCheck
    },
];