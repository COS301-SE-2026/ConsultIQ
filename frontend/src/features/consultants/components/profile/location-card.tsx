import { SectionCard } from "../../../../components/shared/section-card";
import { DetailField } from "../../../../components/shared/detail-field";
import {Button} from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {Pencil} from "lucide-react"
import {useState} from "react";
import { toast } from "sonner";

interface LocationCardProps {
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly suburb?: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string
  readonly canEdit?:boolean;
  readonly onSave?: (updatedLocation: { addressLine1: string; addressLine2?: string; suburb?: string; city: string; province: string,postalCode?:string }) => void;
}

export default function LocationCard({
  addressLine1,
  addressLine2,
  suburb,
  city,
  province,
  postalCode: initialPostalCode,
  canEdit,
  onSave,
 
}: LocationCardProps) {

  
     const [isEditing, setIsEditing] = useState(false);
     const [address1,setAddress1] = useState(addressLine1);
     const [address2,setAddress2]= useState(addressLine2 ?? "");
     const [Suburb,setSuburb]= useState(suburb ?? "");
     const [City,setCity]= useState(city);
     const [Province,setProvince]= useState(province);
     const [postalCode,setPostalCode]= useState(initialPostalCode ?? "");

     const [address1Error, setAddress1Error] = useState("");
     const [cityError,setCityError] = useState("");
     




 const handleSave = () =>{

    let isValid= true;
    if(address1.trim()){
     setAddress1Error("");
    }else{
       setAddress1Error("Address line 1 is required");
      isValid= false;
    }

    if(City.trim()){
      setCityError("");
    }else{
      setCityError("city is required");
      isValid= false;
    }

    onSave?.({
      addressLine1: address1.trim(),
      addressLine2: address2.trim() || undefined,
      suburb: Suburb || undefined,
      city: City.trim(),
      province : Province,
      postalCode: postalCode.trim() || undefined,
    });

    if(!isValid){
      return;
    }

    setIsEditing(false);

     toast.success("Location has been updated successfully");

  }

  const handleCancel = () =>{
    setAddress1(addressLine1);
    setAddress2(addressLine2 ?? "");
    setSuburb(suburb ?? "");
    setCity(city);
    setProvince(province);
    setPostalCode(postalCode ?? "");
    setIsEditing(false);
    
  }

  const handleEditClick = () =>{
    setIsEditing(true);
    setAddress1(addressLine1);
    setAddress2(addressLine2 ?? "");
    setSuburb(suburb ?? "");
    setCity(city);
    setProvince(province);
    setPostalCode(postalCode ?? "");
  }

  return (
    <div className="relative">
      <SectionCard title="Location">

        {canEdit && (
          <div className = " absolute top-[26px] right-6 flex items-center gap-2">
           {isEditing ?(
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
           ):(

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
          
           )}
          </div>
        )}

         <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "28px" }}>
          {isEditing ? (
           
            <>
              <div>
                <label className="text-sm font-medium " htmlFor="form-address-line-one">Address line 1</label>
                <Input value={address1} onChange={(e) => setAddress1(e.target.value) } />
                {address1Error && <span className="text-red-500 text-xs mt-1 block">{address1Error}</span>}
              </div>

               <div>
                <label className="text-sm font-medium" htmlFor="from-address-line-two">Address line 2</label>
                <Input value={address2} onChange={(e) => setAddress2(e.target.value) } />
              </div>

               <div>
                <label className="text-sm font-medium" htmlFor="form-suburb">Suburb</label>
                <Input value={Suburb} onChange={(e) => setSuburb(e.target.value) } />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="form-city">City</label>
                <Input value={City} onChange={(e) => setCity(e.target.value) } />
                {cityError && <span className="text-red-500 text-xs mt-1 block">{cityError}</span>}
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="form-province">Province</label>
               <select
                id="province"
                className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-[#002D72]"
                value={Province}
                onChange={(e) => { setProvince(e.target.value)}}
              >
                <option value="" disabled>Select Province</option>
                <option value="Eastern Cape">Eastern Cape</option>
                <option value="Free State">Free State</option>
                <option value="Gauteng">Gauteng</option>
                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                <option value="Limpopo">Limpopo</option>
                <option value="Mpumalanga">Mpumalanga</option>
                <option value="North West">North West</option>
                <option value="Northern Cape">Northern Cape</option>
                <option value="Western Cape">Western Cape</option>
              </select>
              </div>

               <div>
                <label className="text-sm font-medium " htmlFor="form-postal-code">Postal code</label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value) } />
              </div>

            </>
          ):(
            <>
              <DetailField label="Address line 1" value={addressLine1} variant="compact" />
              <DetailField label="Address line 2" value={addressLine2 ?? "Address line 2 not provided"} variant="compact" />
              <DetailField label="Suburb" value={suburb ?? "Suburb not provided"} variant="compact" />
              <DetailField label="City" value={city } variant="compact" />
              <DetailField label="Province" value={province } variant="compact" />
              <DetailField label="Postal code" value={postalCode ?? "Postal code not provided"} variant="compact" />
            </>
          )}
          
         </div>
    </SectionCard>
    </div>

  );
}