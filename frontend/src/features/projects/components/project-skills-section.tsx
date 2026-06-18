import {Edit, X, Check} from "lucide-react";
import {useState, useEffect} from "react";  
import ProjectSkillsTable from "./project-skills-table";
import ProjectSkillsCard from "./project-skills-card";
import type { ProjectSkillData } from "../pages/project-specification-page";
import {Card} from "../../../components/ui/card";


interface ProjectSkillsSectionProps {
    skills: ProjectSkillData[];
    isEditing?: boolean;
    isDisabled?: boolean;
    onEdit: ()=> void;
    onCancel: ()=> void;
    onSave: (skills: ProjectSkillData[])=> void;
}


export default function ProjectSkillsSection({
    skills, isEditing, isDisabled, onEdit, onCancel, onSave
}: ProjectSkillsSectionProps) {
    const[currentSkills, setCurrentSkills]= useState<ProjectSkillData[]>(skills);

    useEffect(()=> {setCurrentSkills(skills);}, [skills]);

    const handleSaveSkill=() => {
        onSave(currentSkills);  }
    let skillsSection;

    if(isEditing){
        skillsSection= (
            <>
            <div className="h-6"/>
            <ProjectSkillsCard
            skills={currentSkills}
            onSkillsChange={setCurrentSkills}
            
            />
            <div  className="h-6"/>
            <ProjectSkillsTable
            skills={currentSkills.map((skill, skillId) => ({
                id: String(skillId),
                name: skill.name,
                competency: skill.competency,
                years: skill.years,
                mandatory: skill.mandatory,
              }))}
              isEditing={true}
              isDisabled={false}
              onEdit={() => {}} 
              onCancel={() => {}}
              onSave={() => {}}
            />
            <div  className="h-6"/>
            </>
        );
    }else{ 
        skillsSection= (            
          <>
            <ProjectSkillsTable
              skills={currentSkills.map((skill, skillId) => ({
                id: String(skillId),
                name: skill.name,
                competency: skill.competency,
                years: skill.years,
                mandatory: skill.mandatory,
              }))}
              isEditing = {false}
              isDisabled = { true}
              onEdit = {() =>{} }
              onCancel = { () => {} }
              onSave = { () => {} }
            />
            </>
        );
      }
      return(
        <Card style={{ padding: "20px", border: "none" }}>
            
          <div className=" flex flex-center gap-3 mb-8">
            <h3
                className="text-3xl font-bold mb-8"
                style={{ color: "var(--color-primary)" }}
              >
                Skills
              </h3>
              <div>
          {isEditing ? (
            <div className="flex gap-4">
              <button 
              onClick={handleSaveSkill} 
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
          <div className="h-2"/>
          {skillsSection}
        </Card>
      );}

