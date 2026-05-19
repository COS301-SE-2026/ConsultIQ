export class ProjectListItemDto {
    id!: string;
    projectName!: string;
    clientName!: string;
    city!: string;
    province!: string;
    startDate!: Date;
    endDate?: Date | null;
    teamSize!: number;
    requiredAllocationPercentage!: number;
    clientBillingBudget!: number;
    status!: string
    primarySkills!: string[];
}

export class PaginatedProjectsResponseDto {
    page!: number;
    total!: number
    projects!: ProjectListItemDto[];
}