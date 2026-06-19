import { SectionCard } from "../../../../components/shared/section-card";
import { DetailField } from "../../../../components/shared/detail-field";
import {useState, useEffect} from "react";
import { toast } from "sonner";
import {Button} from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {Pencil} from "lucide-react"

interface PersonalInfoCardProps {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly idNumber?: string;
  readonly nationality?: string;
  readonly canEdit?:boolean;
  readonly onSave?: (data: { fullName: string; email: string; phone: string; idNumber?: string; nationality?: string }) => void;
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
   const [fullname, setFullName] = useState(fullName);
   const [emailAddress, setEmail] = useState(email);
   const [phoneNumber, setPhone] = useState(phone);
   const [localIdnumber, setLocalIdNumber] = useState(idNumber);
   const [nationalityStatus, setNationality] = useState(nationality);

   const [phoneError, setPhoneError] = useState("");
   const [idError, setIdError] = useState("");
   const [nationalityError, setNationalityError] = useState("");
   const [emailError,setEmailError] = useState("");
   const [nameError,setNameError]= useState("");

  

   useEffect(() =>{
    setFullName(fullName);
    setEmail(email);
    setPhone(phone);
    setLocalIdNumber(idNumber);
    setNationality(nationality);
   },[fullName,email,phone,idNumber,nationality]);

   const handleEditClick = () => {
    setIsEditing(true);
  };

   const handleCancel = () => {
    setIsEditing(false);
    setFullName(fullName);
    setEmail(email);
    setPhone(phone);
    setLocalIdNumber(idNumber);
    setNationality(nationality);

   }

    function validateSAID(id: string): boolean {
    if (!/^\d{13}$/.test(id)) return false;
    const month = parseInt(id.substring(2, 4));
    const day = parseInt(id.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    let sum = 0;
    let isEven = false;
    for (let i = id.length - 1; i >= 0; i--) {
      let digit = parseInt(id[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }


   const handleSave = () => {

     let isValid = true;

     let normalizedPhone = phoneNumber.replace(/^\+27/,"0").replace(/\D/g,"");

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setPhoneError("Phone number must be exactly 10 digits.");
      isValid = false;
    } else {
      setPhoneError("");
    }

    if (!validateSAID(localIdnumber ?? "")) {
      setIdError("Please enter a valid South African ID number.");
      isValid = false;
    } else {
      setIdError("");
    }

    const currentNationality= nationalityStatus ?? "";

    if (!currentNationality.trim()) {
      setNationalityError("Nationality is required.");
      isValid = false;
    } else if (!/^[a-zA-Z\s'-]+$/.test(currentNationality.trim())) {
      setNationalityError("Nationality must contain letters only.");
      isValid = false;
    } else {
      setNationalityError("");
    }


    if (!emailAddress){
       setEmailError( "Email is required.");
       isValid = false;
    } else if (!/^[\w.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(emailAddress)){
       setEmailError("Invalid email format.");
       isValid= false;
    }else{
      setEmailError("");
    }


     if(!fullname || !fullname.trim()){
      setNameError("full name is required");
      isValid = false;
     }else if(!/^[a-zA-Z\s'-]+$/.test(fullname.trim())){
      setNameError("Full name must contain letters and spaces only");
      isValid = false;
     }else{
        setNameError("");
     }
   

     if(!isValid) return;
    
     //callback to api function in parent
     onSave?.({ fullName: fullname, email: emailAddress, phone: phoneNumber, idNumber: localIdnumber, nationality: nationalityStatus });
     


     setIsEditing(false);
     toast.success("Personal information has been updated successfully");


   }

   

  return (
    <div className="relative">
       <SectionCard title="Personal Information" >

       {canEdit && (
          <div className = " absolute top-[26px] right-6 flex items-center gap-2">
           {!isEditing ?(
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
           ):(
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
           )}
          </div>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "28px" }}>

        {!isEditing ? (
        <>
            <DetailField label="Full Name" value={fullname} variant="compact" />
            <DetailField label="Email Address" value={emailAddress} variant="compact" />
            <DetailField label="Phone Number" value={phoneNumber} variant="compact" />
            <DetailField label="ID Number" value={localIdnumber ?? "N/A"} variant="compact" />
            <DetailField label="Nationality" value={nationalityStatus ?? "N/A"} variant="compact" />
        </>):(
        <>
             <div>
              <label>Full name</label>
              <Input value={fullname} onChange={(e) => setFullName(e.target.value) } />
              {nameError && <span>{nameError}</span>}
            </div>

             <div>
              <label>Email Address</label>
              <Input value={emailAddress} onChange={(e) => setEmail(e.target.value) } />
              {emailError && <span>{emailError}</span>}
            </div>

            <div>
              <label>Phone Number</label>
              <Input value={phoneNumber} onChange={(e) => setPhone(e.target.value) } />
              {phoneError && <span>{phoneError}</span>}
            </div>

            
            <div>
              <label>ID number</label>
              <Input value={localIdnumber} onChange={(e) => setLocalIdNumber(e.target.value) } />
              {idError && <span>{idError}</span>}
            </div>

              <div>
              <label>Nationality</label>
              <Input value={nationalityStatus} onChange={(e) => setNationality(e.target.value) } />
              {nationalityError && <span>{nationalityError}</span>}
            </div>

        </>)}

       
      </div>
    </SectionCard>
    </div>
   
  );
}