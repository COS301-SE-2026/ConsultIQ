import ExperienceForm from "../components/experience/experience-form";
import ExperienceList from "../components/experience/experience-list";
import { useConsultantProfile, type ExperienceItem } from "../pages/consultant-profile.context";

const sanitizeText = (input: string) => {
    if (!input) return "";
    return input.replace(/[^a-zA-Z0-9\s.,&'\-@_+/#()!]/g, "");
};

export default function ExperienceTab() {
    const { profileData, updateProfileData } = useConsultantProfile();
    const experiences = profileData.experiences || [];

    const handleAddExperience = (exp: Omit<ExperienceItem, "id">) => {
        const newExperience: ExperienceItem = {
            id: crypto.randomUUID(),
            jobTitle: sanitizeText(exp.jobTitle),
            companyName: sanitizeText(exp.companyName),
            jobType: sanitizeText(exp.jobType),
            workModel: sanitizeText(exp.workModel),
            startDate: sanitizeText(exp.startDate),
            endDate: sanitizeText(exp.endDate),
            description: sanitizeText(exp.description),
        };
        updateProfileData({ experiences: [...experiences, newExperience] });
    };

    return (
        <div className="space-y-8">
            <ExperienceForm onAdd={handleAddExperience} />
            <div className="h-6" />
            <ExperienceList experiences={experiences} />
        </div>
    );
}