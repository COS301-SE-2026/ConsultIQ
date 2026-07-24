import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { MatchStatsGrid } from "../components/match-stats-grid";
import { useState, useMemo, useEffect } from "react";
import { RecommendationsTable } from "../components/recommendations-table";
import type { Recommendation, MatchRunStats } from "../types/placements.types";
import { useLocation } from "react-router-dom";
import { placementService } from "../services/placement.service";
import { useParams } from "react-router-dom";


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
    const [projectScoringBasis] = useState<'Override' | 'Default'>('Override');

    const [stats, setStats] = useState<MatchRunStats | null>(null);
    const rawMatchData = location.state?.rawMatchData;

    const recommendations = useMemo<Recommendation[]>(() => {
        if (rawMatchData && Array.isArray(rawMatchData)) {
            return rawMatchData.map((result: RawMatchResult, index: number) => ({
                consultantId: result.consultantId || result.id || "",
                consultantName: result.consultantName || result.name || "Unknown Consultant",
                consultantEmail: result.consultantEmail || result.email || "",
                finalScore: result.finalScore || result.score || 0,
                rank: result.rank || index + 1,
                factorBreakdown: (result.factorBreakdown as Recommendation['factorBreakdown']) || [],
                isPlaced: result.isPlaced || false
            }));
        }
        return [];
    }, [rawMatchData]);

    useEffect(() => {
        const fetchStats = async () => {
            if (projectId && runId) {
                try {
                    const fetchedStats = await placementService.getMatchRunStats(projectId, runId);
                    setStats(fetchedStats);
                } catch (error) {
                    console.error("Failed to fetch match run stats", error);
                }
            }
        };
        fetchStats();
    }, [location.state, projectId, runId])



    const projectMatched = stats?.totalMatched ?? recommendations.length;
    const projectPlaced = stats?.totalPlaced ?? recommendations.filter(r => r.isPlaced === true).length;

    const projectExcluded = stats?.totalExcluded ?? 0;
    const projectTotalEvaluated = stats?.totalEvaluated ?? (projectMatched + projectExcluded);


    const handleSelectConsultant = (consultantId: string) => {
        console.log("Selected consultant for modal view", consultantId);
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
                         {/* <span><p className="text-lg font-medium text-slate-500 mt-1">Project Name</p></span> */}
                </header>
                <div className="h-6" />
                <div className="flex-1 px-[80px] py-[32px]">
                    <MatchStatsGrid
                        scoringBasis={projectScoringBasis}
                        totalEvaluated={projectTotalEvaluated}
                        matched={projectPlaced}
                        excluded={projectExcluded}
                    />
                    <div className="h-6" />
                    <RecommendationsTable
                        recommendations={recommendations}
                        onSelectConsultant={handleSelectConsultant}
                        onViewAll={handleViewAll}
                    />
                </div>

            </div>
        </div>
    )
}