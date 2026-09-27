import { DAY_START_HOUR, DAY_END_HOUR, CORE_END_HOUR, CORE_START_HOUR, ROW_HEIGHT_PX } from "../../utils/scheduler.utils";

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

export default function TimeAxis() {
    return (
        <div  className="w-16 flex-none border-r border-slate-200 select-none sticky left-0 z-30 bg-white">
            {HOURS.map((hour) => {
                const core = hour >= CORE_START_HOUR && hour < CORE_END_HOUR;
                return (
                    <div
                        key={hour}
                        className={`h-16 text-[10px] font-mono text-right text-slate-400  pr-2 border-b border-slate-100 ${core ? "bg-white text-slate-500" : "bg-slate-50 text-slate-300"} pt-1`}
                        style={{height: ROW_HEIGHT_PX}}
                    >
                        {String(hour).padStart(2, "0")}:00
                    </div>
                );

            })}

        </div>
    );
}