import type { SidebarItem } from "./sidebar.types";
import { Users, Briefcase } from "lucide-react";
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

];