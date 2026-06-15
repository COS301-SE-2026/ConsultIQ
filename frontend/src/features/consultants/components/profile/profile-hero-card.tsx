import {useState} from "react";
import {Button} from "../../../../components/ui/button";
import {Pencil} from "lucide-react"

interface ProfileHeroCardProps {
  readonly fullName: string;
  readonly status: "Available" | "Unavailable" | "On leave";
  readonly canEdit?: boolean;
  readonly onSave?: (status: "Available" | "Unavailable" | "On leave") => void;
}

function getInitials(fullName: string) {
    const nameParts = fullName ? fullName.split(" ") : ["", ""];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function ProfileHeroCard({ fullName, status, canEdit,onSave }: ProfileHeroCardProps) {
  const isAvailable = status === "Available";
  const [isEditing, setIsEditing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  
  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentStatus(status);
  };

  const handleSave = () => {

    //callback to parent 
    onSave?.(currentStatus);
    setIsEditing(false);
    

  };

  return (
    <div
      className="bg-white rounded-2xl w-full flex items-center "
      style={{
        padding: "28px 28px 28px 28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Avatar */}
      <div
        className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
        style={{
          width: "76px",
          height: "76px",
          backgroundColor: "var(--color-primary)",
          fontSize: "24px",
        }}
      >
        {getInitials(fullName)}
      </div>

      {/* Name + badge */}
      <div className="flex flex-col" style={{ marginLeft: "20px", gap: "8px" }}>
        <p
          className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "22px", lineHeight: "1.25" }}
        >
          {fullName}
        </p>

        { !isEditing ? (
          <span
            className="inline-block self-start rounded-md font-medium"
            style={{
              padding: "4px 16px",
              fontSize: "var(--text-h4)",
              backgroundColor: isAvailable ? "#FEF3C7" : "#F3F4F6",
              color: isAvailable ? "#92400E" : "var(--color-text-secondary)",
            }}
          >
            {currentStatus}
          </span>
        ) : (
          <select 
                name="availabilityStatus" 
                id="status" 
                value={currentStatus} 
                onChange={(e) => setCurrentStatus(e.target.value as any)}
                className="inline-block self-start rounded-md font-medium"
                style={{
                  padding: "4px 16px",
                  fontSize: "var(--text-h4)",
                  backgroundColor: "#F3F4F6",
                  color: "var(--color-text-secondary)",
                }}

              >
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
                <option value="On leave">On leave</option>
              </select>
          
           
        )}
      </div>

       {canEdit && (
          <div className = " flex-1 flex justify-end gap-2">
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
  </div>
);
}


export default ProfileHeroCard;