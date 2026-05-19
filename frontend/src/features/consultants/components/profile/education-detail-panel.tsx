import { ArrowLeft } from "lucide-react";

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  startDate: string;
  endDate: string;
  attachmentName?: string;
}

interface EducationDetailPanelProps {
  education: Education;
  onClose: () => void;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 mb-8">
      <p className="font-semibold text-base" style={{ color: "var(--color-secondary)" }}>
        {label}
      </p>
      <p className="text-base leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

function EducationDetailPanel({ education, onClose }: EducationDetailPanelProps) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="bg-white h-full overflow-y-auto w-1/2 max-w-2xl px-12 py-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 mb-10 font-medium hover:opacity-70 transition"
          style={{ color: "var(--color-primary)" }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1
          className="font-bold text-4xl mb-10"
          style={{ color: "var(--color-primary)" }}
        >
          Education
        </h1>

        <DetailField label="Institution name"   value={education.institution} />
        <DetailField label="Qualification"      value={education.qualification} />
        <DetailField
          label="Start and end date"
          value={`${education.startDate}, ${education.endDate}`}
        />

        {/* Attachment */}
        {education.attachmentName && (
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-base" style={{ color: "var(--color-secondary)" }}>
              Attachments
            </p>
            <div
              className="flex items-center gap-4 rounded-xl border px-5 py-4"
              style={{ borderColor: "var(--color-border)" }}
            >
              {/* File icon */}
              <svg
                width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-base" style={{ color: "var(--color-text-primary)" }}>
                <strong>{education.attachmentName.replace(".pdf", "")}</strong>
                <span style={{ color: "var(--color-text-secondary)" }}>.pdf</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EducationDetailPanel;