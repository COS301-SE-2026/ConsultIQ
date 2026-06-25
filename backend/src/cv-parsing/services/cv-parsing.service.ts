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
}