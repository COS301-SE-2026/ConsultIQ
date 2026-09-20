import React, { useEffect, useState} from "react";
import { useParams } from "react-router-dom";
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

export const SkillGapPage : React.FC<SkillGapProps> =({ projectData: propProjectData, portfolioData: propPortfolioData, mode= "project" }) => {
    const { projectId } = useParams();

    const [fetchedProjectData, setFetchedProjectData] = useState<ProjectSkillGapResponse>();
    const [fetchedPortfolioData, setFetchedPortfolioData] = useState<PortfolioSkillGapResponse>();
    const [isLoading, setIsLoading] = useState(!propProjectData && !propPortfolioData);
    const [viewMode] = useState<ViewMode>( projectId ? mode : "portfolio");
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

    const isProjectView = viewMode === "project" && projectData;
    const isPortfolioView = viewMode === "portfolio" && portfolioData;

    if(isLoading){
        return <div className="p-5 text-center text-gray-500 sm:p-8">Loading skill gap analysis..</div>
    }

    if(!isPortfolioView && !isProjectView){
        return <div className="p-5 text-center text-gray-500 sm:p-8">No data available.</div>
    }

    const data = isProjectView ? projectData! : portfolioData!;
    const skills = isProjectView ? projectData!.skills : portfolioData!.skills;
    const alerts = isPortfolioView ? portfolioData!.alerts : [];
    const projectName = isProjectView ? projectData!.projectName : undefined;

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={projectManagerSidebarItems(projectId)} />
        <div className="min-w-0 flex min-h-screen flex-1 flex-col overflow-hidden">
            <header className="sticky top-0 z-20 flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white pl-16 pr-4 py-4 sm:px-6 lg:px-10"
            style={{ borderColor: "var(--color-border)"}}
            >
                <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
                            {isProjectView ? "Skill Gap Analysis" : "Portfolio Gap Overview"}
                        </h1>
                        <p className="mt-1 truncate text-sm text-gray-500 sm:text-base">
                            {projectName && `Project: ${projectName}`}
                        </p>
                    </div>
                </div>

            </header>

            <main className="min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
                        <SkillGapSummaryCards summary={data.summary} />
                    </section>

                    <section className="mb-8">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">Skill Analysis</h2>
                        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                            <div className = "min-w-0 overflow-hidden rounded-lg border bg-white p-4 sm:p-6" style={{ borderColor: "var(--color-border)" }} >
                                <h3 className="text-lg font-semibold mb-1">
                                    Required vs Actual Skills
                                </h3>
                                <p className="text-sm break-words text-gray-500 mb-4">
                                 Compares the number of consultants required for each skill with the number currently available. Available bars are coloured by coverage status.
                                </p>
                                <SkillGapBarChart  data={skills} height={320} />
                            </div>

                            <div className = "min-w-0 overflow-hidden rounded-lg border bg-white p-4 sm:p-6" style={{ borderColor: "var(--color-border)" }} >
                                <h3 className="text-lg font-semibold mb-1">
                                    Skill Gap Report
                                </h3>
                                <p className="text-sm break-words text-gray-500 mb-4">
                                    Shows coverage percentages for the top 10 skills, helping identify skills with the largest gaps across the project or portfolio.                                </p>
                                <SkillGapRadarChart  data={skills} height={320} />
                            </div>
                        </div>
                    </section>

                    {isPortfolioView && alerts.length > 0 &&(
                        <section>
                            <h2 className = "mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
                                Project Alerts ({alerts.length})
                            </h2>
                            <div className = "overflow-hidden rounded-lg border bg-white" style={{ borderColor: "var(--color-border)" }}>
                                <SkillGapAlertsList alerts={alerts} maxHeight="max-h-[28rem]" />
                            </div>
                        </section>
                    )}
                    {isPortfolioView && alerts.length === 0 && (
                        <section>
                            <div className = "rounded-lg border bg-white p-8 text-center sm:p-12" style={{ borderColor: "var(--color-border)" }} >
                                <p className="text-gray-500">No skill gaps detected across portfolio.</p>
                            </div>
                        </section>
                    )}
                    {isProjectView && (
                        <section>
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl"> Identified Skill Gaps</h2>
                            <div className="space-y-4">
                                {skills.filter(s => s.severity !== "COVERED").map((skill) =>(
                                    <div key={skill.skillName} className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
                                        <p className="text-lg font-semibold text-primary">{skill.skillName}</p>
                                        <p className="mt-1 break-words text-base text-primary/70 sm:text-lg">
                                            Need {skill.requiredCount - skill.availableCount} more consultant{skill.requiredCount - skill.availableCount !== 1 ? 's' : ''} with this skill to meet project requirements.
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