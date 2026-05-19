import SkillsForm from "../components/skills/skills-form";
import EducationForm from "../components/skills/education-form";

export default function SkillsTab() {
    return (
        <div className="space-y-8">
            <SkillsForm />
            <div className="h-6" />
            <EducationForm />
            <div className="h-6" />
        </div>
    );
}