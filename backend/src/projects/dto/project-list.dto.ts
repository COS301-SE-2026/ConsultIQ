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
  status!: string;
  skillCount!: number;
}

export class PaginatedProjectsResponseDto {
  page!: number;
  limit!: number;
  total!: number;
  projects!: ProjectListItemDto[];
}
