export class ConsultantSkillsDto {
  skillName!: string;
  competencyLevel!: string;
  yearsExperience!: number;
  confidenceLevel!: number;
}

export class ConsultantCertificationsDto {
  title!: string;
  issuingBody!: string;
  startDate!: Date | null;
  endDate!: Date | null;
  uploadedAt!: Date;
}

export class ExperienceDTO {
  companyname!: string;
  jobTitle!: string;
  jobType!: string;
  startDate!: Date;
  endDate!: Date | null;
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
  location!: string;
  costToCompany!: number;
  availability!: string;
  skills!: ConsultantSkillsDto[];
  experience!: ExperienceDTO[];
  certificates!: ConsultantCertificationsDto[];
}
