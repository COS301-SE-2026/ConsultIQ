import { Folder } from "lucide-react";
import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";

interface ProjectCardProps {
  readonly project: Project;
  readonly onViewDetails: (project: Project) => void;
  readonly onConfigureScore?: (project: Project)=> void;
}

export default function ProjectCard({
  project,
  onViewDetails,
  onConfigureScore,
}: ProjectCardProps) {
  return (
    <Card className="w-full max-w-[460px] min-h-[250px] rounded-xl flex flex-col bg-white overflow-hidden">
      <div className="flex flex-col h-full flex-1 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 sm:gap-5 mb-5 min-w-0">

          <div className="w-12 h-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0"  style={{
                backgroundColor: "var(--color-primary)",
              }}>
            <Folder className="text-white" size={20} />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold leading-snug"
              style={{
                color: "var(--color-primary)",
              }}>
              {project.projectName}
            </h2>
            <p className="text-base font-medium mb-3"
          style={{
            color:
              "var(--color-accent)",
          }}>
          {project.clientName}
        </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[16px] leading-7 mb-2 line-clamp-2 break-words"
          style={{
            color:
              "var(--color-text-secondary)",
          }}>
          {project.description}
        </p>
        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between mt-auto gap-3">
          {project.budget !== undefined && (
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-semibold text-primary whitespace-nowrap" >
                R {project.budget.toLocaleString()}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {onConfigureScore && (
              <button type="button" onClick={() =>onConfigureScore(project)}
                className="h-8 flex items-center justify-center px-2 text-sm font-medium text-white rounded"
                style={{ backgroundColor: "var(--color-primary)"}}>
                  Configure Scoring
            </button>
            )}
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
            View Details
          </button>
        </div>
      </div>
      </div>
    </Card>
  );
}