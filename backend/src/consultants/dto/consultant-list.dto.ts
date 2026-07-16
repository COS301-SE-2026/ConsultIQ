export class ConsultantListItemDto {
  id!: string;
  fullName!: string;
  email!: string;
  addressLine1!: string;
  addressLine2?: string | null;
  suburb?: string | null;
  city!: string;
  province!: string;
  postalCode?: string | null;
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
