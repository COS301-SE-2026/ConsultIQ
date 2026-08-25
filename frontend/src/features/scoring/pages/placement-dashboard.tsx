import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { MatchStatsGrid } from "../components/match-stats-grid";
import { useState, useEffect, useMemo } from "react";
import { RecommendationsTable } from "../components/recommendations-table";
import type { Recommendation, MatchRunStats } from "../types/placements.types";
import type { MatchRunStatus } from "../services/placement.service";
import { getProjectById, type ProjectPlacementContext } from "../../projects/services/project.service";
import { useLocation } from "react-router-dom";
import { placementService } from "../services/placement.service";
import { useParams } from "react-router-dom";
import {toast} from "sonner";

interface RawMatchResult {
    consultantId?: string;
    id?: string;
    consultantName?: string;
    name?: string;
    consultantEmail?: string;
    email?: string;
    finalScore?: number;
    score?: number;
    rank?: number;
    factorBreakdown?: unknown[];
    isPlaced?: boolean;
}

export default function PlacementDashboard() {

    const location = useLocation();

    const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
    const [project, setProject] = useState<ProjectPlacementContext | null>(null);
    const [projectScoringBasis] = useState<'Override' | 'Default'>('Override');

    const [stats, setStats] = useState<MatchRunStats | null>(null);
    const [rawMatchData, setRawMatchData] = useState<RawMatchResult[]>(location.state?.rawMatchData ?? []);
    const [matchRunStatus, setMatchRunStatus] = useState<MatchRunStatus | null>(null);
    const [placedConsultantIds, setPlacedConsultantIds] = useState<string[]>([]);

    const recommendations = useMemo <Recommendation[]> (()=> {
        if(!rawMatchData || !Array.isArray(rawMatchData)){
            return [];
        }

        return [...rawMatchData]
            .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))
            .map((result: RawMatchResult, index: number): Recommendation => ({
                    consultantId: result.consultantId ?? result.id ?? "",
                    consultantName: result.consultantName ?? result.name ?? "Unknown Consultant",
                    consultantEmail: result.consultantEmail ?? result.email ?? "",
                    finalScore: result.finalScore ?? result.score ?? 0,
                    rank: result.rank ?? index + 1,
                    factorBreakdown: (result.factorBreakdown as Recommendation['factorBreakdown']) ?? [],
                    isPlaced: placedConsultantIds.includes(result.consultantId ?? result.id ?? "") || (result.isPlaced ?? false),
                }));
    }, [rawMatchData, placedConsultantIds]);

    console.log("URL Parameters:", { projectId, runId });

    useEffect(() => {
        let cancelled = false;
        const pollMatchRun = async () => {
            if (projectId && runId) {
                try {
                    const status = await placementService.getMatchRunStatus(projectId, runId);
                    if (cancelled) return;
                    setMatchRunStatus(status);

                    if (status.status === "COMPLETED") {
                        const [fetchedStats, fetchedResults] = await Promise.all([
                            placementService.getMatchRunStats(projectId, runId),
                            placementService.getMatchRun(projectId, runId),
                        ]);
                        if (!cancelled) {
                            setStats(fetchedStats);
                            setRawMatchData(fetchedResults);
                        }
                        return;
                    }

                    if (status.status === "FAILED") {
                        toast.error(status.errorMessage ?? "Match run failed.");
                        return;
                    }

                    window.setTimeout(pollMatchRun, 1000);
                } catch (error) {
                    console.error("Failed to fetch match run stats", error);
                    if (!cancelled) window.setTimeout(pollMatchRun, 2000);
                }
            }
        };
        void pollMatchRun();
        return () => { cancelled = true; };
    }, [projectId, runId]);
    
    useEffect(() =>{
        const loadProject = async() =>{
            if(!projectId) return;

            try{
                const projectData= await getProjectById(projectId);
                setProject(projectData);
            }catch(error){
                console.error("Failed to load project details", error);
            }
        };

        void loadProject();
    }, [projectId]);


    const projectMatched = stats?.totalMatched ?? recommendations.length;
    const projectPlaced = stats?.totalPlaced ?? recommendations.filter(r => r.isPlaced === true).length;

    const projectExcluded = stats?.totalExcluded ?? 0;
    const projectTotalEvaluated = stats?.totalEvaluated ?? (projectMatched + projectExcluded);

    const handleSelectConsultant = (consultantId: string) => {
        console.log("Selected consultant for modal view", consultantId);
    };
    const handlePlaceConsultant = async (consultantId: string) =>{
        if(!projectId || !project){
            throw new Error("Project information is missing.");
        }
        try{ 
            await placementService.createPlacement(projectId, {
            consultantId,
            startDate: project.startDate,
            endDate: project.endDate ?? undefined,
            allocation: project.allocation,
        });

        setPlacedConsultantIds((prev) => 
            prev.includes(consultantId) ? prev : [...prev, consultantId], 
        );

        setStats((currStats) => currStats ? {...currStats, totalPlaced: currStats.totalPlaced + 1,} : currStats,);
        toast.success("Consultant has been placed successfully");
    }catch(err){
        const message = err instanceof Error ? err.message : "Unable to place consultant.";
        toast.error(message);
        throw err;
    }
};

    const handleViewAll = () => {
        console.log("Viewing full list");
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
            <div className="h-screen shrink-0">
                <Sidebar items={projectManagerSidebarItems} />
            </div>
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <header
                    className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
                    style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                >
                   <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
                        Placement Dashboard</h1>
                         <span className="text-right">
                            <p className="text-lg font-medium text-slate-500 mt-1">{project?.projectName}</p>
                            {matchRunStatus?.status === "IN_PROGRESS" && (
                                <p className="text-sm text-slate-400">Scoring in progress: {matchRunStatus.progress}%</p>
                            )}
                         </span>
                </header>
                <div className="flex-1 px-[80px] py-[32px]">
                    <MatchStatsGrid
                        scoringBasis={projectScoringBasis}
                        totalEvaluated={projectTotalEvaluated}
                        matched={projectPlaced}
                        excluded={projectExcluded}
                    />
                    <RecommendationsTable
                        recommendations={recommendations}
                        onSelectConsultant={handleSelectConsultant}
                        onPlaceConsultant={handlePlaceConsultant}
                        onViewAll={handleViewAll}
                    />
                </div>

            </div>
        </div>
    )
}