/* eslint-disable */
import { Injectable, Logger } from '@nestjs/common';
import {
  SECTION_PATTERNS,
  DATE_PATTERNS,
  PHONE_PATTERNS,
  EMAIL_PATTERN,
  JOB_TYPE_PATTERNS,
  WORK_MODEL_PATTERNS,
} from '../skills/section-patterns';
import {
  SKILLS_DICTIONARY,
  SKILLS_CANONICAL_MAP,
} from '../skills/skills.dictionary';
import type {
  ParsedCvData,
  ParsedContactInfo,
  ParsedExperience,
  ParsedSkill,
  ParsedCertification,
  ConfidenceScores,
} from '../types/parsed-cv.types';

interface RawSections {
  contact: string;
  experience: string;
  skills: string;
  certifications: string;
  education: string;
}

@Injectable()
export class CvParsingService {
  private readonly logger = new Logger(CvParsingService.name);

  /**
   * Splits the raw CV text into labelled sections based on heading
   * Assuming contact info is on top: Everything before first heading is considered to be contact info
   */
   private identifySections(text: string): RawSections {
       const lines = text.split('\n');
       const sections: RawSections = {
         contact: '',
         experience: '',
         skills: '',
         certifications: '',
         education: '',
       };

       let currentSection: keyof RawSections = 'contact';

       for (const line of lines) {
         const trimmedLine = line.trim();
         const matchedSection = this.matchSectionHeading(trimmedLine);

         if (matchedSection) {
           currentSection = matchedSection;
           continue;
         }
         sections[currentSection] += line + '\n';
       }

       return sections;
   }

  /**
   * Checks if a single line is a section heading, and if so, which section
   * it belongs to. Headings are typically short.
   */
  private matchSectionHeading(line: string): keyof RawSections | null {
      // We assume the heading is short
      if (line.length > 60) return null;

      // Doesn't include contact section because that's usually at the top of the CV (catering for that type of template).
      // When a line matches the word,we treat that as the start of a new section. Everything between that heading and the next heading belongs to that section.
      if (SECTION_PATTERNS.experience.test(line)) return 'experience';
      if (SECTION_PATTERNS.skills.test(line)) return 'skills';
      if (SECTION_PATTERNS.certifications.test(line)) return 'certifications';
      if (SECTION_PATTERNS.education.test(line)) return 'education';

     return null;
  }

  /**
   * Extracts phone number and email from the contact section of the CV.
   * Falls back to scanning the full text if nothing is found in the
   * dedicated contact section, might possibly be included inline elsewhere.
   */
  private extractContactInfo(
    contactSectionText: string,
    fullText: string,
  ): ParsedContactInfo {
    const contact: ParsedContactInfo = {};

    const phone = this.findFirstMatch(PHONE_PATTERNS, contactSectionText)
      ?? this.findFirstMatch(PHONE_PATTERNS, fullText);
    if (phone) {
      contact.phone = phone.replace(/[\s()]/g, '');
    }

    const emailMatch = contactSectionText.match(EMAIL_PATTERN)
      ?? fullText.match(EMAIL_PATTERN);
    if (emailMatch) {
      contact.email = emailMatch[0];
    }

    const fullName = this.guessFullName(contactSectionText);
    if (fullName) {
      contact.fullName = fullName;
    }

    return contact;
  }

  /**
   * Tries each pattern in order against the given text and returns the
   * first match found, or null if none match.
   */
  private findFirstMatch(patterns: RegExp[], text: string): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  /**
   * Best-effort guess at the consultant's full name. Most CVs put the
   * person's name as the very first non-empty line of the document.
   */
  private guessFullName(contactSectionText: string): string | null {
    const lines = contactSectionText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return null;

    const firstLine = lines[0];

    // A name line shouldn't contain digits, @ symbols, or be excessively long
    const looksLikeName =
      firstLine.length > 2 &&
      firstLine.length < 100 &&
      !/[\d@]/.test(firstLine);

    return looksLikeName ? firstLine : null;
  }
}