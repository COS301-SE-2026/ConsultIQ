import {useSyncExternalStore} from "react"
import { blockTop,instantToLocalDate,instantToLocalTime } from "../../utils/scheduler.utils"

interface NowIndicatorProps{
    date: string;
    timezone: string;
}

function subscribe(onChange: () => void){
    const id= setInterval(onChange, 10_000);
    return () => clearInterval(id);
}

function getCurrentMinute(){
    return Math.floor(Date.now() / 60_000);
}


export default function NowIndicator({date, timezone}:NowIndicatorProps){
    const minute = useSyncExternalStore(subscribe,getCurrentMinute);
    const iso = new Date(minute * 60_000).toISOString();

    if(instantToLocalDate(iso, timezone) !== date) return null;

    const time= instantToLocalTime(iso, timezone);

    return(
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: blockTop(time) }}>
            <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full -ml-1.5 shadow-sm" style={{ backgroundColor: "#ef4444" }} />
                <div className="flex-1" style={{ borderTop: "1.5px solid #ef4444", opacity: 0.85 }}/>
            </div>
        </div>
    );


}