import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ProjectBasicInfoCard from "../components/project-basic-info-card";
import ProjectLocationCard from "../components/project-location-card";
import ProjectSkillsCard from "../components/project-skills-card";
import type { ProjectLocation } from "../types/project.types"
import { useState } from "react";
import { apiClient } from "../../../lib/api-client";
import { toast } from "sonner";
import useUnreadNotificationCount from "../../../hooks/useUnreadNotificationsCount";
import FeasibilityPreviewPanel from "../components/feasibility-preview-panel";
import { useFeasibilityCheck } from "../hooks/use-feasibility-check";
import type { FeasibilityCompetency, FeasibilityRequestDto } from "../types/feasibility.types";
import axios from 'axios';


export interface ProjectSkillData {
  id?: string;
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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

  const { count: unreadCount } = useUnreadNotificationCount();

  const [isFeasibilityOpen, setIsFeasibilityOpen] = useState(false);

  const updateForm = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleEditSkill = (skill: ProjectSkillData) => {
    const index = formData.skills.indexOf(skill);
    if (index !== -1) {
      setEditingIndex(index);
    }
  };

  const handleCancelEditSkill = () => { setEditingIndex(null); }

  const handleSaveSkill = (updatedSkill: ProjectSkillData) => {
    if (editingIndex === null) return;
    const skillUpdated = [...formData.skills];
    skillUpdated[editingIndex] = updatedSkill;
    updateForm("skills", skillUpdated);
  };

  const updateLocation = <K extends keyof ProjectLocation>(field: K, value: ProjectLocation[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      await apiClient.post("/projects", formData);

      toast.success("Project created successfully!");
      navigate("/projects");

    } catch (error) {
      console.error("Error creating project:", error);

      let errorMessage = "Failed to create project. Please try again.";


      if (axios.isAxiosError(error)) {

        errorMessage = error.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {

        errorMessage = error.message;
      }

      toast.error(errorMessage);

    } finally {
      setIsSubmitting(false);
    }
  };

  const feasibilityRequest : FeasibilityRequestDto | null =
    isFeasibilityOpen ? {
      projectName: formData.projectName,
      clientName: formData.clientName,
      description: formData.description,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine1,
      suburb: formData.suburb,
      city: formData.city,
      province: formData.province,
      postalCode: formData.postalCode,
      startDate: formData.startDate,
      endDate: formData.endDate,
      teamSize: formData.teamSize,
      allocation: formData.allocation,
      budget: formData.budget,
      skills :formData.skills.map((skill) => ({
        name: skill.name,
        competency: skill.competency as FeasibilityCompetency,
        years: skill.years,
        mandatory: skill.mandatory,
      })),
  } : null;

  const feasibility = useFeasibilityCheck(feasibilityRequest, isFeasibilityOpen);


  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={projectManagerSidebarItems()} notificationCount={unreadCount} />

      <div className="min-w-0  flex-1 flex flex-col overflow-y-auto">
      <header
          className="flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white pl-16 pr-4 py-3 sm:px-6 lg:px-10"
          style={{ borderColor: "var(--color-border)"}}
        >
          <h1 className="text-xl font-bold sm:text-2xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
            New Project
          </h1>

          <div className="flex w-full gap-3 sm:w-auto sm:gap-6">
            <button
              onClick={() => navigate(-1)}
              className="h-10 flex-1 rounded-xl text-sm font-semibold transition bg-gray-50 hover:bg-gray-100 sm:h-12 sm:flex-none sm:w-35 sm:text-lg"
              style={{ color: "var(--color-primary)" }}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="h-10 flex-1 rounded-xl text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 sm:h-12 sm:flex-none sm:w-35 sm:text-lg"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
          <div className="flex w-full max-w-[1024px] flex-col gap-5 sm:gap-8">
            
            <ProjectBasicInfoCard data={formData} onChange={updateForm} />
            <FeasibilityPreviewPanel 
              open = {isFeasibilityOpen}
              onToggle = {() => setIsFeasibilityOpen((current) => !current)}
              state = {feasibility.state}
              result = {feasibility.result}
              error = {feasibility.error}
            />

            <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-2">

              <ProjectLocationCard data={formData} onChange={updateLocation} />

              <ProjectSkillsCard
                //key={editingIndex ?? "new-skill"}
                skills={formData.skills}
                onSkillsChange={(newSkills) => updateForm("skills", newSkills)}
                editingSkill={editingIndex !== null ? formData.skills[editingIndex] : null}
                onCancelEdit={handleCancelEditSkill}
                editingIndex={editingIndex}
                onSkillSave={handleSaveSkill}
                onEditSkill={handleEditSkill}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProjectSpecificationPage;