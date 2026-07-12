import type { SidebarItem } from "./sidebar.types";
import { Users, Briefcase, UserCheck,House,Cog } from "lucide-react";
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
    }
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
    {
        label: "Configurations",
        path:"/project-scoring-config",
        icon:Cog
    }

] 

export const consultantSidebarItems: SidebarItem[] = [
    {
        label: "Profile",
        path: "/profile-view",
        icon: UserCheck
    },
];