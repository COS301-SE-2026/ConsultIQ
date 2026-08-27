import { Injectable } from '@nestjs/common';
import { EMAIL_PATTERN, PHONE_PATTERNS, DATE_PATTERN } from '../skills/section-patterns';
import { ParsedCvData, FieldWarning } from '../types/parsed-cv.types';

@Injectable()
export class CvFieldValidatorService {
  validate(data: ParsedCvData): FieldWarning[] {
    const warnings: FieldWarning[] = [];
    const { email, phone } = data.contact;

    if (email && !EMAIL_PATTERN.test(email)) {
      warnings.push({
        path: 'contact.email',
        message: `"${email}" does not look like a valid email address.`,
      });
    }

    if (phone && !PHONE_PATTERNS.some((pattern) => pattern.test(phone))) {
      warnings.push({
        path: 'contact.phone',
        message: `"${phone}" does not match a recognised South African phone format.`,
      });
    }

    data.experiences.forEach((exp, i) => {
      if (!this.isValidDate(exp.startDate)) {
        warnings.push({
          path: `experiences[${i}].startDate`,
          message: `"${exp.startDate}" is not a valid YYYY-MM-DD date.`,
        });
      }
      if (exp.endDate && !this.isValidDate(exp.endDate)) {
        warnings.push({
          path: `experiences[${i}].endDate`,
          message: `"${exp.endDate}" is not a valid YYYY-MM-DD date.`,
        });
      }
    });

    data.certifications.forEach((cert, i) => {
      if (cert.startDate && !this.isValidDate(cert.startDate)) {
        warnings.push({
          path: `certifications[${i}].startDate`,
          message: `"${cert.startDate}" is not a valid YYYY-MM-DD date.`,
        });
      }
      if (cert.endDate && !this.isValidDate(cert.endDate)) {
        warnings.push({
          path: `certifications[${i}].endDate`,
          message: `"${cert.endDate}" is not a valid YYYY-MM-DD date.`,
        });
      }
    });

    data.education.forEach((edu, i) => {
      if (edu.startDate && !this.isValidDate(edu.startDate)) {
        warnings.push({
          path: `education[${i}].startDate`,
          message: `"${edu.startDate}" is not a valid YYYY-MM-DD date.`,
        });
      }
      if (edu.endDate && !this.isValidDate(edu.endDate)) {
        warnings.push({
          path: `education[${i}].endDate`,
          message: `"${edu.endDate}" is not a valid YYYY-MM-DD date.`,
        });
      }
    });

    return warnings;
  }

  private isValidDate(value: string): boolean {
    return DATE_PATTERN.test(value);
  }
}