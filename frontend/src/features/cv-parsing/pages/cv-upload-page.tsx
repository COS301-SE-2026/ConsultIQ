import {UploadCloud, ArrowLeft, CheckCircle2} from "lucide-react";
import {useNavigate} from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import {consultantManagerSidebarItems} from "../../../components/layout/sidebar/sidebar.config";
import {Card}  from "../../../components/ui/card";
import React, {useState} from "react";
import type {DragEvent} from "react";
import { toast } from "sonner";


export default function CVUpload (){
    const navigate = useNavigate();
    const [_isDragging,setDragging]= useState(false);
    const [isFileUploaded, setIsFileUploaded]= useState(false);
    const [fileName, setFileName]= useState("");

    const handleFileChange= (e: React.ChangeEvent<HTMLInputElement>)=> {
      const filSelected= e.target.files?.[0];
      if(!filSelected) return;
      toast.success("File successfully uploaded",{description: filSelected.name, duration: 3500,});
      e.target.value= "";
      setTimeout(()=> {alert("Navigating to the CV Extraction Preview page...");}, 2000)
      };
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
              className="flex items-center justify-center h-12 w-30 px-6 text-lg rounded-xl font-semibold bg-white shadows:md"
              style={{ color: "var(--color-primary)" }}>
              <ArrowLeft className="mr-2" />
              Back
            </button>
        </div>    
        </header>
        <div className="h-6"/>
        <main className="flex-1 flex items-center justify-center overflow-y-auto">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border-none rounded-xl" style={{ padding: "45px" }}>
            <div className="w-full max-w-[800px] flex flex-col gap-12 mx-auto">          
                <div className="text-left mb-2">
                    <h2>Upload CV</h2>
                    <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                        Upload a CV file and we will extract the information to help you create the profile faster. </p>
                </div>
                {
                  isFileUploaded? (
                    <div className="w-full border border-gray-100 rounded-xl flex flex-col items-center justify-center ">
                      <CheckCircle2 className="h-14 w-14 text-green-600 animate-bounce"/>
                      <h3 className="text-2xl font-bold mb-2">File successfully uploaded</h3>
                      <p className="text-base ">{fileName}</p>
                    </div>
                  ):(
                <div className= "w-full border rounded-xl flex flex-col items-center justify-center"
                  style={{border: "3px dashed var(--color-primary)", color: "var(--color-primary)",}}
                    onDragOver= {(e: DragEvent<HTMLDivElement>) =>{e.preventDefault()
                                setDragging(true);}}>
                <div className="h-6"/>
                <UploadCloud className="h-14 w-14 mb-4"/>
                <p className="text-lg">Drag and drop CV here</p>
                <span className="text-lg "style={{ color: "var(--color-text-secondary)" }}>or</span>
                <input type="file" id="cv-upload" className="hidden" accept=".pdf,.docx" onChange={handleFileChange}></input>
                <label htmlFor="cv-upload" role="button" 
                className="flex items-center justify-center gap-2 min-w-[240px] h-[50px] text-white rounded-lg font-semi-bold text-lg shadow-md" style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                >Choose file</label>
                <div className="h-2"/>
                <span className ="text-sm"style={{ color: "var(--color-text-secondary)" }}>PDF or DOCX up to 10MB </span>
                <div className="h-6"/>
                </div>
                  )}
              </div>
            </Card>
        </main> 
    </div>
</div>)}