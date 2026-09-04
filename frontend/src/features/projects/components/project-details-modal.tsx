import { X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project, AssignedConsultants } from "../types/project.types";
import ProjectLocationSection from "./project-location-section";
import ProjectOverviewSection from "./project-overview-section";
import ProjectSkillsSection from "./project-skills-section";
import { getAssignedProjectDetails } from "../../consultants/services/consultant.service";
import { apiClient } from "../../../lib/api-client";
import { toast } from "sonner";
import ProjectConsultants from "./project-consultants-section";
import { getConsultantsByProject } from "../services/project.service";
interface ProjectDetailsModalProps {
  readonly open: boolean;
  readonly project: Project | null;
  readonly onClose: () => void;
  readonly isConsultant?: boolean;
  readonly onUpdate: (updatedProject: Project) => void;
}


interface ApiProjectSkill {
  id: string;
  skillId?: string | number;
  skill: {
    name: string;
  };
  competency: string;
  years: number;
  mandatory: boolean;
}

interface FullApiResponse{
  id: string;
  projectName: string;
  clientName: string;
  description: string;
  teamSize: number,
  allocation: number,
  budget: number,
  startDate: string,
  endDate: string,
  status: Project['status'],
  addressLine1: string,
  addressLine2: string | null,
  suburb: string | null,
  city: string,
  province: string,
  postalCode: string | null,
  skills: ApiProjectSkill[],
}

export default function ProjectDetailsModal({
  open,
  project,
  onClose,
  isConsultant,
  onUpdate,
}: ProjectDetailsModalProps) {

  const [fullProject, setFullProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState<string | null>(null);
  const [assignedConsultants, setAssignedConsultants] = useState<AssignedConsultants[] | null>(null);
  const [consultantsLoading, setConsultantsLoading] = useState(false);
  //const isNonConsultant= !isConsultant;
  
  const mapPayload: Record<string, (fields: Partial<Project>)=> Record<string, unknown>> ={
      "project-overview": (fields) =>({
      ...(fields.projectName !==undefined && {projectName: fields.projectName}),
      ...(fields.clientName !==undefined && {clientName: fields.clientName}),
      ...(fields.description !==undefined && {description: fields.description}),
      ...(fields.teamSize !==undefined && {teamSize: fields.teamSize}),
      ...(fields.budget !==undefined && {budget: fields.budget}),
      ...(fields.startDate !==undefined && {startDate: fields.startDate}),
      ...(fields.endDate !==undefined && {endDate: fields.endDate}),
      ...(fields.status !==undefined && {status: fields.status}),
  }),
  "project-location": (fields) => ({
      ...(fields.location?.addressLine1 !==undefined && {addressLine1: fields.location.addressLine1}),
      ...(fields.location?.addressLine2 !==undefined && {addressLine2: fields.location.addressLine2}),
      ...(fields.location?.suburb !==undefined && {suburb: fields.location.suburb}),
      ...(fields.location?.city !==undefined && {city: fields.location.city}),
      ...(fields.location?.province !==undefined && {province: fields.location.province}),
      ...(fields.location?.postalCode !==undefined && {postalCode: fields.location.postalCode}),
    }),
  "project-skills": (fields) =>({
      skills: (fields.skills ?? []).map((skill)=> ({
        id: skill.id,
        name: skill.name,
        competency: skill.competency, 
        years: skill.years, 
        mandatory: skill.mandatory,})),
      }),
    };  
  const mapStates: Record<string, (currProject :Project ,fields: Partial<Project>)=> Project> ={
      "project-overview": (currProject, fields) =>({...currProject,
      name: fields.name ?? currProject.name,
      projectName: fields.projectName ?? currProject.projectName,     
      clientName: fields.clientName ?? currProject.clientName,
      description: fields.description ?? currProject.description,
      teamSize: fields.teamSize ?? currProject.teamSize,
      budget: fields.budget ?? currProject.budget,
      startDate: fields.startDate ?? currProject.startDate,
      endDate: fields.endDate ??  currProject.endDate,
      status : fields.status ?? currProject.status,
  }),
  "project-location": (currProject,fields) => ({...currProject,
      addressLine1: fields.location?.addressLine1 ?? currProject.addressLine1,
      addressLine2 : fields.location?.addressLine2 ?? currProject.addressLine2,
      suburb: fields.location?.suburb?? currProject.suburb,
      city: fields.location?.city ?? currProject.city,
      province: fields.location?.province ?? currProject.province,
      postalCode: fields.location?.postalCode ?? currProject.postalCode,
      location: {...currProject.location, ...fields.location},
    }),
  "project-skills": (currProject, fields) =>({...currProject,
      skills: fields.skills ?? currProject.skills,
      }),
    }; 

  const handleSaveSection = async (section: string, updatedFields:Partial<Project>) =>{
  if (!fullProject) return;

  const pMapper= mapPayload[section];
  const payload= pMapper ? pMapper(updatedFields) : {};

  
  if(Object.keys(payload).length===0){ 
    setActiveEditSection(null);
    return;}
    const formatState= mapStates[section];
    const updatedProject= formatState ? formatState(fullProject, updatedFields) : fullProject;

  try {
    
    await apiClient.patch(`/projects/${fullProject.id}`,payload);
    setFullProject(updatedProject);
    onUpdate(updatedProject);
  }catch(error){
    toast.error("Failed to update project" + error);
  }finally{
    setActiveEditSection(null);};
  }
   

  useEffect(() => {
    if (!open || !project?.id) return;
    setFullProject(null);

    const fetchProjectDetails = async () => {
      setIsLoading(true);
      try {

        if (isConsultant) {
          // consultant path ---
          const data = await getAssignedProjectDetails(project.id);
          const p = data.project;
 
          const mappedProject: Project = {
            id: p.id,
            name: p.projectName,
            projectName: p.projectName,
            clientName: p.clientName,
            description: p.description || "No description provided.",
            teamSize: p.teamSize,
            allocation: p.allocation,
            budget: p.budget,
            startDate: p.startDate,
            endDate: p.endDate || "",
            status: p.status,
 
            addressLine1: p.addressLine1,
            addressLine2: p.addressLine2 || undefined,
            suburb: p.suburb || undefined,
            city: p.city,
            province: p.province,
            postalCode: p.postalCode,
 
            location: {
              addressLine1: p.addressLine1,
              addressLine2: p.addressLine2 || undefined,
              suburb: p.suburb ?? "",
              city: p.city,
              province: p.province,
              postalCode: p.postalCode,
            },
 
            skills: p.skills.map((s) => ({
              name: s.skillName,
              competency: s.competency,
              years: s.years,
              mandatory: s.mandatory,
            })),
          };
 
          setFullProject(mappedProject);
          return;
        }
          const data= await apiClient.get<FullApiResponse>(`/projects/${project.id}`);
          const mappedProject: Project = {
            id: data.id,
            name: data.projectName,
            projectName: data.projectName,
            clientName: data.clientName,
            description: data.description || "No description provided.",
            teamSize: data.teamSize,
            allocation: data.allocation,
            budget: data.budget,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status,

            // Add these missing root-level fields to satisfy TypeScript
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2 || "",
            suburb: data.suburb || "",
            city: data.city,
            province: data.province,
            postalCode: data.postalCode || "",

            // Keep the nested location object if your UI components still use it
            location: {
              addressLine1: data.addressLine1,
              addressLine2: data.addressLine2 || "",
              suburb: data.suburb || "",
              city: data.city,
              province: data.province,
              postalCode: data.postalCode || "",
            },


            skills: data.skills.map((ps: ApiProjectSkill) => ({
              id: ps.id,
              name: ps.skill.name,
              competency: ps.competency,
              years: ps.years,
              mandatory: ps.mandatory,
            })),
          };
        setFullProject(mappedProject);
        
        }catch (error) {
        console.error("Failed to fetch project details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [open, project, isConsultant]);

  useEffect(() => {
    const fetchAssignedConsultants = async () => {
      setConsultantsLoading(true);

      if(!fullProject){
        setConsultantsLoading(false);
        setAssignedConsultants(null);
        return;
      }

      try {
         const data = await getConsultantsByProject(fullProject.id);
         setAssignedConsultants(data);
      } catch (error) {
        toast.error("Failed to fetch assigned consultants" + error);
      }finally{
        setConsultantsLoading(false);
      }
    }

    fetchAssignedConsultants();

  },[fullProject]);


  if (!open || !project) {
    return null;
  }

  const displayData = fullProject || project;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 md:p-12">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative" style={{ padding: "64px" }}>
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-gray-500 transition hover:text-gray-800"
        >
          <X size={28} />
        </button>

        <h2
          className="text-4xl font-bold mb-4 flex items-center gap-4"
          style={{ color: "var(--color-primary)" }}
        >
          Project Details
          {isLoading && <Loader2 className="h-6 w-6 animate-spin text-gray-400" />}
        </h2>


        <div className="flex flex-col gap-8">
          <ProjectOverviewSection 
          key={project.id}
          project={displayData} 
          isEditing = {activeEditSection === "project-overview"}
          isDisabled = { activeEditSection !== null && activeEditSection !== "project-overview"}
          onEdit = {() => setActiveEditSection("project-overview") }
          onCancel = { () => setActiveEditSection(null) }
          onSave = { (fields: Partial <Project>) => handleSaveSection("project-overview", fields)}
          isConsultant={isConsultant}
          />

          <ProjectLocationSection 
          key={project.id}
          project={displayData} 
          isEditing = {activeEditSection === "project-location"}
          isDisabled = { activeEditSection !== null && activeEditSection !== "project-location"}
          onEdit = {() => setActiveEditSection("project-location") }
          onCancel = { () => setActiveEditSection(null) }
          onSave = { (fields: Partial <Project>) => handleSaveSection("project-location", fields)}
          isConsultant={isConsultant}
          />

            <ProjectSkillsSection
              key = {fullProject ? fullProject.id : "loading"}
              skills = {[...(displayData.skills ?? [])]}
              isEditing = {activeEditSection === "project-skills"}
              isDisabled = { activeEditSection !== null && activeEditSection !== "project-skills"}
              onEdit = {() => setActiveEditSection("project-skills") }
              onCancel = { () => setActiveEditSection(null) }
              onSave = { (skills) => handleSaveSection("project-skills", {skills}) }
              isConsultant={isConsultant}
            />

            <ProjectConsultants
              consultants = {assignedConsultants || []}
              projectId={fullProject?.id || ""}
              isLoading={consultantsLoading}

            />
        </div>
      </div>
    </div>
  );
}