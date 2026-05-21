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
  workModel! : string;
}


export class ConsultantProfileDto {
    id!: string;
    fullName!: string;
    email!: string;
    phoneNumber!:string;
    idNumber!:string;
    nationality!:string;
    location!: string;
    costToCompany!: number;
    availability!: string;
    skills!: ConsultantSkillsDto[];
    experience!: ExperienceDTO[];
    certificates!: ConsultantCertificationsDto[];
}

