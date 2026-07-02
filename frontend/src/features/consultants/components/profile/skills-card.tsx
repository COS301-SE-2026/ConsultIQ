import {useState} from "react";
import {Button} from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { toast } from "sonner";
import EditControls from "./edit-controls";

export type CompetencyLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT";
 
export interface Skill {
  name: string;
  confidenceLevel: number;
  competencyLevel: CompetencyLevel;
  yearsOfExperience: number;
}
 
interface SkillsCardProps {
  readonly skills: readonly Skill[];
  readonly canEdit?:boolean;
  readonly onSave?: (updatedSkills: Skill[]) => void;
}
 
function SkillsCard({ skills, canEdit, onSave }: SkillsCardProps) {

  const [isEditing, setIsEditing] = useState(false);
  const [localSkills, setLocalSkills] = useState(skills);
  const [showValidation, setShowValidation] = useState(false);

   

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

  const handleSave = () => {

    const hasEmptyFields = localSkills.some((skill) => !skill.name.trim());

    if (hasEmptyFields) {
      setShowValidation(true); 
      return;
    }

    setShowValidation(false);

     onSave?.([...localSkills]); //Callback to parent where api call is made

    

    setIsEditing(false);
    toast.success(" your skills have been updated successfully");

  }

  const competencyLevel = (years: number, confidence: number) : "BEGINNER" | "INTERMEDIATE" | "EXPERT" =>{
    if (confidence >= 4 && years >= 5) return "EXPERT";
    if (confidence >= 3 && years>= 3) return "INTERMEDIATE";
    return "BEGINNER";
  }

  const addSkill = () =>{
    const newSkill={
      name: "",
      confidenceLevel: 1,
      competencyLevel: "BEGINNER" as const,
      yearsOfExperience: 0
    };

    setLocalSkills([...localSkills,newSkill]);
  }

  const removeSkill = (index: number) =>{
    setLocalSkills(localSkills.filter((_,pos)=> pos !== index));
  }

  const updateSkill = (index: number, field: keyof Skill, value: string) =>{

    const updatedSkills = [...localSkills];

    const currentSkill = {...updatedSkills[index]};

    if(field === "name"){
      currentSkill.name = value;
    }else if(field === "yearsOfExperience"){
      currentSkill.yearsOfExperience = Number.parseFloat(value) || 0;

    }else if(field === "confidenceLevel"){
        currentSkill.confidenceLevel = Number.parseInt(value,10) || 1;
    }

    currentSkill.competencyLevel = competencyLevel(currentSkill.yearsOfExperience,currentSkill.confidenceLevel);
    updatedSkills[index] = currentSkill;

    setLocalSkills(updatedSkills);
  }


  const activeSkills= isEditing ? localSkills : skills;
  const lastIndex= activeSkills.length-1;
  return (
    <div
      className="bg-white rounded-2xl w-full flex flex-col "
      style={{
        padding: "28px 28px 28px 28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        gap: "28px",
      }}
    >


      <div className = "flex justify-between items-center w-full">

        <h2
          className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "22px" }}
        >
          Skills
       </h2>

         {canEdit && (
             <EditControls
                  isEditing={isEditing}
                  onEdit={handleEditClick}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
        )}
      </div>
 
      <hr style={{ borderColor: "var(--color-border)" }} />


 
      {/* Table header */}
      <div
        className={`grid ${isEditing ? "grid-cols-[2fr_1.5fr_1.5fr_2fr_auto]":"grid-cols-3"} font-semibold`}
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
            key={`${skill.name}-${index}`}
            className={`grid ${isEditing ? "grid-cols-[2fr_1.5fr_1.5fr_2fr_auto] gap-4 items-center":"grid-cols-3"} font-medium`}
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
                <div>
                  <Input
                  placeholder="React"
                  value={skill.name}
                  onChange={(e) => updateSkill(index,"name",e.target.value)}
                />
                {showValidation && !skill.name.trim() && (
                    <span className="text-red-500 text-xs mt-1 block">
                      Skill name must be filled in
                    </span>
                  )}
                </div>
                 

                 <select
                  id="confidence"
                  value={skill.confidenceLevel || 1}
                  onChange={(e) => updateSkill(index,"confidenceLevel",e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                >
          
                  <option value="1">1 - Low</option>
                  <option value="2">2 - Moderate</option>
                  <option value="3">3 - High</option>
                  <option value="4">4 - Expert</option>

                  
                </select>
                
                <Input
                  type="text"
                  placeholder="Auto-calculated"
                  value={skill.competencyLevel}
                  readOnly
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />

                <Input
                  type="number"
                  placeholder="5"
                  min="0"
                  max="70"
                  value={skill.yearsOfExperience}
                  onChange={(e) => updateSkill(index,"yearsOfExperience",e.target.value)}
                />

                <Button
                 variant="secondary"
                 onClick={() => removeSkill(index)}
                   style ={{
                  fontSize: "14px",
                  padding: "6px 12px",

                }}
                 
                >
                  <Trash2 size={18} />
                </Button>
              </>
            ):(

              <>
               <span>{skill.name}</span>
               <span className="capitalize">{skill.competencyLevel.toLowerCase()}</span>
               <span>{skill.yearsOfExperience}</span>
              </>
              
            )}
           
          </div>
        ))}
      </div>

      {isEditing && (
        <Button
          variant = "outline"
          onClick= {addSkill}
         className="w-full flex items-center justify-center gap-2 py-8 rounded-lg"
          style={{
            borderColor: "var(--color-border)",
             border: "2px dashed #002D62",
             fontWeight: 600,
             paddingTop: "8px",
             paddingBottom: "8px",
             
           
          }}
        >
          <Plus size= {18}/>
          Add Skill
        </Button>
      )}
    </div>
  );
}
 
export default SkillsCard;