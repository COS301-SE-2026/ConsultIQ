import React, { useEffect, useState} from "react";
import { useParams } from "react-router-dom";
import { Filter, Home} from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import type { ProjectSkillGapResponse, PortfolioSkillGapResponse} from "../types/skill-gap.types";
import { SkillGapSummaryCards } from "../components/skills-gap-summary-cards";
import { SkillGapBarChart } from "../components/skills-gap-bar-chart";
import { SkillGapRadarChart } from "../components/skills-gap-radar-chart";
import { SkillGapAlertsList } from "../components/skills-gap-alert-list";
import { getProjectSkillGap, getPortfolioSkillGap } from "../services/skill-gap.service";
import {toast} from "sonner";

type ViewMode = "project" | "portfolio";

interface SkillGapProps {
    readonly projectData?: ProjectSkillGapResponse;
    readonly portfolioData?: PortfolioSkillGapResponse;
    readonly mode?: ViewMode;
    readonly onViewModeChange?: (mode: ViewMode) => void;
    readonly onBack?: () => void;
}

export const SkillGapPage : React.FC<SkillGapProps> =({ projectData: propProjectData, portfolioData: propPortfolioData, mode= "project", onViewModeChange }) => {
    const { projectId } = useParams();

    const [fetchedProjectData, setFetchedProjectData] = useState<ProjectSkillGapResponse>();
    const [fetchedPortfolioData, setFetchedPortfolioData] = useState<PortfolioSkillGapResponse>();
    const [isLoading, setIsLoading] = useState(!propProjectData && !propPortfolioData);
    const [viewMode, setViewMode] = useState<ViewMode>(mode);
    const projectData = propProjectData ?? fetchedProjectData;
    const portfolioData = propPortfolioData ?? fetchedPortfolioData;

    useEffect(() => {
        if(propProjectData || propPortfolioData){
            return;
        }

        const loadData = async () =>{
            try {
                setIsLoading(true);

                if(projectId){
                    const data = await getProjectSkillGap(projectId);
                    console.log("Project skill gap data: ", data);
                    setFetchedProjectData(data);
                    setFetchedPortfolioData(undefined);
                } else {
                    const data = await getPortfolioSkillGap();
                    setFetchedPortfolioData(data);
                    setFetchedProjectData(undefined);
                }
              } catch{
                    toast.error("Failed to load skill gap data");
                    setIsLoading(false)
                } finally {
                    setIsLoading(false);
                }
        };
        loadData();
    },[projectId, propProjectData, propPortfolioData]);

    const handleModeChange = async (newMode: ViewMode) =>{
        if(newMode === "portfolio" && !portfolioData){
            try {
                setIsLoading(true);
                const data = await getPortfolioSkillGap();
                setFetchedPortfolioData(data);
            }catch{
                toast.error("Failed to load portfolio skill gap data.");
            }finally {
                setIsLoading(false);
            }
        }
        
        setViewMode(newMode);
        onViewModeChange?.(newMode);
    };

    const isProjectView = viewMode === "project" && projectData;
    const isPortfolioView = viewMode === "portfolio" && portfolioData;

    if(isLoading){
        return <div className="p-8 text-center text-gray-500">Loading skill gap analysis..</div>
    }

    if(!isPortfolioView && !isProjectView){
        return <div className="p-8 text-center text-gray-500">No data available.</div>
    }

    const data = isProjectView ? projectData! : portfolioData!;
    const skills = isProjectView ? projectData!.skills : portfolioData!.skills;
    const alerts = isPortfolioView ? portfolioData!.alerts : [];
    const projectName = isProjectView ? projectData!.projectName : undefined;

    return (
        <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={projectManagerSidebarItems} />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
            style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
            >
                <div className="flex items-center gap-4">
                    
                    <div>
                        <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
                            {isProjectView ? "Skill Gap Analysis" : "Portfolio Gap Overview"}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {projectName && `Project: ${projectName}`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {projectData && (
                        <button onClick={() => handleModeChange("project")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                            viewMode === "project" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`} 
                            >
                            <Home size={16} className="inline mr-2"/>
                            This Project
                        </button>
                    )}
                
                        <button onClick={() => handleModeChange("portfolio")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                            viewMode === "portfolio" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`} 
                            >
                            <Filter size={16} className="inline mr-2"/>
                            Portfolio
                        </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto py-8 w-full" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
                        <SkillGapSummaryCards summary={data.summary} />
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Skill Analysis</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className = "bg-white p-6 rounded-lg border" style={{ borderColor: "var(--color-border)" }} >
                                <h3 className="text-lg font-semibold mb-1">
                                    Required vs Actual Skills
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                 Compares the number of consultants required for each skill with the number currently available. Available bars are coloured by coverage status.
                                </p>
                                <SkillGapBarChart  data={skills} height={400} />
                            </div>

                            <div className = "bg-white p-6 rounded-lg border" style={{ borderColor: "var(--color-border)" }} >
                                <h3 className="text-lg font-semibold mb-1">
                                    Skill Gap Report
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Shows coverage percentages for the top 10 skills, helping identify skills with the largest gaps across the project or portfolio.                                </p>
                                <SkillGapRadarChart  data={skills} height={400} />
                            </div>
                        </div>
                    </section>

                    {isPortfolioView && alerts.length > 0 &&(
                        <section>
                            <h2 className = "text-xl font-semibold text-gray-900 mb-4">
                                Project Alerts ({alerts.length})
                            </h2>
                            <div className = "bg-white rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                                <SkillGapAlertsList alerts={alerts} maxHeight="max-h-96" />
                            </div>
                        </section>
                    )}
                    {isPortfolioView && alerts.length === 0 && (
                        <section>
                            <div className = "bg-white p-12 rounded-lg border text-center" style={{ borderColor: "var(--color-border)" }} >
                                <p className="text-gray-500">No skill gaps detected across portfolio.</p>
                            </div>
                        </section>
                    )}
                    {isProjectView && (
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4"> Recommended Actions</h2>
                            <div className="space-y-4">
                                {skills.filter(s => s.severity !== "COVERED").map((skill) =>(
                                    <div key={skill.skillName} className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                        <p className="text-lg font-semibold text-primary">{skill.skillName}</p>
                                        <p className="text-lg text-primary/70 mt-1">
                                            Need {skill.requiredCount - skill.availableCount} more consultant{skill.requiredCount - skill.availableCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )

                    }
                </div>
            </main>
        </div>
    </div>
    );
};