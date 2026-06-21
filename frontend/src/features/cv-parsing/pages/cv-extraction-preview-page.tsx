import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ReviewTab from "../../consultants/layouts/review-tab";
import type { ProfileState } from "../../consultants/pages/consultant-profile.context";

export default function CVExtractionPreviewPage(){
    const navigate= useNavigate();
    const [isSaving, setIsSaving]= useState(false);
    const [extractedData, _setExtractedData]= useState<ProfileState>({
        consultantUserId: "user_123456",
        firstName: "Laycon",
        lastName: "Sebake",
        email: "laycon@gmail.com",
        idNumber:"2012100658083",
        phone: "01234586789",
        nationality: "South African",
        location: "Hatfield, Pretoria, Gauteng",
        availability: "AVAILABLE",
        costToCompany: 600000,
        skills: [{skillName: "C++", competencyLevel:"INTERMEDIATE", yearsExperience:2, confidenceLevel:4}],
        experiences: [],
        certifications:[]
    });

    const handleEditExtractedData= (_changes: string)=>{} 
    const handleApproveExtractedData=async() =>{setIsSaving(true)}  
    
    return(
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={consultantManagerSidebarItems} />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">

        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}>
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Review Extracted Information
          </h1>
  
        </header> 
        <div className="flex-1 overflow-y-auto px-12 pb-12 w-full flex flex-col items-center" >
        <div className="w-full max-w-5xl">
        <div className="h-6"/>

         <ReviewTab 
         customData={extractedData}
         onEdit={handleEditExtractedData}
         onSave={handleApproveExtractedData}
         isSaving={isSaving}
         submitText="Approve and save Profile"
         />
         </div>
         </div>
        </div>
        </div>)}