export type ExtractionStatus = | "PENDING" | "PROCESSING" | "FAILED" | "REVIEW_REQUIRED" | "SECURITY_REJECTED";

export interface FieldWarning{
    path: string;
    message: string;
}

export interface ParsedSkill{
    skillName: string;
    yearsExperience: number;
    extractionConfidence: number;
}

export interface ParsedExperience {
  jobTitle: string;
  companyName: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
  workModel: 'ONSITE' | 'REMOTE' | 'HYBRID';
  startDate: string;
  endDate?: string;
  description: string;
}

export interface ParsedCertification{
    title: string;
    issuingBody: string;
    startDate?: string;
    endDate?: string;
}

export interface ParsedEducation{
    institution: string;
    qualification: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
}

export interface ParsedContactInfo{
    fullName?: string;
    email?: string;
    phone?: string;
    nationality?: string;
    addressLine1?: string;
    addressLine2?: string;
    suburb?: string;
    city?: string;
    province?: string;
    postalCode?: string;
}

export interface ConfidenceScores{
    contact: number;
    skills: number;
    experience: number;
    certifications: number;
    education: number;
    overall: number;
}

export interface ParsedCvData{
contact: ParsedContactInfo;
skills: ParsedSkill[];
experiences: ParsedExperience[];
certifications: ParsedCertification[];
education: ParsedEducation[];
confidenceScores: ConfidenceScores;
}

export interface SkillCompetencySignal {
    skillName: string;
    inferredCompetency: "BEGINNER" | "INTERMEDIATE" | "EXPERT";
    reasoning: string;
}

export type CvSecurityFlagType =
    | "INSTRUCTION_OVERRIDE"
    | "AUTHORITY_IMPERSONATION"
    | "DATA_EXFILTRATION_ATTEMPT"
    | "HIDDEN_OR_OBFUSCATED_TEXT"
    | "TOOL_USE_OR_EXTERNAL_REQUEST"
    | "SCHEMA_MANIPULATION_ATTEMPT"
    | "OTHER_SUSPICIOUS_CONTENT";

export type SecurityReviewStatus = "NONE" | "PENDING" | "CLEARED" | "REJECTED";

export interface CvSecurityFlag {
    field: string;
    flagType: CvSecurityFlagType;
    excerpt: string;
}

export interface CvParsedDataEnvelope {
    data?: ParsedCvData;
    competencySignals?: SkillCompetencySignal[];
    securityFlags?: CvSecurityFlag[];
    fieldWarnings?: FieldWarning[];
    error?: string;
}

export interface CvFileStatus{
    id: string;
    fileName: string;
    fileSize: string;
    mimeType: string;
    uploadStatus: string;
    extractionStatus: ExtractionStatus;
    securityReviewStatus: SecurityReviewStatus;
    parsedData : CvParsedDataEnvelope | null;
    updatedAt: string;
}

export interface CvUploadResponse{
    cvFileId: string;
    message: string;
}
