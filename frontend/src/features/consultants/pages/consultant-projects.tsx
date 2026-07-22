import { ProfileHeroCard } from "../components/profile";
import ProjectGrid from "../../projects/components/project-grid";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { useFetchConsultantProfile } from "../../../hooks/useFetchConsultantsProfiles";
import type { Project } from "../../projects/types/project.types";
import {useState } from "react";
import ProjectDetailsModal from "../../projects/components/project-details-modal";

export const mockProjects: Project[] = [
  {
    id: "proj-001",
    name: "FinTech Mobile App Modernization",
    projectName: "FinTech Mobile App Modernization",
    clientName: "Capitec Bank",
    description: "Overhauling legacy iOS and Android mobile applications to improve transaction speeds and UI responsiveness.",
    teamSize: 6,
    allocation: 100,
    budget: 1250000,
    startDate: "2026-01-15T00:00:00.000Z",
    endDate: "2026-12-15T00:00:00.000Z",
    status: "IN_PROGRESS",
    location: {
      addressLine1: "1 Discovery Place",
      addressLine2: "",
      suburb: "Sandton",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2196",
    },
    skills: [
      { id: "skill-01", name: "React Native", competency: "Expert", years: 4, mandatory: true },
      { id: "skill-02", name: "Kotlin", competency: "Intermediate", years: 2, mandatory: false },
    ],
  },
  {
    id: "proj-002",
    name: "AWS Cloud Migration & Infrastructure",
    projectName: "AWS Cloud Migration & Infrastructure",
    clientName: "Discovery Health",
    description: "Migrating core database instances to AWS Aurora and setting up multi-region disaster recovery.",
    teamSize: 4,
    allocation: 50,
    startDate: "2026-03-01T00:00:00.000Z",
    endDate: "2026-08-31T00:00:00.000Z",
    status: "IN_PROGRESS",
    location: {
      addressLine1: "1 Discovery Place",
      addressLine2: "",
      suburb: "Centurion",
      city: "Pretoria",
      province: "Gauteng",
      postalCode: "0157",
    },
    skills: [
      { id: "skill-03", name: "AWS Aurora", competency: "Expert", years: 5, mandatory: true },
      { id: "skill-04", name: "Terraform", competency: "Advanced", years: 3, mandatory: true },
    ],
  },
  {
    id: "proj-003",
    name: "Supply Chain Analytics Dashboard",
    projectName: "Supply Chain Analytics Dashboard",
    clientName: "Shoprite Holdings",
    description: "Building custom real-time analytics dashboards using React, Node.js, and PowerBI integrations.",
    teamSize: 3,
    allocation: 50,
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    status: "OPEN",
    location: {
      addressLine1: "Cnr Old Paarl Rd",
      addressLine2: "",
      suburb: "Brackenfell",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "7560",
    },
    skills: [
      { id: "skill-05", name: "React", competency: "Expert", years: 4, mandatory: true },
      { id: "skill-06", name: "Power BI", competency: "Intermediate", years: 2, mandatory: false },
    ],
  },
];


function ConsultantProjects(){
      const location = useLocation();
      const navigate = useNavigate();
      const { user } = useAuth();

      const [projects, setProjects] = useState<Project[]>([]);
      const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const targetConsultantId = location.state?.selectedConsultantId;

    const { profile, isLoading, error } = useFetchConsultantProfile(
    targetConsultantId,
    user?.userId
    );

    if (error || !profile) {
    let errorMessage = "profile not found";

    if (error){
      errorMessage = typeof error === "string" ? error :(error.message || "error while loading profile");
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="text-red-500 font-semibold text-lg">{errorMessage || "Profile error"}</div>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
          Go Back
        </button>
      </div>
    );
  }

  
    return(
        <div>
            <ProfileHeroCard 
                fullName={profile.fullName}
                status={profile.status} 
            />

            <div>
                <h2>Assigned Projects</h2>
                <span>3</span>
            </div> 

            {mockProjects.length > 0 ? (
                <ProjectGrid projects={mockProjects} onViewDetails={setSelectedProject} />
                ) : (
                <div>
                    No projects assigned
                </div>
             )}
         <ProjectDetailsModal
            open={!!selectedProject}
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />


        </div>
       
    );
}

export default ConsultantProjects;