import { Badge } from "../../../../components/ui/badge";
import { Card } from "../../../../components/ui/card";
import { Trash2 } from "lucide-react";
import type { ExperienceItem } from "../../pages/consultant-profile.context";

const jobTypeLabel: Record<string, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract",
  INTERNSHIP: "Internship", FREELANCE: "Freelance",
};

const workModelLabel: Record<string, string> = {
  ONSITE: "On-site", REMOTE: "Remote", HYBRID: "Hybrid",
};

function formatDate(iso: string) {
  if (!iso) return "Present";
  return new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

type Props = {
  experience: ExperienceItem;
  onRemove?: () => void;
};

export default function ExperienceCard({ experience, onRemove }: Props) {
  return (
    <Card className="border border-slate-200 shadow-sm" style={{ padding: "28px 32px" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1" style={{ color: "var(--color-primary)" }}>
            {experience.companyName}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600 mb-3">
            <span className="font-semibold text-slate-800">{experience.jobTitle}</span>
            {experience.jobType && (
              <Badge style={{ padding: "3px 10px" }}>
                {jobTypeLabel[experience.jobType] ?? experience.jobType}
              </Badge>
            )}
            {experience.workModel && (
              <Badge variant="outline" style={{ padding: "3px 10px" }}>
                {workModelLabel[experience.workModel] ?? experience.workModel}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {formatDate(experience.startDate)} — {experience.endDate ? formatDate(experience.endDate) : "Present"}
          </p>
          {experience.description && (
            <p className="text-sm text-slate-600 whitespace-pre-wrap mt-3 leading-relaxed">
              {experience.description}
            </p>
          )}
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition hover:bg-red-50 text-red-500 shrink-0"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>
    </Card>
  );
}