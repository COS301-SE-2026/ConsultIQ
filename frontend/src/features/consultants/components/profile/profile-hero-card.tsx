import { useState } from "react";
import EditControls from "./edit-controls";
import { toast } from "sonner";
import { ImageDropzone } from "../image-dropzone";
import { Trash2 } from "lucide-react";

interface ProfileHeroCardProps {
  readonly fullName: string;
  readonly status: "Available" | "Unavailable";
  readonly pictureUrl?: string | null;
  readonly canEdit?: boolean;
  readonly onSave?: (status: "Available" | "Unavailable", photo?: File) => Promise<void> | void;
}

function getInitials(fullName: string) {
  const nameParts = fullName ? fullName.split(" ") : ["", ""];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function ProfileHeroCard({ fullName, status, pictureUrl, canEdit, onSave }: ProfileHeroCardProps) {
  const isAvailable = status === "Available";
  const [isEditing, setIsEditing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | undefined>();
  const [previewProfilePhoto, setPreviewProfilePhoto] = useState<string | null>(null);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentStatus(status);
    setUploadedPhoto(undefined);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(currentStatus, uploadedPhoto);
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };


  const handleRemovePhoto = () => {
    setUploadedPhoto(undefined);

    if (previewProfilePhoto) {
      URL.revokeObjectURL(previewProfilePhoto);
    }

    setPreviewProfilePhoto(null);

  };

  return (
    <div
      className="bg-white rounded-2xl w-full  mb-4 p-4 sm:p-7"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
        <div className="flex items-center gap-4 sm:gap-5">
          <div
            className="relative rounded-full flex items-center justify-center text-white font-bold shrink-0 w-20 h-20 sm:w-[120px] sm:h-[120px] text-xl sm:text-[30px]"
            style={{
              backgroundColor: "var(--color-primary)",
            }}
          >

            {previewProfilePhoto || pictureUrl ? (
                <img
                  src={previewProfilePhoto ?? pictureUrl ?? undefined}
                  alt={fullName}
                  className="w-full h-full rounded-full object-cover"
                />

            ) : (
              getInitials(fullName)
            )}
            {previewProfilePhoto && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -bottom-1 -right-1 sm:-right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-md flex items-center justify-center"
              aria-label="remove photo"
            >
              <Trash2 className="w-4 h-4 sm:w-6 sm:h-6 text-gray-700" />
            </button>
          )}
          </div>
          


          {/* Name + badge */}
          <div className="flex flex-col min-w-0 gap-2 sm:ml-5" style={{ marginLeft: "20px", gap: "8px" }}>
            <p
              className="font-bold text-lg sm:text-[22px] leading-tight break-words"
              style={{ color: "var(--color-primary)" }}
            >
              {fullName}
            </p>

            {isEditing ? (
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
        </div>

        {canEdit && (
          <div className="shrink-0">
             <EditControls
            isEditing={isEditing}
            isSaving={isSaving}
            onEdit={handleEditClick}
            onSave={handleSave}
            onCancel={handleCancel}
          />
          </div>
         
        )}
      </div>

      {isEditing && (
        <div className=" w-full max-w-xl mt-4 sm:mt-6">
          <h3 className="mb-2">Upload profile photo</h3>
          <ImageDropzone onFileSelect={(file) => {

              setUploadedPhoto(file);

              if (previewProfilePhoto) {
                URL.revokeObjectURL(previewProfilePhoto);
              }

              if (file) {
                setPreviewProfilePhoto(URL.createObjectURL(file));
              } else {
                setPreviewProfilePhoto(null);
              }

            }} />
        </div>
      )}
    </div>
  );
}


export default ProfileHeroCard;
