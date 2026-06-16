import { DetailPanel } from "../../../../components/shared/detail-panel";
import { DetailField } from "../../../../components/shared/detail-field";
import { useState, useEffect } from "react";
import { Input } from "../../../../components/ui/input";
import {Button} from "../../../../components/ui/button";


export interface Experience {
  id: string;
  company: string;
  jobTitle: string;
  jobType: string;
  startDate: string;
  endDate: string;
  roleDescription: string;
  workModel: string;
}

interface ExperienceDetailPanelProps {
  readonly experience: Experience;
  readonly onClose: () => void;
  readonly onSave: (experience: Experience) => void;
  readonly editMode?: boolean;
}

export default function ExperienceDetailPanel({ experience, onClose,onSave, editMode }: ExperienceDetailPanelProps) {

  const [company, setCompany] = useState(experience.company);
  const [jobTitle, setJobTitle] = useState(experience.jobTitle);
  const [jobType, setJobType]= useState(experience.jobType);
  const [startDate, setStartDate] = useState(experience.startDate);
  const [endDate, setEndDate] = useState(experience.endDate);
  const [roleDesc, setRoleDesc]= useState(experience.roleDescription);
  const [workModel, setWorkModel] = useState(experience.workModel);
  

  const [companyError, setCompaneyError] = useState("");
  const [jobTitleError, setjobTitleError] = useState("");
  const [jobTypeError, setjobTypeError] = useState("");
  const [startDateError, setstartDateError] = useState("");
  const [endDateError,setEndDateError]= useState("");
  const [roleDescError,setroleDescError]= useState("");
  const [workModelError,setworkModelError]= useState("");
  const [isEditing,setIsEditing]= useState(false);

  useEffect(() => {
    setCompany(experience.company);
    setJobTitle(experience.jobTitle);
    setJobType(experience.jobType);
    setRoleDesc(experience.roleDescription);
    setStartDate(experience.startDate);
    setEndDate(experience.endDate);
    setWorkModel(experience.workModel);
  },[experience]);

  const handleSave = () =>{

    let isValid = true;

    if(!company.trim()){
      setCompaneyError("Company name is required");
      isValid= false;
    }else{
      setCompaneyError("");
    }

    if(!jobTitle.trim()){
      setjobTitleError("Job title is required");
      isValid = false;

    }else{
      setjobTitleError("");
    }

    if (!isValid){
      return;
    }

    onSave({
      ...experience,
      company,
      jobTitle,
      jobType,
      startDate,
      endDate,
      roleDescription: roleDesc,
      workModel,
    });


    setIsEditing(false);
  }

  const handleCancel = () =>{
    setCompany(experience.company);
    setJobTitle(experience.jobTitle);
    setJobType(experience.jobType);
    setRoleDesc(experience.roleDescription);
    setStartDate(experience.startDate);
    setEndDate(experience.endDate);
    setWorkModel(experience.workModel);
    onClose();

  }


  return (
      <DetailPanel title={editMode ? "Edit Experience" : "Experience"} onClose={onClose}>
        {!editMode ? (
          <div className="flex flex-col gap-4">
            <DetailField label="Job title" value={experience.jobTitle} />
            <DetailField label="Company/organisation" value={experience.company} />
            <DetailField label="Work model" value={experience.workModel} />
            <DetailField label="Job type" value={experience.jobType} />
            <DetailField
              label="Start and end date"
              value={`${experience.startDate}, ${experience.endDate}`}
            />
            <DetailField label="Role description" value={experience.roleDescription} />
          </div>   
      
    ):(
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Company name</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value) } />
              {companyError && <span className="text-red-500 text-xs">{companyError}</span>}
        </div>

         <div className="flex flex-col gap-1">
            <label>Job title</label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value) } />
            {jobTitleError && <span>{jobTitleError}</span>}
         </div>

         <div className="flex flex-col gap-1">
            <label>Job type</label>
             <select
              value= {jobType}
              onChange={(e)=> setJobType(e.target.value)}
              className="flex h=1- w-full rounded-md vorder border-slate-200 bg-white px-3 py-2 text-sm outline transition focus:border-slate-400"
             >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="FREELANCE">Freelance</option>
            </select>
            {jobTypeError && <span>{jobTypeError}</span>}
         </div>

         <div className="flex flex-col gap-1">
             <label>Work Model</label>
             <select
              value= {workModel}
              onChange={(e)=> setWorkModel(e.target.value)}
              className="flex h=1- w-full rounded-md vorder border-slate-200 bg-white px-3 py-2 text-sm outline transition focus:border-slate-400"
             >

               <option value="ONSITE">On-site</option>
               <option value="REMOTE">Remote</option>
               <option value="HYBRID">Hybrid</option>

             </select>
         </div>

          <div className="flex flex-col gap-1">
            <label>Start date</label>
            <Input value={startDate} onChange={(e) => setStartDate(e.target.value) } />
            {startDateError && <span>{startDateError}</span>}
         </div>

          <div className="flex flex-col gap-1">
            <label>End date</label>
            <Input 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            type="date"
            placeholder="dd/mm/yyyy" 
            />
            {endDateError && <span>{endDateError}</span>}
         </div>


        <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-base font-semibold">Role description </label>
            <textarea  
            id="description"
            value={roleDesc} 
            onChange={(e) => setRoleDesc(e.target.value) }
            placeholder="Describe your role and responsibilties"
            >
            
            </textarea>
            {roleDescError && <span>{roleDescError}</span>}
         </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button
            variant="default"
            onClick={handleSave}
             className="gap-2 font-bold px-4 py-2 border-b"
                          style={{
                           boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                           fontSize: "14px",
                           padding: "6px 12px",
                         }}
          >
            Done
          </Button>
           <Button
            variant="outline"
            onClick={handleCancel}
             className="gap-2 font-bold px-4 py-2 border-b"
                          style={{
                           boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                           fontSize: "14px",
                           padding: "6px 12px",
                         }}
          >
            Cancel
          </Button>
        </div>
        

      </div>
        
     
    )}
    </DetailPanel>
  );
}