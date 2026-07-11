import type { Project } from "../types/project.types";
import { useState } from "react";
interface ProjectOverviewEditFormProps {
  project: Project;
  onCancel: ()=> void;
  onSave: (fields:{ name: string, projectName:string, clientName: string,
          teamSize: number, budget: number, startDate: string, endDate: string, status: Project['status'],
          description: string})=> void;
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
};

export default function ProjectOverviewEditForm({
  project,
}: ProjectOverviewEditFormProps) {
  const [projectName, setProjectName]= useState(project.name);
  const [clientName, setClientName]= useState(project.clientName);
  const [teamSize, setTeamSize]= useState(project.teamSize);
  const [budget, setBudget]= useState(project.budget);
  const [startDate, setStartDate]= useState(project.startDate);
  const [endDate, setEndDate]= useState(project.endDate);
  const [status, setStatus]= useState(project.status);
  const [description, setDescription] = useState(project.description);

  return(
   <>
    <div className="h-6"/>
    <div className="text-lg grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Project Name</label>
        <input type="text" value={ projectName}
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
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
       <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Start Date</label>
        <input type="date" value={convertDate(startDate)}
        onChange={e => setStartDate(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div> 
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">End Date</label>
        <input type="date" value={convertDate(endDate)}
        onChange={e => setEndDate(e.target.value)}
        className= "text-base text-white rounded border"
        />
      </div> 
     </div>
      <div className = "flex flex-col gap-1">
        <label className="text-base font-semibold">Project Status</label>
        <select id="status" value={status || "OPEN"}
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
        <label className= "text-base font-semibold mb-2">Description</label>
        <textarea value={description} 
        onChange={e => setDescription(e.target.value)}
        className="text-base text-white rounded border"/>
     </div>
    </div>
</>
);};
