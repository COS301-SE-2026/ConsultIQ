export type ScoringFactorName= 'SKILL_ALIGNMENT' | 'COST_FIT' | 'COMPETENCY_MATCH' | 'GEOGRAPHIC_FIT' | 'AVAILABILITY_FIT';

export interface FactorBreakdownItem{
    readonly factorName: string;
    readonly rawScore: number;
    readonly weight: number;
    readonly weightScore: number;
    readonly details:string;
}
    
export interface Recommendation{
    consultantId: string;
    consultantName: string;
    consultantEmail?: string;
    rank: number;
    finalScore: number;
    factorBreakdown: FactorBreakdownItem[];

    availabilityStatus?: 'Available' | 'Partially Available' | 'Unavailable';
}

export interface ScoringConfigSummary{
    activeFactors:{
        name: string;
        weight: number;
        isHardExlusion:boolean;
    }[];
}