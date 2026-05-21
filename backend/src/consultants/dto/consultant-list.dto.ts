export class ConsultantListItemDto {
  id!: string;
  fullName!: string;
  email!: string;
  location!: string;
  availabilityStatus!: string;
  primarySkills!: string[];
  costToCompanyRate?: number;
  phone?: string | null;
  idNumber?: string | null;
  experienceYears?: number;
  certifications?: string[];
}

export class PaginatedConsultantsResponseDto {
  page!: number;
  total!: number;
  consultants!: ConsultantListItemDto[];
}
