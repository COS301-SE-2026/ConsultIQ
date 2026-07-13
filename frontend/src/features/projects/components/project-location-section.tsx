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
}

export default function ProjectLocationSection({
  project,isEditing, isDisabled, onEdit, onCancel, onSave
}: ProjectLocationSectionProps) {

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
    <Card style={{ padding: "20px", border: "none" }}>
      <div className= "flex flex-center gap-3 mb-8">
        <h3
          className="text-3xl font-bold mb-8"
          style={{ color: "var(--color-primary)" }}
        >
          Location
        </h3>
        <div>
          {isEditing ? (
            <div className="flex gap-4">
              <button 
              onClick={handleSaveLocation} 
              className="flex items-center text-green-400 font-medium ">
              <Check className="h-5 w-5"/> Save
              </button>
              <button 
              onClick={onCancel} 
              className="flex items-center text-red-400 font-medium ">
              <X className="h-5 w-5"/> Cancel
              </button>
              </div>):(
                <button 
                onClick={onEdit} 
                disabled={isDisabled}
                className=" hover:text-blue-900 disabled:opacity-30 rounded transition">
                <Edit className="h-5 w-5"/> 
                </button>
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
      <p style={{ color: "var(--color-text-secondary)" }}>
        {value ?? "—"}
      </p>
    </div>
  );
}