import { useState } from "react";
import ExperienceDetailPanel, { type Experience } from "./experience-detail-panel";
import {Button} from "../../../../components/ui/button";
import {Pencil,Trash2,Plus} from "lucide-react"
import { toast } from "sonner";
import EditControls from "./edit-controls";
import { normalizeJobType,normalizeWorkModel } from "../../types/consultant.types";


export type { Experience };

interface ExperienceCardProps {
 readonly experiences: readonly Experience[];
  readonly canEdit?:boolean;
  readonly onSave?: (updatedExperience: Experience[]) => void;
}

function formatDateRange(startDate: string, endDate: string) {
  const fmt = (d: string) => {
   if (!d || d.toLowerCase() === "present") {return d};
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
  };
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}


function ExperienceInfo({exp}:{readonly exp: Experience}){
  return(
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 w-full">
                      <div className="flex flex-col" style={{ gap: "8px" }}>
                        <p
                          className="font-bold"
                          style={{
                            color: "var(--color-text-primary)",
                            fontSize: "var(--text-h3)",
                          }}
                        >
                          {exp.company}
                        </p>
                        <p
                          className="font-medium"
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--text-h4)",
                          }}
                        >
                          {exp.jobTitle}
                        </p>
                        <div
                          className="flex items-center"
                          style={{ gap: "24px", marginTop: "4px" }}
                        >
                          <span
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "var(--text-h4)",
                            }}
                          >
                            {normalizeJobType(exp.jobType)}
                          </span>
                          <span
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "var(--text-h4)",
                            }}
                          >
                            {normalizeWorkModel(exp.workModel)}
                          </span>
                        </div>
                      </div>

                      {/* date range */}
                      <span
                        className="shrink-0"
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--text-h4)",
                        }}
                      >
                        {formatDateRange(exp.startDate, exp.endDate ? exp.endDate : "present")}
                      </span>
                    </div>

  );
}

function ExperienceCard({ experiences, canEdit, onSave }: ExperienceCardProps) {
const [selected, setSelected] = useState<{exp: Experience; index: number }| null>(null);
const [isEditing,setIsEditing]= useState(false);
const [localExperience,setLocalExperience]= useState(experiences);
const [isSaving, setIsSaving] = useState(false);
  
  


  const handleEditClick = () => {
    setIsEditing(true);
    setLocalExperience(experiences);

  }

  
  const handleCancel = () =>{
    setIsEditing(false);
    setLocalExperience(experiences);

  }

const handleSave = async () => {
  setIsSaving(true);
  try {
    await onSave?.([...localExperience]);
    setIsEditing(false);
    toast.success("Experience has been updated successfully");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to update — please try again");
  } finally {
    setIsSaving(false);
  }
};

  const addExperience = () => {

    const newExperience={
      id: `exp-${Date.now()}`,
      company: "",
      jobTitle: "",
      jobType: "Full-time",
      startDate: "",
      endDate: "",
      roleDescription: "",
      workModel: "On-site",
    };

    setLocalExperience([...localExperience,newExperience]);
    setSelected(null);

  }

  const removeExperience = (index: number) =>{
    setLocalExperience(localExperience.filter((_,pos) => pos !== index));

  }

  const savePanelChanges = (exp: Experience) =>{
    const updated = [...localExperience];
    updated[selected!.index]= exp;
    setLocalExperience(updated);
    setSelected(null);

  }

  

  return (
    <>
      <div
        className="bg-white rounded-2xl w-full flex flex-col p-4 sm:p-7 gap-5 sm:gap-7"
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >

       <div className = "flex justify-between items-center w-full">
            <h2
              className="font-bold"
              style={{ color: "var(--color-primary)", fontSize: "22px" }}
            >
              Experience
            </h2>

            {canEdit && (
                <div className="shrink-0">
                   <EditControls
                  isEditing={isEditing}
                  isSaving={isSaving}
                  onEdit={handleEditClick}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
                </div>
               
          )}
       </div>
        <hr style={{ borderColor: "var(--color-border)" }} />
        
        <div className="flex flex-col">
          {(isEditing ? localExperience: experiences).map((exp, index) => (
            <div key={exp.id}>
              {index > 0 && (
                <hr
                  style={{
                    borderColor: "var(--color-border)",
                    margin: "24px 0",
                  }}
                />
              )}

              <div className="flex items-start sm:flex-row sm:items-start justify-between gap-6 w-full">
                {isEditing ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <ExperienceInfo exp={exp}/>
                    </div>
                    

                    <div className="flex items-center gap-2 shrink-0 sm:ml-4 ">
                       <Button
                         variant= "ghost"
                         onClick={()=> setSelected({exp,index})}
                         className="gap-2 font-bold px-3 text-sm py-1.5 shadow-md"
                       >
                         <Pencil size={16} className="text-slate-500"/>

                         Edit
                       </Button>
                       <Button
                          variant= "default"
                         onClick={()=> removeExperience(index)}
                         className="p-2 border"
                         style={{
                           boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                           fontSize: "14px",
                           padding: "6px 12px",
                         }}
                       >
                        <Trash2 size={16}/>
                       </Button>
                    </div>
                  
                  </>
                ):(

                  <button
                    onClick={() => setSelected({exp,index})}
                    className="w-full text-left hover:opacity-70 transition cursor-pointer"
                  >
                    <ExperienceInfo exp={exp}/>
                  </button>
                  

                )}


              </div>
                {/* end of education row */}
            </div>
          ))}
        </div>

         {isEditing && (
              <Button
                variant = "outline"
                onClick= {addExperience}
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
                Add Experience
              </Button>
            )}
      </div>

      {/* Detail panel */}
      {selected && (
        <ExperienceDetailPanel
          key={selected.exp.id}
          experience={selected.exp}
          onClose={() => setSelected(null)}
          onSave={savePanelChanges}
          editMode={isEditing}
        />
      )}
    </>
  );
}

export default ExperienceCard;