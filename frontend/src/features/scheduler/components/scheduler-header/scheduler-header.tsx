import { type WeekContainer, type WeekMetadata, SCHEDULER_RULES } from "../../types/scheduler.types"
import type { ProjectSummary } from "../../types/scheduler.fixtures"
import { getProjectColour } from "../week/project-colour"
import { Button } from "../../../../components/ui/button"


function hours(minutes: number) {
    return (minutes / 60).toFixed(1).replace(/\.0$/, "");
}

function formatRange(weekStart: string) {
    const start = new Date(weekStart + "T00:00:00Z");
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 4);
    const dayMonth = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
    return `${dayMonth(start)} - ${dayMonth(end)} ${end.getUTCFullYear()}`;
}

interface WeekNavigatorProps {
    readonly weekStart: string;
    readonly onPrevWeek?: () => void;
    readonly onNextWeek?: () => void;
}

function WeekNavigator({ weekStart, onPrevWeek, onNextWeek }: WeekNavigatorProps) {
    const arrowClass = "w-8 h-8 p-0 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
    return (
        <div className="flex items-center gap-6">
            <div className="flex flex-col">
                <h1 className="font-bold" style={{ color: "#002D62", fontSize: "1.125rem", lineHeight: 1.3 }}>My week</h1>
                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{formatRange(weekStart)}</span>
            </div>
            <div className="flex gap-1">
                <Button variant="ghost" className={arrowClass} aria-label="Previous week" disabled={!onPrevWeek} onClick={onPrevWeek} >
                    {"\u2039"}
                </Button>
                <Button variant="ghost" className={arrowClass} aria-label="Next week" disabled={!onNextWeek} onClick={onNextWeek}>
                    {"\u203A"}
                </Button>
            </div>

        </div>
    );
}

function HoursSummary({ metadata }: { readonly metadata: WeekMetadata }) {
    const { scheduledMinutes, contractedMinutes, availableMinutes, allocatedMinutes, bufferMinutes } = metadata;
    const hardCap = SCHEDULER_RULES.hardCapMinutes;

    const scale = Math.max(hardCap * 1.1, scheduledMinutes);
    const pct = (m: number) => `${Math.min(100, (m / scale) * 100)}%`;
    const over = scheduledMinutes > contractedMinutes;
    const percentOfContract = Math.round((scheduledMinutes / contractedMinutes) * 100);

    const rows: [string, number][] = [
        ["Available", availableMinutes],
        ["Allocated", allocatedMinutes],
        ["Scheduled", scheduledMinutes],
        ["Buffer", bufferMinutes],
    ];

    return (
        <div className="relative group w-52">
            <button
                type="button"
                aria-labelledby="capacity-breakdown"
                className="w-full flex flex-col gap-1.5 text-left rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#002D62]"
            >
                <span className="w-full flex items-baseline gap-3 justify-between text-xs">
                    <span className="text-slate-500">Scheduled</span>
                    <span className={`font-semibold ${over ? "text-red-600" : "text-slate-800"}`}>
                        {hours(scheduledMinutes)}h / {hours(contractedMinutes)}h  ({percentOfContract}%)
                    </span>
                </span>

                <span className="relative block h-2 rounded-full bg-slate-100">
                    <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: pct(scheduledMinutes), backgroundColor: over ? "#DC2626" : "#002D62" }}
                    />

                    <span className="absolute -top-1 -bottom-1 w-px bg-slate-400" style={{ left: pct(contractedMinutes) }} />
                    <span className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-red-700" style={{ left: pct(hardCap) }} />

                </span>
            </button>


            <div 
                id="capacity-breakdown"
                role="tooltip"
                className="absolute top-full left-0 mt-2 z-20 hidden group-hover:block group-focus:block w-56 rounded-lg bg-white border border-slate-200 shadow-lg p-3"
            >
                {rows.map(([label, minutes]) => (
                    <div key={label} className="flex justify-between text-xs py-0.5" >
                        <span className="text-slate-500">{label}</span>
                        <span className="text-slate-800 font-medium">{hours(minutes)}h</span>
                    </div>
                ))}
                <p className="text-[10px] text-slate-400 mt-2">
                    Grey line: 40h contract &middot; Red line: 45h legal limit
                </p>
            </div>
        </div>
    );
}

interface ProjectLegendprops {
    readonly projects: SchedulerHeaderProject[];
    readonly contractedMinutes: number;
}

interface SchedulerHeaderProject extends ProjectSummary {
  allocation: number;
}

function ProjectLegend({ projects, contractedMinutes }: ProjectLegendprops) {
   
        return (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {projects.map((project) => {
                    const minutes = Math.round((project.allocation / 100) * contractedMinutes);

                    return (
                        <div key={project.id} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getProjectColour(project.id).color }} />
                            <span className=" text-slate-600">{project.name}</span>
                            <span className="text-slate-400">
                                {project.allocation}% · {hours(minutes)}h
                            </span>
                        </div>

                    );
                })}
            </div>
        );

}


export interface SchedulerHeaderProps {
    readonly week: WeekContainer;
    readonly projects: SchedulerHeaderProject[];
    readonly onPrevWeek?: () => void;
    readonly onNextWeek?: () => void;
}

export default function SchedulerHeader({
    week,
    projects,
    onPrevWeek,
    onNextWeek,
}: SchedulerHeaderProps) {
    

    return (
        <div className="w-full flex flex-wrap items-center justify-between gap-x-8 gap-y-3 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] p-4">

            <div className="justify-self-start">
                <WeekNavigator weekStart={week.weekStart} onPrevWeek={onPrevWeek} onNextWeek={onNextWeek} />
            </div>


            <div className="flex flex-col items-center gap-2 min-w-0">
                <HoursSummary metadata={week.metadata} />
                <ProjectLegend projects={projects} contractedMinutes={week.metadata.contractedMinutes} />

            </div>
        </div>
    );

}
