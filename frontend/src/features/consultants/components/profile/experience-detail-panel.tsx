import { ArrowLeft } from "lucide-react";

export interface Experience {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  jobType: string;
  startDate: string;
  endDate: string;
  duration: string;
  roleDescription: string;
}

interface ExperienceDetailPanelProps {
  readonly experience: Experience;
  readonly onClose: () => void;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: "10px", marginBottom: "28px" }}>
      <p
        className="font-semibold"
        style={{ color: "var(--color-secondary)", fontSize: "var(--text-h4)" }}
      >
        {label}
      </p>
      <p
        className="leading-relaxed"
        style={{ color: "var(--color-text-primary)", fontSize: "var(--text-h3)" }}
      >
        {value}
      </p>
    </div>
  );
}

function ExperienceDetailPanel({ experience, onClose }: ExperienceDetailPanelProps) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="bg-white h-full overflow-y-auto w-1/2 max-w-2xl"
        style={{ padding: "40px 48px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 font-medium hover:opacity-70 transition"
          style={{
            color: "var(--color-primary)",
            fontSize: "var(--text-h4)",
            marginBottom: "32px",
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1
          className="font-bold"
          style={{
            color: "var(--color-primary)",
            fontSize: "32px",
            marginBottom: "36px",
          }}
        >
          Experience
        </h1>

        <DetailField label="Job title"            value={experience.jobTitle} />
        <DetailField label="Company/organisation" value={experience.company} />
        <DetailField label="Location"             value={experience.location} />
        <DetailField label="Job type"             value={experience.jobType} />
        <DetailField
          label="Start and end date"
          value={`${experience.startDate}, ${experience.endDate}`}
        />
        <DetailField label="Role description" value={experience.roleDescription} />
      </div>
    </div>
  );
}

export default ExperienceDetailPanel;