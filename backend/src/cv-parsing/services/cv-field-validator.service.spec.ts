import { CvFieldValidatorService } from './cv-field-validator.service';
import { ParsedCvData } from '../types/parsed-cv.types';

function buildData(overrides: Partial<ParsedCvData> = {}): ParsedCvData {
  return {
    contact: { fullName: 'Jane Doe', email: 'jane@example.com', phone: '0821234567' },
    skills: [],
    experiences: [],
    certifications: [],
    education: [],
    confidenceScores: { contact: 1, skills: 1, experience: 1, certifications: 1, education: 1, overall: 1 },
    ...overrides,
  };
}

describe('CvFieldValidatorService', () => {
  let service: CvFieldValidatorService;

  beforeEach(() => {
    service = new CvFieldValidatorService();
  });

  it('returns no warnings for a fully valid, empty-sections CV', () => {
    expect(service.validate(buildData())).toEqual([]);
  });

  describe('email', () => {
    it('flags a malformed email with the correct path', () => {
      const warnings = service.validate(
        buildData({ contact: { ...buildData().contact, email: 'not-an-email' } }),
      );
      expect(warnings).toContainEqual({
        path: 'contact.email',
        message: '"not-an-email" does not look like a valid email address.',
      });
    });

    it('does not flag a missing email', () => {
      const warnings = service.validate(
        buildData({ contact: { ...buildData().contact, email: undefined } }),
      );
      expect(warnings.some((w) => w.path === 'contact.email')).toBe(false);
    });
  });

  describe('phone', () => {
    it.each(['0821234567', '+27821234567', '+27 (0) 82 123 4567', '011 234 5678'])(
      'accepts valid SA format: %s',
      (phone) => {
        const warnings = service.validate(buildData({ contact: { ...buildData().contact, phone } }));
        expect(warnings.some((w) => w.path === 'contact.phone')).toBe(false);
      },
    );

    it('flags an unrecognised phone format', () => {
      const warnings = service.validate(buildData({ contact: { ...buildData().contact, phone: '12345' } }));
      expect(warnings).toContainEqual({
        path: 'contact.phone',
        message: '"12345" does not match a recognised South African phone format.',
      });
    });

    it('does not flag a missing phone', () => {
      const warnings = service.validate(
        buildData({ contact: { ...buildData().contact, phone: undefined } }),
      );
      expect(warnings.some((w) => w.path === 'contact.phone')).toBe(false);
    });
  });

  describe('experience dates', () => {
    const validExp = {
      jobTitle: 'Dev', companyName: 'BBD', jobType: 'FULL_TIME' as const,
      workModel: 'ONSITE' as const, startDate: '2022-01-01', description: '',
    };

    it('flags a malformed start date, indexed correctly', () => {
      const warnings = service.validate(
        buildData({ experiences: [validExp, { ...validExp, startDate: '2022/01/01' }] }),
      );
      expect(warnings).toContainEqual({
        path: 'experiences[1].startDate',
        message: '"2022/01/01" is not a valid YYYY-MM-DD date.',
      });
    });

    it('flags a blank start date — required field, not treated as "ongoing"', () => {
      const warnings = service.validate(buildData({ experiences: [{ ...validExp, startDate: '' }] }));
      expect(warnings).toContainEqual({
        path: 'experiences[0].startDate',
        message: '"" is not a valid YYYY-MM-DD date.',
      });
    });

    it('does not flag a blank end date (ongoing role)', () => {
      const warnings = service.validate(buildData({ experiences: [{ ...validExp, endDate: undefined }] }));
      expect(warnings.some((w) => w.path === 'experiences[0].endDate')).toBe(false);
    });

    it('flags a malformed, non-blank end date', () => {
      const warnings = service.validate(buildData({ experiences: [{ ...validExp, endDate: '01-2024' }] }));
      expect(warnings).toContainEqual({
        path: 'experiences[0].endDate',
        message: '"01-2024" is not a valid YYYY-MM-DD date.',
      });
    });
  });

  describe('certification dates', () => {
    it('does not flag a certification with both dates blank', () => {
      const warnings = service.validate(
        buildData({ certifications: [{ title: 'AWS SAA', issuingBody: 'AWS' }] }),
      );
      expect(warnings).toEqual([]);
    });

    it('flags a malformed, non-blank certification start date', () => {
      const warnings = service.validate(
        buildData({ certifications: [{ title: 'AWS SAA', issuingBody: 'AWS', startDate: '2022' }] }),
      );
      expect(warnings).toContainEqual({
        path: 'certifications[0].startDate',
        message: '"2022" is not a valid YYYY-MM-DD date.',
      });
    });
  });

  describe('education dates', () => {
    it('does not flag an education entry with both dates blank', () => {
      const warnings = service.validate(
        buildData({ education: [{ institution: 'UP', qualification: 'BSc CS' }] }),
      );
      expect(warnings).toEqual([]);
    });

    it('flags a malformed, non-blank education end date', () => {
      const warnings = service.validate(
        buildData({
          education: [{ institution: 'UP', qualification: 'BSc CS', startDate: '2019-01-01', endDate: '2022/12' }],
        }),
      );
      expect(warnings).toContainEqual({
        path: 'education[0].endDate',
        message: '"2022/12" is not a valid YYYY-MM-DD date.',
      });
    });
  });

  it('collects every warning across sections in a single call, not just the first', () => {
    const warnings = service.validate(
      buildData({
        contact: { fullName: 'Jane Doe', email: 'bad-email', phone: 'bad-phone' },
        certifications: [{ title: 'X', issuingBody: 'Y', startDate: 'not-a-date' }],
      }),
    );
    expect(warnings.map((w) => w.path).sort()).toEqual(
      ['certifications[0].startDate', 'contact.email', 'contact.phone'].sort(),
    );
  });
});