import { Folder, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";
import type React from "react";

interface ProjectCardProps {
  readonly project: Project;
  readonly onViewDetails: (project: Project) => void;
  readonly onConfigureScore?: (project: Project)=> void;
  readonly onViewSkillGap?: (project: Project) => void;
}

interface GapBadgeProps {
  readonly severity?: "ADEQUATELY_COVERED" | "PARTIALLY_COVERED" | "NOT_COVERED";
  readonly onClick: () => void;
}

const GapBadge : React.FC<GapBadgeProps> = ({ severity, onClick }) =>{
  if(!severity) return null;

  const config = {
    ADEQUATELY_COVERED: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: CheckCircle2,
      label: "Covered",
      tooltip: "All required  skills are adequately covered."
    },
    PARTIALLY_COVERED: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: AlertCircle,
      label: "At Risk",
      tooltip: "Some skills have insufficient coverage"
    },
    NOT_COVERED: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: AlertTriangle,
      label: "Critical",
      tooltip: "Critical skill gaps detected - placement not recommended"
    },
  };

  const style = config[severity];
  const Icon = style.icon;

  return (
    <div className="group relative">
      <button type="button" onClick={onClick}
        title={style.tooltip}
        className = {`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all hover:shadow-md ${style.bg} ${style.border} ${style.text}`}
      >
        <Icon size={16} />
        <span>{style.label}</span>
      </button>

      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block">
        <div className={`px-3 py-2 rounded-lg text-xs font-medium text-white whitespace-nowrap shadow-lg
         ${severity === "NOT_COVERED" ? "bg-red-600" : severity === "PARTIALLY_COVERED" ? "bg-yellow-600" : "bg-green-600"}`}
        > 
          {style.tooltip}
          <div className={`absolute top-full right-2 border-4 border-transparent 
          ${severity === "NOT_COVERED" ? "border-t-red-600" : severity === "PARTIALLY_COVERED" ? "border-t-yellow-600" : "border-t-green-600"}`}
          />
        </div>
      </div>
    </div>
  )

}

export default function ProjectCard({
  project,
  onViewDetails,
  onConfigureScore,
  onViewSkillGap,
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
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {project.gapSeverity && (
              <GapBadge severity={project.gapSeverity} onClick={() => onViewSkillGap?.(project)} />
            )}

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