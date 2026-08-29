import {UploadCloud, ArrowLeft, CheckCircle2, Download } from "lucide-react";
import {useNavigate, useParams} from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import {consultantManagerSidebarItems} from "../../../components/layout/sidebar/sidebar.config";
import { cvParsingService } from "../services/cv-parsing.service";
import {Card}  from "../../../components/ui/card";
import React, {useState} from "react";
import { toast } from "sonner";


export default function CVUpload (){
    const navigate = useNavigate();
    const { userId }= useParams<{userId: string}>();
    const [isDragging,setDragging]= useState(false);
    const [isUploading, setIsUploading]= useState(false);
    const [stagedFile, setStagedFile] = useState<File | null>(null);
    const [uploadedCv, setUploadedCv]= useState<{
        cvFileId: string;
        fileName: string;
        fileSize: number;
    } | null>(null);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(true);
    const [selectedParsingMethod, setSelectedParsingMethod] = useState<"RULE_BASED" | "AI_ASSISTED">("RULE_BASED");

    const validateFile = (file: File) : boolean =>{
      const allowedMimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
     ];

     if(!allowedMimeTypes.includes(file.type)){
        toast.error("Only PDF and DOCX files are supported.");
        return false;
     }

     if(file.size > 10*1024*1024){
        toast.error("File size must not exceed 10MB.");
        return false;
     }

     return true;

  }

  const handleSelectedFile =async (fileSelected: File)=> {
    if(!validateFile(fileSelected)) return;
    setStagedFile(fileSelected);
  };

    const handleFileChange= (event: React.ChangeEvent<HTMLInputElement>) =>{
      const fileSelected = event.target.files?.[0];

      if(fileSelected){
        void handleSelectedFile(fileSelected);
      }

      event.target.value = "";
  };

  const handleConfirmUpload = async() => {
    if(!stagedFile || !userId) return;

    try{
      setIsUploading(true);
      const response = await cvParsingService.upload(userId, stagedFile, selectedParsingMethod);

      setUploadedCv({
        cvFileId: response.cvFileId,
        fileName: stagedFile.name,
        fileSize: stagedFile.size,
      });
      setStagedFile(null);
      setIsConfirmationOpen(true);
      toast.success("CV uploaded successfully.");
    }catch(error){
      toast.error(error instanceof Error ? error.message : "Failed to upload file.")
    }finally{
      setIsUploading(false);
    }
  };

  const handleChangeFile = () =>{
    setStagedFile(null);
  }

  const handleDownload = async () =>{
    if(!uploadedCv) return;

    try{
      const { url } = await cvParsingService.getDownloadUrl(uploadedCv.cvFileId);
      window.open(url, "_blank", "noopener,noreferrer");
    }catch(error){
      toast.error(error instanceof Error ? error.message : "Unable to download the uploaded CV.");
    }
  };

  const handleContinueToExtraction = () =>{
    if(!userId  || !uploadedCv) return;
    navigate(`/cv-extraction-review/${userId}/${uploadedCv.cvFileId}`);

  }

  const handleAcknowledgeDisclaimer = () =>{
    setIsDisclaimerOpen(false);
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
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border-none rounded-xl" style={{ padding: "60px" }}>
            <div className="w-full max-w-[800px] flex flex-col gap-12 mx-auto">          
                <div className="text-left mb-2">
                    <h2>Upload CV</h2>
                    <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                        Upload a CV file and we will extract the information to help you create the profile faster. </p>
                </div>
                {isUploading  &&(
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)"}}>Uploading CV...</p>
                )}
                { uploadedCv? (
                    <div className="w-full border border-gray-100 rounded-xl flex flex-col items-center justify-center ">
                      <CheckCircle2 className="h-14 w-14 text-green-600"/>
                      <h3 className="text-2xl font-bold mb-2">File successfully uploaded</h3>
                      <p className="text-base ">{uploadedCv.fileName}</p>
                    </div>
                ): stagedFile ?(
                  <div className="w-full border border-gray-300 rounded-xl flex flex-col items-center justify-center gap-4 py-10">
                    <p className="text-lg text-primary"><strong>{stagedFile.name}</strong> : {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB</p>

                    <div className="flex items-center  gap-4 mt-2">
                        {/* <p className="mb-2 text-lg font-medium text-primary" >
                          Parsing method :
                        </p> */}
                        <div className="flex gap-3">
                          <label className="flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2">
                            <input type="radio" name="parsingMethod" value="RULE_BASED"
                            checked = {selectedParsingMethod === "RULE_BASED"}
                            onChange={() => setSelectedParsingMethod("RULE_BASED")} />
                            <span>Rule-based Parsing</span>
                          </label>
                          <label className="flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2">
                            <input type="radio" name="parsingMethod" value="AI_ASSISTED"
                            checked = {selectedParsingMethod === "AI_ASSISTED"}
                            onChange={() => setSelectedParsingMethod("AI_ASSISTED")} />
                            <span>AI-assisted Parsing</span>
                          </label>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <button type="button"
                      className="h-12 px-8 rounded-lg border font-semibold text-lg"
                      style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
                      onClick={handleChangeFile}
                      disabled={isUploading}
                      >
                        Change File
                      </button>

                      <button type="button"
                      className="h-12 px-8 rounded-lg font-semibold text-white text-lg"
                      style={{ backgroundColor: "var(--color-primary)" }}
                      onClick={handleConfirmUpload}
                      disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Confirm & Upload"}
                      </button>
                    </div>  
                  </div>
                  ):(
                <div className= "w-full border rounded-xl flex flex-col items-center justify-center"
                  style={{border: "3px dashed var(--color-primary)", color: "var(--color-primary)", backgroundColor: isDragging ? "#e8f0ff" : "transparent"}}
                   
                      onDragOver= {(event) =>{
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "copy";
                          setDragging(true);
                          }}

                      onDragLeave={() => {
                        setDragging(false)
                      }}

                      onDrop={(event) =>{
                        event.preventDefault();
                        setDragging(false);

                        const droppedFile = event.dataTransfer.files.item(0);
                        if(droppedFile){
                          handleSelectedFile(droppedFile);
                        }
                      }}
                      >

                  <div className="h-6"/>
                  <UploadCloud className="h-14 w-14 mb-4"/>
                  <p className="text-lg">Drag and drop CV here</p>
                  <span className="text-lg "style={{ color: "var(--color-text-secondary)" }}>or</span>
                  <input type="file" id="cv-upload" className="hidden" accept=".pdf,.docx" onChange={handleFileChange}></input>
                    <label htmlFor="cv-upload" role="button" 
                    className="flex items-center justify-center gap-2 min-w-[240px] h-[50px] text-white rounded-lg font-semi-bold text-lg shadow-md" 
                    style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
                      Choose file
                    </label>
                  <div className="h-2"/>
                  <span className ="text-sm"style={{ color: "var(--color-text-secondary)" }}>PDF or DOCX up to 10MB </span>
                  <div className="h-6"/>
                </div>
                  )}
              </div>
            </Card>
            {isDisclaimerOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                role="dialog"
                aria-modal ="true"
                aria-labelledby = "parsing-disclaimer-title"
              >
                <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white p-8 shadow-xl">
                  <h2 id="parsing-disclaimer-title" className="text-2xl font-bold mb-4">
                    How CV parsing works
                  </h2>

                  <div className="space-y-4 text-base" style={{ color: "var(--color-text-secondary)" }}>
                    <p>
                      <strong>Rule-based parsing(default)</strong> keeps your CV entirely within our own systems and does not share it with any outside service.
                      It works best with our standard CV template and is currently optimised for software and IT consulting profiles -CVs
                       outside this format or industry may be extracted less accurately, or need more manual review.
                    </p>

                    <p>
                      <strong>AI-assisted parsing</strong> reads a much wider range of CV formats and industries more accurately, 
                      and does not require a fixed template, but involves sending your CV's text to Anthropic's Claude AI service
                     for processing.
                    </p>

                    <p>
                      Either way, no extracted information is added to a consultant's profile automatically - you'll review and confirm everything before it's saved.
                    </p>

                    <div>
                      <h3 className="font-semibold text-black mb-2">Security</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>
                          Anthropic's published policy is not to use API data to train its models - this is not a chat product, and CVs processed this way are not used to improve Anthropic's AI.
                        </li>
                        <li>
                          Rule-based parsing never leaves our own infrastructure, hosted in South Africa, if you'd rather not use AI-assisted mode at all.
                        </li>
                        <li>
                          Nothing is written to a consultant's profile without your review and explicit confirmation, regardless of which mode was used.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button type="button"
                  className = "text-lg mt-6 h-12 w-full rounded-lg font-semibold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                  onClick={handleAcknowledgeDisclaimer}>
                    I understand, continue
                  </button>
                </div>
              </div>
            )
              
            }

            {isConfirmationOpen && uploadedCv && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                role="dialog"
                aria-modal ="true"
                aria-labelledby = "cv-upload-confirmation-title"
              >
                <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
                  <div className="flex flex-col items-center text-center">
                    <CheckCircle2 className=" mb-4 h-14 w-14 text-green-600"/>

                    <h2 id="cv-upload-confirmation-title" className="text-2xl font-bold">
                      CV uploaded successfully
                    </h2>
                    <p className="mt-3 break-all text-base">{uploadedCv.fileName}</p>

                    <div className="mt-6 flex w-full flex-col gap-3">
                      <button type="button"
                      className = "flex h-12 items-center justify-center gap-2 rounded-lg border font-semibold"
                      style={{borderColor: "var(--color-primary)", color: "var(--color-primary)"}}
                      onClick={handleDownload}
                      >
                        <Download className="h-5 h-4"/>
                        Download CV
                      </button>
                      
                      <button type="button"
                      className="h-12 rounded-lg font-semibold text-white"
                      style={{ backgroundColor: "var(--color-primary)" }}
                      onClick={handleContinueToExtraction}
                      >
                        Continue to extraction review
                      </button>

                    </div>
                  </div>
                </div>

              </div>
            )

            }
        </main> 
    </div>
</div>)}