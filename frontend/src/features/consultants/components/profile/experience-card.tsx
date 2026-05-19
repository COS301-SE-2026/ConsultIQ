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
        className="bg-white rounded-2xl px-10 py-8"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2
          className="font-bold text-xl mb-8"
          style={{ color: "var(--color-primary)" }}
        >
          Experience
        </h2>

        <div className="flex flex-col">
          {experiences.map((exp, index) => (
            <div key={exp.id}>
              {index > 0 && (
                <hr className="my-6" style={{ borderColor: "var(--color-border)" }} />
              )}

              <button
                onClick={() => setSelected(exp)}
                className="w-full text-left hover:opacity-70 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* company info */}
                  <div className="flex flex-col gap-1.5">
                    <p className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                      {exp.company}
                    </p>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {exp.jobTitle}
                    </p>
                    <div className="flex items-center gap-5 mt-1">
                      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {exp.jobType}
                      </span>
                      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {exp.duration}
                      </span>
                    </div>
                  </div>

                  {/* date range */}
                  <span
                    className="text-sm shrink-0"
                    style={{ color: "var(--color-text-secondary)" }}
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