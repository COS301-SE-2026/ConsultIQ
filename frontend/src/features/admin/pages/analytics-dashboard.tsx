import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import AnalyticsCard from "../components/analytics-card";
import DonutChart from "../components/donut-chart";
import BarChart from "../components/bar-graph";
//import LineGraph from "../components/line-chart";
import { 
    type SkillDistributionDto,  
    type OverallUtilisationDto,
    type UtilisationBySkillDto,
    type BenchCountDto,
    type BenchBySkillDto,
    type CvParsingStatsDto,
    type PlacementsBySkillDto, 
    mockSkillDistribution,
} from "../types/admin.types";
import {
    getOverallUtilisation,
    getOverallBenchCount,
    getUtilisationBySkillCategory,
    getBenchBySkillCategory,
    getPlacementsBySkillCategory,
    getCvParsingStats,
} from "../services/admin-analytics.service";
import { formatPercent, formatFractionAsPercent, formatRate } from "../utils/percent";


export default function AnalyticsPage() {
    const [overallUtilisation, setOverallUtilisation] = useState<OverallUtilisationDto | null>(null);
    const [benchCount, setBenchCount] = useState<BenchCountDto | null>(null);
    const [utilisationBySkill, setUtilisationBySkill] = useState<UtilisationBySkillDto[]>([]);
    const [benchBySkill, setBenchBySkill] = useState<BenchBySkillDto[]>([]);
    const [placementsBySkill, setPlacementsBySkill] = useState<PlacementsBySkillDto[]>([]);
    const [cvParsingStats, setCvParsingStats] = useState<CvParsingStatsDto | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            setIsLoading(true);
            setError(null);
            
            const results = await Promise.allSettled([
                getOverallUtilisation(),
                getOverallBenchCount(),
                getUtilisationBySkillCategory(),
                getBenchBySkillCategory(),
                getPlacementsBySkillCategory(),
                getCvParsingStats(),
            ]);

            const [utilRes, benchRes, utilBySkillRes, benchBySkillRes, placementsRes, cvParsingRes] = results;

            if (utilRes.status === "fulfilled") setOverallUtilisation(utilRes.value);
            if (benchRes.status === "fulfilled") setBenchCount(benchRes.value);
            if(utilBySkillRes.status === "fulfilled") setUtilisationBySkill(utilBySkillRes.value);
            if(benchBySkillRes.status === "fulfilled") setBenchBySkill(benchBySkillRes.value);
            if(placementsRes.status === "fulfilled") setPlacementsBySkill(placementsRes.value);
            if(cvParsingRes.status === "fulfilled") setCvParsingStats(cvParsingRes.value);

            const failed = results.filter(r => r.status === "rejected");
            failed.forEach(f => console.error("Failed to load analytics data:", (f as PromiseRejectedResult).reason));
            if( failed.length > 0) {
                setError(`${failed.length} of ${results.length} analytics sections failed to load.`);
            }

            setIsLoading(false);
        };

        loadAnalytics();
    }, []);

    const mergedSkillData = utilisationBySkill.map((utilItem) => {
        const benchItem = benchBySkill.find((b) => b.category === utilItem.category);
        return {
        category: utilItem.category,
        utilised: utilItem.utilisedConsultants,
        bench: benchItem ? benchItem.benchCount : 0,
        total: utilItem.totalConsultants,
        utilisationPercent: utilItem.utilisationPercent,
        };
    });

    const CvchartData = cvParsingStats 
        ? [
            { name: "Successful", value: cvParsingStats.successCount },
            { name: "Failed", value: cvParsingStats.failedCount },
        ]
        : [];
    
    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={adminSidebarItems} />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto  gap-4">
                <header
                    className="shrink-0 z-20 bg-white border-b h-22.5 flex  flex-col p-4 justify-start w-full"
                    style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                >
                    <h1 className="font-bold text-3xl" style={{ color: "var(--color-primary)" }}>
                        Analytics Dashboard
                    </h1>
                    <p className="text-[13px] text-[#6b7280] ">
                        Internal consultant pool — Internal consultant pool — {overallUtilisation?.totalConsultants ?? 0} consultants total </p>
                </header>

                <main className="flex-1 overflow-y-auto  overscroll-none relative ">
                    <div className=" flex flex-col gap-8  max-w-[1600px] mx-auto w-full pb-12 px-[80px] mt-6" >
                        {error && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                                {error}
                            </div>
                        )}

                        {isLoading ? (
                            <p className="text-sm text-[#6b7280]">Loading analytics…</p>
                            ) : (
                            <>
                            <section className="space-y-3">
                                <h3 className="text-[14px] text-[#6b7280] uppercase tracking-wider">Genral Overview</h3>
                                <div className="grid w-full grid-cols-1 gap-4 gap-x-8 transition-all sm:grid-cols-2 xl:grid-cols-4 ">
                                    <AnalyticsCard 
                                        label="Overall Utilisation" 
                                        value={formatPercent(overallUtilisation?.utilisationPercent ?? 0, 1)}
                                    />
                                    <AnalyticsCard 
                                        label="Consultants on bench" 
                                        value={benchCount?.count ?? 0} 
                                        valueKey="consultants"
                                    />
                                    {/*Siya's part*/}
                                    <AnalyticsCard 
                                        label="Placements YTD" 
                                        value={195} 
                                    />
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-[14px] text-[#6b7280] uppercase tracking-wider">CV Parsing</h3>
                                <div className="grid w-full grid-cols-1 gap-4 gap-x-8 transition-all sm:grid-cols-2 xl:grid-cols-4 ">
                                    <AnalyticsCard 
                                        label="Total CVs processed" 
                                        value={cvParsingStats?.totalProcessed ?? 0}
                                        variant="gold" 
                                        valueKey="Cvs" 
                                    />
                                    <AnalyticsCard 
                                        label="Cv parsing success rate" 
                                        value={formatRate(cvParsingStats?.successCount ?? 0, cvParsingStats?.totalProcessed ?? 0)}
                                        variant="gold" 
                                    />
                                    <AnalyticsCard 
                                        label="Average confidence" 
                                        value={formatFractionAsPercent(cvParsingStats?.averageConfidence ?? 0)} 
                                        variant="gold"
                                    />
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-[14px] text-[#6b7280] uppercase tracking-wider">Pool analytics & breakdown</h3>
                                <div className="grid w-full grid-cols-1 md:grid-cols-2  xl:grid-cols-3 gap-6">
                                    <DonutChart<SkillDistributionDto>
                                        title="Skill Distribution"
                                        data={mockSkillDistribution} //Siya's part
                                        dataKey="consultantCount"
                                        nameKey="category"
                                        valueToString={(v) => `${v} consultants`}
                                    />

                                    <DonutChart
                                        title="CV success vs failure rate"
                                        data={CvchartData}
                                        dataKey="value"
                                        nameKey="name"
                                        valueToString={(v) => `${v} consultants`}
                                    />

                                    <BarChart
                                        title= "Utilisation vs Bench"
                                        data= {mergedSkillData}
                                        xAxisKey="category"
                                        bars={[
                                            {dataKey:"utilised",label:"Utilised"},
                                            {dataKey:"bench",label:"Benched"},
                                        ]}
                                    />

                                    <BarChart<PlacementsBySkillDto>
                                        title= "Placements per skill"
                                        data= {placementsBySkill}
                                        xAxisKey="category"
                                        bars={[
                                            {dataKey:"placementCount",label:"placements"},
                                        ]}
                                    />

                                    {/* <LineGraph
                                        title="placement by Skill category overtime"
                                        data= {mockPlacementsBySkillOverTime}
                                        xAxisKey="month"
                                        lines={[
                                            {dataKey:"Cloud & DevOps"},
                                            {dataKey:"Backend"},
                                            {dataKey:"Frontend"},
                                            {dataKey:"Data & AI"},
                                            {dataKey:"QA & Testing"},
                                        ]}
                                        className="md:col-span-1 xl:col-span-2"
                                    /> */}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    </div>
    );
}