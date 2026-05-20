import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ProjectBasicInfoCard from "../components/project-basic-info-card";
import ProjectLocationCard from "../components/project-location-card";
import ProjectSkillsCard from "../components/project-skills-card";
import { useState } from "react";
import { apiClient } from "../../../lib/api-client";


export interface ProjectSkillData {
  name: string;
  competency: string;
  years: number;
  mandatory: boolean;
}


export interface ProjectFormData {
  projectName: string;
  clientName: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  startDate: string;
  endDate: string;
  teamSize: number;
  allocation: number;
  budget: number;
  skills: ProjectSkillData[];
}

function ProjectSpecificationPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProjectFormData>({
    projectName: "",
    clientName: "",
    description: "",
    addressLine1: "",
    addressLine2: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    startDate: "",
    endDate: "",
    teamSize: 1,
    allocation: 100,
    budget: 0,
    skills: [],
  });

  const updateForm = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      await apiClient.post("/projects", formData);
      navigate("/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      // TODO: show a toast notification
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={projectManagerSidebarItems} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <header
          className="shrink-0 sticky top-0 z-20 bg-white border-b px-10 h-[90px] flex items-center justify-end relative"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h1
            className="text-4xl font-bold absolute left-1/2 -translate-x-1/2"
            style={{ color: "var(--color-primary)" }}
          >
            New Project
          </h1>

          <div className="flex gap-6">
            <button
              onClick={() => navigate(-1)}
              className="h-12 w-35 text-lg rounded-xl font-semibold transition bg-gray-50 hover:bg-gray-100"
              style={{ color: "var(--color-primary)" }}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="h-12 w-35 text-lg rounded-xl text-white font-semibold transition hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center p-10">
          <div className="flex flex-col gap-8 w-full max-w-[1024px]">
            <div className="h-1" />


            <ProjectBasicInfoCard data={formData} onChange={updateForm} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <ProjectLocationCard data={formData} onChange={updateForm} />


              <ProjectSkillsCard
                skills={formData.skills}
                onSkillsChange={(newSkills) => updateForm("skills", newSkills)}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProjectSpecificationPage;