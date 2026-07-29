import SkillsForm from "../components/skills/skills-form";
import EducationForm from "../components/skills/education-form";
import { ArrowRight } from "lucide-react";
import { useConsultantProfile } from "../pages/consultant-profile.context";
import { Button } from "../../../components/ui/button";

interface Props {
  onComplete: () => void;
}

export default function SkillsTab({ onComplete }: Props) {
  const { profileData } = useConsultantProfile();

  return (
    <div className="space-y-8">
      <SkillsForm />
     
      <EducationForm />
      

      {profileData.skills.length > 0 && (
        <div className="flex justify-end mt-4">
           <Button
              variant="default"
              onClick={onComplete}
              className="h-10 gap-2  rounded-xl font-semibold"
            >
              Next: Review
              <ArrowRight size={18} />
            </Button>
        </div>
      )}
    </div>
  );
}