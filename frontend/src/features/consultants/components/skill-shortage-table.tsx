import { Card } from "../../../components/ui/card";
import { ChevronDown } from "lucide-react";
import { type TeamSkillDemandItem } from "../types/consultant.types";
import { Fragment, useState } from "react";


interface SkillShortageTableProps {
    readonly skills: TeamSkillDemandItem[];
}


const projects = (n: number) => (n === 1 ? "project": "projects");


const panelIdFor = (skillName: string) =>
    `trainees-${skillName.replace(/\s+/g,"-").toLowerCase()}`;

function ColumnHeader({label}: {readonly label: string}){
    return(
        <th scope="col" className="px-4 py-4 text-right text-sm font-semibold text-[#4B5563]">
            {label}
        </th>
    );
}


function TraineeList({ skill }: { readonly skill: TeamSkillDemandItem }) {
    const trainees = skill.consultantsNeedingTraining;

    if (trainees.length === 0) {
        return <p className="text-sm text-[#6B7280]">No consultants identified for this skill yet.</p>
    }

    return (
        <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Consultants to train ({trainees.length})
            </p>

            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#F4F6F9]">
                        <tr>
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                                Full Name
                            </th>
                            {/* <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                                Surname
                            </th> */}
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                                Email
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {trainees.map((c) => (
                            <tr key={c.consultantId}>
                                <td className="px-4 py-3 text-[#1F2937]">{c.fullName}</td>
                                <td className="px-4 py-3">{c.email}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

    );
}



export default function SkillShortageTable({skills }: SkillShortageTableProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());


    const toggleRow = (skillName: string) =>{
        setExpanded((prev) => {
            const next = new Set(prev);
            if(next.has(skillName)) next.delete(skillName);
            else next.add(skillName);
            return next;
        });

    }
    return (
        <Card className="gap-0 overflow-hidden rounded-lg border border-gray-200 border-t-4 border-t-[#0B2F63] bg-white p-0 shadow-sm">
            <div className="px-8 pt-8">
                <p className="text-lg font-bold uppercase tracking-widest text-[#0B2F63]">
                    Bench intelligence
                </p>
                <p className="mt-2 text-xl text-[#6B7280]">Skill shortage ranking</p>
            </div>

            {skills.length === 0 ? (
                <p className="px-8 py-12 text-center text-base text-[#6B7280]">
                    No skill shortages on the bench right now.
                </p>
            ):(
                <div className="mt-6 overflow-x-auto px-8 pb-6">
                    <table className="w-full min-w-160 border-collapse">
                        <thead>
                        <tr className="border-b border-gray-200">
                            <th
                                scope="col"
                                className="py-4 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[#4B5563]"

                            >
                                Skill
                            </th>
                            <ColumnHeader label="Demand" />
                            <ColumnHeader label="Uncovered" />
                             <ColumnHeader label="Supply" />
                            <ColumnHeader label="To train"/>
                            <th scope="col" className="w-12">
                                <span className="sr-only">Expand</span>
                            </th>
                        </tr>
                        </thead>

                        <tbody>
                            {skills.map((skill) => {
                                const isOpen = expanded.has(skill.skillName);
                                const panelId = panelIdFor(skill.skillName);

                                return(
                                    <Fragment key={skill.skillName}>
                                        <tr
                                            onClick={() => toggleRow(skill.skillName)}
                                            className="cursor-pointer border-b border-gray-200 transition-colors hover:bg-[#F9FAFB]"                                        
                                        >
                                            <th scope="row" className="py-5 pr-4 text-left">
                                                <span className="text-base font-bold text-[#0B2F63]">{skill.skillName}</span>
                                            </th>
                                            <td className="px-4 py-5 text-right">
                                                <span className="text-base text-[#1F2937]">{skill.projectsRequiringSkill}</span>
                                                <span className="ml-1.5 text-sm text-[#6B7280]">
                                                    {projects(skill.projectsRequiringSkill)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 text-right">
                                                <span className="text-base text-[#1F2937]">{skill.uncoveredProjectCount}</span>
                                                <span className="ml-1.5 text-sm text-[#6B7280]">
                                                    {projects(skill.uncoveredProjectCount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 text-right text-base text-[#0B2F63]">
                                                {skill.supply}
                                            </td>
                                             <td className="px-4 py-5 text-right text-base text-[#0B2F63]">
                                                {skill.trainingGap}
                                            </td>
                                            <td className="py-5 pl-2 text-right">
                                                <button
                                                    type="button"
                                                    aria-expanded={isOpen}
                                                    aria-controls={panelId}
                                                    className="rounded p-1 hover:bg-gray-100"
                                                >
                                                    <ChevronDown
                                                        className={`h-5 w-5 text-[#6B7280] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                                        aria-hidden="true"
                                                        
                                                    />
                                                    <span className="sr-only">
                                                        {isOpen ? "Hide" : "Show"} consultants to train for {skill.skillName}

                                                    </span>

                                                </button> 
                                            </td>
                                        </tr>

                                        {isOpen && (
                                            <tr id={panelId} className="border-b border-gray-200 bg-[#F9FAFB]">
                                                <td colSpan={6} className="px-4 py-5">
                                                    <TraineeList skill={skill }/>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                </div>
            )}
        </Card>
    );

}