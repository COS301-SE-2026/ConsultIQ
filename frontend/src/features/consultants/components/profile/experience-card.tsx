import { useState } from "react";
import ExperienceDetailPanel, { type Experience } from "./experience-detail-panel";

export type { Experience };

interface ExperienceCardProps {
  experiences: Experience[];
}

function formatDateRange(startDate: string, endDate: string) {
  const fmt = (d: string) => {
    const parts = d.split(" ");
    return parts.length >= 2 ? `${parts[0].slice(0, 3)} ${parts[1]}` : d;
  };
  return `${fmt(startDate)}, ${fmt(endDate)}`;
}

function ExperienceCard({ experiences }: ExperienceCardProps) {
  const [selected, setSelected] = useState<Experience | null>(null);

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
          Experience
        </h2>

        <hr style={{ borderColor: "var(--color-border)" }} />

        
        <div className="flex flex-col">
          {experiences.map((exp, index) => (
            <div key={exp.id}>
              {index > 0 && (
                <hr
                  style={{
                    borderColor: "var(--color-border)",
                    margin: "24px 0",
                  }}
                />
              )}

              <button
                onClick={() => setSelected(exp)}
                className="w-full text-left hover:opacity-70 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* company info */}
                  <div className="flex flex-col" style={{ gap: "8px" }}>
                    <p
                      className="font-bold"
                      style={{
                        color: "var(--color-text-primary)",
                        fontSize: "var(--text-h3)",
                      }}
                    >
                      {exp.company}
                    </p>
                    <p
                      className="font-medium"
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "var(--text-h4)",
                      }}
                    >
                      {exp.jobTitle}
                    </p>
                    <div
                      className="flex items-center"
                      style={{ gap: "24px", marginTop: "4px" }}
                    >
                      <span
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--text-h4)",
                        }}
                      >
                        {exp.jobType}
                      </span>
                      <span
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--text-h4)",
                        }}
                      >
                        {exp.duration}
                      </span>
                    </div>
                  </div>

                  {/* date range */}
                  <span
                    className="shrink-0"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "var(--text-h4)",
                    }}
                  >
                    {formatDateRange(exp.startDate, exp.endDate)}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Detail panel */}
      {selected && (
        <ExperienceDetailPanel
          experience={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

export default ExperienceCard;