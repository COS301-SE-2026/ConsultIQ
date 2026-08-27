// src/cv-parsing/services/cv-parsing.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { CvParsingService } from './cv-parsing.service';
import { CvFormReaderService, RawTemplateData } from './cv-form-reader.service';

function baseRawData(overrides: Partial<RawTemplateData> = {}): RawTemplateData {
  return {
    contact: {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '0821234567',
      addressLine1: '',
      suburb: '',
      city: '',
      province: '',
      postalCode: '',
      nationality: '',
    },
    skills: [],
    experiences: [],
    certifications: [],
    education: [],
    ...overrides,
  };
}

describe('CvParsingService', () => {
  let service: CvParsingService;
  let mockRead: jest.Mock;

  beforeEach(async () => {
    mockRead = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvParsingService,
        { provide: CvFormReaderService, useValue: { read: mockRead } },
      ],
    }).compile();

    service = module.get(CvParsingService);
  });

  it('fails immediately if no full name is present, without processing anything else', async () => {
    mockRead.mockResolvedValue(
      baseRawData({ contact: { ...baseRawData().contact, fullName: '' } }),
    );

    const result = await service.parse(Buffer.from('irrelevant'));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no name/i);
  });

  it('returns a failure if the form reader throws', async () => {
    mockRead.mockRejectedValue(new Error('corrupt PDF'));

    const result = await service.parse(Buffer.from('irrelevant'));

    expect(result.success).toBe(false);
    expect(result.error).toBe('corrupt PDF');
  });

  describe('contact', () => {
    it('accepts a valid email and phone with full confidence', async () => {
      mockRead.mockResolvedValue(baseRawData());
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.contact).toBe(1.0);
    });

    it('reduces confidence for a malformed email', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ contact: { ...baseRawData().contact, email: 'not-an-email' } }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.contact.email).toBe('not-an-email'); // captured as-is, not discarded
      expect(result.data?.confidenceScores.contact).toBeLessThan(1.0);
    });

    it.each(['0821234567', '+27821234567', '+27 (0) 82 123 4567', '011 234 5678'])(
      'accepts valid SA phone format: %s',
      async (phone) => {
        mockRead.mockResolvedValue(baseRawData({ contact: { ...baseRawData().contact, phone } }));
        const result = await service.parse(Buffer.from(''));
        expect(result.data?.confidenceScores.contact).toBe(1.0);
      },
    );

    it('reduces confidence for an unrecognised phone format', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ contact: { ...baseRawData().contact, phone: '123' } }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.contact).toBeLessThan(1.0);
    });
  });

  describe('skills', () => {
    it('resolves an exact dictionary match to its canonical name with full confidence', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ skills: [{ name: 'TypeScript', years: '4' }] }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.skills[0]).toEqual({
        skillName: 'TypeScript',
        yearsExperience: 4,
        extractionConfidence: 1.0,
      });
    });

    it('resolves a known alias to its canonical name', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ skills: [{ name: 'golang', years: '2' }] }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.skills[0].skillName).toBe('Go');
    });

    it('is case-insensitive on the typed skill name', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ skills: [{ name: 'typescript', years: '1' }] }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.skills[0].skillName).toBe('TypeScript');
    });

    it('keeps the raw typed name and lowers confidence for an unmatched skill', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ skills: [{ name: 'Underwater Basket Weaving', years: '5' }] }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.skills[0].skillName).toBe('Underwater Basket Weaving');
      expect(result.data?.skills[0].extractionConfidence).toBe(0.3);
    });

    it('lowers confidence (but does not drop the skill) when years is missing or invalid', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ skills: [{ name: 'TypeScript', years: '' }] }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.skills[0].yearsExperience).toBe(0);
      expect(result.data?.skills[0].extractionConfidence).toBe(0.5);
    });

    it('rounds a non-integer years value', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ skills: [{ name: 'TypeScript', years: '3.7' }] }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.skills[0].yearsExperience).toBe(4);
    });

    it('treats a negative years value as invalid', async () => {
      mockRead.mockResolvedValue(
        baseRawData({ skills: [{ name: 'TypeScript', years: '-2' }] }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.skills[0].yearsExperience).toBe(0);
      expect(result.data?.skills[0].extractionConfidence).toBe(0.5);
    });
  });

  describe('experience', () => {
    it('penalises a missing start date', async () => {
      mockRead.mockResolvedValue(
        baseRawData({
          experiences: [{ title: 'Dev', company: 'BBD', jobType: 'FULL_TIME', workModel: 'ONSITE', start: '', end: '', description: '' }],
        }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.experience).toBeLessThan(1.0);
    });

    it('does not penalise a blank end date (ongoing role)', async () => {
      mockRead.mockResolvedValue(
        baseRawData({
          experiences: [{ title: 'Dev', company: 'BBD', jobType: 'FULL_TIME', workModel: 'ONSITE', start: '2022-01-01', end: '', description: '' }],
        }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.experience).toBe(1.0);
    });

    it('penalises a malformed (non-blank) end date', async () => {
      mockRead.mockResolvedValue(
        baseRawData({
          experiences: [{ title: 'Dev', company: 'BBD', jobType: 'FULL_TIME', workModel: 'ONSITE', start: '2022-01-01', end: '2022/05/01', description: '' }],
        }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.experience).toBeLessThan(1.0);
    });
  });

  // NOTE: certifications currently do NOT penalise a blank start
  describe('certifications date handling', () => {
    it('does NOT penalise a certification with both dates blank', async () => {
      mockRead.mockResolvedValue(
        baseRawData({
          certifications: [{ title: 'AWS SAA', issuingBody: 'AWS', start: '', end: '' }],
        }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.certifications).toBe(1.0);
    });

    it('penalises a certification with a malformed, non-blank date', async () => {
      mockRead.mockResolvedValue(
        baseRawData({
          certifications: [{ title: 'AWS SAA', issuingBody: 'AWS', start: '01-2022', end: '' }],
        }),
      );
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.certifications).toBeLessThan(1.0);
    });
    });

    describe('education', () => {
    it('penalises a missing start date', async () => {
        mockRead.mockResolvedValue(
        baseRawData({
            education: [{ qualification: 'BSc CS', institution: 'UP', fieldOfStudy: '', start: '', end: '' }],
        }),
        );
        const result = await service.parse(Buffer.from(''));
        expect(result.data?.confidenceScores.education).toBeLessThan(1.0);
    });

    it('does not penalise a blank end date (ongoing studies)', async () => {
        mockRead.mockResolvedValue(
        baseRawData({
            education: [{ qualification: 'BSc CS', institution: 'UP', fieldOfStudy: '', start: '2020-01-01', end: '' }],
        }),
        );
        const result = await service.parse(Buffer.from(''));
        expect(result.data?.confidenceScores.education).toBe(1.0);
    });

    it('penalises a malformed (non-blank) end date', async () => {
        mockRead.mockResolvedValue(
        baseRawData({
            education: [{ qualification: 'BSc CS', institution: 'UP', fieldOfStudy: '', start: '2020-01-01', end: '2024/06' }],
        }),
        );
        const result = await service.parse(Buffer.from(''));
        expect(result.data?.confidenceScores.education).toBeLessThan(1.0);
    });
});

  describe('confidence aggregation', () => {
    it('defaults empty categories to full confidence rather than penalising absence', async () => {
      mockRead.mockResolvedValue(baseRawData()); // no skills, experience, certs, education at all
      const result = await service.parse(Buffer.from(''));
      expect(result.data?.confidenceScores.skills).toBe(1.0);
      expect(result.data?.confidenceScores.experience).toBe(1.0);
      expect(result.data?.confidenceScores.certifications).toBe(1.0);
      expect(result.data?.confidenceScores.education).toBe(1.0);
      expect(result.data?.confidenceScores.overall).toBe(1.0);
    });

    it('overall confidence is the average across all five categories', async () => {
      mockRead.mockResolvedValue(
        baseRawData({
          contact: { ...baseRawData().contact, email: 'bad-email' }, // contact confidence: 0.6
          skills: [{ name: 'Underwater Basket Weaving', years: '1' }], // skills confidence: 0.3
        }),
      );
      const result = await service.parse(Buffer.from(''));
      const scores = result.data!.confidenceScores;
      const expectedOverall =
        (scores.contact + scores.skills + scores.experience + scores.certifications + scores.education) / 5;
      expect(scores.overall).toBeCloseTo(expectedOverall, 5);
    });
  });
});