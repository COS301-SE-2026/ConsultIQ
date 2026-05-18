import type { SidebarItem } from "./sidebar.types";
import { Users, Briefcase, UserCheck } from "lucide-react";
export const adminSidebarItems: SidebarItem[] = [
    {
        label: "Consultants",
        path: "/consultants",
        icon: Users
    },
    {
        label: "Projects",
        path: "/projects",
        icon: Briefcase
    },
]

export const consultantManagerSidebarItems: SidebarItem[] = [
    {
        label: "Consultants",
        path: "/consultants",
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
        label: "Projects",
        path: "/profile",
        icon: UserCheck
    },
];