import { X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project } from "../types/project.types";
import ProjectLocationSection from "./project-location-section";
import ProjectOverviewSection from "./project-overview-section";
import ProjectSkillsTable from "./project-skills-table";
import { Card } from "../../../components/ui/card";

interface ProjectDetailsModalProps {
  readonly open: boolean;
  readonly project: Project | null;
  readonly onClose: () => void;
}

export default function ProjectDetailsModal({
  open,
  project,
  onClose,
}: ProjectDetailsModalProps) {

  const [fullProject, setFullProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !project?.id) return;

    const fetchProjectDetails = async () => {
      setIsLoading(true);
      try {
        const token = sessionStorage.getItem("ciq_access_token");
        const response = await fetch(`http://localhost:3000/projects/${project.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Map the backend data to your frontend Project type
          const mappedProject: Project = {
            id: data.id,
            name: data.projectName,
            projectName: data.projectName,
            clientName: data.clientName,
            description: data.description || "No description provided.",
            teamSize: data.teamSize,
            allocation: data.allocation,
            budget: data.budget,
            startDate: data.startDate,
            endDate: data.endDate,

            // Add these missing root-level fields to satisfy TypeScript
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2 || "",
            suburb: data.suburb || "",
            city: data.city,
            province: data.province,
            postalCode: data.postalCode || "",

            // Keep the nested location object if your UI components still use it
            location: {
              addressLine1: data.addressLine1,
              addressLine2: data.addressLine2 || "",
              suburb: data.suburb || "",
              city: data.city,
              province: data.province,
              postalCode: data.postalCode || "",
            },

            skills: data.skills.map((ps: any) => ({
              id: String(ps.skillId),
              name: ps.skill.name,
              competency: ps.competency,
              years: ps.years,
              mandatory: ps.mandatory,
            })),
          };
          setFullProject(mappedProject);
        }
      } catch (error) {
        console.error("Failed to fetch project details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [open, project?.id]);

  if (!open || !project) {
    return null;
  }


  const displayData = fullProject || project;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 md:p-12">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative" style={{ padding: "64px" }}>
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-gray-500 transition hover:text-gray-800"
        >
          <X size={28} />
        </button>

        <h2
          className="text-4xl font-bold mb-10 flex items-center gap-4"
          style={{ color: "var(--color-primary)" }}
        >
          Project Details
          {isLoading && <Loader2 className="h-6 w-6 animate-spin text-gray-400" />}
        </h2>

        <div className="h-4" />

        <div className="flex flex-col gap-8">
          <ProjectOverviewSection project={displayData} />

          <ProjectLocationSection project={displayData} />

          <Card style={{ padding: "20px", border: "none" }}>
            <h3
              className="text-3xl font-bold mb-8"
              style={{ color: "var(--color-primary)" }}
            >
              Skills
            </h3>
            <div className="h-4" />

            <ProjectSkillsTable
              skills={displayData.skills.map((skill) => ({
                id: String(skill.id),
                name: skill.name,
                competency: skill.competency,
                years: skill.years,
                mandatory: skill.mandatory,
              }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}