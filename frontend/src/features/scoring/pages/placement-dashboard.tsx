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
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";


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
    const navigate = useNavigate();

    const location = useLocation();

    const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
    const [project, setProject] = useState<ProjectPlacementContext | null>(null);
    const [projectScoringBasis] = useState<'Override' | 'Default'>('Override');

    const [stats, setStats] = useState<MatchRunStats | null>(null);
    const [rawMatchData, setRawMatchData] = useState<RawMatchResult[]>(location.state?.rawMatchData ?? []);
    const [matchRunStatus, setMatchRunStatus] = useState<MatchRunStatus | null>(null);
    const [placedConsultantIds, setPlacedConsultantIds] = useState<string[]>([]);

    const recommendations = useMemo<Recommendation[]>(() => {
        if (!rawMatchData || !Array.isArray(rawMatchData)) {
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

    useEffect(() => {
        if (!projectId || !runId) return;

        let cancelled = false;

        const handleCompletedRun = async () => {
            const [fetchedStats, fetchedResults] = await Promise.all([
                placementService.getMatchRunStats(projectId, runId),
                placementService.getMatchRun(projectId, runId),
            ]);

            if (!cancelled) {
                setStats(fetchedStats);
                setRawMatchData(fetchedResults);
            }
        };

        const pollMatchRun = async () => {
            if (cancelled) return;

            try {
                const status = await placementService.getMatchRunStatus(projectId, runId);
                if (cancelled) return;

                setMatchRunStatus(status);

                if (status.status === "COMPLETED") {
                    await handleCompletedRun();
                    return;
                }

                if (status.status === "FAILED") {
                    toast.error(status.errorMessage ?? "Match run failed.");
                    return;
                }


                window.setTimeout(pollMatchRun, 1000);
            } catch (error) {
                console.error("Failed to fetch match run status", error);

                if (!cancelled) window.setTimeout(pollMatchRun, 2000);
            }
        };

        void pollMatchRun();

        return () => { cancelled = true; };
    }, [projectId, runId]);

    useEffect(() => {
        const loadProject = async () => {
            if (!projectId) return;

            try {
                const projectData = await getProjectById(projectId);
                setProject(projectData);
            } catch (error) {
                console.error("Failed to load project details", error);
            }
        };

        void loadProject();
    }, [projectId]);


    const projectMatched = stats?.totalMatched ?? recommendations.length;
    const projectPlaced = stats?.totalPlaced ?? recommendations.filter(r => r.isPlaced === true).length;

    const projectExcluded = stats?.totalExcluded ?? 0;
    const projectTotalEvaluated = stats?.totalEvaluated ?? (projectMatched + projectExcluded);

    const isMatchLoading = !matchRunStatus || matchRunStatus.status === "IN_PROGRESS" || (matchRunStatus.status === "COMPLETED" && stats === null);

    const handleSelectConsultant = (consultantId: string) => {
        console.log("Selected consultant for modal view", consultantId);
    };
    const handlePlaceConsultant = async (consultantId: string) => {
        if (!projectId || !project) {
            navigate("/projects", {replace: true});
            throw new Error("Project information is missing.");
        }
        try {
            await placementService.createPlacement(projectId, {
                consultantId,
                startDate: project.startDate,
                endDate: project.endDate ?? undefined,
                allocation: project.allocation,
            });

            setPlacedConsultantIds((prev) =>
                prev.includes(consultantId) ? prev : [...prev, consultantId],
            );

            setStats((currStats) => currStats ? { ...currStats, totalPlaced: currStats.totalPlaced + 1, } : currStats,);
            toast.success("Consultant has been placed successfully");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to place consultant.";
            toast.error(message);
            throw err;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--color-surface)] lg:flex-row">
            <div className="h-screen shrink-0">
                <Sidebar items={projectManagerSidebarItems(projectId, runId)} />
            </div>
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <header
                    className="flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-4 border-b bg-white pl-16 pr-4 py-4 sm:px-6 lg:px-10"
                    style={{ borderColor: "var(--color-border)", minHeight: "90px" }}
                >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
                        Placement Dashboard
                    </h1>
                    <div className="text-left sm:text-right">
                        <p className="text-lg font-medium text-slate-500 lg:text-lg">{project?.projectName}</p>
                        {matchRunStatus?.status === "IN_PROGRESS" && (
                            <p className="text-sm text-slate-400">Scoring in progress: {matchRunStatus.progress}%</p>
                        )}
                    </div>
                   </div>
                </header>
                <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-[80px] lg:py-[32px]">
                 {isMatchLoading ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
                        <Loader2 className="h-10 w-10 animate-spin" style={{color: "var(--color-primary)"}}/>
                        <div className="text-lg font-semibold text-slate-800">
                            <h2 className="text-lg font-semibold text-slate-800">
                                Scoring consultants...
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {matchRunStatus ? `Progress: ${matchRunStatus.progress}%` : "Preparing the match run"}
                            </p>
                        </div>
                    </div>
                 ) : matchRunStatus?.status === "FAILED" ?(
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                        {matchRunStatus.errorMessage ?? "The match run failed. Please try again."}
                    </div>
                 ) : (
                 <>
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
                />
                </>
            )}   
                </div>

            </div>
        </div>
    )
}