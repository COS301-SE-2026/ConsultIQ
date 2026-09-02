export type UserRole = 
  'ADMIN' | 
  'PROJECT_MANAGER' |
  'CONSULTANT_MANAGER'|
  'CONSULTANT' 
;

export type ProjectStatus =
  'OPEN' |
  'IN_PROGRESS' |
  'CLOSED' |
  'ARCHIVED' |
  'COMPLETED'
;


export interface AdminUserItem{
    id:string;
    fullName: string;
    email: string;
    role: UserRole;
    status: 'ACTIVE' | 'SUSPEND' | 'ARCHIVED';
    createdAt: string;
}

export interface PaginationMeta{
    totalRecords: number;
    currentPage: number;
    totalPages: number;
}

export interface UserMeta{
    totalRecords: number;
    absoluteTotalRecords: number;
    activeUsers: number;
    suspendedUsers: number;
    currentPage: number;
    totalPages: number;
}


export interface GetAllUsersResponse{
    data: AdminUserItem[];
    meta: UserMeta;
}



export interface AdminProjectItem{
    id:string;
    projectName: string;
    status:  ProjectStatus;
    clientName: string;
    createdAt: string;
    budget: number;

}

export interface ProjectMeta{
    totalRecords: number;
    absoluteTotalRecords: number;
    currentPage: number;
    totalPages: number;
}

export interface GetAllProjectsResponse{
    data: AdminProjectItem[];
    meta: ProjectMeta;
}


export interface MessageResponse{
    message:string;
}


//Analytics dto's

export interface OverallUtilisationDto {
    totalConsultants: number;
    utilisedConsultants: number;
    utilisationPercent: number;
}

export interface UtilisationBySkillDto {
    category: string;
    totalConsultants: number;
    utilisedConsultants: number;
    utilisationPercent: number;
}

export interface BenchBySkillDto {
    category: string;
    benchCount: number;
}

export interface BenchCountDto {
    count: number;
}

export interface SkillDistributionDto {
    category: string;
    consultantCount: number;
    percentageOfPool: number;
}

export interface PlacementsBySkillDto {
    category: string;
    placementCount: number;
}

export interface PlacementsYTDDto{
    count: number;
}

export interface CvParsingStatsDto{
    totalProcessed: number;
    ruleBasedCount: number;
    aiAssistedCount: number;
    failedCount: number;
    successCount: number;
    averageConfidence: number;
}

export const mockOverallUtilisation: OverallUtilisationDto = {
  totalConsultants: 42,
  utilisedConsultants: 31,
  utilisationPercent: 73.8,
};

export const mockUtilisationBySkill: UtilisationBySkillDto[] = [
  { category: 'Cloud & DevOps', totalConsultants: 12, utilisedConsultants: 9, utilisationPercent: 75 },
  { category: 'Frontend', totalConsultants: 10, utilisedConsultants: 6, utilisationPercent: 60 },
  { category: 'Backend', totalConsultants: 14, utilisedConsultants: 11, utilisationPercent: 78.6 },
  { category: 'Data & AI', totalConsultants: 6, utilisedConsultants: 2, utilisationPercent: 33.3 },
  { category: 'QA & Testing', totalConsultants: 5, utilisedConsultants: 3, utilisationPercent: 60 },
];

export const mockOverallBenchCount: BenchCountDto = {
  count: 11,
};

export const mockBenchBySkill: BenchBySkillDto[] = [
  { category: 'Cloud & DevOps', benchCount: 3 },
  { category: 'Frontend', benchCount: 4 },
  { category: 'Backend', benchCount: 3 },
  { category: 'Data & AI', benchCount: 4 },
  { category: 'QA & Testing', benchCount: 2 },
];

export const mockPlacementsBySkill: PlacementsBySkillDto[] = [
  { category: 'Cloud & DevOps', placementCount: 7 },
  { category: 'Backend', placementCount: 5 },
  { category: 'Data & AI', placementCount: 2 },
  { category: 'Frontend', placementCount: 4 },
];


export const mockPlacementsYTD: PlacementsYTDDto = {
  count: 24,
};

export const mockCvParsingStats: CvParsingStatsDto = {
  totalProcessed: 150,
  ruleBasedCount: 90,
  aiAssistedCount: 60,
  failedCount: 8,
  successCount: 142,
  averageConfidence: 0.87,
};

export const CvchartData = [
  { name: "Successful", value: mockCvParsingStats.successCount },
  { name: "Failed", value: mockCvParsingStats.failedCount  },
];

export interface CvParsingSummary {
  failedCount: number;
  successCount: number;
}

export const mockCvParsingSummaries: CvParsingSummary[] = [
  { failedCount: 2, successCount: 8 },
  { failedCount: 4, successCount: 12 },
];


export const mockSkillDistribution: SkillDistributionDto[] = [
  { category: 'Cloud & DevOps', consultantCount: 15, percentageOfPool: 36 },
  { category: 'Backend', consultantCount: 18, percentageOfPool: 43 },
  { category: 'Frontend', consultantCount: 13, percentageOfPool: 31 },
  { category: 'Data & AI', consultantCount: 6, percentageOfPool: 14 },
  { category: 'QA & Testing', consultantCount: 5, percentageOfPool: 12 },
];

export const mergedSkillData = mockUtilisationBySkill.map((utilItem) => {
  const benchItem = mockBenchBySkill.find(
    (b) => b.category === utilItem.category
  );
  
  return {
    category: utilItem.category,
    utilised: utilItem.utilisedConsultants,
    bench: benchItem ? benchItem.benchCount : 0,
    total: utilItem.totalConsultants,
    utilisationPercent: utilItem.utilisationPercent,
  };
});

export interface PlacementsOverTimeDto{
  month:string;
  [category: string]: string | number;
}

export const mockPlacementsBySkillOverTime: PlacementsOverTimeDto[] = [
  { month: "Jan 2026", "Cloud & DevOps": 2, "Backend": 1, "Frontend": 1, "Data & AI": 0, "QA & Testing": 0 },
  { month: "Feb 2026", "Cloud & DevOps": 3, "Backend": 2, "Frontend": 0, "Data & AI": 1, "QA & Testing": 0 },
  { month: "Mar 2026", "Cloud & DevOps": 1, "Backend": 1, "Frontend": 1, "Data & AI": 0, "QA & Testing": 0 },
  { month: "Apr 2026", "Cloud & DevOps": 4, "Backend": 2, "Frontend": 1, "Data & AI": 1, "QA & Testing": 0 },
  { month: "May 2026", "Cloud & DevOps": 2, "Backend": 1, "Frontend": 1, "Data & AI": 0, "QA & Testing": 1 },
  { month: "Jun 2026", "Cloud & DevOps": 3, "Backend": 3, "Frontend": 2, "Data & AI": 1, "QA & Testing": 0 },
  { month: "Jul 2026", "Cloud & DevOps": 2, "Backend": 2, "Frontend": 1, "Data & AI": 1, "QA & Testing": 1 },
  { month: "Aug 2026", "Cloud & DevOps": 4, "Backend": 3, "Frontend": 2, "Data & AI": 2, "QA & Testing": 1 },
];