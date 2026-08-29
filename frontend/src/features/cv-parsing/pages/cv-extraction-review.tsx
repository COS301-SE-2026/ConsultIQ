import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { Card } from "../../../components/ui/card";
// import { cvParsingService } from "../services/cv-parsing.service";
// import { createConsultantProfile } from "../../consultants/services/consultant.service";    
import type {
    CvFileStatus,
    ParsedCvData,
    ParsedSkill,
    ParsedExperience,
    // ParsedEducation,
    // ParsedCertification,
    FieldWarning,
} from "../types/cv.types";

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

// const POLL_INTERVAL_MS = 2000;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

export default function CVExtractionReview(){
    const navigate = useNavigate();
    const { userId, /*cvField */} = useParams<{userId: string; /*cvField: string*/}>();

    const [viewState, _setViewState] = useState<ViewState>("loading");
    const [cvFile, _setCvFile] = useState<CvFileStatus | null>(null);
    const [fieldWarnings, _setFieldWarnings] = useState<FieldWarning[]>([]);
    const [failureReason, _setFailureReason] = useState<string>("");

    const [contact, setContact] = useState<ParsedCvData["contact"]>({});
    const [skills, setSkills] = useState<SkillFormRow[]>([]);
    const [experiences, setExperiences] = useState<ParsedExperience[]>([]);
    // const [certificaions, setCertifications] = useState<ParsedCertification[]>([]);
    // const [education, setEducation] = useState<ParsedEducation[]>([]);
    const [manualFields, setManualFields] = useState<ManualFields>({
        idNumber: "",
        costToCompany: "",
        availability: "AVAILABLE",
    });

    // const [isSubmitting, setIsSubmitting] = useState(false);
    // const [isDiscarding, setIsDiscarding] = useState(false);
    // const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    // const confidenceScores = cvFile?.parsedData?.confidenceScores;

    const warningByPath = useMemo(() =>{
        const map = new Map<string, string>();
        fieldWarnings.forEach((w) => map.set(w.path, w.message));
        return map;
    }, [fieldWarnings]);

    const updateSkill = (idx: number, patch:Partial<SkillFormRow>) =>{
        setSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch} : s)));
    };

    const updateExperience = (idx: number, patch: Partial<ParsedExperience>) =>{
        setExperiences((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch} : e)))
    }

    return (
        <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={consultantManagerSidebarItems}/>

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header
            className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
            style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
            >
            <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
                Create Profile
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
                            <Card className="p-6">
                                <h2 className="text-xl font-bold mb-4" /*</Card>style={{ color: isLowConfidence("contact") ? "#b45309" : undefined }}*/>
                                    Contact details
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
                                            <option value="AVAILABILITY" >Availability</option>
                                            <option value="UNAVAILABILITY">Unavailable</option>
                                            <option value="ON_LEAVE">On leave</option>
                                        </select>
                                    </label>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h2 className="text-xl font-bold mb-4" /* style={{ color: isLowConfidence("skills") ? "#b45309" : undefined }} */>
                                    Skills
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

                            <Card className="p-6">
                                <h2 className="text-xl font-bold mb-4">
                                    Experience
                                </h2>
                                {experiences.map((exp, i) =>(
                                    <div>
                                        <FormField label="Job title" value={exp.jobTitle} onChange={(v) => updateExperience(i, { jobTitle: v })} />
                                        <FormField label="Company" value={exp.companyName} onChange={(v) => updateExperience(i, { companyName: v })} />
                                        <FormField label="Start date" value={exp.startDate} onChange={(v) => updateExperience(i, { startDate: v })} />
                                        <FormField label="End date" value={exp.endDate ?? ""} onChange={(v) => updateExperience(i, { endDate: v })} />
                                        <div>
                                            <FormField label="Description" value={exp.description} onChange={(v) => updateExperience(i, { description: v })} />
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        </div>
                    )
                }
            </main>
        </div>
        </div>
    );
}

function FormField({label, value, warning, onChange}: {
    label: string; value: string; warning?: string; onChange: (value:string) =>void; }){
    return(
        <label>
            <span>{label}</span>
            <input  className="border rounded-lg h-10 px-3"
        style={{ borderColor: warning ? "#f59e0b" : undefined }}
        value={value}
        onChange={(e) => onChange(e.target.value)}/>
        </label>
    )
}