export class ConsultantListItemDto {
    id!: string;
    fullName!: string;
    email!: string;
    location!: string;
    availabilityStatus!: string;
    primarySkills!: string[];
    costToCompanyRate?: number;
}

export class PaginatedConsultantsResponseDto {
    page!: number;
    total!:number;
    consultants!: ConsultantListItemDto[];
}