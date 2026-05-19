import { useState } from "react";
import EducationDetailPanel, { type Education } from "./education-detail-panel";

export type { Education };

interface EducationCardProps {
  educationList: Education[];
}

function formatDateRange(startDate: string, endDate: string) {
  const fmt = (d: string) => {
    const parts = d.split(" ");
    return parts.length >= 2 ? `${parts[0].slice(0, 3)} ${parts[1]}` : d;
  };
  return `${fmt(startDate)}, ${fmt(endDate)}`;
}

function EducationCard({ educationList }: EducationCardProps) {
  const [selected, setSelected] = useState<Education | null>(null);

  return (
    <>
      <div
        className="bg-white rounded-2xl px-10 py-8"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2
          className="font-bold text-xl mb-8"
          style={{ color: "var(--color-primary)" }}
        >
          Education
        </h2>

        <div className="flex flex-col">
          {educationList.map((edu, index) => (
            <div key={edu.id}>
              {index > 0 && (
                <hr className="my-6" style={{ borderColor: "var(--color-border)" }} />
              )}

              <button
                onClick={() => setSelected(edu)}
                className="w-full text-left hover:opacity-70 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-6">
                
                  <div className="flex flex-col gap-1.5">
                    <p className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                      {edu.institution}
                    </p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {edu.qualification}
                    </p>
                  </div>

                  <span
                    className="text-sm shrink-0"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <EducationDetailPanel
          education={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

export default EducationCard;