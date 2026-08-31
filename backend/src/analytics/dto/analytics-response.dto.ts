
export class UtilisationBySkillDto {
    category!: string;
    totalConsultants!: number;
    utilisedConsultants!: number;
    utilisationPercent!: number;
}

export class BenchBySkillDto {
    category!: string;
    benchCount!: number;
}

export class SkillDistributionDto {
    category!: string;
    consultantCount!: number;
    percentageOfPool!: number;
}

export class PlacementsBySkillDto {
    category!: string;
    placementCount!: number;
}

export class PlacementsYTDDto  {
    count!: number;
}

 export class CvParsingStatsDto  {
    totalProcessed!: number;
    ruleBasedCount!: number;
    asAssistedCount!: number;
    failedCount!: number;
    averageConfidence!: number;
}