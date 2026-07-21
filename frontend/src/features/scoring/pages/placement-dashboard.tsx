import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { MatchStatsGrid } from "../components/match-stats-grid";
import { useState } from "react";
import { RecommendationsTable } from "../components/recommendations-table";
import type { Recommendation } from "../types/placements.types";


export default function PlacementDashboard(){
    const [projectScoringBasis]= useState<'Override' | 'Default'>('Override');
    const [projectTotalEvaluated]= useState<number>(26);
    const [projectMatched]= useState<number>(21);
    const [projectExcluded]= useState<number>(5);
    const [recommendations]= useState<Recommendation[]>();

    const handleSelectConsultant= (consultantId:string)=> {
        console.log("Selected consultant for modal view", consultantId);
    };

    const handleViewAll=() =>{
        console.log("Viewing full list");
    };

    return(
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="h-screen shrink-0">
          <Sidebar items={projectManagerSidebarItems}/>
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
          >
            <span><h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
                Placement Dashboard</h1>
                <p className="text-lg font-medium text-slate-500 mt-1">Project Name</p></span>
        </header>
        <div className="h-6"/>
        <div className="flex-1 px-[80px] py-[32px]">
            <MatchStatsGrid 
            scoringBasis={projectScoringBasis}
            totalEvaluated={projectTotalEvaluated}
            matched={projectMatched}
            excluded={projectExcluded}
            />
            <div className="h-6"/>
            <RecommendationsTable 
            recommendations={recommendations ?? []}
            onSelectConsultant={handleSelectConsultant}
            onViewAll={handleViewAll}
            />
        </div>
                      
        </div>
        </div>
    )
}