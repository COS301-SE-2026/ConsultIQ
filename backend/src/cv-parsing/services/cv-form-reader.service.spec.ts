import { CvFormReaderService } from './cv-form-reader.service';
import { PDFDocument } from 'pdf-lib';

jest.mock('pdf-lib', () => ({
  PDFDocument: { load: jest.fn() },
}));

function mockForm(fields: Record<string, string | string[]>) {
  return {
    getTextField: (name: string) => {
      if (typeof fields[name] !== 'string') {
        throw new Error(`PDFDocument has no form field with the name "${name}"`);
      }
      return { getText: () => fields[name] as string };
    },
    getDropdown: (name: string) => {
      if (!Array.isArray(fields[name])) {
        throw new Error(`PDFDocument has no form field with the name "${name}"`);
      }
      return { getSelected: () => fields[name] as string[] };
    },
  };
}

function mockPdf(fields: Record<string, string | string[]>) {
  (PDFDocument.load as jest.Mock).mockResolvedValue({
    getForm: () => mockForm(fields),
  });
}

describe('CvFormReaderService', () => {
  let service: CvFormReaderService;

  beforeEach(() => {
    service = new CvFormReaderService();
    jest.clearAllMocks();
  });

  describe('contact', () => {
    it('reads and trims all contact fields', async () => {
      mockPdf({
        full_name: '  Jane Doe  ',
        email: 'jane@example.com',
        phone: '0821234567',
        address_line1: '1 Main Road',
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        postal_code: '2196',
        nationality: 'South African',
      });

      const result = await service.read(Buffer.from(''));

      expect(result.contact).toEqual({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '0821234567',
        addressLine1: '1 Main Road',
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
        nationality: 'South African',
      });
    });

    it('returns an empty string, not a thrown error, for a field missing from the PDF', async () => {
      mockPdf({ full_name: 'Jane Doe' }); // every other contact field absent entirely

      const result = await service.read(Buffer.from(''));

      expect(result.contact.email).toBe('');
      expect(result.contact.phone).toBe('');
    });
  });

  describe('skills', () => {
    it('includes only skill slots with a non-empty name', async () => {
      mockPdf({
        full_name: 'Jane Doe',
        skill_1_name: 'TypeScript',
        skill_1_years: '4',
        skill_2_name: '',
        skill_2_years: '2',
      });

      const result = await service.read(Buffer.from(''));

      expect(result.skills).toEqual([{ name: 'TypeScript', years: '4' }]);
    });

    it('does not stop at the first blank slot — later filled skills still come through', async () => {
      mockPdf({
        full_name: 'Jane Doe',
        skill_1_name: 'TypeScript',
        skill_1_years: '4',
        skill_2_name: '', // deliberately blank, in the middle
        skill_3_name: 'Python',
        skill_3_years: '2',
      });

      const result = await service.read(Buffer.from(''));

      expect(result.skills.map((s) => s.name)).toEqual(['TypeScript', 'Python']);
    });
  });

  describe('experiences — presence anchored on title, not the dropdowns', () => {
    it('omits a role entirely when title is blank, even though the dropdowns still report a default', async () => {
      mockPdf({
        full_name: 'Jane Doe',
        exp_1_title: '',
        exp_1_company: '',
        // Simulates the real bug this service exists to avoid: a dropdown
        // still returns its default selection even when the rest of the
        // row was never touched.
        exp_1_job_type: ['FULL_TIME'],
        exp_1_work_model: ['ONSITE'],
      });

      const result = await service.read(Buffer.from(''));

      expect(result.experiences).toEqual([]);
    });

    it('includes a role once title is present, with its dropdown values', async () => {
      mockPdf({
        full_name: 'Jane Doe',
        exp_1_title: 'Software Engineer',
        exp_1_company: 'BBD',
        exp_1_job_type: ['CONTRACT'],
        exp_1_work_model: ['HYBRID'],
        exp_1_start: '2022-01-01',
        exp_1_end: '',
        exp_1_description: 'Built things.',
      });

      const result = await service.read(Buffer.from(''));

      expect(result.experiences).toEqual([
        {
          title: 'Software Engineer',
          company: 'BBD',
          jobType: 'CONTRACT',
          workModel: 'HYBRID',
          start: '2022-01-01',
          end: '',
          description: 'Built things.',
        },
      ]);
    });
  });

  describe('certifications — presence anchored on title', () => {
    it('omits a certification entirely when title is blank', async () => {
      mockPdf({ full_name: 'Jane Doe', cert_1_title: '' });
      const result = await service.read(Buffer.from(''));
      expect(result.certifications).toEqual([]);
    });

    it('includes a certification once title is present', async () => {
      mockPdf({
        full_name: 'Jane Doe',
        cert_1_title: 'AWS Solutions Architect',
        cert_1_body: 'AWS',
        cert_1_start: '2023-05-01',
        cert_1_end: '',
      });
      const result = await service.read(Buffer.from(''));
      expect(result.certifications).toEqual([
        { title: 'AWS Solutions Architect', issuingBody: 'AWS', start: '2023-05-01', end: '' },
      ]);
    });
  });

  describe('education — presence anchored on qualification', () => {
    it('omits an education entry entirely when qualification is blank', async () => {
      mockPdf({ full_name: 'Jane Doe', edu_1_qualification: '' });
      const result = await service.read(Buffer.from(''));
      expect(result.education).toEqual([]);
    });

    it('includes an education entry once qualification is present', async () => {
      mockPdf({
        full_name: 'Jane Doe',
        edu_1_qualification: 'BSc Computer Science',
        edu_1_institution: 'University of Pretoria',
        edu_1_field: 'Computer Science',
        edu_1_start: '2019-01-01',
        edu_1_end: '2022-12-01',
      });
      const result = await service.read(Buffer.from(''));
      expect(result.education).toEqual([
        {
          qualification: 'BSc Computer Science',
          institution: 'University of Pretoria',
          fieldOfStudy: 'Computer Science',
          start: '2019-01-01',
          end: '2022-12-01',
        },
      ]);
    });
  });

  it('returns fully empty arrays/fields for a template with nothing filled in beyond a name', async () => {
    mockPdf({ full_name: 'Jane Doe' });

    const result = await service.read(Buffer.from(''));

    expect(result.skills).toEqual([]);
    expect(result.experiences).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.education).toEqual([]);
  });
});