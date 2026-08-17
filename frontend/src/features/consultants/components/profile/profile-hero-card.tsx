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
      className="bg-white rounded-2xl w-full flex-col mb-4 "
      style={{
        padding: "28px 28px 28px 28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Avatar */}
      <div className="flex items-start justify-between w-full">
        <div className="flex items-center gap-5">
          <div
            className="relative rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{
              width: "120px",
              height: "120px",
              backgroundColor: "var(--color-primary)",
              fontSize: "30px",
            }}
          >

            {previewProfilePhoto || pictureUrl ? (
              <>
                <img
                  src={previewProfilePhoto ?? pictureUrl ?? undefined}
                  alt={fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              </>

            ) : (
              getInitials(fullName)
            )}
            {previewProfilePhoto && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -bottom-1 -right-3 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center"
              aria-label="remove photo"
            >
              <Trash2 className="w-6 h-6 text-gray-700" />
            </button>
          )}
          </div>
          


          {/* Name + badge */}
          <div className="flex flex-col" style={{ marginLeft: "20px", gap: "8px" }}>
            <p
              className="font-bold"
              style={{ color: "var(--color-primary)", fontSize: "22px", lineHeight: "1.25" }}
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
          <EditControls
            isEditing={isEditing}
            isSaving={isSaving}
            onEdit={handleEditClick}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>

      {isEditing && (
        <div className=" w-full max-w-xl mt-6">
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