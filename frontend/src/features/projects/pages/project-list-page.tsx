import { useMemo, useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import SearchBar from "../../../components/shared/search-bar";
import ProjectFilters from "../components/project-filters";
import ProjectGrid from "../components/project-grid";
import ProjectDetailsModal from "../components/project-details-modal";
import EmptyProjectState from "../components/empty-project-state";
import type { Project } from "../types/project.types";


export default function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [budgetFilter, setBudgetFilter] = useState("");
  const [teamSizeFilter, setTeamSizeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Fetch projects from the backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const token = sessionStorage.getItem("ciq_access_token");

        const response = await fetch("http://localhost:3000/projects?page=1&limit=50", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }

        const data = await response.json();

        const mappedProjects: Project[] = data.projects.map((p: any) => ({
          id: p.id,
          name: p.projectName,
          projectName: p.projectName,
          clientName: p.clientName,
          description: "View details for full description.",
          teamSize: p.teamSize,
          allocation: p.requiredAllocationPercentage,
          budget: p.clientBillingBudget,
          startDate: p.startDate,
          endDate: p.endDate || "",
          location: {
            addressLine1: "",
            addressLine2: "",
            suburb: "",
            city: p.city,
            province: p.province,
            postalCode: "",
          },
          skills: [],
        }));

        setProjects(mappedProjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search Filter
      const matchesSearch =
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.clientName.toLowerCase().includes(search.toLowerCase());

      // Budget Filter
      let matchesBudget = true;
      if (budgetFilter === "small") matchesBudget = project.budget < 50000;
      else if (budgetFilter === "medium") matchesBudget = project.budget >= 50000 && project.budget <= 200000;
      else if (budgetFilter === "large") matchesBudget = project.budget > 200000;

      // Team Size Filter
      let matchesTeamSize = true;
      if (teamSizeFilter === "small") matchesTeamSize = project.teamSize <= 5;
      else if (teamSizeFilter === "medium") matchesTeamSize = project.teamSize >= 6 && project.teamSize <= 10;
      else if (teamSizeFilter === "large") matchesTeamSize = project.teamSize > 10;

      // Location Filter 
      let matchesLocation = true;
      if (locationFilter && locationFilter !== "all") {
        matchesLocation = project.location.province.toLowerCase().replace(/\s/g, "-") === locationFilter;
      }

      return matchesSearch && matchesBudget && matchesTeamSize && matchesLocation;
    });
  }, [search, budgetFilter, teamSizeFilter, locationFilter, projects]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={projectManagerSidebarItems} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Projects
          </h1>
          <div className="flex gap-6">
            <button
              onClick={() => navigate("/project-specification")}
              className="h-12 w-35 text-lg rounded-xl font-semibold flex items-center justify-center gap-2 rounded text-white transition hover:brightness-110"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              <Plus className="h-5 w-5" />
              Project
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto py-8 w-full" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
            <div className="mt-8">
              <div className="h-6" />
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search projects..."
                onFilterClick={() => setShowFilters((prev) => !prev)}
              />
            </div>

            {showFilters && (
              <div className="mt-6">
                <ProjectFilters
                  budgetFilter={budgetFilter}
                  teamSizeFilter={teamSizeFilter}
                  locationFilter={locationFilter}
                  onBudgetChange={setBudgetFilter}
                  onTeamSizeChange={setTeamSizeFilter}
                  onLocationChange={setLocationFilter}
                />
              </div>
            )}

            <div className="mt-10">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : error ? (
                <div className="text-red-500 text-center p-8 bg-red-50 rounded-xl">
                  {error}
                </div>
              ) : filteredProjects.length > 0 ? (
                <ProjectGrid projects={filteredProjects} onViewDetails={setSelectedProject} />
              ) : (
                <EmptyProjectState />
              )}
            </div>
          </div>
        </main>
      </div>

      <ProjectDetailsModal
        open={!!selectedProject}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  );
}