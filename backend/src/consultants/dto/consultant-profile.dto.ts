export class ConsultantSkillsDto {
  id!: string;
  skillName!: string;
  competencyLevel!: string;
  yearsExperience!: number;
  confidenceLevel!: number;
}

export class ConsultantCertificationsDto {
  id!: string;
  title!: string;
  issuingBody!: string;
  startDate!: Date;
  endDate!: Date;
  uploadedAt!: Date;
}

export class ExperienceDTO {
  id!: string;
  companyname!: string;
  jobTitle!: string;
  jobType!: string;
  startDate!: Date;
  endDate!: Date;
  roleDescription!: string;
  workModel!: string;
}

export class ConsultantProfileDto {
  id!: string;
  fullName!: string;
  email!: string;
  phoneNumber!: string;
  idNumber!: string;
  nationality!: string;
  addressLine1!: string;
  addressLine2?: string | null;
  suburb?: string | null;
  city!: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  formattedAddress?: string | null;
  province!: string;
  postalCode?: string | null;
  costToCompany!: number;
  availability!: string;
  skills!: ConsultantSkillsDto[];
  experience!: ExperienceDTO[];
  certificates!: ConsultantCertificationsDto[];
  education!: ConsultantEducationDto[];
  pictureUrl!: string | null;
}

export class ConsultantEducationDto {
  id!: string;
  institution!: string;
  qualification!: string;
  startDate!: Date;
  endDate!: Date | null;
}
