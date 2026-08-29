import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 , Trash2} from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { Card } from "../../../components/ui/card";
import { cvParsingService } from "../services/cv-parsing.service";
import { createConsultantProfile } from "../../consultants/services/consultant.service";  
import { validateSAID, normaliseSAPhone } from "../../consultants/components/profile/validation-helpers";

import type {
    CvFileStatus,
    ParsedCvData,
    ParsedSkill,
    ParsedExperience,
    ParsedEducation,
    ParsedCertification,
    FieldWarning,
} from "../types/cv.types";
import { toast } from "sonner";

type ViewState = "loading" | "processing" | "review" | "failed";

interface ManualFields {
    idNumber: string;
    costToCompany: string;
    availability: "AVAILABLE" | "UNAVAILABLE" | "ON_LEAVE"
}

interface SkillFormRow extends ParsedSkill {
    competencyLevel:  "BEGINNER" | "INTERMEDIATE" | "EXPERT";
    confidenceLevel: number;
}


//normalize job type and work model options to match backend enum values
const JOB_TYPE_OPTIONS = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"] as const;
const WORK_MODEL_OPTIONS = ["ONSITE", "REMOTE", "HYBRID"] as const;

type JobType = (typeof JOB_TYPE_OPTIONS)[number];
type WorkModel = (typeof WORK_MODEL_OPTIONS)[number];

interface ExperienceFormRow extends Omit<ParsedExperience, "jobType" | "workModel"> {
    jobType?: JobType;
    workModel?: WorkModel;
}

const normaliseEnum = <T extends string>(raw: string | undefined, options: readonly T[]): T | "" => {
    if(!raw) return "";
    const cleaned = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
    return (options as readonly string[]).includes(cleaned) ? (cleaned as T) : "";
}

const POLL_INTERVAL_MS = 2000;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

export default function CVExtractionReview(){
    const navigate = useNavigate();
    const { userId, cvFileId } = useParams<{userId: string; cvFileId: string }>();

    const [viewState, setViewState] = useState<ViewState>("loading");
    const [cvFile, setCvFile] = useState<CvFileStatus | null>(null);
    const [fieldWarnings, setFieldWarnings] = useState<FieldWarning[]>([]);
    const [failureReason, setFailureReason] = useState<string>("");

    const [contact, setContact] = useState<ParsedCvData["contact"]>({});
    const [skills, setSkills] = useState<SkillFormRow[]>([]);
    const [experiences, setExperiences] = useState<ExperienceFormRow[]>([]);
    const [certifications, setCertifications] = useState<ParsedCertification[]>([]);
    const [education, setEducation] = useState<ParsedEducation[]>([]);
    const [manualFields, setManualFields] = useState<ManualFields>({
        idNumber: "",
        costToCompany: "",
        availability: "AVAILABLE",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);
    const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const confidenceScores = cvFile?.parsedData?.data?.confidenceScores;

    const warningByPath = useMemo(() =>{
        const map = new Map<string, string>();
        fieldWarnings.forEach((w) => map.set(w.path, w.message));
        return map;
    }, [fieldWarnings]);

    useEffect(() => {
    if (!cvFileId) return; 

    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const result = await cvParsingService.getCvFile(cvFileId);
        if (cancelled) return;

        setCvFile(result);

        if (result.extractionStatus === "PENDING" || result.extractionStatus === "PROCESSING") {
          setViewState("processing");
          return;
        }

        if (result.extractionStatus ==="FAILED") {
          setViewState("failed");
          setFailureReason(result.parsedData?.error ?? "CV extraction failed.");
          if (pollTimer.current) clearInterval(pollTimer.current);
          return;
        }

        // REVIEW_REQUIRED status
        if (pollTimer.current) clearInterval(pollTimer.current);

        const data = result.parsedData?.data;
        setFieldWarnings(result.parsedData?.fieldWarnings ?? []);

        if (data) {
          setContact(data.contact ?? {});
          setSkills(
            (data.skills ?? []).map((s) => ({
              ...s,
              competencyLevel: "BEGINNER",
              confidenceLevel: 1,
            })),
          );
          setExperiences(
            (data.experiences ?? []).map((e) =>({
                ...e,
                jobType: normaliseEnum(e.jobType, JOB_TYPE_OPTIONS) || undefined,
                workModel: normaliseEnum(e.workModel, WORK_MODEL_OPTIONS) || undefined,
          })), );

          setCertifications(data.certifications ?? []);
          setEducation(data.education ?? []);
        }

        setViewState("review");
      } catch (error) {
        if (cancelled) return;
        setViewState("failed");
        setFailureReason(
          error instanceof Error ? error.message : "Unable to load CV details.",
        );
        if (pollTimer.current) clearInterval(pollTimer.current);
      }
    };

    void fetchOnce();
    pollTimer.current = setInterval(fetchOnce, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [cvFileId]);

    const updateSkill = (idx: number, patch:Partial<SkillFormRow>) =>{
        setSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch} : s)));
    };

    const updateExperience = (idx: number, patch: Partial<ExperienceFormRow>) =>{
        setExperiences((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch} : e)));
    }

    const updateCertification = (idx: number, patch: Partial<ParsedCertification>) =>{
        setCertifications((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch} : c)));
    }

    const updateEducation = (idx: number, patch: Partial<ParsedEducation>) =>{
        setEducation((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch} : e)));
    }

    const validateBeforeSubmit = () : {error: string} | {error  : null; experiences : ParsedExperience[]} =>{
        const normalisedPhone = normaliseSAPhone(contact.phone ?? "");

        if(!contact.fullName) return {error : "Full name is required."};
        
        if(!/^\d{10}$/.test(normalisedPhone)) {
            return {error : "Phone number must be exactly 10 digits."};
        }
        if(!manualFields.idNumber || !validateSAID(manualFields.idNumber)) {
            return { error : "Please enter a valid South African ID number."};
        }
        if(manualFields.costToCompany && isNaN(Number(manualFields.costToCompany))) {
            return { error : "Cost to company must be a valid number."};
        }
        if(!contact.city || !contact.province || !contact.addressLine1){
            return {error : "Adress, city and province are required."};
        }

        const invalidIdx = experiences.findIndex(
            (e) => !e.jobType || !e.workModel,
        );

        if(invalidIdx !== -1){
            return { error : "Please select a job type and work model for every experience entry." };
        }
        return { error : null , experiences: experiences as ParsedExperience[]};
    };

    const handleApprove = async  () =>{
        if(!userId) return;

        const validation = validateBeforeSubmit();
        if(validation.error){
            toast.error(validation.error ?? "Validation failed.");
            return;
        }

        try{
            setIsSubmitting(true);

            const normalisedPhone = normaliseSAPhone(contact.phone ?? "");
            await createConsultantProfile({
                consultantUserId: userId,
                idNumber: manualFields.idNumber,
                phone: normalisedPhone,
                nationality: contact.nationality ?? "",
                addressLine1: contact.addressLine1 ?? "",
                addressLine2: contact.addressLine2,
                suburb: contact.suburb,
                city: contact.city ?? "",
                province: contact.province ?? "",
                postalCode: contact.postalCode,
                costToCompany: Number(manualFields.costToCompany),
                availability: manualFields.availability,
                skills: skills.map((s) => ({
                skillName: s.skillName,
                competencyLevel: s.competencyLevel,
                yearsExperience: s.yearsExperience,
                confidenceLevel: s.confidenceLevel,
                })),
                experiences: experiences as ParsedExperience[],
                certifications,
                education,
            });
            ""
            toast.success("Consultant profile created successfully");
            navigate("/consultants-manager");
        }catch(error){ 
            toast.error(error instanceof Error ? error.message : "Failed to create consultant profile.");
        }finally{
            setIsSubmitting(false);
        } 
    };

    const handleDiscard = async  () =>{
        if(!cvFileId) return;

        const confirmed = window.confirm("This will permanently delete the uploaded CV. Continue?");

        if(!confirmed) return;

        try{
            setIsDiscarding(true);
            await cvParsingService.discard(cvFileId);
            toast.success("CV discarded.");
            navigate(`/create-profile-entry/${userId}`);
        }catch(error){
            toast.error(error instanceof Error ? error.message : "Failed to discard cv.");
        }finally{
            setIsDiscarding(false);
        }
    };

    const isLowConfidence = (section: keyof NonNullable<typeof confidenceScores>) => (confidenceScores?.[section] ?? 1) < LOW_CONFIDENCE_THRESHOLD;
    

    return (
        <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={consultantManagerSidebarItems}/>

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header
            className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
            style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
            >
            <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
               Review Extracted CV Details
            </h1>

            <div className="flex gap-6">
                <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center h-12 px-6 text-lg rounded-xl font-semibold bg-white"
                style={{ color: "var(--color-primary)" }}
                >
                <ArrowLeft size={20} className="mr-2" />
                Back
                </button>
            </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10">
                {viewState === "loading" &&(
                    <div className="flex items-center justify-center h-full gap-2">
                        <Loader2  className="h-6 w-6 animate-spin"/>
                        <p>Loading...</p>   
                    </div>
                )}

                {viewState === "processing" &&(
                    <div className="flex items-center justify-center h-full gap-3">
                        <Loader2  className="h-10 w-10 animate-spin" style={{color: "var(--color-primary"}}/>
                        <p className="text-lg">Extracting CV details...</p>  
                        <p className="text-sm text-gray-500">
                            This can take a moment. Please do not close this page.
                        </p>
                    </div>
                )}

                {viewState === "failed" &&(
                    <div className="flex items-center justify-center h-full gap-3">
                        <AlertTriangle  className="h-10 w-10 text-red-600"/>
                        <p className="text-lg font-semibold text-secondary text-center max-w-md">Extraction failed.</p>  
                        <p className="text-sm ">
                            {failureReason}
                        </p>
                        <button className="h-12 px-6 rounded-lg font-semibold text-white"
                            style={{ backgroundColor: "var(--color-primary)" }}
                            onClick={() => navigate(`/create-profile-entry/${userId}`)}>
                            Back to upload
                        </button>
                    </div>
                )}

                { viewState === "review" && cvFile &&(
                        <div className="max-w-4xl mx-auto flex flex-col gap-8">
                            <Card className="p-6 rounded-lg">
                                <h2 className="text-xl font-bold mb-4" style={{ color: isLowConfidence("contact") ? "#b45309" : undefined }}>
                                    Contact details
                                    {isLowConfidence("contact") && " (low extraction confidence — please verify) "}
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Full name" value={contact.fullName?? ""} warning={warningByPath.get("contact.fullName")} onChange={(v) => setContact((c) => ({...c, fullName:  v}))} />

                                    <FormField label="Email" value={contact.email?? ""} warning={warningByPath.get("contact.email")} onChange={(v) => setContact((c) => ({...c, email:  v}))} />

                                    <FormField label="Phone (10 digits)" value={contact.phone?? ""} warning={warningByPath.get("contact.phone")} onChange={(v) => setContact((c) => ({...c, phone:  v}))} />

                                    <FormField label="Nationality" value={contact.nationality?? ""} warning={warningByPath.get("contact.nationality")} onChange={(v) => setContact((c) => ({...c, nationality:  v}))} />

                                    <FormField label="Address line 1" value={contact.addressLine1?? ""} warning={warningByPath.get("contact.addressLine1")} onChange={(v) => setContact((c) => ({...c, addressLine1:  v}))} />

                                    <FormField label="Suburb" value={contact.suburb?? ""} warning={warningByPath.get("contact.suburb")} onChange={(v) => setContact((c) => ({...c, suburb:  v}))} />

                                    <FormField label="City" value={contact.city?? ""} warning={warningByPath.get("contact.city")} onChange={(v) => setContact((c) => ({...c, city:  v}))} />

                                    <FormField label="Postal code" value={contact.postalCode?? ""} warning={warningByPath.get("contact.postalCode")} onChange={(v) => setContact((c) => ({...c, postalCode:  v}))} />
                                </div>

                                <h3 className="text-base font-semibold mt-6 mb-2">Additional required details (not extracted from CV)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="ID number (13 digits)" value={manualFields.idNumber} onChange={(v) => setManualFields((m) => ({...m, idNumber:  v}))} />

                                    <FormField label="Cost to company" value={manualFields.costToCompany} onChange={(v) => setManualFields((m) => ({...m, costToCompany:  v}))} />

                                    <label className="flex flex-col gap-1">
                                        <span className="text-sm font-medium">Availability</span>
                                        <select className="border rounded-lg h-10 px-2">
                                            <option value="AVAILABLE" >Available</option>
                                            <option value="UNAVAILABLE">Unavailable</option>
                                            <option value="ON_LEAVE">On leave</option>
                                        </select>
                                    </label>
                                </div>
                            </Card>

                            <Card className="p-6 rounded-lg">
                                <h2 className="text-xl font-bold mb-4"  style={{ color: isLowConfidence("skills") ? "#b45309" : undefined }} >
                                    Skills
                                    {isLowConfidence("skills") && " (low extraction confidence — please verify) "}

                                </h2>
                                {skills.map((skill, i) =>(
                                    <div key={i} className="grid grid-cols-4 gap-3 items-end mb-3 border-b pb-3">
                                        <FormField label="Skill" value={skill.skillName} onChange={(v) => updateSkill(i, { skillName: v})}/>
                                        <FormField label="Years experience" value={String(skill.yearsExperience)} 
                                        onChange={(v) => updateSkill(i, {yearsExperience: Number(v) || 0})} />
                                        
                                        <label className="flex flex-col gap-1">
                                            <span className="text-sm font-medium">Competency</span>
                                            <select className="border rounded-lg h-10 px-2" value={skill.competencyLevel}>
                                                <option value="BEGINNER">Beginner</option>
                                                <option value="INTERMEDIATE">Intermediate</option>
                                                <option value="EXPERT">Expert</option>
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1">
                                            <span className="text-sm font-medium"> Confidence (1-4) </span>
                                            <input type="number" min={1} max={4} className="border rounded-lg h-10 px-2"
                                                value={skill.confidenceLevel} onChange={(e) => updateSkill(i, {confidenceLevel: Number(e.target.value)})}
                                             />
                                        </label>
                                        {skill.extractionConfidence < LOW_CONFIDENCE_THRESHOLD && (
                                            <p className="col-span-4 text-xs text-amber-700">
                                                Low extraction confidence for this skill — please verify.
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </Card>

                            <Card className="p-6 rounded-lg">
                                <h2 className="text-xl font-bold mb-4" >
                                    Experience
                                </h2>
                                {experiences.map((exp, i) =>(
                                    <div key={i} className="grid grid-cols-2 gap-3 mb-4 border-b border-gray-400 pb-4">
                                        <FormField label="Job title" value={exp.jobTitle} onChange={(v) => updateExperience(i, { jobTitle: v })} />
                                        <FormField label="Company" value={exp.companyName} onChange={(v) => updateExperience(i, { companyName: v })} />
                                        <label className="flex flex-col gap-1">
                                            <span className="text-sm">Job type</span>
                                            <select value={ exp.jobType ?? ""} onChange={(e) => updateExperience(i, { jobType: e.target.value as JobType })}>
                                                <option value="" disabled>Select job type</option>
                                                <option value="FULL_TIME">Full-time</option>
                                                <option value="PART_TIME">Part-time</option>
                                                <option value="CONTRACT">Contract</option>
                                                <option value="INTERNSHIP">Internship</option>
                                                <option value="FREELANCE">Freelance</option>
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1">
                                            <span className="text-sm">Work model</span>
                                            <select value={exp.workModel ?? ""} onChange={(e) => updateExperience(i, { workModel: e.target.value as WorkModel })}>
                                                <option value="">Select work model</option>
                                                <option value="ONSITE">Onsite</option>
                                                <option value="REMOTE">Remote</option>
                                                <option value="HYBRID">Hybrid</option>
                                            </select>
                                        </label>
                                        <FormField label="Start date" value={exp.startDate} onChange={(v) => updateExperience(i, { startDate: v })} />
                                        <FormField label="End date" value={exp.endDate ?? ""} onChange={(v) => updateExperience(i, { endDate: v })} />
                                        <div className="col-span-2">
                                            <FormField label="Description" value={exp.description} onChange={(v) => updateExperience(i, { description: v })} />
                                        </div>
                                    </div>
                                ))}
                            </Card>

                            <Card className="p-6 rounded-lg">
                                <h2 className="text-xl font-bold mb-4"> Certifications</h2>
                                {certifications.map((cert, i) =>(
                                    <div key={i} className="grid grid-cols-2 gap-3 mb-4 border-b border-gray-400 pb-4">
                                        <FormField label="Title" value={cert.title} onChange={(v) => updateCertification(i, { title: v })} />
                                        <FormField label="Issuing body" value={cert.issuingBody} onChange={(v) => updateCertification(i, { issuingBody: v })} />
                                        <FormField label="Start date" value={cert.startDate ?? ""} onChange={(v) => updateCertification(i, { startDate: v })} />
                                        <FormField label="End date" value={cert.endDate ?? ""} onChange={(v) => updateCertification(i, { endDate: v })} />
                                    </div>
                                ))}
                            </Card>

                            <Card className="p-6 rounded-lg">
                                <h2 className="text-xl font-bold mb-4"> Education</h2>
                                {education.map((edu, i) =>(
                                    <div key={i} className="grid grid-cols-2 gap-3 mb-4 border-b border-gray-400 pb-4">
                                        <FormField label="Institution" value={edu.institution} onChange={(v) => updateEducation(i, { institution: v })} />
                                        <FormField label="Qualification" value={edu.qualification} onChange={(v) => updateEducation(i, { qualification: v })} />
                                        <FormField label="Start date" value={edu.startDate ?? ""} onChange={(v) => updateEducation(i, { startDate: v })} />
                                        <FormField label="End date" value={edu.endDate ?? ""} onChange={(v) => updateEducation(i, { endDate: v })} />
                                    </div>
                                ))}
                            </Card>

                            <div className="flex justify-between items-center pb-10">
                                <button className="flex items-center gap-2 h-12 px-6 rounded-lg font-semibold border border-red-300 text-red-600"
                                    onClick={handleDiscard} disabled={isDiscarding || isSubmitting} >
                                    <Trash2 className="h-5 w-5" />
                                    {isDiscarding ? "Discarding..." : "Discard this CV"}
                                </button>

                                <button className="h-12 px-8 rounded-lg font-semibold text-white "
                                style={{ backgroundColor: "var(--color-primary)" }}
                                    onClick={handleApprove} disabled={isSubmitting || isDiscarding} >
                                    {isSubmitting ? "Creating profile..." : "Approve and create profile"}
                                </button>
                            </div>
                        </div>
                    )}
            </main>
        </div>
    </div>
    );
}

function FormField({label, value, warning, onChange}: {
    label: string; value: string; warning?: string; onChange: (value:string) =>void; }){
    return(
        <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{label}</span>
            <input  className="border rounded-lg h-10 px-3"
        style={{ borderColor: warning ? "#f59e0b" : undefined }}
        value={value}
        onChange={(e) => onChange(e.target.value)}/>
        {warning && <span className="text-sm text-yellow-500">{warning}</span>}
        </label>
    )
}