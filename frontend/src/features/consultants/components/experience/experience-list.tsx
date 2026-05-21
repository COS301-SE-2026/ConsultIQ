import { Card } from "../../../../components/ui/card";
import ExperienceCard from "./experience-card";
import type { ExperienceItem } from "../../pages/consultant-profile.context";

type Props = {
  experiences?: ExperienceItem[];
  onRemove?: (id: string) => void;
};

export default function ExperienceList({ experiences = [], onRemove }: Props) {
  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[800px] flex flex-col h-full">
        <div className="h-6" />
        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Added Experience
        </h2>
        <div className="h-6" />
        <div className="flex flex-col gap-6 flex-1">
          {experiences.length > 0 ? (
            experiences.map((exp) => (
              <ExperienceCard
                key={exp.id}
                experience={exp}
                onRemove={onRemove ? () => onRemove(exp.id) : undefined}
              />
            ))
          ) : (
            <p className="text-slate-500 text-center py-8">No experience added yet.</p>
          )}
        </div>
        <div className="h-6" />
      </div>
    </Card>
  );
}