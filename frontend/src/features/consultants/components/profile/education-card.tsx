import { useState } from "react";
import EducationDetailPanel, { type Education } from "./education-detail-panel";

export type { Education };

interface EducationCardProps {
   readonly educationList: readonly Education[];
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
        className="bg-white rounded-2xl w-full flex flex-col"
        style={{
          padding: "28px 28px 28px 28px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          gap: "28px",
        }}
      >
       
        <h2
          className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "22px" }}
        >
          Education
        </h2>

        <hr style={{ borderColor: "var(--color-border)" }} />

        {/* Education rows */}
        <div className="flex flex-col">
          {educationList.map((edu, index) => (
            <div key={edu.id}>
              {index > 0 && (
                <hr
                  style={{
                    borderColor: "var(--color-border)",
                    margin: "24px 0",
                  }}
                />
              )}

              <button
                onClick={() => setSelected(edu)}
                className="w-full text-left hover:opacity-70 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* institution info */}
                  <div className="flex flex-col" style={{ gap: "8px" }}>
                    <p
                      className="font-bold"
                      style={{
                        color: "var(--color-text-primary)",
                        fontSize: "var(--text-h3)",
                      }}
                    >
                      {edu.institution}
                    </p>
                    <p
                      className="font-medium"
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "var(--text-h4)",
                      }}
                    >
                      {edu.qualification}
                    </p>
                  </div>

                  {/* date range */}
                  <span
                    className="shrink-0"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "var(--text-h4)",
                    }}
                  >
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

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