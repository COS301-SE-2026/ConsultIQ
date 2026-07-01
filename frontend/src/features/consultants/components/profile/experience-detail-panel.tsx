import { DetailPanel } from "../../../../components/shared/detail-panel";
import { DetailField } from "../../../../components/shared/detail-field";
import { useState } from "react";
import { Input } from "../../../../components/ui/input";
import {Button} from "../../../../components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import TextareaAutosize from "react-textarea-autosize";
import { isBefore, isAfter, startOfDay } from 'date-fns';


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
 const [startDate, setStartDate]= useState<Date | null>(experience.startDate ? new Date(experience.startDate) : null);
  const [endDate, setEndDate]= useState<Date | null>(experience.endDate ? new Date(experience.endDate) : null);
  const [roleDesc, setRoleDesc]= useState(experience.roleDescription);
  const [workModel, setWorkModel] = useState(experience.workModel);
  

  const [companyError, setCompaneyError] = useState("");
  const [jobTitleError, setjobTitleError] = useState("");
  const [startDateError, setstartDateError] = useState("");
  const [endDateError,setEndDateError]= useState("");
  const [roleDescError,setroleDescError]= useState("");
 



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

    if(!roleDesc.trim()){
      setroleDescError("Role description is required");
      isValid= false;
    }else{
      setroleDescError("");
    }

    if(!startDate){
      setstartDateError("Start date is required");
      isValid = false;

    }else{
      setstartDateError("");
    }

    if(!endDate){
      setEndDateError("End date is required");
      isValid = false;

    }else{
      setEndDateError("");
    }

    if(startDate && endDate){
          if(isAfter(startOfDay(startDate),startOfDay(endDate))){
            setstartDateError("Start day must be before end date");
            isValid= false;
          }else{
            setstartDateError("");
          }
    
          if(isBefore(startOfDay(endDate),startOfDay(startDate))){
            setstartDateError("End date must be after start date");
            isValid= false;
          }else{
            setstartDateError("");
          }
    
        }

    if (!isValid){
      return;
    }

    onSave({
      ...experience,
      company,
      jobTitle,
      jobType,
      startDate: startDate!.toISOString().split("T")[0],
      endDate:  endDate!.toISOString().split("T")[0],
      roleDescription: roleDesc,
      workModel,
    });


   onClose();
  }

  const handleCancel = () =>{
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
              value={`${experience.startDate ? new Date(experience.startDate).toLocaleDateString("en-GB") : ""} 
            - ${experience.endDate ? new Date(experience.endDate).toLocaleDateString("en-GB") : ""}`}
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
             {jobTitleError && <span className="text-red-500 text-xs">{jobTitleError}</span>}
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
          <DatePicker
            selected={startDate} 
            onChange={(date: Date | null) => setStartDate(date) }
            dateFormat={"dd/MM/yyyy"}
            placeholderText="DD/MM/YYYY"
            maxDate={new Date()}
            showMonthDropdown
            showYearDropdown
            scrollableYearDropdown
            scrollableMonthYearDropdown
            yearDropdownItemNumber={100}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D72]/20"
            />
            {startDateError && <span className="text-red-500 text-sm">{startDateError}</span>}
         </div>

          <div className="flex flex-col gap-1">
            <label>End date</label>
             <DatePicker
              selected={endDate} 
              onChange={(date : Date | null) => setEndDate(date)}
              dateFormat={"dd/MM/yyyy"}
              placeholderText="DD/MM/YYYY"
              maxDate={new Date()}
              showMonthDropdown
              showYearDropdown
              scrollableYearDropdown
              scrollableMonthYearDropdown
              yearDropdownItemNumber={100}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm  focus:ring-2 focus:ring-[#002D72]/20"
           />
            {endDateError && <span className="text-red-500 text-sm">{endDateError}</span>}
         </div>


        <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-base font-semibold">Role description </label>
            <TextareaAutosize  
            id="description"
            value={roleDesc} 
            onChange={(e) => setRoleDesc(e.target.value) }
            placeholder="Describe your role and responsibilties"
            minRows={3} // Sets the initial minimum height
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D72]/20"
            
            />
            {roleDescError && <span className="text-red-500 text-xs">{roleDescError}</span>}
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