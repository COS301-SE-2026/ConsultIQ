import { DetailPanel } from "../../../../components/shared/detail-panel";
import { DetailField } from "../../../../components/shared/detail-field";
import { useState, useEffect } from "react";
import { Input } from "../../../../components/ui/input";
import {Button} from "../../../../components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
 


export interface Education {
  id: string;
  institution: string;
  qualification: string;
  startDate: string;
  endDate: string;
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

 const [startDateError, setstartDateError] = useState("");
 const [endDateError,setEndDateError]= useState("");
  const [institutionError,setInstitutionError] = useState("");
  const [qualificationError,setQualificationError]= useState("");

  useEffect(() => {
    setInstitution(education.institution);
    setQualification(education.qualification);
    setStartDate(education.startDate ? new Date(education.startDate) : null);
    setEndDate(education.endDate ? new Date(education.endDate) : null); 
  },[education]);

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

    if (!isValid){
      return;
    }

    onSave({
      ...education,
      institution,
      qualification,
      startDate: startDate!.toISOString().split("T")[0],
      endDate:  endDate!.toISOString().split("T")[0],
    });

    onClose();
  }

  const handleCancel = () =>{

    setInstitution(education.institution);
    setQualification(education.qualification);
    setStartDate(education.startDate ? new Date(education.startDate) : null);
    setEndDate(education.endDate ? new Date(education.endDate) : null); 
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
            value={`${education.startDate} - ${education.endDate}`}
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