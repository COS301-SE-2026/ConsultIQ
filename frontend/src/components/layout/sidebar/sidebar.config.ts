import type { SidebarItem } from "./sidebar.types";
import { Users, Briefcase, UserCheck, House, Cog, Bell, HelpCircle, ChartPie } from "lucide-react";
export const adminSidebarItems: SidebarItem[] = [
    {
        label: "Dashboard",
        path: "/admin-dashboard",
        icon: House
    },
    {
        label: "Configurations",
        path: "/admin-scoring-config",
        icon: Cog
    },
    {
        label: "Analytics",
        path: "/analytics-dashboard",
        icon: ChartPie
    },
    {
        label: "Help",
        path: "/help-page",
        icon: HelpCircle
    }
]

export const consultantManagerSidebarItems: SidebarItem[] = [
    {
        label: "Consultants",
        path: "/consultants-manager",
        icon: Users
    },
    {
        label: "Help",
        path: "/help-page",
        icon: HelpCircle
    }

]

export const projectManagerSidebarItems = (projectId?: string, runId?:string,): SidebarItem[] => {
    const items: SidebarItem[] = [
       {
        label: "Projects",
        path: "/projects",
        icon: Briefcase
    },
    {
        label: "Portfolio Gaps",
        path: "/skill-gap",
        icon: ChartPie
    },

   ];

   if(projectId){
    items.push(
        {
            label: "Configurations",
            path: `/project-scoring-config/${projectId}`,
            icon: Cog
        });
   }

   if(projectId && runId){
    items.push(
        {
            label: "Placements",
            path: `/placement-dashboard/${projectId}/${runId}`,
            icon: Users
        })
   }

   items.push({
        label: "Help",
        path: "/help-page",
        icon: HelpCircle
    });
    
    return items;
}

export const consultantSidebarItems: SidebarItem[] = [
    {
        label: "Profile",
        path: "/under-construction",
        icon: UserCheck
    },
    {
        label: "Notifications",
        path: "/notifications",
        icon: Bell
    },
    {
        label: " My Projects",
        path: "/consultant-projects",
        icon: Briefcase
    },
    {
        label: "Help",
        path: "/help-page",
        icon: HelpCircle
    }
];