import type { SidebarItem } from "./sidebar.types";
import { Users, Briefcase, UserCheck,House,Cog,Bell,HelpCircle } from "lucide-react";
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
    },
     {
        label: "Help",
        path:"/help-page",
        icon:HelpCircle
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
    },
     {
        label: "Help",
        path:"/help-page",
        icon:HelpCircle
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
        label: "Placements",
        path:"/placement-dashboard",
        icon:Users
    },
    {
        label: "Notifications",
        path:"/notifications",
        icon:Bell
    },
     {
        label: "Help",
        path:"/help-page",
        icon:HelpCircle
    }

] 

export const consultantSidebarItems: SidebarItem[] = [
    {
        label: "Profile",
        path: "/under-construction",
        icon: UserCheck
    },
    {
        label: "Notifications",
        path:"/notifications",
        icon:Bell
    },
    {
        label: " My Projects",
        path: "/consultant-projects",
        icon: Briefcase
    },
     {
        label: "Help",
        path:"/help-page",
        icon:HelpCircle
    }
];