import { useMemo, useState } from "react";

import Sidebar from "../../../components/layout/sidebar/sidebar";
import SearchBar from "../../../components/shared/search-bar";

import AdminTabs from "../components/admin-tabs";
import AdminStatsCard from "../components/admin-stats-card";
import UsersTable from "../components/users-table";
import ProjectsTable from "../components/projects-table";

import {
  FolderKanban,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { AdminUser, AdminProject } from "../types/admin.types";

import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"users" | "projects">("users");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john@consultiq.com",
      role: "Project Manager",
      status: "Active",
      joinedDate: "2026-05-01",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah@consultiq.com",
      role: "Consultant",
      status: "Suspended",
      joinedDate: "2026-04-15",
    },
    {
      id: "3",
      name: "Michael Brown",
      email: "michael@consultiq.com",
      role: "Consultant",
      status: "Active",
      joinedDate: "2026-03-20",
    },
  ]);

  const [projects, setProjects] = useState<AdminProject[]>([
      {
        id: "1",
        name: "Retail Analytics Dashboard",
        clientName: "Shoprite",
        budget: 30000,
        teamSize: 5,
        location: "Johannesburg",
      },
      {
        id: "2",
        name: "Mobile Banking App",
        clientName: "FNB",
        budget: 100000,
        teamSize: 10,
        location: "Cape Town",
      },
      {
        id: "3",
        name: "AI Recruitment Platform",
        clientName: "ConsultIQ",
        budget: 500000,
        teamSize: 8,
        location: "Pretoria",
      },
    ]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      `${user.name} ${user.email} ${user.role}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [users, search]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) =>
      `${project.name} ${project.clientName} ${project.location}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [projects, search]);

  function handleSuspendUser(id: string) {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              status: "Suspended",
            }
          : user
      )
    );
  }

  function handleReactivateUser(
    id: string
  ) {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              status: "Active",
            }
          : user
      )
    );
  }

  function handleRemoveUser(id: string) {
    setUsers((prev) =>
      prev.filter((user) => user.id !== id)
    );
  }

  function handleRemoveProject(
    id: string
  ) {
    setProjects((prev) =>
      prev.filter(
        (project) => project.id !== id
      )
    );
  }

  function handleViewProject(id: string) {
    console.log("View project:", id);
  }

  const activeUsers = users.filter(
    (user) => user.status === "Active"
  ).length;

  const suspendedUsers = users.filter(
    (user) =>
      user.status === "Suspended"
  ).length;

  return (
    <div
      className="flex h-screen"
      style={{
        backgroundColor:
          "var(--color-surface)",
      }}
    >
      <Sidebar
        items={adminSidebarItems}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full" 
          style={{
            borderColor: "var(--color-border)",
            paddingLeft: "40px",
            paddingRight: "40px",
          }}
        >
          <h1 className="text-4xl font-bold"
            style={{
              color: "var(--color-primary)",
            }}
          >
            Admin Dashboard
          </h1>

        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto py-8 w-full" style={{ paddingLeft: "40px", paddingRight: "40px" }}>

          {/* Search */}
          <div className="mt-8">
            <div className="h-6" />
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={
                activeTab === "users"
                  ? "Search users..."
                  : "Search projects..."
              }
            />
          </div>
          <div className="h-6" />
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
            <AdminStatsCard
              title="Total Users"
              value={users.length}
              icon={Users}
            />

            <AdminStatsCard
              title="Active Users"
              value={activeUsers}
              icon={ShieldCheck}
            />

            <AdminStatsCard
              title="Suspended Users"
              value={suspendedUsers}
              icon={ShieldCheck}
            />

            <AdminStatsCard
              title="Projects"
              value={projects.length}
              icon={FolderKanban}
            />
          </div>
          <div className="h-6" />


          {/* Tabs */}
          <AdminTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <div className="h-6" />


          {/* Content */}
          <div className="mt-8">
            {activeTab === "users" ? (
              <UsersTable
                users={filteredUsers}
                onSuspend={
                  handleSuspendUser
                }
                onReactivate={
                  handleReactivateUser
                }
                onRemove={
                  handleRemoveUser
                }
              />
            ) : (
              <ProjectsTable
                projects={
                  filteredProjects
                }
                onView={
                  handleViewProject
                }
                onRemove={
                  handleRemoveProject
                }
              />
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}