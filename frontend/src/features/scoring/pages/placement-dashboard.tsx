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
import { toast } from "sonner";
import { AlertCircle, Loader2, X } from "lucide-react";
import { ApiError } from "../../../lib/api-client";


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

const getPlacementRecoveryHint = (error: unknown): string => {
    if (error instanceof ApiError) {
        if (error.status === 400) return "Review the placement dates, allocation, consultant capacity, and budget requirements.";
        if (error.status === 403) return "Confirm that you are the project manager assigned to this project.";
        if (error.status === 404) return "Refresh the recommendations and confirm the project and consultant are still available.";
        if (error.status === 409) return "Check the project team limit, existing placements, and remaining budget.";
    }

    return "Review the placement details and try again. If the issue continues, contact support.";
};

const getPlacementErrorType = (error: unknown): string => {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("team size")) return "Team size limit";
    if (message.includes("budget exceeded") || message.includes("project budget is")) return "Budget limit";
    if (message.includes("already placed")) return "Already placed";
    if (message.includes("capacity")) return "Capacity limit";

    if (error instanceof ApiError) {
        if (error.status === 400) return "Placement requirements";
        if (error.status === 403) return "Permission error";
        if (error.status === 404) return "Project or consultant unavailable";
        if (error.status === 409) return "Placement conflict";
    }

    return "Placement error";
};

export default function PlacementDashboard() {
    const location = useLocation();

    const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
    const [project, setProject] = useState<ProjectPlacementContext | null>(null);
    const [projectScoringBasis] = useState<'Override' | 'Default'>('Override');

    const [stats, setStats] = useState<MatchRunStats | null>(null);
    const [rawMatchData, setRawMatchData] = useState<RawMatchResult[]>(location.state?.rawMatchData ?? []);
    const [matchRunStatus, setMatchRunStatus] = useState<MatchRunStatus | null>(null);
    const [placedConsultantIds, setPlacedConsultantIds] = useState<string[]>([]);
    const [placementError, setPlacementError] = useState<{ consultantName: string; rank: number; message: string; hint: string } | null>(null);

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

    const hasInitialRecommendations = rawMatchData.length > 0;
    const isMatchLoading =
        !matchRunStatus ||
        (matchRunStatus.status === "IN_PROGRESS" && !hasInitialRecommendations) ||
        (matchRunStatus.status === "COMPLETED" && stats === null);

    const handleSelectConsultant = (consultantId: string) => {
        console.log("Selected consultant for modal view", consultantId);
    };
    const handlePlaceConsultant = async (consultantId: string): Promise<boolean> => {
        const recommendation = recommendations.find((item) => item.consultantId === consultantId);
        const consultantName = recommendation?.consultantName ?? "Selected consultant";
        const rank = recommendation?.rank ?? 0;
        if (!projectId || !project) {
            setPlacementError({
                consultantName,
                rank,
                message: "Project information is missing, so the placement could not be submitted.",
                hint: "Return to the projects list and reopen this recommendation run.",
            });
            return false;
        }
        try {
            await placementService.createPlacement(projectId, {
                consultantId,
                startDate: project.startDate,
                endDate: project.endDate ?? undefined,
                allocation: project.allocation,
            });

            setPlacementError(null);

            setPlacedConsultantIds((prev) =>
                prev.includes(consultantId) ? prev : [...prev, consultantId],
            );

            setStats((currStats) => currStats ? { ...currStats, totalPlaced: currStats.totalPlaced + 1, } : currStats,);
            toast.success("Consultant has been placed successfully");
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to place consultant.";
            const hint = getPlacementRecoveryHint(err);
            setPlacementError({
                consultantName,
                rank,
                message,
                hint,
            });
            toast.error("Placement failed", {
                description: `${getPlacementErrorType(err)} (Recommendation #${rank})`,
            });
            return false;
        }
    };

    function renderMatchContent() {
        if (isMatchLoading) {
            return (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
                    <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--color-primary)" }} />
                    <div className="text-lg font-semibold text-slate-800">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Scoring consultants...
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {matchRunStatus ? `Progress: ${matchRunStatus.progress}%` : "Preparing the match run"}
                        </p>
                    </div>
                </div>
            );
        }
        if (matchRunStatus?.status === "FAILED") {
            return (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                    {matchRunStatus.errorMessage ?? "The match run failed. Please try again."}
                </div>
            );
        }

        return (
            <>
                <MatchStatsGrid
                    scoringBasis={projectScoringBasis}
                    totalEvaluated={projectTotalEvaluated}
                    matched={projectPlaced}
                    excluded={projectExcluded}
                />
                {placementError && (
                    <section role="alert" className="mb-5 flex items-start gap-3 border-l-4 border-rose-600 bg-rose-50 p-4 text-rose-950 shadow-sm">
                        <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold">Placement could not be completed</h2>
                            <p className="mt-1 text-sm font-medium">Recommendation #{placementError.rank}: {placementError.consultantName}</p>
                            <p className="mt-1 break-words text-sm">{placementError.message}</p>
                            <p className="mt-2 text-sm text-rose-800">{placementError.hint}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setPlacementError(null)}
                            aria-label="Dismiss placement error"
                            className="rounded p-1 text-rose-800 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                        >
                            <X aria-hidden="true" className="h-4 w-4" />
                        </button>
                    </section>
                )}
                <RecommendationsTable
                    recommendations={recommendations}
                    onSelectConsultant={handleSelectConsultant}
                    onPlaceConsultant={handlePlaceConsultant}
                />
            </>
        );
    }

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
                    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
                            Placement Dashboard
                        </h1>
                        <div className="text-left sm:text-right">
                            <p className="text-lg font-medium text-slate-500 lg:text-lg">{project?.projectName}</p>
                            {/* {matchRunStatus?.status === "IN_PROGRESS" && (
                            <p className="text-sm text-slate-400">Scoring in progress: {matchRunStatus.progress}%</p>
                        )} */}
                        </div>
                    </div>
                </header>
                <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-[80px] lg:py-[32px]">
                    {renderMatchContent()}
                </div>

            </div>
        </div>
    )
}