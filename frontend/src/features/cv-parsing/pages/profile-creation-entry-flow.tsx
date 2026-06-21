import {Edit, UploadCloud, ArrowLeft} from "lucide-react";
import {useNavigate, useParams} from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import {consultantManagerSidebarItems} from "../../../components/layout/sidebar/sidebar.config";
import {Card}  from "../../../components/ui/card"


export default function ProfileCreationEntryFlow (){
    const navigate = useNavigate();
    const {userId}= useParams<{userId: string}>();
    return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantManagerSidebarItems} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}>
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Create Consultant Profile
          </h1>
          <div className="flex gap-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center h-12 w-30 px-6 text-lg rounded-xl font-semibold transition bg-gray-50 hover:bg-gray-100"
              style={{ color: "var(--color-primary)" }}>
              <ArrowLeft className="mr-2" />
              Back
            </button>
          </div>
        </header>
        <div className="h-6"/>
        <main className="flex-1 flex items-center justify-center overflow-y-auto">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border-none rounded-xl" style={{ padding: "45px" }}>
            <div className="w-full max-w-[800px] flex flex-col gap-12">          
                <div className="text-left mb-2">
                    <h2>Choose how you want to create the consultant profile</h2>
                    <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                        You can either enter the details manually or upload a CV and let our AI extract the information for you </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items stretch w-full">
                  <div className="border border-gray-200 rounded-xl flex flex-col items-center text-center justify-between min-h-[360px] shadow-md "
                  style={{padding: "20px 20px"}}>
                    <div className="flex flex-col items-center gap-4">
                      <div className= "h-6"/>
                      <h3>Upload CV (AI Powered)</h3>
                      <p className="text-lg leading-8" style={{ color: "var(--color-text-secondary)" }}>
                        Upload a CV and our AI will extract the consultant’s details including skills, certifications and experience.
                      </p>
                    </div>
                    <div className="w-full flex flex-col items-center gap-3 mt-6">
                      <button className="flex items-center justify-center gap-2 min-w-[240px] h-[50px] rounded-lg text-white font-semi-bold text-lg shadow-md" style={{ backgroundColor: "var(--color-primary)" }}
                      onClick={()=> navigate(`/cv-upload/${userId}`)}>
                        <UploadCloud className="h-8 w-8" />
                        Upload CV
                      </button>
                      <span className ="text-sm"style={{ color: "var(--color-text-secondary)" }}>Supports PDF, DOCX (Max 10MB)</span>
                      <div  className= "h-6"/>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-xl flex flex-col items-center text-center justify-between min-h-[360px] shadow-md"
                  style={{padding: "20px 20px"}}>
                    <div className="flex flex-col items-center gap-4">
                      <div className= "h-6"/>
                      <h3>Manual Entry</h3>
                      <p className="text-lg leading-8 mt-4" style={{ color: "var(--color-text-secondary)" }}>
                      Fill in the consultant details manually using our comprehensive form. You have complete control.</p>
                    </div>
                    <div className="w-full flex flex-col items-center gap-3 mt-6">
                      <button className="flex items-center justify-center gap-2 min-w-[240px] h-[50px] rounded-lg border font-semi-bold text-lg bg-gray-50 shadow-md " style={{
                        border: "1.5px solid var(--color-primary)",
                        color: "var(--color-primary)",}}
                        onClick={()=> navigate(`/create-profile/${userId}`)}>
                        <Edit className="h-8 w-8" />
                        Enter Manually 
                      </button>
                      <div  className= "h-14  mt-3"/>
                    </div>
                  </div>
                  
                </div>
              </div>
       
        </Card>
        </main>     
    </div>
</div>
    )}