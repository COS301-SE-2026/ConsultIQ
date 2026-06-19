import { useState, useEffect } from "react";
import ExperienceDetailPanel, { type Experience } from "./experience-detail-panel";
import {Button} from "../../../../components/ui/button";
import {Pencil,Trash2,Plus} from "lucide-react"
import { toast } from "sonner";

export type { Experience };

interface ExperienceCardProps {
 readonly experiences: readonly Experience[];
  readonly canEdit?:boolean;
  readonly onSave?: (updatedExperience: Experience[]) => void;
}

function formatDateRange(startDate: string, endDate: string) {
  const fmt = (d: string) => {
   if (!d || d.toLowerCase() === "present") return d;
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
  };
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}


function ExperienceCard({ experiences, canEdit, onSave }: ExperienceCardProps) {
  const [selected, setSelected] = useState<{exp: Experience; index: number }| null>(null);
  const [isEditing,setIsEditing]= useState(false);
  const [localExperience,setLocalExp]= useState(experiences);
  
  useEffect(() =>{
      setLocalExp(experiences);
     },[experiences]);


  const handleEditClick = () => {
    setIsEditing(true);
    setLocalExp(experiences);

  }

  
  const handleCancel = () =>{
    setIsEditing(false);
    setLocalExp(experiences);

  }

  const handleSave = () => {

    onSave?.([...localExperience]);
    setIsEditing(false);
    toast.success("Experience has been updated successfully");

  }

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

    setLocalExp([...localExperience,newExperience]);
    setSelected(null);

  }

  const removeExperience = (index: number) =>{
    setLocalExp(localExperience.filter((_,pos) => pos !== index));

  }

  const savePanelChanges = (exp: Experience) =>{
    const updated = [...localExperience];
    updated[selected!.index]= exp;
    setLocalExp(updated);
    setSelected(null);

  }

  

  return (
    <>
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
              Experience
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

              <div className="flex items-start justify-between gap-6 w-full">
                {!isEditing ? (
                        
                  <button
                    onClick={() => setSelected({exp,index})}
                    className="w-full text-left hover:opacity-70 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-6">
                      {/* company info */}
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
                            {exp.jobType}
                          </span>
                          <span
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "var(--text-h4)",
                            }}
                          >
                            {exp.workModel}
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
                        {formatDateRange(exp.startDate, exp.endDate)}
                      </span>
                    </div>
                  </button>

                ):(
                  <>

                  <div className="flex items-start justify-between gap-6 w-full">
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
                            {exp.jobType}
                          </span>
                          <span
                            style={{
                              color: "var(--color-text-secondary)",
                              fontSize: "var(--text-h4)",
                            }}
                          >
                            {exp.workModel}
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
                        {formatDateRange(exp.startDate, exp.endDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                       <Button
                         variant= "secondary"
                         onClick={()=> setSelected({exp,index})}
                         className="gap-2 font-bold px-4 py-2 border-b"
                          style={{
                           boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                           fontSize: "14px",
                           padding: "6px 12px",
                         }}
                       >
                         <Pencil size={16} className="text-slate-500"/>

                         Edit
                       </Button>
                       <Button
                          variant= "secondary"
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