import { Card } from "../../../../components/ui/card";
import ExperienceCard from "./experience-card";
import type { ExperienceItem } from "../../pages/consultant-profile.context";
import { ArrowRight } from "lucide-react";
import { Button } from "../../../../components/ui/button";

type Props = {
  experiences?: ExperienceItem[];
  onRemove?: (id: string) => void;
  onComplete?: () => void;
};

export default function ExperienceList({ experiences = [], onRemove, onComplete }: Props) {
  return (
    <Card className="p-12 h-full w-full flex items-start justify-center rounded-2xl">
      <div className="w-full max-w-[800px] flex flex-col h-full">
        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Added Experience
        </h2>
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
        {experiences.length > 0 && onComplete && (
          <div className="flex justify-end mt-4">
            <Button
              variant="default"
              onClick={onComplete}
              className="h-10 gap-2  rounded-xl font-semibold"
            >
              Next: Skills
              <ArrowRight size={18} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}