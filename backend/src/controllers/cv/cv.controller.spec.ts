import { Test, TestingModule } from '@nestjs/testing';
import { CvController } from './cv.controller';
import { CVUploadService } from '../../cv-parsing/services/cv-upload.service';
import { BadRequestException } from '@nestjs/common';
import { CvParsingMethodDto, UploadCvDto } from '../../cv-parsing/dto/upload-cv.dto';
import { CvParsingMethod } from '@prisma/client';
import { SecurityReviewDecision, ResolveSecurityReviewDto } from '../../cv-parsing/dto/resolve-security-review.dto';

const mockCVUploadService = {
  uploadCV: jest.fn(),
  getPresignedUrl: jest.fn(),
  getCvFile: jest.fn(),
  discardCvFile: jest.fn(),
  getFlaggedForCm: jest.fn(),
  getSecurityReviewQueue: jest.fn(),
  resolveSecurityReview: jest.fn(),
  getResolvedHistory: jest.fn(),
  getDashboardStats: jest.fn(),
};

const mockFile = (): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'cv.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('mock content'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
});

const mockReq = (userId = 'cm-uuid-1') => ({ user: { id: userId } } as any);

describe('CvController', () => {
  let controller: CvController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CvController],
      providers: [
        { provide: CVUploadService, useValue: mockCVUploadService },
      ],
    }).compile();

    controller = module.get<CvController>(CvController);
    jest.clearAllMocks();
  });

  describe('uploadCv', () => {
    it('should call service with userId, file, uploadedByUserId (from req.user.id) and the parsing method', async () => {
      mockCVUploadService.uploadCV.mockResolvedValue({
        cvFileId: 'cvfile-uuid-1',
        message: 'CV uploaded successfully.',
      });

      const file = mockFile();
      const dto: UploadCvDto = { parsingMethod: CvParsingMethodDto.AI_ASSISTED };
      const req = mockReq('cm-uuid-1');
      const result = await controller.uploadCv('consultant-uuid-1', file, req, dto);

      expect(mockCVUploadService.uploadCV).toHaveBeenCalledWith(
        'consultant-uuid-1',
        'cm-uuid-1',
        file,
        CvParsingMethod.AI_ASSISTED,
      );
      expect(result.cvFileId).toBe('cvfile-uuid-1');
      expect(result.message).toBe('CV uploaded successfully.');
    });

    it('does not throw when dto itself is undefined, and passes undefined through for the service to default', async () => {
      mockCVUploadService.uploadCV.mockResolvedValue({
        cvFileId: 'cvfile-uuid-2',
        message: 'CV uploaded successfully.',
      });

      const file = mockFile();
      const req = mockReq('cm-uuid-1');
      const result = await controller.uploadCv('consultant-uuid-1', file, req, undefined as any);

      expect(mockCVUploadService.uploadCV).toHaveBeenCalledWith(
        'consultant-uuid-1',
        'cm-uuid-1',
         file,
        undefined,
      );

      expect(result.cvFileId).toBe('cvfile-uuid-2');
    });

    it('should throw BadRequestException if no file is uploaded', async () => {
      const req = mockReq('cm-uuid-1');
      await expect(
        controller.uploadCv('consultant-uuid-1', undefined as any, req, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate errors from service', async () => {
      mockCVUploadService.uploadCV.mockRejectedValue(
        new BadRequestException('Only PDF and DOCX files are supported.'),
      );

      const req = mockReq('cm-uuid-1');
      await expect(
        controller.uploadCv('consultant-uuid-1', mockFile(), req, {} as UploadCvDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes a different uploadedByUserId through when a different CM is authenticated', async () => {
      mockCVUploadService.uploadCV.mockResolvedValue({
        cvFileId: 'cvfile-uuid-3',
        message: 'CV uploaded successfully.',
      });

      const req = mockReq('cm-uuid-2');
      await controller.uploadCv('consultant-uuid-1', mockFile(), req, undefined as any);

      expect(mockCVUploadService.uploadCV).toHaveBeenCalledWith(
        'consultant-uuid-1',
        'cm-uuid-2',
        expect.anything(),
        undefined,
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should return a presigned URL for a valid cvFileId', async () => {
      mockCVUploadService.getPresignedUrl.mockResolvedValue({
        url: 'https://s3.example.com/signed-url',
      });

      const result = await controller.getPresignedUrl('cvfile-uuid-1');

      expect(mockCVUploadService.getPresignedUrl).toHaveBeenCalledWith('cvfile-uuid-1');
      expect(result.url).toBe('https://s3.example.com/signed-url');
    });

    it('should propagate errors from service', async () => {
      mockCVUploadService.getPresignedUrl.mockRejectedValue(
        new BadRequestException('CV file with id nonexistent not found.'),
      );

      await expect(
        controller.getPresignedUrl('nonexistent'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCvFile', () => {
    it('should return the CV metadata, including security review fields, for a valid cvFileId', async () => {
      const updatedAt = new Date('2026-01-15T00:00:00.000Z');
      mockCVUploadService.getCvFile.mockResolvedValue({
        cvFileId: 'cvfile-uuid-1',
        fileName: 'cv.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadStatus: 'UPLOADED',
        extractionStatus: 'PENDING',
        securityReviewStatus: 'NONE',
        securityReviewedAt: null,
        securityReviewedBy: null,
        parsedData: null,
        updatedAt,
      });

      const result = await controller.getCvFile('cvfile-uuid-1');

      expect(mockCVUploadService.getCvFile).toHaveBeenCalledWith('cvfile-uuid-1');
      expect(result.cvFileId).toBe('cvfile-uuid-1');
      expect(result.fileName).toBe('cv.pdf');
      expect(result.uploadStatus).toBe('UPLOADED');
      expect(result.securityReviewStatus).toBe('NONE');
    });

    it('should propagate errors from the service', async () => {
      mockCVUploadService.getCvFile.mockRejectedValue(
        new BadRequestException('CV file with id nonexistent not found.'),
      );

      await expect(controller.getCvFile('nonexistent')).rejects.toThrow(BadRequestException);
    });
  });

  describe('discardCvFile', () => {
    it('should discard a CV and return the success message', async () => {
      mockCVUploadService.discardCvFile.mockResolvedValue({ message: 'CV discarded successfully.' });

      const result = await controller.discardCvFile('cvfile-uuid-1');

      expect(mockCVUploadService.discardCvFile).toHaveBeenCalledWith('cvfile-uuid-1');
      expect(result.message).toBe('CV discarded successfully.');
    });

    it('should propagate errors from the service', async () => {
      mockCVUploadService.discardCvFile.mockRejectedValue(
        new BadRequestException('Cannot discard a CV that has already been linked to a consultant profile.'),
      );
      await expect(controller.discardCvFile('consultant-linked-cv')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFlagged', () => {
    it('should call getFlaggedForCm with the authenticated CM id from req.user.id', async () => {
      mockCVUploadService.getFlaggedForCm.mockResolvedValue([
        { cvFileId: 'cvfile-uuid-1', consultantName: 'Maria Slopes', securityReviewStatus: 'PENDING' },
      ]);

      const req = mockReq('cm-uuid-1');
      const result = await controller.getFlagged(req);

      expect(mockCVUploadService.getFlaggedForCm).toHaveBeenCalledWith('cm-uuid-1');
      expect(result).toHaveLength(1);
      expect(result[0].consultantName).toBe('Maria Slopes');
    });

    it('should scope to a different CM when a different user is authenticated', async () => {
      mockCVUploadService.getFlaggedForCm.mockResolvedValue([]);

      const req = mockReq('cm-uuid-2');
      await controller.getFlagged(req);

      expect(mockCVUploadService.getFlaggedForCm).toHaveBeenCalledWith('cm-uuid-2');
    });

    it('should propagate errors from the service', async () => {
      mockCVUploadService.getFlaggedForCm.mockRejectedValue(new Error('DB unreachable'));
      await expect(controller.getFlagged(mockReq())).rejects.toThrow('DB unreachable');
    });
  });

  describe('getSecurityReviewQueue', () => {
    it('should return the pending queue from the service', async () => {
      mockCVUploadService.getSecurityReviewQueue.mockResolvedValue([
        { cvFileId: 'cvfile-uuid-1', consultantName: 'Maria Slopes', securityFlags: [] },
      ]);

      const result = await controller.getSecurityReviewQueue();

      expect(mockCVUploadService.getSecurityReviewQueue).toHaveBeenCalledWith();
      expect(result).toHaveLength(1);
    });

    it('should propagate errors from the service', async () => {
      mockCVUploadService.getSecurityReviewQueue.mockRejectedValue(new Error('DB unreachable'));
      await expect(controller.getSecurityReviewQueue()).rejects.toThrow('DB unreachable');
    });
  });

  describe('resolveSecurityReview', () => {
    it('should call the service with cvFileId, decision, and the acting super admin id from req.user.id', async () => {
      mockCVUploadService.resolveSecurityReview.mockResolvedValue({
        message: 'CV security review resolved as CLEARED.',
      });

      const dto: ResolveSecurityReviewDto = { decision: SecurityReviewDecision.CLEARED };
      const req = mockReq('sa-uuid-1');
      const result = await controller.resolveSecurityReview('cvfile-uuid-1', dto, req);

      expect(mockCVUploadService.resolveSecurityReview).toHaveBeenCalledWith(
        'cvfile-uuid-1',
        SecurityReviewDecision.CLEARED,
        'sa-uuid-1',
      );
      expect(result.message).toMatch(/CLEARED/);
    });

    it('should work identically for a REJECTED decision', async () => {
      mockCVUploadService.resolveSecurityReview.mockResolvedValue({
        message: 'CV security review resolved as REJECTED.',
      });

      const dto: ResolveSecurityReviewDto = { decision: SecurityReviewDecision.REJECTED };
      const req = mockReq('sa-uuid-1');
      await controller.resolveSecurityReview('cvfile-uuid-1', dto, req);

      expect(mockCVUploadService.resolveSecurityReview).toHaveBeenCalledWith(
        'cvfile-uuid-1',
        SecurityReviewDecision.REJECTED,
        'sa-uuid-1',
      );
    });

    it('should propagate errors from the service, e.g. when the CV is not pending', async () => {
      mockCVUploadService.resolveSecurityReview.mockRejectedValue(
        new BadRequestException('This CV is not pending security review (current status: CLEARED).'),
      );

      const dto: ResolveSecurityReviewDto = { decision: SecurityReviewDecision.CLEARED };
      await expect(
        controller.resolveSecurityReview('cvfile-uuid-1', dto, mockReq()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSecurityReviewHistory', () => {
    it('should return resolved history from the service', async () => {
      mockCVUploadService.getResolvedHistory.mockResolvedValue([
        {
          cvFileId: 'cvfile-uuid-1',
          consultantName: 'Maria Slopes',
          decision: 'CLEARED',
          reviewedByName: 'Super Admin',
        },
      ]);

      const result = await controller.getSecurityReviewHistory();

      expect(mockCVUploadService.getResolvedHistory).toHaveBeenCalledWith();
      expect(result).toHaveLength(1);
      expect(result[0].decision).toBe('CLEARED');
    });

    it('should propagate errors from the service', async () => {
      mockCVUploadService.getResolvedHistory.mockRejectedValue(new Error('DB unreachable'));
      await expect(controller.getSecurityReviewHistory()).rejects.toThrow('DB unreachable');
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats from the service', async () => {
      mockCVUploadService.getDashboardStats.mockResolvedValue({
        totalProcessed: 10,
        flagRatePercent: 40,
        avgResolutionHours: 3,
      });

      const result = await controller.getDashboardStats();

      expect(mockCVUploadService.getDashboardStats).toHaveBeenCalledWith();
      expect(result.totalProcessed).toBe(10);
      expect(result.flagRatePercent).toBe(40);
    });

    it('should propagate a null avgResolutionHours as-is when there is no resolved history yet', async () => {
      mockCVUploadService.getDashboardStats.mockResolvedValue({
        totalProcessed: 0,
        flagRatePercent: 0,
        avgResolutionHours: null,
      });

      const result = await controller.getDashboardStats();

      expect(result.avgResolutionHours).toBeNull();
    });

    it('should propagate errors from the service', async () => {
      mockCVUploadService.getDashboardStats.mockRejectedValue(new Error('DB unreachable'));
      await expect(controller.getDashboardStats()).rejects.toThrow('DB unreachable');
    });
  });
});