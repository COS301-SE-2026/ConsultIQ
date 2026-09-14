import { Card } from "../../../components/ui/card";
import type { Project, ProjectLocation } from "../types/project.types";
import { Edit, X, Check } from "lucide-react";
import { useState } from "react";
import ProjectLocationCard from "./project-location-card"

type LocationPayload={
  location: ProjectLocation;
};
 interface ProjectLocationSectionProps {
  readonly project: Project;
  readonly isEditing?: boolean;
  readonly isDisabled?: boolean;
  readonly onEdit: ()=> void;
  readonly onCancel: ()=> void;
  readonly onSave: (fields: LocationPayload)=> void;
  readonly isConsultant?: boolean;
}

export default function ProjectLocationSection({
  project,isEditing, isDisabled, onEdit, onCancel, onSave, isConsultant
}: ProjectLocationSectionProps) {

  const isNonConsultant= !isConsultant;
  const[currentLocation, setCurrentLocation]= useState<ProjectLocation>(project.location);

  const handleSaveField=(field: keyof ProjectLocation, changedVal: ProjectLocation[keyof ProjectLocation])=>{
    setCurrentLocation(prev => ({...prev, [field]: changedVal}));
  } 

  const handleSaveLocation = ()=>{
    if(!isEditing) return;
    onSave({
      location: currentLocation
    });
  };
  let locationSection;

  if(isEditing){
    locationSection= (
      <div className="w-full">
        <ProjectLocationCard
        data={isEditing ? currentLocation: project.location}
        onChange={handleSaveField}
        errors={{}}
        />
      </div>

    );
  }else{
    locationSection= (
      <div className=" text-lg grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Address Line 1" value={project.location.addressLine1} />
        <Info label="Address Line 2" value={project.location.addressLine2} />
        <Info label="Suburb" value={project.location.suburb} />
        <Info label="City" value={project.location.city} />
        <Info label="Province" value={project.location.province} />
        <Info label="Postal Code" value={project.location.postalCode} />
      </div>
    )
  }


  return (
    <Card className={`border-none p-4 sm:p-5 ${isDisabled ? "opacity-40 pointer-events-none": "opacity-100"}`}>
      <div className= "flex flex-wrap items-start justify-between gap-3">
        <h2
          className="mb-4 text-2xl font-bold sm:text-3xl"
          style={{ color: "var(--color-primary)" }}
        >
          Location
        </h2>
        <div>
          {isEditing ? (
            <div className="flex flex-wrap gap-3">
              <button type="button"
              onClick={handleSaveLocation} 
              className="flex items-center text-green-400 font-medium ">
              <Check className="h-6 w-6"/> Save
              </button>
              <button type="button"
              onClick={onCancel} 
              className="flex items-center text-red-400 font-medium ">
              <X className="h-6 w-6"/> Cancel
              </button>
              </div>):(
                isNonConsultant && (
                  <button type="button"
                  onClick={onEdit} 
                  disabled={isDisabled}
                  className=" hover:text-blue-900 disabled:opacity-30 rounded transition">
                  <Edit className="h-6 w-6 text-primary"/> 
                  </button>
                )
                
              )}
            </div>

      </div>
      <div className="h-2" />
      {locationSection}   
    </Card>
  );
}

function Info({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | undefined;
}) {
  return (
    <div>
      <p className="font-semibold mb-2">{label}</p>
      <p className="break-words" style={{ color: "var(--color-text-secondary)" }}>
        {value ?? "—"}
      </p>
    </div>
  );
}