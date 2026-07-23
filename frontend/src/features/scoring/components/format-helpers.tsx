import type { FactorBreakdownItem } from "../types/placements.types";

export function formatFactorName(name: string): string {
    if (!name) return 'Uknown Factor';

    return name.toLowerCase().split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getAvailabilityDisplay(breakdown: FactorBreakdownItem[]): string {
    if (!breakdown || !Array.isArray(breakdown)) return 'Available';

    const availability = breakdown.find((f) => f.factorName === 'AVAILABILITY');
    if (!availability) return 'Available';
    if (availability.rawScore >= 0.8) return 'Available';
    if (availability.rawScore >= 0.1) return 'Partially Available'
    return 'Unavailable';
}