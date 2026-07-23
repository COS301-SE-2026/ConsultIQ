import { ProfileHeroCard } from "../components/profile";
import ProjectGrid from "../../projects/components/project-grid";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { useFetchConsultantProfile } from "../../../hooks/useFetchConsultantsProfiles";
import type { Project } from "../../projects/types/project.types";
import {useState } from "react";
import ProjectDetailsModal from "../../projects/components/project-details-modal";
import {consultantSidebarItems,} from "../../../components/layout/sidebar/sidebar.config";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { useFetchAssignedProject } from "../../../hooks/useFetchAssignedProjects";



function ConsultantProjects(){
      const location = useLocation();
      const { user } = useAuth();

      
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const targetConsultantId = location.state?.selectedConsultantId;
    const { projects, isLoading: projectsLoading, error: projectsError } = useFetchAssignedProject();

    const { profile, error } = useFetchConsultantProfile(
    targetConsultantId,
    user?.userId
    );

    const hasNoProfile = Boolean(error || !profile);
  

  
    return(
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
          <Sidebar items={consultantSidebarItems} />
          <div className="flex-1 flex flex-col overflow-y-auto min-w-0">

            <header
              className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
              style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
            >
               <h1 className="font-bold" style={{ color: "var(--color-primary)", fontSize: "32px" }}>
                My projects
              </h1>
              
            </header>
             

            <main className="flex-1 flex flex-col items-center p-10 overflow-y-auto overscroll-none">
              {hasNoProfile ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-brand-muted font-medium text-lg">No projects assigned yet</p>
                </div>
              ):(
                 <div className="flex flex-col gap-8 w-full max-w-5xl">
                <div className="h-1" />
                    
                  <ProfileHeroCard 
                    fullName={profile?.fullName ?? ""}
                    status={profile?.status ?? "Unavailable"} 
                  />
                  
                
              
                <div className="flex items-center gap-3 p-2 justify-start ">
                    <h2>Assigned Projects</h2>
                    <span className="bg-brand-blue text-white font-bold rounded-full flex items-center justify-center w-6 h-6">{projects.length}</span>
                </div> 
                {projectsLoading ? (
                  <div>Loading your projects...</div>
                    ) : projectsError ? (
                    <div className="text-red-500">{projectsError}</div>
                    ) : projects.length >0 ? (
                    <ProjectGrid projects={projects} onViewDetails={setSelectedProject} />
                    ) : (
                    <div>
                        No projects assigned
                    </div>
                )}
              </div>
              )}
           
             
              <ProjectDetailsModal
                open={!!selectedProject}
                project={selectedProject}
                onClose={() => setSelectedProject(null)}
                isConsultant={true}
              />
            </main>
             

          </div>
        </div>
       
    );
}

export default ConsultantProjects;