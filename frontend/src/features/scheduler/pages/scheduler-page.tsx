import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import WeekCalendar from "../components/week/week-calendar";
import { useState } from "react";
import SchedulerHeader from "../components/scheduler-header/scheduler-header";
import {
    FIXTURE_PROJECTS,
    designWeek,
    holidayWeek,
    leaveWeek,
    batchWeek,
    emptyWeek,
    underusedWeek

} from "../types/scheduler.fixtures";

const FIXTURE_WEEKS = [designWeek, holidayWeek, leaveWeek, batchWeek, emptyWeek, underusedWeek];




export default function SchedulerPage() {
    const [weekIndex, setWeekIndex] = useState(0);
    const [backlogOpen, setBacklogOpen] = useState(true);
    const [creatingEntry, setCreatingEntry] = useState(false);

    const week = FIXTURE_WEEKS[weekIndex];
    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantSidebarItems} />

            <div className="flex-1 flex flex-col min-w-0">
                <header className=" flex-none border-b border-slate-200 bg-white px-6 ">
                    <SchedulerHeader
                        week={week}
                        projects={FIXTURE_PROJECTS}
                        backlogOpen={backlogOpen}
                        onPrevWeek={weekIndex > 0 ? () => setWeekIndex((i) => i - 1) : undefined}
                        onNextWeek={weekIndex < FIXTURE_WEEKS.length - 1 ? () => setWeekIndex((i) => i + 1) : undefined}
                        onToggleBacklog={() => setBacklogOpen((o) => !o)}
                        onAddEvent={() => setCreatingEntry(true)}
                    />
                </header>

                {/* Three vertical sections */}
                <div className="flex-1 flex min-h-0 overflow-hidden">

                    {/* Backlog panel */}
                    {backlogOpen && (
                        <aside className="w-72 flex-none border-r border-slate-200 bg-slate-50 flex flex-col">
                            {/* BacklogPanel Stub  */}
                        </aside>
                    )}


                    {/*Week calendar*/}
                    <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                        <div className="flex-1 overflow-auto p-4">
                            <WeekCalendar
                                key={week.id}
                                weekData={week}
                                createEntryRequested={creatingEntry}
                                onCreateEntryDone={() => setCreatingEntry(false)}
                            />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                            <div className="pointer-events-auto z-90 bg-amber-500 text-white p-3 rounded-lg shadow-lg">
                                Alert Banner
                            </div>
                        </div>
                    </main>

                    {/* BlockDetail panel */}
                    <aside className="w-72 flex-none border-l border-slate-200 bg-slate-50 flex flex-col">
                        {/* BlockDetailPanel Stub  */}
                    </aside>

                </div>

            </div>


        </div>
    );
}