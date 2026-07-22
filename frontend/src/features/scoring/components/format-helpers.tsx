import type { FactorBreakdownItem } from "../types/placements.types";

export function formatFactorName(name: string):string{
    return name.toLowerCase().split('_')
    .map((word)=> word.charAt(0)+ word.slice(1)).join(' ');
}

export function getAvailabilityDisplay(breakdown: FactorBreakdownItem[]): string{
    const availability= breakdown.find((f) => f.factorName=== 'AVAILABILITY_FIT');
    if(!availability) return 'Available';
    if(availability.rawScore >= 80) return 'Available';
    if(availability.rawScore >= 10) return 'Partially Available'
    return 'Unavailable';
}