import { useState } from "react";
import EducationDetailPanel, { type Education } from "./education-detail-panel";
import { toast } from "sonner";
import {Button} from "../../../../components/ui/button";
import {Pencil,Trash2,Plus} from "lucide-react"

export type { Education };

interface EducationCardProps {
   readonly educationList: readonly Education[];
   readonly canEdit?:boolean;
   readonly onSave?: (updatedEducation: Education[]) => void;
}

function formatDateRange(startDate: string, endDate: string) {
  const fmt = (d: string) => {
   if (!d || d.toLowerCase() === "present") {return d};
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
  };
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}

function EducationCard({ educationList, canEdit, onSave }: EducationCardProps) {
  const [selected, setSelected] = useState<{ edu: Education; index: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localEducation, setLocalEdu] = useState(educationList);

  const handleEditClick = () => {
    setIsEditing(true);
    setLocalEdu(educationList);

  }

  
  const handleCancel = () =>{
    setIsEditing(false);
    setLocalEdu(educationList);

  }

  const handleSave = () => {

    onSave?.([...localEducation]);
    setIsEditing(false);
    toast.success("Education has been updated successfully");

  }

  const addEducation = () => {
  
      const newEducation={
        id: `edu-${Date.now()}`,
        institution: "Institution Name",
        qualification: "Qualification Name",
        startDate: "",
        endDate: "",
      };
  
      setLocalEdu([...localEducation,newEducation]);
      setSelected(null);
  
    }
  
    const removeEducation = (index: number) =>{
      setLocalEdu(prev => prev.filter((_,pos) => pos !== index));
  
    }
  
    const savePanelChanges = (edu: Education) =>{
      const updated = [...localEducation];
      updated[selected!.index]= edu;
      setLocalEdu(updated);
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
            Education
          </h2>

          {canEdit && (
            <div className = " flex-1 flex justify-end gap-2">
            {isEditing ?(
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
            ):(

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
              
            )}
            </div>
          )}
       </div>
        

        <hr style={{ borderColor: "var(--color-border)" }} />

        {/* Education rows */}
        <div className="flex flex-col">
          { localEducation.map((edu, index) => (
            <div key={edu.id}>
              {index > 0 && (
                <hr
                  style={{
                    borderColor: "var(--color-border)",
                    margin: "24px 0",
                  }}
                />
              )}

              <div className="flex items-start justify-between gap-6 w-full">
                {isEditing ? (
                 <>
                     <div className="flex items-start justify-between gap-6">
                      {/* institution info */}
                      <div className="flex flex-col" style={{ gap: "8px" }}>
                        <p
                          className="font-bold"
                          style={{
                            color: "var(--color-text-primary)",
                            fontSize: "var(--text-h3)",
                          }}
                        >
                          {edu.institution}
                        </p>
                        <p
                          className="font-medium"
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--text-h4)",
                          }}
                        >
                          {edu.qualification}
                        </p>
                      </div>

                      {/* date range */}
                      <span
                        className="shrink-0"
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--text-h4)",
                        }}
                      >
                        {formatDateRange(edu.startDate, edu.endDate)}
                      </span>
                    </div>

                      <div className="flex items-center gap-2 shrink-0 ml-4">
                       <Button
                         variant= "secondary"
                         onClick={()=> setSelected({edu,index})}
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
                         onClick={()=> removeEducation(index)}
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
                    onClick={() => setSelected({edu,index})}
                    className="w-full text-left hover:opacity-70 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-6 flex-1">
                      {/* institution info */}
                      <div className="flex flex-col" style={{ gap: "8px" }}>
                        <p
                          className="font-bold"
                          style={{
                            color: "var(--color-text-primary)",
                            fontSize: "var(--text-h3)",
                          }}
                        >
                          {edu.institution}
                        </p>
                        <p
                          className="font-medium"
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--text-h4)",
                          }}
                        >
                          {edu.qualification}
                        </p>
                      </div>

                      {/* date range */}
                      <span
                        className="shrink-0"
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--text-h4)",
                        }}
                      >
                        {formatDateRange(edu.startDate, edu.endDate)}
                      </span>
                    </div>
                  </button>
                  
                )}

              </div>

       

              {/* end of education row */}
            </div>

          // end of isEditing block
          ))}

        {/* end education rows */}
        </div>
         {isEditing && (
              <Button
                variant = "outline"
                onClick= {addEducation}
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
                Add  education
              </Button>
            )}
      </div>

      {selected && (
        <EducationDetailPanel
          key={selected.edu.id}
          education={selected.edu}
          onClose={() => setSelected(null)}
          onSave={savePanelChanges}
          editMode={isEditing}
        />
      )}
    </>
  );
}

export default EducationCard;