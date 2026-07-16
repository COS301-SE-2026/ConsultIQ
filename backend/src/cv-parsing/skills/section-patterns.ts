export const SECTION_PATTERNS: Record<string, RegExp> = {
  experience: /\b(work\s+experience|employment\s+history|professional\s+experience|career\s+history|work\s+history|experience)\b/i,
  education: /\b(education|academic\s+background|academic\s+history|qualifications|degrees|studies)\b/i,
  skills: /\b(skills|technical\s+skills|core\s+competencies|competencies|technologies|tools\s+&\s+technologies|key\s+skills)\b/i,
  certifications: /\b(certifications|certificates|accreditations|professional\s+certifications|courses\s+&\s+certifications|licences)\b/i,
  contact: /\b(contact|contact\s+information|personal\s+information|personal\s+details|profile)\b/i,
  summary: /\b(summary|professional\s+summary|career\s+objective|objective|about\s+me|profile\s+summary)\b/i,
};

export const DATE_PATTERNS: RegExp[] = [
  // Jan 2022 / January 2022
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i,
  // 01/2022 or 01-2022
  /\b(\d{1,2})[/-](\d{4})\b/,
  // 2022/01 or 2022-01
  /\b(\d{4})[/-](\d{1,2})\b/,
  // 2022 - 2024 or 2022 – 2024
  /\b(\d{4})\s*[-–]\s*(\d{4})\b/,
  // 2022 - Present / 2022 - Current
  /\b(\d{4})\s*[-–]\s*(present|current|now|to\s+date)\b/i,
  // Jan 2022 - Mar 2024
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\s*[-–]\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i,
];

export const PHONE_PATTERNS: RegExp[] = [
  /\b0\d{9}\b/,
  /\b\+27\s?\d{9}\b/,
  /\b\+27\s?\(0\)\s?\d{9}\b/,
  /\b0\d{2}\s?\d{3}\s?\d{4}\b/,
  /\b\+27\s?\d{2}\s?\d{3}\s?\d{4}\b/,
];

export const EMAIL_PATTERN = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;

export const JOB_TYPE_PATTERNS: Record<string, RegExp> = {
  FULL_TIME: /\b(full[\s-]?time|permanent|full\s+time)\b/i,
  PART_TIME: /\b(part[\s-]?time|part\s+time)\b/i,
  CONTRACT: /\b(contract|contractor|fixed[\s-]?term|ftc)\b/i,
  INTERNSHIP: /\b(intern|internship|graduate\s+programme|learnership)\b/i,
  FREELANCE: /\b(freelance|self[\s-]?employed|consultant|independent)\b/i,
};

export const WORK_MODEL_PATTERNS: Record<string, RegExp> = {
  REMOTE: /\b(remote|work\s+from\s+home|wfh|distributed)\b/i,
  HYBRID: /\b(hybrid|partially\s+remote|flexible)\b/i,
  ONSITE: /\b(on[\s-]?site|onsite|in[\s-]?office|office[\s-]?based|in\s+person)\b/i,
};

export const SA_NATIONALITY_PATTERNS: RegExp[] = [
  /\b(south\s+african|sa\s+citizen|rsa\s+citizen)\b/i,
  /\b(zimbabwean|botswanan|namibian|mozambican|zambian|kenyan|nigerian|ghanaian)\b/i,
];