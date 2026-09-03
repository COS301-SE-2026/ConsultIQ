import { DetailPanel } from "../../../../components/shared/detail-panel";
import { DetailField } from "../../../../components/shared/detail-field";
import DateField from "../../../../components/shared/date-picker";
import { useState } from "react";
import { Input } from "../../../../components/ui/input";
import {Button} from "../../../../components/ui/button";
import "react-datepicker/dist/react-datepicker.css";
import { isBefore, isAfter, startOfDay } from 'date-fns';
import { Upload,Trash2 } from "lucide-react";
import { AttachmentDisplay } from "../../../../components/shared/attachment-display";
 


export interface Education {
  id: string;
  institution: string;
  qualification: string;
  startDate: string;
  endDate: string;
  fileName?:string;
}

interface EducationDetailPanelProps {
  readonly education: Education;
  readonly onClose: () => void;
  readonly onSave: (education: Education) => void;
  readonly editMode?: boolean;
  
}

const actionButtonStyle ={
   boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
   fontSize: "14px",
   padding: "6px 12px",
}

export default function EducationDetailPanel({ education, onClose,onSave,editMode }: EducationDetailPanelProps) {

  const [institution,setInstitution] = useState(education.institution);
  const [qualification,setQualification]= useState(education.qualification);
  const [startDate, setStartDate]= useState<Date | null>(education.startDate ? new Date(education.startDate) : null);
  const [endDate, setEndDate]= useState<Date | null>(education.endDate ? new Date(education.endDate) : null);
   const [uploadedFile, setUploadedFile] = useState<File | undefined>();

 const [startDateError, setstartDateError] = useState("");
 const [endDateError,setEndDateError]= useState("");
  const [institutionError,setInstitutionError] = useState("");
  const [qualificationError,setQualificationError]= useState("");

 

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) =>{
        const file = (e.target as HTMLInputElement).files?.[0];
        setUploadedFile(file);
    };


  const validateInstitution = () =>{
    if(institution.trim()){
     setInstitutionError("");
     return true;
    }
      setInstitutionError("Institution is required");
      return false;
    
  
  }

  const validateQualification = () =>{

     if(qualification.trim()){
      setQualificationError("");
      return true;
    }
      setQualificationError("Role description is required");
      return false;
    

  }

  const validateDateRange = () => {
    if(!startDate || !endDate) return true;

    if(isAfter(startOfDay(startDate),startOfDay(endDate))){
        setstartDateError("Start day must be before end date");
        return false;
      }

      if(isBefore(startOfDay(endDate),startOfDay(startDate))){
        setstartDateError("End date must be after start date");
        return false;
      }
      
      setstartDateError("");
      return true;
      

  }

  const validateStartDate = () => {
    if(startDate){
      setstartDateError("");
      return true;
    }

      setstartDateError("Start date is required");
      return false;
    

  }

  const validateEndDate = () => {
    if(endDate){
      setEndDateError("");
      return true;
    }
       setEndDateError("End date is required");
      return false;
  }

  const handleSave = () =>{

   const isValid =
      validateInstitution() &&
      validateQualification() &&
      validateStartDate() &&
      validateEndDate() &&
      validateDateRange();

    

    if (!isValid){
      return;
    }

    onSave({
      ...education,
      institution,
      qualification,
      startDate: startDate!.toISOString().split("T")[0],
      endDate:  endDate!.toISOString().split("T")[0],
      fileName: uploadedFile?.name,
    });

       setUploadedFile(undefined);
        const input= document.getElementById("cert-upload") as HTMLInputElement;
        if (input) input.value="";

    onClose();
  }

  const handleCancel = () =>{

    onClose();

  }

  return (
    <DetailPanel title="Education" onClose={onClose}>

      {editMode ? (
        
         
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="form-institution">Institution </label>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value) } />
              {institutionError && <span className="text-red-500 text-sm">{institutionError}</span>}
           </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="form-qualification">Qualification </label>
              <Input value={qualification} onChange={(e) => setQualification(e.target.value) } />
              {qualificationError && <span className="text-red-500 text-sm">{qualificationError}</span>}
           </div>

           <div className="flex flex-col gap-1">
            <DateField id="form-start-date" label="Start date" selected={startDate} onChange={setStartDate} error={startDateError}/>
          </div>

          <div className="flex flex-col gap-1">
           <DateField id="form-end-date" label="End date" selected={endDate} onChange={setEndDate} error={endDateError}/>
         </div>
         
          <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button
            variant="default"
            onClick={handleSave}
            className="gap-2 font-bold px-4 py-2 border-b"
            style={actionButtonStyle}
          >
            Done
          </Button>
           <Button
            variant="outline"
            onClick={handleCancel}
             className="gap-2 font-bold px-4 py-2 border-b"
            style={actionButtonStyle}
          >
            Cancel
          </Button>
        </div>


          </div>
           
      ):(
         <div className="flex flex-col gap-4">
          <DetailField label="Institution name" value={education.institution} />
          <DetailField label="Qualification" value={education.qualification} />
          <DetailField
            label="Start and end date"
            value={`${education.startDate ? new Date(education.startDate).toLocaleDateString("en-GB") : ""} 
            - ${education.endDate ? new Date(education.endDate).toLocaleDateString("en-GB") : ""}`}
          />
         </div>
       
      )}
     
      
    </DetailPanel>
  );
}