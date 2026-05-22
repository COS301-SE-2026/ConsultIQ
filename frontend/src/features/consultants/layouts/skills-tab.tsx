import SkillsForm from "../components/skills/skills-form";
import EducationForm from "../components/skills/education-form";
import { ArrowRight } from "lucide-react";
import { useConsultantProfile } from "../pages/consultant-profile.context";

interface Props {
  onComplete: () => void;
}

export default function SkillsTab({ onComplete }: Props) {
  const { profileData } = useConsultantProfile();

  return (
    <div className="space-y-8">
      <SkillsForm />
      <div className="h-6" />
      <EducationForm />
      <div className="h-6" />

      {profileData.skills.length > 0 && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onComplete}
              className="flex items-center justify-center gap-2 h-10 w-30 px-8 rounded-xl text-white font-semibold transition hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            Next: Review
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}