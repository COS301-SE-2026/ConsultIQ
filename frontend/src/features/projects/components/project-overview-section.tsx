import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";
import { Edit, X, Check } from "lucide-react";
import { useState } from "react";
interface ProjectOverviewSectionProps {
  readonly project: Project;
  readonly isEditing: boolean;
  readonly isDisabled: boolean;
  readonly onEdit: ()=> void;
  readonly onCancel: ()=> void;
  readonly onSave: (fields:{ name: string, projectName:string, clientName: string,
          teamSize: number, budget: number, startDate: string, endDate: string, status: Project['status'],
          description: string})=>| void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "Not specified";

  const date = new Date(dateString);


  if (Number.isNaN(date.getTime())) return dateString;


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
  const [status, setStatus]= useState(project.status);
  const [description, setDescription] = useState(project.description);

  const handleSave= ()=>{
    onSave({
      name: projectName,
      projectName: projectName,
      clientName: clientName,
      teamSize: teamSize,
      budget: budget,
      startDate: startDate,
      endDate: endDate,
      status: status,
      description: description || "",
    });
  }
  const convertDate = (dateReturned: string | undefined): string => {
    if (!dateReturned) return "No date specified";

    const parsedDate = new Date(dateReturned);
    if (!Number.isNaN(parsedDate.getTime())){
      const yyyy= parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(parsedDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
}
  const renderEditingSection=() =>(
    <>
      <div className="h-6"/>
    <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className = "flex flex-col gap-1">
        <label htmlFor="project-name" className="text-base font-semibold">Project Name</label>
        <input type="text" id="project-name" value={isEditing ? projectName : project.name}
        onChange={e => setProjectName(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div>
      <div className = "flex flex-col gap-1">
        <label htmlFor="client-name" className="text-base font-semibold">Client Name</label>
        <input type="text" id="client-name" value={isEditing ? clientName : project.clientName}
        onChange={e => setClientName(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div>
      <div className = "flex flex-col gap-1">
        <label htmlFor="team-size" className="text-base font-semibold">Team Size</label>
        <input type="number" id="team-size" value={isEditing? teamSize : project.teamSize}
        onChange={e => setTeamSize(Number(e.target.value))}
        className= "text-base text-white rounded border"
        />
      </div>
      <div className = "flex flex-col gap-1">
        <label htmlFor="budget" className="text-base font-semibold">Budget</label>
        <input type="number" id="budget" value={isEditing ? budget : project.budget }
        onChange={e => setBudget(Number(e.target.value))}
        className= "text-base text-white rounded border"
        />
      </div> 
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
       <div className = "flex flex-col gap-1">
        <label htmlFor="start-date" className="text-base font-semibold">Start Date</label>
        <input type="date" id="start-date" value={convertDate(isEditing ? startDate : project.startDate)}
        onChange={e => setStartDate(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div> 
      <div className = "flex flex-col gap-1">
        <label htmlFor="end-date" className="text-base font-semibold">End Date</label>
        <input type="date" id="end-date" value={convertDate(isEditing ?endDate : project.endDate)}
        onChange={e => setEndDate(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div> 
     </div>
      <div className = "flex flex-col gap-1">
        <label htmlFor="status" className="text-base font-semibold">Project Status</label>
        <select id="status" value={isEditing ? status : project.status || "OPEN"}
        onChange={e => setStatus( e.target.value as "OPEN" |"IN_PROGRESS" | "CLOSED" | "COMPLETED")}
        className= "text-base text-white rounded border"
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CLOSED">Closed</option>
          <option value="COMPLETED">Completed</option>
        </select>
        </div>
      <div className="flex flex-col gap-1 col-span-2">
        <label htmlFor="description" className= "text-base font-semibold mb-2">Description</label>
        <textarea value={isEditing ? description : project.description} 
        onChange={e => setDescription(e.target.value)}
        className="text-base text-white rounded border"/>
      </div>
    </div>
    </>
  )

  const renderReadOnlySection=()=>(
    <>
  <div className="h-2" />
      <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Project Name" value={project.name} />
        <Info label="Client Name" value={project.clientName} />
        <Info label="Team Size" value={String(project.teamSize)} />
        <Info label="Budget" value={`R${project.budget}`} />
        <Info label="Start Date" value={formatDate(project.startDate)} />
        <Info label="End Date" value={formatDate(project.endDate)} />
        <Info label="Project Status" value={project.status} />
      </div>
      <div className="mt-8">
      <div className="h-2" />
        <p className="text-lg font-semibold mb-2">Description</p>
        <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
          {project.description}
        </p>
      </div>  

    </>
  )
  const section= isEditing ? renderEditingSection() : renderReadOnlySection();
 

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
   readonly label: string;
   readonly value: string;
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