import type { SidebarItem } from "./sidebar.types";
import { Users, Briefcase, UserCheck,House,Cog,Bell } from "lucide-react";
export const adminSidebarItems: SidebarItem[] = [
    {
        label: "Dashboard",
        path: "/admin-dashboard",
        icon: House
    },
    {
        label: "Configurations",
        path:"/admin-scoring-config",
        icon:Cog
    },
    {
        label: "Notifications",
        path:"/notifications",
        icon:Bell
    }
]

export const consultantManagerSidebarItems: SidebarItem[] = [
    {
        label: "Consultants",
        path: "/consultants-manager",
        icon: Users
    },
    {
        label: "Notifications",
        path:"/notifications",
        icon:Bell
    }

]

export const projectManagerSidebarItems: SidebarItem[] = [
    {
        label: "Projects",
        path: "/projects",
        icon: Briefcase
    },
    {
        label: "Configurations",
        path:"/project-scoring-config",
        icon:Cog
    },
    {
        label: "Notifications",
        path:"/notifications",
        icon:Bell
    }

] 

export const consultantSidebarItems: SidebarItem[] = [
    {
        label: "Profile",
        path: "/profile-view",
        icon: UserCheck
    },
    {
        label: "Notifications",
        path:"/notifications",
        icon:Bell
    },
    {
        label: " My Projects",
        path: "/projects",
        icon: Briefcase
    },
];