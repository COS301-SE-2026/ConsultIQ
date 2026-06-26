export enum CompetencyLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    EXPERT = 'EXPERT',
}

export type CompetencyLevelOrMissing = CompetencyLevel | 'MISSING';
export const MISSING = 'MISSING' as const;

export const COMPETENCY_RANK: Record<CompetencyLevelOrMissing, number> = {
    [MISSING]: 0.0,
    [CompetencyLevel.BEGINNER]: 0.3,
    [CompetencyLevel.INTERMEDIATE]: 0.6,
    [CompetencyLevel.EXPERT]: 1.0,
};

export const COMPETENCY_ORDINAL: Record<CompetencyLevelOrMissing, number> = {
    [MISSING]: 0,
    [CompetencyLevel.BEGINNER]: 1,
    [CompetencyLevel.INTERMEDIATE]: 2,
    [CompetencyLevel.EXPERT]: 3,
};