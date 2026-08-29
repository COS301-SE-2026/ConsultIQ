import { Test, TestingModule } from '@nestjs/testing';
import { CvExtractionService } from './cv-extraction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from './s3.service';
import { CvOcrService } from './cv-ocr.service';
import { ClaudeExtractionService } from './claude-extraction.service';
import { CvParsingService } from './cv-parsing.service';
import { CvFieldValidatorService } from './cv-field-validator.service';
import { ParsedCvData } from '../types/parsed-cv.types';

const sampleParsedData: ParsedCvData = {
  contact: { fullName: 'Jane Doe', email: 'jane@example.com' },
  skills: [],
  experiences: [],
  certifications: [],
  education: [],
  confidenceScores: { contact: 1, skills: 1, experience: 1, certifications: 1, education: 1, overall: 1 },
};

describe('CvExtractionService', () => {
  let service: CvExtractionService;
  let prisma: { cvFile: { findUniqueOrThrow: jest.Mock; update: jest.Mock } };
  let s3: { downloadFile: jest.Mock };
  let ocr: { extractText: jest.Mock };
  let claudeExtraction: { extractCvData: jest.Mock };
  let ruleBasedParsing: { parse: jest.Mock };
  let validator: { validate: jest.Mock };

  beforeEach(async () => {
    prisma = { cvFile: { findUniqueOrThrow: jest.fn(), update: jest.fn() } };
    s3 = { downloadFile: jest.fn() };
    ocr = { extractText: jest.fn() };
    claudeExtraction = { extractCvData: jest.fn() };
    ruleBasedParsing = { parse: jest.fn() };
    validator = { validate: jest.fn().mockReturnValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvExtractionService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
        { provide: CvOcrService, useValue: ocr },
        { provide: ClaudeExtractionService, useValue: claudeExtraction },
        { provide: CvParsingService, useValue: ruleBasedParsing },
        { provide: CvFieldValidatorService, useValue: validator },
      ],
    }).compile();

    service = module.get(CvExtractionService);
  });

  it('sets PROCESSING as the first database write, before anything else runs', async () => {
    prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
      id: 'cv-1', s3Key: 'key', mimeType: 'application/pdf', parsingMethod: 'RULE_BASED',
    });
    s3.downloadFile.mockResolvedValue(Buffer.from(''));
    ruleBasedParsing.parse.mockResolvedValue({ success: true, data: sampleParsedData, processingTimeMs: 10 });

    await service.processExtraction('cv-1');

    expect(prisma.cvFile.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'cv-1' },
      data: { extractionStatus: 'PROCESSING' },
    });
  });

  describe('rule-based path', () => {
    it('rejects a non-PDF file without calling CvParsingService at all', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        parsingMethod: 'RULE_BASED',
      });
      s3.downloadFile.mockResolvedValue(Buffer.from(''));

      await service.processExtraction('cv-1');

      expect(ruleBasedParsing.parse).not.toHaveBeenCalled();
      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('FAILED');
      expect(finalUpdate.data.parsedData.error).toMatch(/only supports the PDF/i);
    });

    it('calls CvParsingService for a PDF and persists REVIEW_REQUIRED on success', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key', mimeType: 'application/pdf', parsingMethod: 'RULE_BASED',
      });
      const fileBuffer = Buffer.from('pdf-bytes');
      s3.downloadFile.mockResolvedValue(fileBuffer);
      ruleBasedParsing.parse.mockResolvedValue({ success: true, data: sampleParsedData, processingTimeMs: 50 });

      await service.processExtraction('cv-1');

      expect(ruleBasedParsing.parse).toHaveBeenCalledWith(fileBuffer);
      expect(ocr.extractText).not.toHaveBeenCalled();
      expect(claudeExtraction.extractCvData).not.toHaveBeenCalled();
      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('REVIEW_REQUIRED');
      expect(finalUpdate.data.parsedData.data).toEqual(sampleParsedData);
    });

    it('persists FAILED, and never calls the validator, when CvParsingService itself fails', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key', mimeType: 'application/pdf', parsingMethod: 'RULE_BASED',
      });
      s3.downloadFile.mockResolvedValue(Buffer.from(''));
      ruleBasedParsing.parse.mockResolvedValue({
        success: false, error: 'Template has no name filled in — cannot proceed.', processingTimeMs: 10,
      });

      await service.processExtraction('cv-1');

      expect(validator.validate).not.toHaveBeenCalled();
      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('FAILED');
    });
  });

  describe('AI-assisted path', () => {
    it('runs OCR then Claude extraction, in order, for any non-RULE_BASED method', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key', mimeType: 'application/pdf', parsingMethod: 'AI_ASSISTED',
      });
      const fileBuffer = Buffer.from('pdf-bytes');
      s3.downloadFile.mockResolvedValue(fileBuffer);
      ocr.extractText.mockResolvedValue('extracted raw text');
      claudeExtraction.extractCvData.mockResolvedValue({ success: true, data: sampleParsedData, processingTimeMs: 800 });

      await service.processExtraction('cv-1');

      expect(ocr.extractText).toHaveBeenCalledWith(fileBuffer, 'application/pdf');
      expect(claudeExtraction.extractCvData).toHaveBeenCalledWith('extracted raw text');
      expect(ruleBasedParsing.parse).not.toHaveBeenCalled();
      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('REVIEW_REQUIRED');
    });

    it('does not reject a DOCX file the way the rule-based path does', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        parsingMethod: 'AI_ASSISTED',
      });
      s3.downloadFile.mockResolvedValue(Buffer.from(''));
      ocr.extractText.mockResolvedValue('docx text');
      claudeExtraction.extractCvData.mockResolvedValue({ success: true, data: sampleParsedData, processingTimeMs: 500 });

      await service.processExtraction('cv-1');

      expect(ocr.extractText).toHaveBeenCalled();
      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('REVIEW_REQUIRED');
    });

    it('persists FAILED when Claude extraction itself reports failure', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key', mimeType: 'application/pdf', parsingMethod: 'AI_ASSISTED',
      });
      s3.downloadFile.mockResolvedValue(Buffer.from(''));
      ocr.extractText.mockResolvedValue('text');
      claudeExtraction.extractCvData.mockResolvedValue({
        success: false, error: 'insufficient credits', processingTimeMs: 200,
      });

      await service.processExtraction('cv-1');

      expect(validator.validate).not.toHaveBeenCalled();
      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('FAILED');
      expect(finalUpdate.data.parsedData.error).toBe('insufficient credits');
    });
  });

  describe('validator invocation', () => {
    it('runs the validator against the parsed data and includes its warnings in what gets persisted', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key', mimeType: 'application/pdf', parsingMethod: 'RULE_BASED',
      });
      s3.downloadFile.mockResolvedValue(Buffer.from(''));
      ruleBasedParsing.parse.mockResolvedValue({ success: true, data: sampleParsedData, processingTimeMs: 10 });
      const warnings = [{ path: 'contact.email', message: 'looks malformed' }];
      validator.validate.mockReturnValue(warnings);

      await service.processExtraction('cv-1');

      expect(validator.validate).toHaveBeenCalledWith(sampleParsedData);
      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.parsedData.fieldWarnings).toEqual(warnings);
    });
  });

  describe('unhandled errors', () => {
    it('resolves to a clean FAILED status if the CvFile row cannot be found', async () => {
      prisma.cvFile.findUniqueOrThrow.mockRejectedValue(new Error('No CvFile found'));

      await service.processExtraction('missing-id');

      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('FAILED');
      expect(finalUpdate.data.parsedData.error).toBe('No CvFile found');
    });

    it('resolves to a clean FAILED status if the S3 download throws', async () => {
      prisma.cvFile.findUniqueOrThrow.mockResolvedValue({
        id: 'cv-1', s3Key: 'key', mimeType: 'application/pdf', parsingMethod: 'RULE_BASED',
      });
      s3.downloadFile.mockRejectedValue(new Error('S3 unreachable'));

      await service.processExtraction('cv-1');

      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.extractionStatus).toBe('FAILED');
      expect(finalUpdate.data.parsedData.error).toBe('S3 unreachable');
    });

    it('falls back to a generic message for a non-Error throw', async () => {
      prisma.cvFile.findUniqueOrThrow.mockRejectedValue('a plain string rejection');

      await service.processExtraction('cv-1');

      const finalUpdate = prisma.cvFile.update.mock.calls[1][0];
      expect(finalUpdate.data.parsedData.error).toBe('Unknown error during CV processing.');
    });
  });
});