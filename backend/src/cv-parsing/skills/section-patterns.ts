export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const PHONE_PATTERNS: RegExp[] = [
  /\b0\d{9}\b/,
  /\b\+27\s?\d{9}\b/,
  /\b\+27\s?\(0\)\s?\d{9}\b/,
  /\b0\d{2}\s?\d{3}\s?\d{4}\b/,
  /\b\+27\s?\d{2}\s?\d{3}\s?\d{4}\b/,
];

export const EMAIL_PATTERN =
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;
