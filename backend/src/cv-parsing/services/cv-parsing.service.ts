import { Injectable } from '@nestjs/common';
import { CvFormReaderService, RawTemplateData } from './cv-form-reader.service';
import { SKILLS_CANONICAL_MAP } from '../skills/skills.dictionary';
import {
  DATE_PATTERN,
  EMAIL_PATTERN,
  PHONE_PATTERNS,
} from '../skills/section-patterns';
import {
  CvParsingResult,
  ParsedCvData,
  ParsedSkill,
  ParsedExperience,
  ParsedCertification,
  ParsedEducation,
  ParsedContactInfo,
  ConfidenceScores,
} from '../types/parsed-cv.types';

// Deliberately low, not zero
const UNMATCHED_SKILL_CONFIDENCE = 0.3;
const MATCHED_SKILL_MISSING_YEARS_CONFIDENCE = 0.5;
const MATCHED_SKILL_CONFIDENCE = 1.0;

@Injectable()
export class CvParsingService {
  constructor(private readonly formReader: CvFormReaderService) {}

  async parse(pdfBuffer: Buffer): Promise<CvParsingResult> {
    const startTime = Date.now();

    try {
      const raw = await this.formReader.read(pdfBuffer);

      if (!raw.contact.fullName) {
        return {
          success: false,
          error: 'Template has no name filled in — cannot proceed.',
          processingTimeMs: Date.now() - startTime,
        };
      }

      const contact = this.buildContact(raw.contact);
      const skills = raw.skills.map((s) => this.buildSkill(s));
      const experiences = raw.experiences.map((e) => this.buildExperience(e));
      const certifications = raw.certifications.map((c) =>
        this.buildCertification(c),
      );
      const education = raw.education.map((e) => this.buildEducation(e));

      const confidenceScores = this.computeConfidenceScores(
        contact.confidence,
        skills,
        raw.experiences,
        raw.certifications,
        raw.education,
      );

      const data: ParsedCvData = {
        contact: contact.value,
        skills,
        experiences,
        certifications,
        education,
        confidenceScores,
      };

      return { success: true, data, processingTimeMs: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during rule-based parsing.',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  // ---------------- Contact ----------------

  private buildContact(raw: RawTemplateData['contact']): {
    value: ParsedContactInfo;
    confidence: number;
  } {
    let confidence = 1.0;

    if (raw.email && !EMAIL_PATTERN.test(raw.email)) confidence -= 0.4;
    if (raw.phone && !PHONE_PATTERNS.some((p) => p.test(raw.phone)))
      confidence -= 0.3;

    const value: ParsedContactInfo = {
      fullName: raw.fullName || undefined,
      email: raw.email || undefined,
      phone: raw.phone || undefined,
      nationality: raw.nationality || undefined,
      addressLine1: raw.addressLine1 || undefined,
      suburb: raw.suburb || undefined,
      city: raw.city || undefined,
      province: raw.province || undefined,
      postalCode: raw.postalCode || undefined,
    };

    return { value, confidence: Math.max(0, confidence) };
  }

  // ---------------- Skills ----------------

  private buildSkill(raw: RawTemplateData['skills'][number]): ParsedSkill {
    const canonical = SKILLS_CANONICAL_MAP.get(raw.name.trim().toLowerCase());
    const { value: years, valid: yearsValid } = this.parseYears(raw.years);

    let extractionConfidence: number;
    if (!canonical) {
      extractionConfidence = UNMATCHED_SKILL_CONFIDENCE;
    } else if (!yearsValid) {
      extractionConfidence = MATCHED_SKILL_MISSING_YEARS_CONFIDENCE;
    } else {
      extractionConfidence = MATCHED_SKILL_CONFIDENCE;
    }

    return {
      // Unmatched skills keep the consultant's own typed text
      skillName: canonical ?? raw.name.trim(),
      yearsExperience: years,
      extractionConfidence,
    };
  }

  private parseYears(raw: string): { value: number; valid: boolean } {
    if (!raw) return { value: 0, valid: false };
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { value: 0, valid: false };
    return { value: Math.round(n), valid: true };
  }

  // ---------------- Experience ----------------

  private buildExperience(
    raw: RawTemplateData['experiences'][number],
  ): ParsedExperience {
    return {
      jobTitle: raw.title,
      companyName: raw.company,
      jobType: raw.jobType as ParsedExperience['jobType'],
      workModel: raw.workModel as ParsedExperience['workModel'],
      startDate: raw.start,
      endDate: raw.end || undefined,
      description: raw.description,
    };
  }

  private experienceConfidence(
    raw: RawTemplateData['experiences'][number],
  ): number {
    let confidence = 1.0;
    if (!this.isValidDate(raw.start) || !raw.start) confidence -= 0.5;
    if (raw.end && !this.isValidDate(raw.end)) confidence -= 0.3;
    return Math.max(0, confidence);
  }

  // ---------------- Certifications ----------------

  private buildCertification(
    raw: RawTemplateData['certifications'][number],
  ): ParsedCertification {
    return {
      title: raw.title,
      issuingBody: raw.issuingBody,
      startDate: raw.start || undefined,
      endDate: raw.end || undefined,
    };
  }

  private certificationConfidence(
    raw: RawTemplateData['certifications'][number],
  ): number {
    let confidence = 1.0;
    if (raw.start && !this.isValidDate(raw.start)) confidence -= 0.3;
    if (raw.end && !this.isValidDate(raw.end)) confidence -= 0.3;
    return Math.max(0, confidence);
  }

  // ---------------- Education ----------------

  private buildEducation(
    raw: RawTemplateData['education'][number],
  ): ParsedEducation {
    return {
      institution: raw.institution,
      qualification: raw.qualification,
      fieldOfStudy: raw.fieldOfStudy || undefined,
      startDate: raw.start || undefined,
      endDate: raw.end || undefined,
    };
  }

  private educationConfidence(
    raw: RawTemplateData['education'][number],
  ): number {
    let confidence = 1.0;
    if (!raw.start || !this.isValidDate(raw.start)) confidence -= 0.3;
    if (raw.end && !this.isValidDate(raw.end)) confidence -= 0.3;
    return Math.max(0, confidence);
  }

  // ---------------- Shared ----------------

  private isValidDate(value: string): boolean {
    return value === '' || DATE_PATTERN.test(value);
  }

  private average(values: number[]): number {
    if (values.length === 0) return 1.0; // nothing present to be uncertain about
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private computeConfidenceScores(
    contactConfidence: number,
    skills: ParsedSkill[],
    rawExperiences: RawTemplateData['experiences'],
    rawCertifications: RawTemplateData['certifications'],
    rawEducation: RawTemplateData['education'],
  ): ConfidenceScores {
    const skillsConfidence = this.average(
      skills.map((s) => s.extractionConfidence),
    );
    const experienceConfidence = this.average(
      rawExperiences.map((e) => this.experienceConfidence(e)),
    );
    const certificationsConfidence = this.average(
      rawCertifications.map((c) => this.certificationConfidence(c)),
    );
    const educationConfidence = this.average(
      rawEducation.map((e) => this.educationConfidence(e)),
    );

    const overall = this.average([
      contactConfidence,
      skillsConfidence,
      experienceConfidence,
      certificationsConfidence,
      educationConfidence,
    ]);

    return {
      contact: contactConfidence,
      skills: skillsConfidence,
      experience: experienceConfidence,
      certifications: certificationsConfidence,
      education: educationConfidence,
      overall,
    };
  }
}
