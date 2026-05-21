export class ConsultantSkillsDto {
    skillName!: string;
    competencyLevel!: string;
    yearsExperience!: number;
    confidenceLevel!: number;
}

export class ConsultantCertificationsDto {
  title!: string;
  issuingBody!: string;
  uploadedAt!: Date;
}

export class ConsultantProfileDto {
    id!: string;
    fullName!: string;
    email!: string;
    location!: string;
    costToCompany!: number;
    availability!: string;
    skills!: ConsultantSkillsDto[];
    certificates!: ConsultantCertificationsDto[];
}

