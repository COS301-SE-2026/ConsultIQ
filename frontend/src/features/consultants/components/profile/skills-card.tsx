import {useState, useEffect} from "react";
import {Button} from "../../../../components/ui/button";
import {Pencil} from "lucide-react"

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
}
 
function SkillsCard({ skills, canEdit }: SkillsCardProps) {

  const [isEditing, setIsEditing] = useState(false);
  const [localSkills, setLocalSkills] = useState(skills);
  const [skillError, setSkillError] = useState("");

    useEffect(() =>{
      setLocalSkills(skills);
     },[skills]);

  const handleCancel = () => {
    setIsEditing(false);
    setLocalSkills(skills);

  }

  const handleEditClick = () => {
    setIsEditing(true);

  }

  const handleSave = () => {

    setIsEditing(false);

  }





  return (
    <div
      className="bg-white rounded-2xl w-full flex flex-col"
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
          <div className = " flex-1 flex justify-end gap-2">
           {!isEditing ?(
             <Button 
              onClick={handleEditClick} 
              variant="secondary" 
              className="gap-2 font-bold px-4 py-2 border-b"
              style ={{
                fontSize: "14px",
                padding: "6px 12px",
                boxShadow: "2px 4px 6px rgba(0,0,0,0.1)",
              }}
             >
                <Pencil size={16}/>
                Edit
             </Button>
           ):(
            <>
            <Button 
              onClick={handleSave} 
              variant="default" 
              className ="font-bold px-4 py-2"
              style ={{
                fontSize: "14px",
                padding: "6px 12px",
                boxShadow: "2px 4px 6px rgba(0,0,0,0.1)",

              }}
            >
              Save
            </Button>
            <Button 
              onClick={handleCancel} 
              variant="outline" 
              className="font-bold px-4 py-2"
                style ={{
                  fontSize: "14px",
                  padding: "6px 12px",
                  boxShadow: "2px 4px 6px rgba(0,0,0,0.1)",

                }}
            >
              Cancel
            </Button>

            </>
           )}
          </div>
        )}
      </div>
 
      <hr style={{ borderColor: "var(--color-border)" }} />


 
      {/* Table header */}
      <div
        className="grid grid-cols-3 font-semibold"
        style={{
          fontSize: "var(--text-h4)",
          color: "var(--color-text-secondary)",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span>Skill Name</span>
        <span>Competency Level</span>
        <span>Years of Experience</span>
      </div>
 
      {/* Rows */}
      <div className="flex flex-col">
        {skills.map((skill, index) => (
          <div
            key={skill.name}
            className="grid grid-cols-3 font-medium"
            style={{
              fontSize: "var(--text-h3)",
              color: "var(--color-text-primary)",
              padding: "18px 0",
              borderBottom:
                index < skills.length - 1
                  ? "1px solid var(--color-border)"
                  : "none",
            }}
          >
            <span>{skill.name}</span>
            <span className="capitalize">{skill.competencyLevel.toLowerCase()}</span>
            <span>{skill.yearsOfExperience}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
 
export default SkillsCard;