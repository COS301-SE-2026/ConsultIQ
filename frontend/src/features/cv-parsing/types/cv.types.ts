export type ExtractionStatus = | "PENDING" | "PROCESSING" | "FAILED" | "REVIEW_REQUIRED";

export interface FieldWarning{
    path: string;
    message: string;
}

export interface CvFileStatus{
    id: string;
    fileName: string;
    fileSize: string;
    mimeType: string;
    uploadStatus: string;
    extractionStatus: ExtractionStatus;
    parsedData : ParsedCvData | null;
    updatedAt: string;
}

export interface CvUploadResponse{
    cvFileId: string;
    message: string;
}

export interface ParsedSkill{
    skillName: string;
    yearsExperience: string;
    extractionConfidence: string;
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

export interface CvParsedDataEnvelope {
    data?: ParsedCvData;
    comptencySignals?: unknown[];
    fieldWarnings?: FieldWarning[];
    error?: string;
}