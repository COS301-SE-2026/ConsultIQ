import { SectionCard } from "../../../../components/shared/section-card";
import { DetailField } from "../../../../components/shared/detail-field";
import {useState} from "react";
import { toast } from "sonner";
import { Input } from "../../../../components/ui/input";
import EditControls from "./edit-controls";

interface PersonalInfoCardProps {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly idNumber?: string;
  readonly nationality?: string;
  readonly canEdit?:boolean;
  readonly onSave?: (data: { fullName: string; email: string; phone: string; idNumber?: string; nationality?: string }) => void;
}

    function validateSAID(id: string): boolean {
    if (!/^\d{13}$/.test(id)) return false;
    const month = Number.parseInt(id.substring(2, 4));
    const day = Number.parseInt(id.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    let sum = 0;
    let isEven = false;
    for (let i = id.length - 1; i >= 0; i--) {
      let digit = Number.parseInt(id[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }


export default function PersonalInfoCard({
  fullName,
  email,
  phone,
  idNumber,
  nationality,
  canEdit,
  onSave,
}: PersonalInfoCardProps) {

   const [isEditing, setIsEditing] = useState(false);
   const [fullNameState, setFullNameState] = useState(fullName);
   const [emailState, setEmailState] = useState(email);
   const [phoneNumber, setPhoneNumber] = useState(phone);
   const [localIdNumber, setLocalIdNumber] = useState(idNumber);
   const [nationalityStatus, setNationalityStatus] = useState(nationality);

   const [phoneError, setPhoneError] = useState("");
   const [idError, setIdError] = useState("");
   const [nationalityError, setNationalityError] = useState("");
   const [emailError,setEmailError] = useState("");
   const [nameError,setNameError]= useState("");
   const [isSaving, setIsSaving] = useState(false);

   const handleEditClick = () => {
    setIsEditing(true);
    setFullNameState(fullName);
    setEmailState(email);
    setPhoneNumber(phone);
    setLocalIdNumber(idNumber);
    setNationalityStatus(nationality);
  };

   const handleCancel = () => {
    setIsEditing(false);
    setFullNameState(fullName);
    setEmailState(email);
    setPhoneNumber(phone);
    setLocalIdNumber(idNumber);
    setNationalityStatus(nationality);

   }

   const handleSave = async () => {

     let isValid = true;

     const normalizedPhone = phoneNumber.replace(/^\+27/,"0").replace(/\D/g,"");

    if (/^\d{10}$/.test(normalizedPhone)) {
     setPhoneError("");
    } else {
       setPhoneError("Phone number must be exactly 10 digits.");
      isValid = false;
    }

    if (validateSAID(localIdNumber ?? "")) {
      setIdError("");
    } else {
      setIdError("Please enter a valid South African ID number.");
      isValid = false;
    }

    const currentNationality= nationalityStatus ?? "";

    if (!currentNationality.trim()) {
      setNationalityError("Nationality is required.");
      isValid = false;
    } else if (/^[a-zA-Z\s'-]+$/.test(currentNationality.trim())) {
     setNationalityError("");
    } else {
       setNationalityError("Nationality must contain letters only.");
      isValid = false;
      
    }


    if (!emailState){
       setEmailError( "Email is required.");
       isValid = false;
    } else if (/^[\w.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(emailState)){
      setEmailError("");
    }else{
       setEmailError("Invalid email format.");
       isValid= false;
    }


     if(!fullNameState?.trim()){
      setNameError("full name is required");
      isValid = false;
     }else if(/^[a-zA-Z\s'-]+$/.test(fullNameState.trim())){
      setNameError("");
     }else{
      setNameError("Full name must contain letters and spaces only");
      isValid = false;
     }
   

     if(!isValid) return;
    
    setIsSaving(true);
    try {
      await onSave?.({ fullName: fullNameState, email: emailState, phone: phoneNumber, idNumber: localIdNumber, nationality: nationalityStatus });
      setIsEditing(false);
      toast.success("Personal information has been updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update — please try again");
    } finally {
      setIsSaving(false);
    }
  };

   

  return (
    <div className="relative">
       <SectionCard 
        title="Personal Information" 
        edit={
          canEdit && (
           <EditControls
                  isEditing={isEditing}
                  isSaving={isSaving}
                  onEdit={handleEditClick}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
          )
        }
        >

       

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "28px" }}>

        {isEditing ? (
          <>
             <div>
              <label className="text-sm font-medium " htmlFor="form-full-name">Full name</label>
              <Input value={fullNameState} onChange={(e) => setFullNameState(e.target.value) } />
              {nameError && <span className="text-red-500 text-xs mt-1 block">{nameError}</span>}
            </div>

             <div>
              <label className="text-sm font-medium " htmlFor="form-email-address">Email Address</label>
              <Input value={emailState} onChange={(e) => setEmailState(e.target.value) } />
              {emailError && <span className="text-red-500 text-xs mt-1 block">{emailError}</span>}
            </div>

            <div>
              <label className="text-sm font-medium " htmlFor="form-phone-number">Phone Number</label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value) } />
              {phoneError && <span className="text-red-500 text-xs mt-1 block">{phoneError}</span>}
            </div>

            
            <div>
              <label className="text-sm font-medium " htmlFor="form-id-number">ID number</label>
              <Input value={localIdNumber} onChange={(e) => setLocalIdNumber(e.target.value) } />
              {idError && <span className="text-red-500 text-xs mt-1 block">{idError}</span>}
            </div>

              <div>
              <label className="text-sm font-medium " htmlFor="form-nationality">Nationality</label>
              <Input value={nationalityStatus} onChange={(e) => setNationalityStatus(e.target.value) } />
              {nationalityError && <span className="text-red-500 text-xs mt-1 block">{nationalityError}</span>}
            </div>

        </>
        ):(
          <>
            <DetailField label="Full Name" value={fullNameState} variant="compact" />
            <DetailField label="Email Address" value={emailState} variant="compact" />
            <DetailField label="Phone Number" value={phoneNumber} variant="compact" />
            <DetailField label="ID Number" value={localIdNumber ?? "N/A"} variant="compact" />
            <DetailField label="Nationality" value={nationalityStatus ?? "N/A"} variant="compact" />
        </>
       )}

       
      </div>
    </SectionCard>
    </div>
   
  );
}