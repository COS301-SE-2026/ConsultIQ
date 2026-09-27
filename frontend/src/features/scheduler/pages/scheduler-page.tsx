import { useState } from "react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import WeekCalendar from "../components/week/week-calendar";
import BacklogPanel, { type BacklogProjectOption } from "../components/backlog-panel";
//import BlockDetailPanel from "../components/block-detail-panel";    
import { designWeek, FIXTURE_NOW, FIXTURE_PROJECTS } from "../types/scheduler.fixtures";

const projectColors = ["#2563eb", "#059669", "#d97706"];

const projects: BacklogProjectOption[] = FIXTURE_PROJECTS.map(
    (project, index) => ({
        id: project.id,
        label: project.name,
        clientName: project.clientName,
        color: projectColors[index % projectColors.length]
    }),
);

export default function SchedulerPage() {
    const [backlogCollapsed, setBacklogCollapsed] = useState(false);
    //const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => designWeek.blocks[0]?.id ?? null );
    //const selectedBlock = designWeek.blocks.find((block) => block.id === selectedBlockId);

    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantSidebarItems} />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 flex-none border-b border-slate-200 bg-white px-6 flex items-center justify-between">
                    <h1 className="font-bold text-slate-800">Scheduler Header</h1>
                </header>

                {/* Three vertical sections */}
                <div className="flex-1 flex min-h-0 overflow-hidden">

                    {/* Backlog panel */}
                    <BacklogPanel 
                        tasks={designWeek.tasks.filter((task) => task.placement === "unplaced")}
                        unplacedSummaries={designWeek.metadata.unplaced}
                        projects={projects}
                        now={Date.parse(FIXTURE_NOW)}
                        expectedVersion={designWeek.version}
                        collapsed={backlogCollapsed}
                        onToggleCollapse={() => setBacklogCollapsed((collapsed) => !collapsed)}
                        onAddTask={() => {}}
                        onSchedule={() => {}}
                        onResolveDeadline={() => {}}
                        onDeferToNextWeek={() => {}}
                        onDismiss={() => {}}
                    />

                    {/*Week calendar*/}
                    <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                        <div className="flex-1 overflow-auto p-4">
                            <WeekCalendar/>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                            <div className="pointer-events-auto z-90 bg-amber-500 text-white p-3 rounded-lg shadow-lg">
                                Alert Banner
                            </div>
                        </div>
                    </main>

                    {/* BlockDetail panel */}
                    <aside className="w-80 flex-none border-l border-slate-200 bg-slate-50 flex flex-col">
                        {/* BlockDetailPanel Stub  */}
                    </aside>

                </div>

            </div>


        </div>
    );
}