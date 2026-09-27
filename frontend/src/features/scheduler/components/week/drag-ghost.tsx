import {blockTop, blockHeight, minutesToTime} from "../../utils/scheduler.utils"


interface DropGhostProps{
    readonly startMin: number;
    readonly durationMin: number;
    readonly colour: string;
}

export default function DropGhost({startMin, durationMin, colour}:DropGhostProps){
    const start= minutesToTime(startMin);
    const end= minutesToTime(startMin + durationMin);

    return(
        <div
            className="absolute left-0.5 right-0.5 rounded-md pointer-events-none z-30"
            style={{
                top: blockTop(start),
                height: blockHeight(start, end),
                border: `2px dashed ${colour}`,
                background: colour + "18"

            }}
        >

            <div className="px-2 py-1 text-[10px] font-bold "   style={{color:colour}}>
                {start} - {end}
            </div>
        </div>
    );
}