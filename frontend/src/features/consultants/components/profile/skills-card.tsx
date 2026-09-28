import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Trash2, Plus } from "lucide-react"
import { Input } from "../../../../components/ui/input";
import { toast } from "sonner";
import EditControls from "./edit-controls";
import { normalizeCompetency } from "../../types/consultant.types"

export type CompetencyLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT";

export interface Skill {
  name: string;
  confidenceLevel: number;
  competencyLevel: CompetencyLevel;
  yearsOfExperience: number;
}

interface SkillsCardProps {
  readonly skills: readonly Skill[];
  readonly canEdit?: boolean;
  readonly onSave?: (updatedSkills: Skill[]) => void;
}

function SkillsCard({ skills, canEdit, onSave }: SkillsCardProps) {

  const [isEditing, setIsEditing] = useState(false);
  const [localSkills, setLocalSkills] = useState(skills);
  const [showValidation, setShowValidation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const handleCancel = () => {
    setIsEditing(false);
    setLocalSkills(skills);
    setShowValidation(false);

  }

  const handleEditClick = () => {
    setIsEditing(true);
    setLocalSkills(skills);
    setShowValidation(false);

  }

  const handleSave = async () => {
    const hasEmptyFields = localSkills.some((skill) => !skill.name.trim());

    if (hasEmptyFields) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);
    setIsSaving(true);
    try {
      await onSave?.([...localSkills]);
      setIsEditing(false);
      toast.success("Your skills have been updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update — please try again");
    } finally {
      setIsSaving(false);
    }
  };

  const competencyLevel = (years: number, confidence: number): "BEGINNER" | "INTERMEDIATE" | "EXPERT" => {
    if (confidence >= 4 && years >= 5) return "EXPERT";
    if (confidence >= 3 && years >= 3) return "INTERMEDIATE";
    return "BEGINNER";
  }

  const addSkill = () => {
    const newSkill = {
      name: "",
      confidenceLevel: 1,
      competencyLevel: "BEGINNER" as const,
      yearsOfExperience: 0
    };

    setLocalSkills([...localSkills, newSkill]);
  }

  const removeSkill = (index: number) => {
    setLocalSkills(localSkills.filter((_, pos) => pos !== index));
  }

  const updateSkill = (index: number, field: keyof Skill, value: string) => {

    const updatedSkills = [...localSkills];

    const currentSkill = { ...updatedSkills[index] };

    if (field === "name") {
      currentSkill.name = value;
    } else if (field === "yearsOfExperience") {
      const parsedValue = value === "" ? 0 : Number.parseFloat(value);
      currentSkill.yearsOfExperience = Number.isNaN(parsedValue) ? 0 : parsedValue;

    } else if (field === "confidenceLevel") {
      currentSkill.confidenceLevel = Number.parseInt(value, 10) || 1;
    }

    currentSkill.competencyLevel = competencyLevel(currentSkill.yearsOfExperience, currentSkill.confidenceLevel);
    updatedSkills[index] = currentSkill;

    setLocalSkills(updatedSkills);
  }


  const activeSkills = isEditing ? localSkills : skills;
  const lastIndex = activeSkills.length - 1;
  return (
    <div
      className="bg-white rounded-2xl w-full flex flex-col p-4 sm:p-7 gap-5 sm:gap-7 "
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", }}
    >


      <div className="flex justify-between items-center w-full">

        <h2
          className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "22px" }}
        >
          Skills
        </h2>

        {canEdit && (
          <EditControls
            isEditing={isEditing}
            isSaving={isSaving}
            onEdit={handleEditClick}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>

      <hr style={{ borderColor: "var(--color-border)" }} />



      {/* Table header */}
      <div
        className={`${isEditing ? " hidden sm:grid sm:grid-cols-[2fr_1.5fr_1.5fr_2fr_auto] sm:gap-4"
          : " grid grid-cols-3 gap-3"} font-semibold`}
        style={{
          fontSize: "var(--text-h4)",
          color: "var(--color-text-secondary)",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span>Skill Name</span>
        {isEditing && <span>Confidence (1-4)</span>}
        <span>Competency Level</span>
        <span>Years of Experience</span>
        {isEditing && <span className="w-5"></span>}
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {activeSkills.map((skill, index) => (
          <div
            key={index}
            className={`grid 
              ${isEditing ? "grid-cols-2 gap-3 sm:grid-cols-[2fr_1.5fr_1.5fr_2fr_auto] sm:gap-4 sm:items-center"
                : " grid grid-cols-3"} font-medium`}
            style={{
              fontSize: "var(--text-h3)",
              color: "var(--color-text-primary)",
              padding: "18px 0",
              borderBottom:
                index < lastIndex
                  ? "1px solid var(--color-border)"
                  : "none",
            }}
          >
            {isEditing ? (
              <>
                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <label htmlFor="skillName" className="sm:hidden block text-xs font-semibold text-slate-500 mb-1">Skill name</label>
                  <Input
                    id="skillName"
                    placeholder="React"
                    value={skill.name}
                    onChange={(e) => updateSkill(index, "name", e.target.value)}
                  />
                  {showValidation && !skill.name.trim() && (
                    <span className="text-red-500 text-xs mt-1 block">
                      Skill name must be filled in
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <label htmlFor="confidence" className="sm:hidden block text-xs font-semibold text-slate-500 mb-1">Confidence (1-4)</label>
                  <select
                    id="confidence"
                    value={skill.confidenceLevel || 1}
                    onChange={(e) => updateSkill(index, "confidenceLevel", e.target.value)}
                    className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                  >

                    <option value="1">1 - Low</option>
                    <option value="2">2 - Moderate</option>
                    <option value="3">3 - High</option>
                    <option value="4">4 - Expert</option>


                  </select>
                </div>


                <div className="min-w-0">
                  <label htmlFor="competency-level" className="sm:hidden block text-xs font-semibold text-slate-500 mb-1">Competency level</label>
                  <Input
                    id="competency-level"
                    type="text"
                    placeholder="Auto-calculated"
                    value={normalizeCompetency(skill.competencyLevel)}
                    readOnly
                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className=" col-span-2 sm:col-span-1 min-w-0">
                  <label htmlFor="years-of-Experience" className="sm:hidden block text-xs font-semibold text-slate-500 mb-1">Years of experience</label>
                  <Input
                    id="years-of-Experience"
                    type="number"
                    placeholder="5"
                    min="0"
                    max="70"
                    value={skill.yearsOfExperience === 0 ? "" : skill.yearsOfExperience}
                    onChange={(e) => updateSkill(index, "yearsOfExperience", e.target.value)}
                  />
                </div>




                <Button
                  variant="default"
                  onClick={() => removeSkill(index)}
                  style={{
                    fontSize: "14px",
                    padding: "6px 12px",

                  }}

                >
                  <Trash2 size={18} />
                </Button>
              </>
            ) : (

              <>
                <span>{skill.name}</span>
                <span>{normalizeCompetency(skill.competencyLevel)}</span>
                <span>{skill.yearsOfExperience}</span>
              </>

            )}

          </div>
        ))}
      </div>

      {isEditing && (
        <Button
          variant="outline"
          onClick={addSkill}
          className="w-full flex items-center justify-center gap-2 py-8 rounded-lg"
          style={{
            borderColor: "var(--color-border)",
            border: "2px dashed #002D62",
            fontWeight: 600,
            paddingTop: "8px",
            paddingBottom: "8px",


          }}
        >
          <Plus size={18} />
          Add Skill
        </Button>
      )}
    </div>
  );
}

export default SkillsCard;