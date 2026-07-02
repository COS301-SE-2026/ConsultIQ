import {useState} from "react";
import EditControls from "./edit-controls";

interface ProfileHeroCardProps {
  readonly fullName: string;
  readonly status: "Available" | "Unavailable" ;
  readonly canEdit?: boolean;
  readonly onSave?: (status: "Available" | "Unavailable") => void;
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

        { isEditing ? (
           <select 
                name="availabilityStatus" 
                id="status" 
                value={currentStatus} 
                onChange={(e) => setCurrentStatus(e.target.value as "Available" | "Unavailable")}
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
                
              </select>
          
        ) : (
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
       
           
        )}
      </div>

       {canEdit && (
          <EditControls
            isEditing={isEditing}
            onEdit={handleEditClick}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
  </div>
);
}


export default ProfileHeroCard;