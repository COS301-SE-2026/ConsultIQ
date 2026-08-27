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
}

export interface ParsedCvData {
    contact: ParsedContactInfo;
    skills: ParsedSkill[];
    experiences: ParsedExperience[];
    certifications: ParsedCertification[];
    confidenceScores: ConfidenceScores;
}

// Only used by AI Parsing
export interface SkillCompetencySignal {
  skillName: string; // links back to a skill in ParsedCvData.skills
  inferredCompetency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  reasoning: string;
}

export interface CvParsingResult {
  success: boolean;
  data?: ParsedCvData;
  competencySignals?: SkillCompetencySignal[];
  error?: string;
  processingTimeMs: number;
}
