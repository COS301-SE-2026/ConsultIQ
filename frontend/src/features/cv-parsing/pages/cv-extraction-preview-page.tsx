import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import { ArrowLeft, CheckCircle, RefreshCcw } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import type { ProfileState } from "../../consultants/pages/consultant-profile.context";
import ProfileInfoForm from "../../consultants/components/personal/profile-info-form";
import LocationForm from "../../consultants/components/personal/location-form";
import SkillsForm from "../../consultants/components/skills/skills-form";
import EducationForm from "../../consultants/components/skills/education-form";
import ExperienceForm from "../../consultants/components/experience/experience-form";
import ExperienceList from "../../consultants/components/experience/experience-list";
import type { ExperienceItem } from "../../consultants/pages/consultant-profile.context";
import {ConsultantProfileProvider} from "../../consultants/pages/consultant-profile.context"
import {toast} from "sonner"
import { RefreshCcw } from "lucide-react";

export default function CVExtractionPreviewPage(){
    const {userId}= useParams<{userId: string}>();
    const navigate= useNavigate();
    const [_isSaving, setIsSaving]= useState(false);
    const [extractedData, setExtractedData]= useState<ProfileState>({
        consultantUserId: "user_123456",
        firstName: "Laycon",
        lastName: "Sebake",
        email: "laycon@gmail.com",
        idNumber:"2012100658083",
        phone: "01234586789",
        nationality: "South African",
        location: "1135 Francis Baard, Hatfield, Pretoria, Gauteng, 0083",
        availability: "AVAILABLE",
        costToCompany: 600000,
        skills: [{skillName: "C++", competencyLevel:"INTERMEDIATE", yearsExperience:2, confidenceLevel:4}],
        experiences: [{id: "exp_1", companyName:"CSIR", jobTitle: "Junior SE", jobType: "INTERNSHIP", workModel: "HYBRID", startDate: "2025-01-15", endDate: "2025-06-01", description: "SPA for MCT project"}],
        certifications:[{title:"BSc Computer Science",issuingBody:"UP", startDate:"02/02/2022", endDate: "01/12/2023"}]
    });
    const [editExperience, setEditExperience]= useState<ExperienceItem | null>(null);

    const handleUpdate= (updatedField: Partial<ProfileState>)=> {
      setExtractedData(prev=> ({...prev, ...updatedField}));
    }
    const handleAddExperience= (newExperience: any)=> {
      setExtractedData(prev=> ({...prev, experiences: [...prev.experiences, newExperience]}))
    }
    const handleDeleteExperience= (id: string)=> {
      setExtractedData(prev=> ({...prev, experiences: prev.experiences.filter(exp=> exp.id !==id),}))
    }
    const handleEditExperience= (id: string)=> {
      const e= extractedData.experiences.find((item)=> item.id===id);
      if(e) setEditExperience(e);
    }
    const handleSaveExperience= (updatedExperience: ExperienceItem)=> {
      setExtractedData((previous)=> ({...previous, 
        experiences: previous.experiences.map((e)=> e.id=== updatedExperience.id ? updatedExperience : e),
      }));
      setEditExperience(null);
    }

    const handleApproveAndSave= async()=> {
      setIsSaving(true);
      try{
        //await createConsultantProfile(extractedData);
        navigate("/consultants-manager")
      } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create consultant profile");
      } finally {
      setIsSaving(false);}
    }
    
    return(
      <ConsultantProfileProvider>
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={consultantManagerSidebarItems} />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">

        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}>
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Review Extracted CV Information</h1>
        </header> 
        <div className="flex-1 overflow-y-auto px-12 pb-12 w-full flex flex-col items-center" >
        <div className="w-full max-w-5xl">
        <div className="h-6"/>
        <div><ProfileInfoForm data={extractedData} onChange={(data)=> handleUpdate(data)}/></div>
        <div className="h-6"/>
        <div><LocationForm data={extractedData} onChange={(data)=> handleUpdate(data)} /></div>
        <div className="h-6"/>
        <div><SkillsForm data={extractedData} onChange={(data)=> handleUpdate(data)}/></div>
        <div className="h-6"/>
        <div><EducationForm data={extractedData} onChange={(data)=> handleUpdate(data)}/></div>
        <div className="h-6"/>
        <div><ExperienceForm onAdd={handleAddExperience} editExperience= {editExperience} onSave= {handleSaveExperience}  onCancelEdit={()=> setEditExperience(null)}/>
        <div className="h-6"/>
        <ExperienceList experiences={extractedData.experiences} onRemove={handleDeleteExperience} onEdit= {handleEditExperience}/></div>
        <div className="h-6"/>
        <div className= "flex items-center justify-between bg-white rounded-2xl border-none rounded-2xl" style={{ padding: "20px" }}>
          <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 min-w-[240px] h-[50px] rounded-lg border font-semi-bold text-lg bg-gray-50 shadow-md ">Cancel</button>
          
          <button
          onClick={()=> navigate(`cv-upload/${userId}`)}
          className="flex items-center justify-center gap-2 min-w-[240px] h-[50px] rounded-lg border font-semi-bold text-lg bg-gray-50 shadow-md " style={{
            border: "1.5px solid var(--color-primary)", color: "var(--color-primary)",}}
          ><RefreshCcw size={18}/>Re-exract CV</button>
          
          <button className="flex items-center justify-center gap-2 min-w-[240px] h-[50px] rounded-lg text-white font-semi-bold text-lg shadow-md" style={{ backgroundColor: "var(--color-primary)" }}
            onClick={handleApproveAndSave}>Approve & Save Profile</button>
        </div>
        </div>
        </div>
        </div>
        </div></ConsultantProfileProvider>)}