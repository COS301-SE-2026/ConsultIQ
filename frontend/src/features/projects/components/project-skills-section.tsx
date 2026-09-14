import { Edit, X, Check } from "lucide-react";
import { useState } from "react";
import ProjectSkillsTable from "./project-skills-table";
import ProjectSkillsCard from "./project-skills-card";
import type { ProjectSkillData } from "../pages/project-specification-page";
import { Card } from "../../../components/ui/card";


interface ProjectSkillsSectionProps {
  readonly skills: ProjectSkillData[];
  readonly isEditing?: boolean;
  readonly isDisabled?: boolean;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
  readonly onSave: (skills: ProjectSkillData[]) => void;
  readonly isConsultant?: boolean;
}


export default function ProjectSkillsSection({
  skills, isEditing, isDisabled, onEdit, onCancel, onSave, isConsultant
}: ProjectSkillsSectionProps) {
  const [currentSkills, setCurrentSkills] = useState<ProjectSkillData[]>(skills);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const isNonConsultant = !isConsultant;

  const handleSaveSkill = () => {
    onSave(currentSkills);
  }

  const startEditing = (_skill: ProjectSkillData, idx: number) => {
    setEditingIndex(idx);
  }

  const cancelEditing = () => { setEditingIndex(null); }

  const updateSkill = (updatedSkill: ProjectSkillData) => {
    if (editingIndex !== null) {
      const newSkills = currentSkills.map((skill, idx) => idx === editingIndex ? updatedSkill : skill);
      setCurrentSkills(newSkills);
      setEditingIndex(null);
    };
  };

  let skillsSection;

  if (isEditing) {
    skillsSection = (
      <>
        <ProjectSkillsCard
          key={editingIndex ?? "new-skill"}
          skills={currentSkills}
          onSkillsChange={setCurrentSkills}
          editingSkill={editingIndex !== null ? currentSkills[editingIndex] : null}
          onCancelEdit={cancelEditing}
          editingIndex={editingIndex}
          onSkillSave={updateSkill}
          isEditing={isEditing}
        />
        <ProjectSkillsTable
          skills={currentSkills.map((skill, skillId) => ({
            id: String(skillId),
            name: skill.name,
            competency: skill.competency,
            years: skill.years,
            mandatory: skill.mandatory,
          }))}
          onEditSkill={startEditing}
          isEditing={isEditing}
        />
      </>
    );
  } else {
    skillsSection = (
      <ProjectSkillsTable
        skills={currentSkills.map((skill, skillId) => ({
          id: String(skillId),
          name: skill.name,
          competency: skill.competency,
          years: skill.years,
          mandatory: skill.mandatory,
        }))}
        onEditSkill={() => { }}
        isEditing={isEditing}
      />
    );
  }
  return (
    <Card className={`border-none p-4 sm:p-5 ${isDisabled ? "opacity-40 pointer-events-none": "opacity-100"}`}>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2
          className="mb-4 text-2xl font-bold sm:text-3xl"
          style={{ color: "var(--color-primary)" }}
        >
          Skills
        </h2>
        <div>
          {isEditing ? (
            <div className="flex flex-wrap gap-3">
              <button type="button"
                onClick={handleSaveSkill}
                className="flex items-center text-green-400 font-medium ">
                <Check className="h-6 w-6" /> Save
              </button>
              <button type="button"
                onClick={onCancel}
                className="flex items-center text-red-400 font-medium ">
                <X className="h-6 w-6" /> Cancel
              </button>
            </div>) : (
            isNonConsultant && (
              <button type="button"
                onClick={onEdit}
                disabled={isDisabled}
                className=" hover:text-blue-900 disabled:opacity-30 rounded transition">
                <Edit className="h-6 w-6 text-primary" />
              </button>
            )

          )}
        </div>
      </div>
      <div className="h-2" />
      {skillsSection}
    </Card>
  );
}