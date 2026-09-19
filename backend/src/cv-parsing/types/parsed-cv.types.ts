export interface ParsedSkill {
  skillName: string;
  yearsExperience: number;
  extractionConfidence: number; //parser's certainty in extraction
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

export interface ParsedCertification {
  title: string;
  issuingBody: string;
  startDate?: string;
  endDate?: string;
}

export interface ParsedEducation {
  institution: string;
  qualification: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

export interface ParsedContactInfo {
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

export interface ConfidenceScores {
  contact: number;
  skills: number;
  experience: number;
  certifications: number;
  overall: number;
  education: number;
}

export interface ParsedCvData {
  contact: ParsedContactInfo;
  skills: ParsedSkill[];
  experiences: ParsedExperience[];
  certifications: ParsedCertification[];
  confidenceScores: ConfidenceScores;
  education: ParsedEducation[];
}

// Only used by AI Parsing
export interface SkillCompetencySignal {
  skillName: string; // links back to a skill in ParsedCvData.skills
  inferredCompetency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  reasoning: string;
}

export const CV_SECURITY_FLAG_TYPES = [
  'INSTRUCTION_OVERRIDE',
  'AUTHORITY_IMPERSONATION',
  'DATA_EXFILTRATION_ATTEMPT',
  'HIDDEN_OR_OBFUSCATED_TEXT',
  'TOOL_USE_OR_EXTERNAL_REQUEST',
  'SCHEMA_MANIPULATION_ATTEMPT',
  'OTHER_SUSPICIOUS_CONTENT',
] as const;

export type CvSecurityFlagType = (typeof CV_SECURITY_FLAG_TYPES)[number];

export interface CvParsingResult {
  success: boolean;
  data?: ParsedCvData;
  competencySignals?: SkillCompetencySignal[];
  securityFlags?: CvSecurityFlag[];
  fieldWarnings?: FieldWarning[];
  error?: string;
  processingTimeMs: number;
}

export interface FieldWarning {
  path: string; // e.g. "contact.email", "experiences[1].endDate"
  message: string; // human-readable, shown directly on the review screen
}

export interface CvSecurityFlag {
  field: string;
  flagType: CvSecurityFlagType;
  excerpt: string;
}
