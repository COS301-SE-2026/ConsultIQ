import { X } from "lucide-react";
import type { Project } from "../types/project.types";
import ProjectLocationSection from "./project-location-section.tsx";
import ProjectOverviewSection from "./project-overview-section.tsx";
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
  if (!open || !project) {
    return null;
  }

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
          className="text-4xl font-bold mb-10"
          style={{ color: "var(--color-primary)" }}
        >
          Project Details
        </h2>
        <div className="h-4" />
        <div className="flex flex-col gap-8">
          <ProjectOverviewSection project={project} />

          <ProjectLocationSection project={project} />

          <Card style={{ padding: "20px", border: "none" }}>
            <h3
              className="text-3xl font-bold mb-8"
              style={{ color: "var(--color-primary)" }}
            >
              Skills
            </h3>
            <div className="h-4" />

            <ProjectSkillsTable
              skills={project.skills.map((skill) => ({
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