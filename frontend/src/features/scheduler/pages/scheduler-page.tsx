import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import WeekCalendar from "../components/week/week-calendar";
import UnderutilisationCard, {type ActionSuggestion} from "../components/underutilisation-card";
import { ReasonCode } from "../types/scheduler.types";
import { useState } from "react";
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
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [weekIndex, setWeekIndex] = useState(0);
    const week = FIXTURE_WEEKS[weekIndex];

    const underused = [...week.metadata.alerts, ...week.metadata.warnings].find(
        (i) => i.code === ReasonCode.UNDERUTILISED,
    );

    const dismissKey = `${week.id}:${ReasonCode.UNDERUTILISED}`;
    const showUnderused = underused && !dismissed.includes(dismissKey);

    function handleSuggestion(s:ActionSuggestion){
        switch (s.code){
            case "PLACE_UNPLACED":
            //
            case "PULL_FORWARD":
                //
            case "EXTEND_BLOCK":
                //
                break;
        }
    }


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
                    <aside className="w-80 flex-none border-r border-slate-200 bg-slate-50 flex flex-col">
                        {/* BacklogPanel Stub  */}
                    </aside>

                    {/*Week calendar*/}
                    <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
                        <div className="flex-1 overflow-auto p-4">
                            <WeekCalendar/>
                        </div>
                        {showUnderused && (
                            <div className="flex-none">
                                <UnderutilisationCard
                                    issue={underused}
                                    metadata={week.metadata}
                                    weekStart={week.weekStart}
                                    onSuggestion={handleSuggestion}
                                    onDismiss={() => setDismissed((d) => [...d, dismissKey])}
                                />

                            </div>
                        )}

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