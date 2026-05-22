import ExperienceForm from "../components/experience/experience-form";
import ExperienceList from "../components/experience/experience-list";
import { useConsultantProfile, type ExperienceItem } from "../pages/consultant-profile.context";
import { toast } from "sonner";

const sanitizeText = (input: string) => {
  if (!input) return "";
  return input.replace(/[^a-zA-Z0-9\s.,&'\-@_+/#()!]/g, "");
};

interface Props {
  onComplete: () => void;
}

export default function ExperienceTab({ onComplete }: Props) {
  const { profileData, updateProfileData } = useConsultantProfile();
  const experiences = profileData.experiences || [];

  const handleAddExperience = (exp: Omit<ExperienceItem, "id">) => {
    const newExperience: ExperienceItem = {
      id: crypto.randomUUID(),
      jobTitle: sanitizeText(exp.jobTitle),
      companyName: sanitizeText(exp.companyName),
      jobType: exp.jobType,
      workModel: exp.workModel,
      startDate: exp.startDate,
      endDate: exp.endDate,
      description: sanitizeText(exp.description),
    };
    updateProfileData({ experiences: [...experiences, newExperience] });
    toast.success("Experience added!");
  };

  const handleRemoveExperience = (id: string) => {
    updateProfileData({ experiences: experiences.filter((e) => e.id !== id) });
    toast.success("Experience removed.");
  };

  return (
    <div className="space-y-8">
      <ExperienceForm onAdd={handleAddExperience} />
      <div className="h-6" />
      <ExperienceList
        experiences={experiences}
        onRemove={handleRemoveExperience}
        onComplete={onComplete}
      />
    </div>
  );
}