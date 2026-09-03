// Reads a filled CV template PDF by field name via pdf-lib
// Only gets the raw text

import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFForm } from 'pdf-lib';

export interface RawContact {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  nationality: string;
}

export interface RawSkillEntry {
  name: string;
  years: string;
}

export interface RawExperienceEntry {
  title: string;
  company: string;
  jobType: string;
  workModel: string;
  start: string;
  end: string;
  description: string;
}

export interface RawCertificationEntry {
  title: string;
  issuingBody: string;
  start: string;
  end: string;
}

export interface RawEducationEntry {
  qualification: string;
  institution: string;
  fieldOfStudy: string;
  start: string;
  end: string;
}

export interface RawTemplateData {
  contact: RawContact;
  skills: RawSkillEntry[];
  experiences: RawExperienceEntry[];
  certifications: RawCertificationEntry[];
  education: RawEducationEntry[];
}

const MAX_SKILLS = 10;
const MAX_ROLES = 6;
const MAX_CERTS = 6;
const MAX_EDU = 6;

@Injectable()
export class CvFormReaderService {
  private readonly logger = new Logger(CvFormReaderService.name);

  async read(pdfBuffer: Buffer): Promise<RawTemplateData> {
    const doc = await PDFDocument.load(pdfBuffer);
    const form = doc.getForm();

    return {
      contact: this.readContact(form),
      skills: this.readSkills(form),
      experiences: this.readExperiences(form),
      certifications: this.readCertifications(form),
      education: this.readEducation(form),
    };
  }

  private text(form: PDFForm, name: string): string {
    try {
      return form.getTextField(name).getText()?.trim() ?? '';
    } catch {
      this.logger.warn(`Expected text field "${name}" not found on template.`);
      return '';
    }
  }

  private choice(form: PDFForm, name: string): string {
    try {
      return form.getDropdown(name).getSelected()[0] ?? '';
    } catch {
      this.logger.warn(
        `Expected dropdown field "${name}" not found on template.`,
      );
      return '';
    }
  }

  private readContact(form: PDFForm): RawContact {
    return {
      fullName: this.text(form, 'full_name'),
      email: this.text(form, 'email'),
      phone: this.text(form, 'phone'),
      addressLine1: this.text(form, 'address_line1'),
      suburb: this.text(form, 'suburb'),
      city: this.text(form, 'city'),
      province: this.text(form, 'province'),
      postalCode: this.text(form, 'postal_code'),
      nationality: this.text(form, 'nationality'),
    };
  }

  private readSkills(form: PDFForm): RawSkillEntry[] {
    const skills: RawSkillEntry[] = [];
    for (let i = 1; i <= MAX_SKILLS; i++) {
      const name = this.text(form, `skill_${i}_name`);
      if (!name) continue; // no default-value trap here — text fields have no default
      skills.push({ name, years: this.text(form, `skill_${i}_years`) });
    }
    return skills;
  }

  private readExperiences(form: PDFForm): RawExperienceEntry[] {
    const roles: RawExperienceEntry[] = [];
    for (let i = 1; i <= MAX_ROLES; i++) {
      const title = this.text(form, `exp_${i}_title`);
      if (!title) continue;
      roles.push({
        title,
        company: this.text(form, `exp_${i}_company`),
        jobType: this.choice(form, `exp_${i}_job_type`),
        workModel: this.choice(form, `exp_${i}_work_model`),
        start: this.text(form, `exp_${i}_start`),
        end: this.text(form, `exp_${i}_end`),
        description: this.text(form, `exp_${i}_description`),
      });
    }
    return roles;
  }

  private readCertifications(form: PDFForm): RawCertificationEntry[] {
    const certs: RawCertificationEntry[] = [];
    for (let i = 1; i <= MAX_CERTS; i++) {
      const title = this.text(form, `cert_${i}_title`);
      if (!title) continue;
      certs.push({
        title,
        issuingBody: this.text(form, `cert_${i}_body`),
        start: this.text(form, `cert_${i}_start`),
        end: this.text(form, `cert_${i}_end`),
      });
    }
    return certs;
  }

  private readEducation(form: PDFForm): RawEducationEntry[] {
    const edu: RawEducationEntry[] = [];
    for (let i = 1; i <= MAX_EDU; i++) {
      const qualification = this.text(form, `edu_${i}_qualification`);
      if (!qualification) continue;
      edu.push({
        qualification,
        institution: this.text(form, `edu_${i}_institution`),
        fieldOfStudy: this.text(form, `edu_${i}_field`),
        start: this.text(form, `edu_${i}_start`),
        end: this.text(form, `edu_${i}_end`),
      });
    }
    return edu;
  }
}
