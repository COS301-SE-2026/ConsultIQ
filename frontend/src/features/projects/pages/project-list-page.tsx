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
import useUnreadNotificationCount from "../../../hooks/useUnreadNotificationsCount";
import type {ApiProject} from "../services/project.service"
import { getProjects } from "../services/project.service";

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

  const{count: unreadCount} = useUnreadNotificationCount();

  // Fetch projects from the backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const response= await getProjects(1,50);
       
        const mappedProjects: Project[] = response.projects.map((p: ApiProject) => ({
          id: p.id,
          name: p.projectName,
          projectName: p.projectName,
          clientName: p.clientName,
          description: p.description || "View details for full description.",
          teamSize: p.teamSize,
          allocation: p.requiredAllocationPercentage,
          budget: p.clientBillingBudget,
          startDate: p.startDate,
          endDate: p.endDate || "",
          status: p.status,
          location: {
            addressLine1: "",
            addressLine2: "",
            suburb: "",
            city: p.city,
            province: p.province,
            postalCode: "",
          },
            addressLine1: "",
            addressLine2: "",
            suburb: "",
            city: p.city,
            province: p.province,
            postalCode: "",
          skills:[],
          gapSeverity: p.gapSeverity,
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
      if(budgetFilter){
        const budget = project.budget;
        if(budget === undefined){
          matchesBudget=false;
        }else if (budgetFilter === "small") {
          matchesBudget = budget < 50000;
        } else if(budgetFilter === "medium"){
          matchesBudget = budget >= 50000 && budget <= 200000;
        }else if(budgetFilter === "large"){
          matchesBudget = budget > 200000;
        }
      }
      

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

  const handleConfigureScore= (project: Project)=>{
    navigate(`/project-scoring-config/${project.id}`);
  };

  const handleProjectUpdate= (updatedProject: Project) =>{
    setProjects((currProjects)=> 
      currProjects.map((p)=> (p.id ===updatedProject.id ? updatedProject : p))
  );}

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={projectManagerSidebarItems()} notificationCount={unreadCount}/>
      <div className="min-w-0 flex-1 flex flex-col min-h-screen overflow-hidden">
        <header
          className="flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-4 border-b bg-white pl-16 pr-4 py-4 sm:px-6 lg:px-10"
          style={{ borderColor: "var(--color-border)"}}
        >
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
            Projects
          </h1>
          <div className="flex gap-6">
            <button type="button"
              onClick={() => navigate("/project-specification")}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-white transition hover:brightness-110 sm:h-12 sm:px-5 sm:text-base"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <Plus className="h-5 w-5" />
              Project
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10">
            <div className="mt-4 sm:mt-8">
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
                <ProjectGrid projects={filteredProjects} onViewDetails={setSelectedProject} onConfigureScore={handleConfigureScore} onViewSkillGap={(project) => navigate(`/skill-gap/${project.id}`)}/>
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
        onUpdate={handleProjectUpdate}
      />
    </div>
  );
}