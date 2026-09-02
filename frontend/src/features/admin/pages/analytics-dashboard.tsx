import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import AnalyticsCard from "../components/analytics-card";
import DonutChart from "../components/donut-chart";
import BarChart from "../components/bar-graph";
import LineGraph from "../components/line-chart";
import { type SkillDistributionDto, mockSkillDistribution, CvchartData, mergedSkillData, type PlacementsBySkillDto, mockPlacementsBySkill, mockPlacementsBySkillOverTime } from "../types/admin.types";


export default function AnalyticsPage() {
    

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
                    {/* create a state vairable that will represent total consultants */}
                    <p className="text-[13px] text-[#6b7280] ">Internal consultant pool — 0 consultants total </p>
                </header>


                <main className="flex-1 overflow-y-auto  overscroll-none relative ">
                    <div className=" flex flex-col gap-8  max-w-[1600px] mx-auto w-full pb-12 px-[80px] mt-6" >

                        <section className="space-y-3">
                            <h3 className="text-[14px] text-[#6b7280] uppercase tracking-wider">Genral Overview</h3>
                            <div className="grid w-full grid-cols-1 gap-4 gap-x-8 transition-all sm:grid-cols-2 xl:grid-cols-4 ">
                                <AnalyticsCard label="Overall Utilisation" value="50%" />
                                <AnalyticsCard label="Consultants on bench" value={5} valueKey="consultants"/>
                                <AnalyticsCard label="Placements YTD" value={195} />
                               
                            </div>

                        </section>



                        <section className="space-y-3">
                            <h3 className="text-[14px] text-[#6b7280] uppercase tracking-wider">CV Parsing</h3>
                            <div className="grid w-full grid-cols-1 gap-4 gap-x-8 transition-all sm:grid-cols-2 xl:grid-cols-4 ">
                                <AnalyticsCard label="Total CVs processed" value="230" variant="gold" valueKey="Cvs" />
                                <AnalyticsCard label="Cv parsing success rate" value="94%" variant="gold" />
                                <AnalyticsCard label="Average confidence" value="95%" variant="gold" />
                            </div>

                        </section>

                        <section className="space-y-3">
                            <h3 className="text-[14px] text-[#6b7280] uppercase tracking-wider">Pool analytics & breakdown</h3>
                            <div className="grid w-full grid-cols-1 md:grid-cols-2  xl:grid-cols-3 gap-6">
                                <DonutChart<SkillDistributionDto>
                                    title="Skill Distribution"
                                    data={mockSkillDistribution}
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
                                    data= {mockPlacementsBySkill}
                                    xAxisKey="category"
                                    bars={[
                                        {dataKey:"placementCount",label:"placements"},
                                    ]}
                                />

                                <LineGraph
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
                                />


                            </div>

                        </section>






                    </div>
                </main>

            </div>




        </div>
    );
}