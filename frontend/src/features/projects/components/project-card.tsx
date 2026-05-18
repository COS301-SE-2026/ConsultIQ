import { Folder } from "lucide-react";
import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";

interface ProjectCardProps {
  readonly project: Project;
  readonly onViewDetails: (project: Project) => void;
}

export default function ProjectCard({
  project,
  onViewDetails,
}: ProjectCardProps) {
  return (
<Card className="w-full max-w-[460px] min-h-[250px] rounded-xl flex flex-col bg-white">
  <div className="flex flex-col h-full flex-1" style={{ padding: "32px 48px" }}>
    {/* Header */}
    <div className="flex items-center gap-5 mb-5">
      
      <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
        <Folder className="text-white" size={18} />
      </div>

      <div className="flex flex-col">
        <h2 className="text-[20px] font-semibold leading-snug"
          style={{
            color: "var(--color-primary)",
          }}>
          {project.name}
        </h2>
      </div>
    </div>
    <div className="h-4" />

    <p className="text-base font-medium mb-3"
      style={{
        color:
          "var(--color-accent)",
      }}>
      {project.clientName}
    </p>

    {/* Description */}
    <p className="text-[15px] leading-7 mb-8 line-clamp-4"
      style={{
        color:
          "var(--color-text-secondary)",
      }}>
      {project.description}
    </p>

<div className="h-4" />
    {/* Footer */}
    <div className="flex items-center justify-between mt-auto pt-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl text-yellow-500">
          $
        </span>

        <p className="text-xl font-semibold">
          R{project.budget.toLocaleString()}
        </p>
      </div>

        <button
        type="button"
        onClick={() => onViewDetails(project)}
        className="
            flex
            items-center
            justify-center
            h-8
            w-25
            px-6
            rounded
            text-sm
            font-medium
            transition-colors
            duration-200
            hover:bg-[var(--button-secondary-hover)]
            whitespace-nowrap
        "
        style={{
            border: "1.5px solid var(--color-primary)",
            color: "var(--color-primary)",
            backgroundColor: "var(--color-white)",
        }}
        >
        View Details &gt;
        </button>
    </div>
  </div>
</Card>
  );
}