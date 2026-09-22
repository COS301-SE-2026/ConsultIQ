import { Folder, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";
import type React from "react";
import { useState } from "react";

interface ProjectCardProps {
  readonly project: Project;
  readonly onViewDetails: (project: Project) => void;
  readonly onConfigureScore?: (project: Project)=> void;
  readonly onViewSkillGap?: (project: Project) => void;
}

interface GapBadgeProps {
  readonly severity?: "COVERED" | "AT_RISK" | "CRITICAL";
  readonly onClick: () => void;
  readonly isOpen: boolean;
  readonly onOpen: () => void;
  readonly onClose: () => void;
}

const GapBadge : React.FC<GapBadgeProps> = ({ severity, onClick, isOpen, onOpen, onClose }) =>{
  if(!severity) return null;

  const config = {
    COVERED: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: CheckCircle2,
      label: "Covered",
      tooltip: "All required  skills are adequately covered."
    },
    AT_RISK: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: AlertCircle,
      label: "At Risk",
      tooltip: "Some skills have insufficient coverage"
    },
    CRITICAL: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: AlertTriangle,
      label: "Critical",
      tooltip: "Critical skill gaps detected - placement not recommended"
    },
  };


  const getTooltipBgColor = (sev : typeof severity) : string =>{
    switch(sev){
      case "CRITICAL":
        return "bg-red-600";
      case "AT_RISK":
        return "bg-yellow-600";
      case "COVERED":
        return "bg-green-600";
      default:
        return "bg-gray-600";
    }
  };

  const getTooltipArrowColor = (sev: typeof severity): string => {
    switch(sev){
      case "CRITICAL":
        return "border-t-red-600";
      case "AT_RISK":
        return "border-t-yellow-600";
      case "COVERED":
        return "border-t-green-600";
      default: 
      return "border-t-gray-600";
    }
  };

  const style = config[severity];
  const Icon = style.icon;

  return (
    <div className="group relative">
      <button type="button"
        onClick={onClick}
        onFocus={() => onOpen}
        onBlur={() => onClose}
        onMouseEnter={() => onOpen}
        onMouseLeave={() => onClose}
        aria-label={`View skill gap analysis for ${style.label}`}
        className = {`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all hover:shadow-md ${style.bg} ${style.border} ${style.text}`}
      >
        <Icon size={16} />
        <span>{style.label}</span>
      </button>

     {isOpen &&(
      <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2">
        <div className={`w-64 max-w-[calc(100vw-2rem)] whitespace-normal break-words rounded-lg px-3 py-2 text-left text-sm font-medium text-white shadow-lg ${getTooltipBgColor(severity)}`}
        >
          {style.tooltip}
          <div className={`absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent ${getTooltipArrowColor(severity)}`}
          />
        </div>
      </div>
      )}
    </div>
  )

}

export default function ProjectCard({
  project,
  onViewDetails,
  onConfigureScore,
  onViewSkillGap,
}: ProjectCardProps) {

  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Card className="flex min-h-[250px] w-full min-w-0 flex-col overflow-visible rounded-xl bg-white">
      <div className="flex flex-col h-full flex-1 p-6 sm:p-8">
        {/* Header */}
        <div className="mb-5 flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">

          <div className="w-12 h-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0"  style={{
                backgroundColor: "var(--color-primary)",
              }}>
            <Folder className="text-white" size={20} />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="break-words text-lg font-semibold leading-snug sm:text-xl"
              style={{
                color: "var(--color-primary)",
              }}>
              {project.projectName}
            </h2>
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <p className="text-lg text-base font-medium"
              style={{
                color:
                  "var(--color-accent)",
              }}>
              {project.clientName}
              </p>
              {project.gapSeverity && (
                  <GapBadge 
                  severity={project.gapSeverity} 
                  onClick={() => onViewSkillGap?.(project)} 
                  isOpen={tooltipOpen}
                  onOpen={() => setTooltipOpen(true)}
                  onClose={() => setTooltipOpen(false)}
                  />
              )}
            </div>
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
          <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {onConfigureScore && (
              <button type="button" onClick={() =>onConfigureScore(project)}
                className="h-9 min-w-0 flex-1 rounded px-2 text-xs font-medium text-white transition sm:flex-none sm:text-sm"
                style={{ backgroundColor: "var(--color-primary)"}}>
                  Configure Scoring
            </button>
            )}
          <button
            type="button"
            onClick={() => onViewDetails(project)}
            className=" flex h-9 min-w-0 flex-1 items-center justify-center rounded px-3 text-xs font-medium transition-colors sm:flex-none sm:px-5 sm:text-sm"
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