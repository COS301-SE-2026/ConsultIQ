

const HOURS= [8,9,10,11,12,13,14,15,16];

export default function TimeAxis() {
    return(
        <div className="w-16 flex-none border-r border-slate-200 bg-slate-50 select-none">
            {HOURS.map((hour)=> (
                <div
                    key={hour}
                    className="h-16 text-[10px] font-mono text-slate-400 text-right pr-2 border-b border-slate-100 flex items-start justify-end pt-1"
                >
                    {String(hour).padStart(2,"0")}:00
                </div>
            ))}

        </div>
    );
}