import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";
import { Edit, X, Check } from "lucide-react";
import { useState, useEffect } from "react";
interface ProjectOverviewSectionProps {
  project: Project;
  isEditing: boolean;
  isDisabled: boolean;
  onEdit: ()=> void;
  onCancel: ()=> void;
  onSave: (fields:{ name: string, projectName:string, clientName: string,
          teamSize: number, budget: number, startDate: string, endDate: string,
          description: string})=>| void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "Not specified";

  const date = new Date(dateString);


  if (isNaN(date.getTime())) return dateString;


  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function ProjectOverviewSection({
  project, isEditing, isDisabled, onEdit, onCancel, onSave,
}: ProjectOverviewSectionProps) {
  const [projectName, setProjectName]= useState(project.name);
  const [clientName, setClientName]= useState(project.clientName);
  const [teamSize, setTeamSize]= useState(project.teamSize);
  const [budget, setBudget]= useState(project.budget);
  const [startDate, setStartDate]= useState(project.startDate);
  const [endDate, setEndDate]= useState(project.endDate);
  const [description, setDescription] = useState(project.description);
  let section;

  useEffect(() => {
    setProjectName(project.name);
    setClientName(project.clientName);
    setTeamSize(project.teamSize);
    setBudget(project.budget);
    setStartDate(project.startDate);
    setEndDate(project.endDate);
    setDescription(project.description);
  }, [project]);

  const handleSave= ()=>{
    onSave({
      name: projectName,
      projectName: projectName,
      clientName: clientName,
      teamSize: teamSize,
      budget: budget,
      startDate: startDate,
      endDate: endDate,
      description: description || "",
    });
  }
  const convertDate = (dateReturned: string | undefined): string => {
    if (!dateReturned) return "No date specified";

    const parsedDate = new Date(dateReturned);
    if (!isNaN(parsedDate.getTime())){
      const yyyy= parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(parsedDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
}

  if(isEditing){
    section= (
    <>
    <div className="h-6"/>
    <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Project Name</label>
        <input type="text" value={projectName}
        onChange={e => setProjectName(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div>
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Client Name</label>
        <input type="text" value={clientName}
        onChange={e => setClientName(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div>
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Team Size</label>
        <input type="number" value={teamSize}
        onChange={e => setTeamSize(Number(e.target.value))}
        className= "text-base text-white rounded border"
        />
      </div>
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Budget</label>
        <input type="number" value={budget}
        onChange={e => setBudget(Number(e.target.value))}
        className= "text-base text-white rounded border"
        />
      </div> 
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Start Dtae</label>
        <input type="date" value={convertDate(startDate)}
        onChange={e => setStartDate(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div> 
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">End Dtae</label>
        <input type="date" value={convertDate(endDate)}
        onChange={e => setEndDate(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div> 
      <div className="flex flex-col gap-1 col-span-2">
        <label className= "text-base font-semibold mb-2">Description</label>
        <textarea value={description} 
        onChange={e => setDescription(e.target.value)}
        className="text-base text-white rounded border"/>

      </div>

    </div>
    </>);

  }else{
    section =(
      <>
      <div className="h-2" />
      <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Project Name" value={project.name} />
        <Info label="Client Name" value={project.clientName} />
        <Info label="Team Size" value={String(project.teamSize)} />
        <Info label="Budget" value={`R${project.budget}`} />
        <Info label="Start Date" value={formatDate(project.startDate)} />
        <Info label="End Date" value={formatDate(project.endDate)} />
      </div>
      <div className="mt-8">
      <div className="h-2" />
        <p className="text-lg font-semibold mb-2">Description</p>
        <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
          {project.description}
        </p>
      </div>
      </>
    );

  }

  return (
    <Card style={{ padding: "20px", border: "none" }}
     className= {`${isDisabled ? "opacity-40 pointer-events-none": "opacity-100"}`}>
      <div className="flex flex-center gap-3 mb-8">
        <h3
          className="text-3xl font-bold mb-8"
          style={{ color: "var(--color-primary)" }}
        >
          Overview
        </h3>
        <div className= "h-6"/>
        <div>
          {isEditing ? (
            <div className="flex gap-4">
              <button 
              onClick={handleSave} 
              className="flex items-center text-green-400 font-medium ">
              <Check className="h-5 w-5"/> Save
              </button>
              <button 
              onClick={onCancel} 
              className="flex items-center text-red-400 font-medium ">
              <X className="h-5 w-5"/> Cancel
              </button>
              </div>):(
                <button 
                onClick={onEdit} 
                disabled={isDisabled}
                className=" hover:text-blue-900 disabled:opacity-30 rounded transition">
                <Edit className="h-5 w-5"/> 
                </button>
              )}
            </div>
        </div>
        {section}
    </Card>
  );
}

function Info({
  label,
  value,
}: {
   label: string;
   value: string;
}) {
  return (
    <div>
      <p className="font-semibold mb-2">{label}</p>

      <p style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </p>
    </div>
  );
}