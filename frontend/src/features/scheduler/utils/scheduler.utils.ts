import type {Interval, Task} from "../types/scheduler.types";

export type LocalDate = string; // nosonar
export type LocalTime = string; // nosonar

export const DAY_START_HOUR=0;
export const DAY_END_HOUR=24;
export const CORE_START_HOUR=7;
export const CORE_END_HOUR=16;


export const CORE_START_TIME: LocalTime = `${String(CORE_START_HOUR).padStart(2, "0")}:00`;
export const CORE_END_TIME: LocalTime = `${String(CORE_END_HOUR).padStart(2, "0")}:00`;

export const TOTAL_DAY_MINUTES=24 * 60;
export const ROW_HEIGHT_PX=64;

export function instantToLocalTime(instant: string, timeZone: string): LocalTime{
    return new Date(instant).toLocaleTimeString("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
}

export function localDate(instant: string, timezone: string): string {
    return new  Date(instant).toLocaleDateString("en-CA",{timeZone: timezone});
}

export function instantToLocalDate(instant: string, timeZone: string): LocalDate {
    return new  Date(instant).toLocaleDateString("en-CA",{timeZone});
}


export function timeToMinutes(timeStr: LocalTime): number{
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): LocalTime{
    const snapped= Math.round(minutes/15) *15;
    const clamped= Math.max(0,Math.min(TOTAL_DAY_MINUTES-15,snapped));
    const hours = Math.floor(clamped /60);
    const mins = clamped % 60;
    return `${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
}

export function getPositionStyle(interval: {start: LocalTime; end: LocalTime}){
    const startMins = timeToMinutes(interval.start);
    const endMins = timeToMinutes(interval.end);

    const topPct = (startMins / TOTAL_DAY_MINUTES) * 100;
    const heightPct= (Math.max(15, endMins - startMins) / TOTAL_DAY_MINUTES) * 100;

    return{
        top: `${topPct}%`,
        height: `${heightPct}%`,
    };
}

export function isOutOfHours(start: LocalTime, end: LocalTime): boolean{
    const endMins  = timeToMinutes(end);
    const startMins = timeToMinutes(start);
    const coreStartMins = CORE_START_HOUR * 60;
    const coreEndMins = CORE_END_HOUR * 60;

    return startMins < coreStartMins || endMins > coreEndMins;
}

export function blockTop(start: LocalTime): number{
    return ((timeToMinutes(start)-DAY_START_HOUR * 60)/ 60) * ROW_HEIGHT_PX;
}

export function blockHeight(start: LocalTime, end: LocalTime): number{
    return ((timeToMinutes(end)- timeToMinutes(start))/ 60) * ROW_HEIGHT_PX;
}

// export function priorityScore(task: Task, now = Date.now()): number {
//     const hoursToDeadline = task.deadline 
//         ? (Date.parse(task.deadline) - now) / 3_600_000 : Infinity;
    
//     return task.urgency + task.complexity + 1  / Math.max(hoursToDeadline, 1);
// }

export function  priorityScore(task: Task, now = Date.now()): number {
        const urgencyWeight = 0.25;
        const complexityWeight = 0.15;
        const deadlineWeight = 0.60;

        let deadlineScore = 0;

        if (task.deadline) {
            const nowTime = new Date(now).getTime();
            const deadlineTime = new Date(task.deadline).getTime();

            const hoursToDeadline =
                (deadlineTime - nowTime) / 3_600_000;

            if (hoursToDeadline <= 1) {
                deadlineScore = 1;
            } else if (hoursToDeadline <= 8) {
                deadlineScore = 0.9;
            } else if (hoursToDeadline <= 24) {
                deadlineScore = 0.75;
            } else if (hoursToDeadline <= 72) {
                deadlineScore = 0.5;
            } else if (hoursToDeadline <= 168) {
                deadlineScore = 0.25;
            } else {
                deadlineScore = 0.1;
            }
        }

        const MAX_URGENCY= 5;
        const MAX_COMPLEXITY= 5;


        return (
            (task.urgency / MAX_URGENCY) * urgencyWeight +
            (task.complexity / MAX_COMPLEXITY) * complexityWeight +
            deadlineScore * deadlineWeight
        );
}

export function isIntervalOutOfHours(interval: Interval, timeZone: string): boolean{
    const startMin = timeToMinutes(instantToLocalTime(interval.start, timeZone));
    const endMin = startMin + (Date.parse(interval.end) - Date.parse(interval.start)) / 60_000;
    return startMin < CORE_START_HOUR * 60 || endMin > CORE_END_HOUR * 60;
}

export function isWeekendInstant(instant: string, timeZone: string): boolean{
    const day = new Date(instantToLocalDate(instant, timeZone) + "T00:00:00Z").getUTCDay();
    return day === 0 || day === 6;
}

export function hours(minutes: number){
    return (minutes / 60).toFixed(1).replace(/\.0$/,"");
}

export function formatRange(weekStart: string){
    const start = new Date(weekStart + "T00:00:00Z");
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 4);
    const dayMonth= (d: Date) => d.toLocaleDateString("en-GB", {day: "numeric", month: "long", timeZone: "UTC"});
    return `${dayMonth(start)} – ${dayMonth(end)} ${end.getUTCFullYear()}`;
}