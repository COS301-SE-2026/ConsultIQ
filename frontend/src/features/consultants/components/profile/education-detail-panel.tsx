import { DetailPanel } from "../../../../components/shared/detail-panel";
import { DetailField } from "../../../../components/shared/detail-field";
import { useState } from "react";
import { Input } from "../../../../components/ui/input";
import {Button} from "../../../../components/ui/button";
import DatePicker from "react-datepicker";
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


  const handleSave = () =>{

    let isValid = true;

    if(!institution.trim()){
      setInstitutionError("Institution is required");
      isValid= false;
    }else{
      setInstitutionError("");
    }

    if(!qualification.trim()){
      setQualificationError("Role description is required");
      isValid= false;
    }else{
      setQualificationError("");
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

      {!editMode ? (
         <div className="flex flex-col gap-4">
          <DetailField label="Institution name" value={education.institution} />
          <DetailField label="Qualification" value={education.qualification} />
          <DetailField
            label="Start and end date"
            value={`${education.startDate ? new Date(education.startDate).toLocaleDateString("en-GB") : ""} 
            - ${education.endDate ? new Date(education.endDate).toLocaleDateString("en-GB") : ""}`}
          />
         </div>
        
      ):(
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label>Institution </label>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value) } />
              {institutionError && <span className="text-red-500 text-sm">{institutionError}</span>}
           </div>

            <div className="flex flex-col gap-1">
              <label>Qualification </label>
              <Input value={qualification} onChange={(e) => setQualification(e.target.value) } />
              {qualificationError && <span className="text-red-500 text-sm">{qualificationError}</span>}
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

            <div className="flex flex-col gap-3">
                    <span className="text-xl font-medium">Certificate upload</span>
                    <label  
                        htmlFor="cert-upload" 
                        className="flex flex-col items-center justify-center gap-3 p-8 px-6 py-2 h-28 rounded-lg border border-dashed cursor-pointer transition-colors duration-200"
                        style={{
                            borderColor:"var(--color-border)"
                        }}

                    >
                        <Upload size={24} className="text-gray-400"/>

                       <span 
                        className="inline-flex items-center  justify-center px-4 py-2 w-20 rounded text-white text-sm font-medium shadow-sm "
                        style = {{
                            backgroundColor:"var(--color-primary)"
                        }}
                       >
                        Choose file
                       </span>
                       <span
                        className="text-sm text-gray-500"
                       >
                         {uploadedFile ? uploadedFile.name : "no file chosen"}
                        </span>

                       <Input 
                            id="cert-upload" 
                            type="file" 
                            accept=".pdf,.jpg,.png"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                    
                   {uploadedFile && (
                    <div className="flex items-end gap-2 mt-2">
                    <div className="flex-1">
                        <AttachmentDisplay attachmentName={uploadedFile.name}/>
                    </div>
                     
                     
                      <Button
                          variant= "secondary"
                         onClick={()=> { 
                            setUploadedFile(undefined);
                            const input= document.getElementById("cert-upload") as HTMLInputElement;
                            if (input) input.value="";}}
                         className="p-3 h-[62px] w-15 rounded-xl border flex items-center"
                         style={{
                           boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                           fontSize: "14px",
                           padding: "6px 12px",
                         }}
                         title="Remove attachment"
                       >
                        <Trash2 size={18}/>
                       </Button>
                    </div>
                    
                   )}
                  
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