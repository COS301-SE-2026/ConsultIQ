import type {Task} from "../types/scheduler.types";

export type LocalDate = string;
export type LocalTime = string;

export const DAY_START_HOUR=0;
export const DAY_END_HOUR=24;
export const CORE_START_HOUR=8;
export const CORE_END_HOUR=16;

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
        height: `${heightPct}`,
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
    return ((timeToMinutes(start)-CORE_START_HOUR * 60)/ 60) * ROW_HEIGHT_PX;
}

export function blockHeight(start: LocalTime, end: LocalTime): number{
    return ((timeToMinutes(end)- timeToMinutes(start))/ 60) * ROW_HEIGHT_PX;
}

export function priorityScore(task: Task, now = Date.now()): number {
    const hoursToDeadline = task.deadline 
        ? (Date.parse(task.deadline) - now) / 3_600_000 : Infinity;
    
    return task.urgency + task.complexity + 1  / Math.max(hoursToDeadline, 1);
}
