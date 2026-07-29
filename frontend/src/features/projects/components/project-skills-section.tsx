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

  const startEditing = (skill: ProjectSkillData) => {
    setEditingIndex(Number(skill.id));
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
      />

    );
  }
  return (
    <Card style={{ padding: "20px", border: "none" }}>

    if(isEditing ){
        skillsSection= (
            <>
            <ProjectSkillsCard
            key= {editingIndex ?? "new-skill"}
            skills={currentSkills}
            onSkillsChange={setCurrentSkills}
            editingSkill= {editingIndex !==null ? currentSkills[editingIndex]: null}
            onCancelEdit= {cancelEditing}
            editingIndex ={editingIndex}
            onSkillSave={updateSkill} 
            isEditing = {isEditing}
            />
            <ProjectSkillsTable
            skills={currentSkills.map((skill, skillId) => ({
                id: String(skillId),
                name: skill.name,
                competency: skill.competency,
                years: skill.years,
                mandatory: skill.mandatory,
              }))}
              onEditSkill= {startEditing}
              isEditing= {isEditing}
            />
            </>
        );
    }else{ 
        skillsSection= (            
            <ProjectSkillsTable
              skills={currentSkills.map((skill, skillId) => ({
                id: String(skillId),
                name: skill.name,
                competency: skill.competency,
                years: skill.years,
                mandatory: skill.mandatory,
              }))}
              onEditSkill= {()=> {}}
              isEditing = {isEditing}
            />
        );
      }
      return(
        <Card style={{ padding: "20px", border: "none" }}>
            
          <div className=" flex flex-center gap-3">
            <h3
                className="text-3xl font-bold mb-4"
                style={{ color: "var(--color-primary)" }}
              >
                Skills
              </h3>
              <div>
          {isEditing ? (
            <div className="flex gap-4">
              <button
                onClick={handleSaveSkill}
                className="flex items-center text-green-400 font-medium ">
                <Check className="h-5 w-5" /> Save
              </button>
              <button
                onClick={onCancel}
                className="flex items-center text-red-400 font-medium ">
                <X className="h-5 w-5" /> Cancel
              </button>
            </div>) : (
            isNonConsultant && (
              <button
                onClick={onEdit}
                disabled={isDisabled}
                className=" hover:text-blue-900 disabled:opacity-30 rounded transition">
                <Edit className="h-5 w-5" />
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

