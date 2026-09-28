import { Test, TestingModule } from '@nestjs/testing';
import { CVUploadService } from './cv-upload.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from './s3.service';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { CV_PROCESSING_QUEUE } from '../queues/cv-processing.queue';
import { AuditLogService } from '../../auth/../audit-log/services/audit-log.service';
import { NotificationService } from '../../notification/service/notification.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  cvFile: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(), 
    update: jest.fn(),
    count: jest.fn(),   
  },
};

const mockS3Service = {
  generateS3Key: jest.fn(),
  uploadFile: jest.fn(),
  getObjectUrl: jest.fn(),
  generatePresignedUrl: jest.fn(),
  deleteFile: jest.fn() 
};


const mockCvQueue = {
  add: jest.fn(),
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockNotificationService = {
  createAndSendNotification: jest.fn(),
};

const mockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'cv.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('mock file content'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
  ...overrides,
});

describe('CVUploadService', () => {
  let service: CVUploadService;

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CVUploadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: getQueueToken(CV_PROCESSING_QUEUE), useValue: mockCvQueue },
        { provide: AuditLogService, useValue: mockAuditLogService },      // NEW
        { provide: NotificationService, useValue: mockNotificationService }, 
      ],
    }).compile();

    service = module.get<CVUploadService>(CVUploadService);
    jest.clearAllMocks();
  });

  describe('uploadCV', () => {
    const userId = 'consultant-uuid-1';
    const cmId = 'cm-uuid-1';

    it('should throw BadRequestException for unsupported file type', async () => {
      const file = mockFile({ mimetype: 'image/jpeg' });

      await expect(
        service.uploadCV(userId,cmId, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds 10MB', async () => {
      const file = mockFile({ size: 11 * 1024 * 1024 });

      await expect(
        service.uploadCV(userId,cmId, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const file = mockFile();

      await expect(
        service.uploadCV(userId,cmId, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is not CONSULTANT', async () =>{
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'PROJECT_MANAGER',
        status: 'ACTIVE',
      });
      const file = mockFile();

      await expect(
        service.uploadCV(userId,cmId, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload file and create CvFile record for valid PDF', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId, role: 'CONSULTANT', status: 'ACTIVE', });
      mockS3Service.generateS3Key.mockReturnValue('cvs/consultant-uuid-1/uuid-cv.pdf');
      mockS3Service.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.cvFile.create.mockResolvedValue({
        id: 'cvfile-uuid-1',
        userId,
        fileName: 'cv.pdf',
      });

      const file = mockFile();
      const result = await service.uploadCV(userId,cmId, file);

      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.cvFile.create).toHaveBeenCalledTimes(1);
      expect(mockCvQueue.add).toHaveBeenCalledWith('cv-parse-job', { cvFileId: expect.any(String) });
      expect(result.cvFileId).toBe('cvfile-uuid-1');
      expect(result.message).toBe('CV uploaded successfully.');
    });

    it('should upload file for valid DOCX', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId, role: 'CONSULTANT', status: 'ACTIVE', });
      mockS3Service.generateS3Key.mockReturnValue('cvs/consultant-uuid-1/uuid-cv.docx');
      mockS3Service.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.cvFile.create.mockResolvedValue({
        id: 'cvfile-uuid-2',
        userId,
        fileName: 'cv.docx',
      });

      const file = mockFile({
        originalname: 'cv.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = await service.uploadCV(userId,cmId, file);

      expect(result.cvFileId).toBe('cvfile-uuid-2');
    });

    it('should create CvFile record with correct userId, consultantId, upload and extraction status', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId, role: 'CONSULTANT', status: 'ACTIVE', });
      mockS3Service.generateS3Key.mockReturnValue('cvs/consultant-uuid-1/uuid-cv.pdf');
      mockS3Service.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.cvFile.create.mockResolvedValue({
        id: 'cvfile-uuid-1',
        userId,
        cmId,
        fileName: 'cv.pdf',
      });

      await service.uploadCV(userId,cmId, mockFile());

      expect(mockPrismaService.cvFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uploadStatus: 'UPLOADED',
          extractionStatus: 'PENDING',
        }),
      });
    });

    it('should upload file and create CvFile record for valid PDF', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId, role: 'CONSULTANT', status: 'ACTIVE', });
      mockS3Service.generateS3Key.mockReturnValue('cvs/consultant-uuid-1/uuid-cv.pdf');
      mockS3Service.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.cvFile.create.mockResolvedValue({
        id: 'cvfile-uuid-1',
        userId,
        fileName: 'cv.pdf',
      });

      const file = mockFile();
      const result = await service.uploadCV(userId,cmId, file,);

      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.cvFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ uploadedByUserId: cmId }),
        }),
      );
      expect(mockCvQueue.add).toHaveBeenCalledWith('cv-parse-job', { cvFileId: expect.any(String) });
      expect(result.cvFileId).toBe('cvfile-uuid-1');
      expect(result.message).toBe('CV uploaded successfully.');
    });
  });

  describe('getPresignedUrl', () => {
    it('should throw BadRequestException if CvFile does not exist', async () => {
      mockPrismaService.cvFile.findUnique.mockResolvedValue(null);

      await expect(
        service.getPresignedUrl('nonexistent-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return a presigned URL for an existing CvFile', async () => {
      mockPrismaService.cvFile.findUnique.mockResolvedValue({
        id: 'cvfile-uuid-1',
        s3Key: 'cvs/consultant-uuid-1/uuid-cv.pdf',
      });
      mockS3Service.generatePresignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const result = await service.getPresignedUrl('cvfile-uuid-1');

      expect(mockS3Service.generatePresignedUrl).toHaveBeenCalledWith(
        'cvs/consultant-uuid-1/uuid-cv.pdf',
      );
      expect(result.url).toBe('https://s3.example.com/signed-url');
    });
  });

  describe('getCvFile', () => {
    it('should return the CV file mapped with cvFileId in place of id', async () => {
      const updatedAt = new Date().toISOString();
      mockPrismaService.cvFile.findUnique.mockResolvedValue({
        id: 'cvfile-uuid-1',
        fileName: 'cv.pdf',
        fileSize: '1024',
        mimeType: 'application/pdf',
        uploadStatus: 'UPLOADED',
        extractionStatus: 'REVIEW_REQUIRED',
        securityReviewStatus: 'NONE',      
        securityReviewedAt: null,           
        securityReviewedBy: null,           
        parsedData: {data: {}},
        updatedAt,
      });
    const result = await service.getCvFile('cvfile-uuid-1');
    
    expect(mockPrismaService.cvFile.findUnique).toHaveBeenCalledWith({
      where: { id: 'cvfile-uuid-1' },
      select: {
        id: true,
        fileName: true,
        fileSize: true ,
        mimeType: true,
        uploadStatus: true,
        extractionStatus: true,
        securityReviewStatus: true, 
        securityReviewedAt: true,    
        securityReviewedBy: true,  
        parsedData: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual({
        cvFileId: 'cvfile-uuid-1',
        fileName: 'cv.pdf',
        fileSize: '1024',
        mimeType: 'application/pdf',
        uploadStatus: 'UPLOADED',
        extractionStatus: 'REVIEW_REQUIRED',
        securityReviewStatus: 'NONE',  
        securityReviewedAt: null,      
        securityReviewedBy: null,  
        parsedData: {data: {}},
        updatedAt,
    });
  });

  it('should throw BadRequestException if the CV file record does not exist', async () => {
    mockPrismaService.cvFile.findUnique.mockResolvedValue(null);
    await expect(service.getCvFile('nonexistent-id')).rejects.toThrow(BadRequestException);
    await expect(service.getCvFile('nonexistent-id')).rejects.toThrow('CV file with id nonexistent-id not found.');
    });
  });

  describe('discardCvFile', () => {
    it('should delete the s3 file and DB record, and return a success message', async () => {
      mockPrismaService.cvFile.findUnique.mockResolvedValue({
        id: 'cvfile-uuid-1',
        s3Key: 'cvs//uuid-cv.pdf',
        consultantId: null,
      });
     
      const result = await service.discardCvFile('cvfile-uuid-1');

      expect(mockS3Service.deleteFile).toHaveBeenCalledWith('cvs//uuid-cv.pdf');

      expect(mockPrismaService.cvFile.delete).toHaveBeenCalledWith({where : { id: 'cvfile-uuid-1'},});
      expect(result).toEqual({message : "CV discarded successfully."});
    });

    it('should throw BadRequestException if the CV file record does not exist', async () =>{
      mockPrismaService.cvFile.findUnique.mockResolvedValue(null);

      await expect(service.discardCvFile('nonexistent-id')).rejects.toThrow(BadRequestException);
      expect(mockS3Service.deleteFile).not.toHaveBeenCalled();
      expect(mockPrismaService.cvFile.delete).not.toHaveBeenCalled();
    });

     it('should throw BadRequestException if the CV file is already linked to a consultant', async () =>{
      mockPrismaService.cvFile.findUnique.mockResolvedValue({
        id: 'cvfile-uuid-1',
        s3Key: 'cvs//uuid-cv.pdf',
        consultantId: 'consultant-uuid-1',
      });

      await expect(service.discardCvFile('consultant-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.discardCvFile('consultant-uuid-1')).rejects.toThrow('Cannot discard a CV that has already been linked to a consultant profile.');
      
      expect(mockS3Service.deleteFile).not.toHaveBeenCalled();
      expect(mockPrismaService.cvFile.delete).not.toHaveBeenCalled();
    });
  });

  describe('getSecurityReviewQueue', () => {
    it('returns only PENDING cv files, mapped with their flags', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([
        {
          id: 'cvfile-uuid-1',
          fileName: 'cv.pdf',
          uploadedAt: new Date('2026-09-01'),
          userId: 'consultant-uuid-1',
          consultantId: null,
          parsedData: { securityFlags: [{ field: 'contact.fullName', flagType: 'SCHEMA_MANIPULATION_ATTEMPT', excerpt: 'x' }] },
          user: { fullName: 'Maria Slopes', email: 'maria@example.com' },
        },
      ]);

      const result = await service.getSecurityReviewQueue();

      expect(mockPrismaService.cvFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { securityReviewStatus: 'PENDING' } }),
      );
      expect(result).toEqual([
        expect.objectContaining({
          cvFileId: 'cvfile-uuid-1',
          consultantName: 'Maria Slopes',
          consultantEmail: 'maria@example.com',
          securityFlags: [{ field: 'contact.fullName', flagType: 'SCHEMA_MANIPULATION_ATTEMPT', excerpt: 'x' }],
        }),
      ]);
    });

    it('defaults to an empty securityFlags array when parsedData has none', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([
        {
          id: 'cvfile-uuid-2',
          fileName: 'cv2.pdf',
          uploadedAt: new Date(),
          userId: 'consultant-uuid-2',
          parsedData: {},
          user: { fullName: 'John Doe', email: 'john@example.com' },
        },
      ]);

      const result = await service.getSecurityReviewQueue();
      expect(result[0].securityFlags).toEqual([]);
    });
  });

  describe('resolveSecurityReview', () => {
    it('throws NotFoundException when the CV file does not exist', async () => {
      mockPrismaService.cvFile.findUnique.mockResolvedValue(null);
      await expect(
        service.resolveSecurityReview('nonexistent-id', 'CLEARED' as any, 'sa-uuid-1'),
      ).rejects.toThrow('CV file with id nonexistent-id not found.');
    });

    it('throws BadRequestException if the CV is not currently PENDING', async () => {
      mockPrismaService.cvFile.findUnique.mockResolvedValue({
        id: 'cvfile-uuid-1',
        securityReviewStatus: 'CLEARED',
      });

      await expect(
        service.resolveSecurityReview('cvfile-uuid-1', 'CLEARED' as any, 'sa-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('clears a CV: updates status, logs audit, sends no notification', async () => {
      mockPrismaService.cvFile.findUnique.mockResolvedValue({
        id: 'cvfile-uuid-1',
        securityReviewStatus: 'PENDING',
        userId: 'consultant-uuid-1',
      });

      await service.resolveSecurityReview('cvfile-uuid-1', 'CLEARED' as any, 'sa-uuid-1');

      expect(mockPrismaService.cvFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cvfile-uuid-1' },
          data: expect.objectContaining({
            securityReviewStatus: 'CLEARED',
            securityReviewedBy: 'sa-uuid-1',
            extractionStatus: undefined,
          }),
        }),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CV_SECURITY_CLEARED', actingUserId: 'sa-uuid-1' }),
      );
      expect(mockNotificationService.createAndSendNotification).not.toHaveBeenCalled();
    });

    it('rejects a CV: flips extractionStatus, logs audit, notifies every ADMIN', async () => {
      mockPrismaService.cvFile.findUnique.mockResolvedValue({
        id: 'cvfile-uuid-1',
        securityReviewStatus: 'PENDING',
        userId: 'consultant-uuid-1',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ fullName: 'Maria Slopes' });
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'admin-uuid-1' },
        { id: 'admin-uuid-2' },
      ]);

      await service.resolveSecurityReview('cvfile-uuid-1', 'REJECTED' as any, 'sa-uuid-1');

      expect(mockPrismaService.cvFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            securityReviewStatus: 'REJECTED',
            extractionStatus: 'SECURITY_REJECTED',
          }),
        }),
      );
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CV_SECURITY_REJECTED' }),
      );
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'ADMIN' } }),
      );
      expect(mockNotificationService.createAndSendNotification).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.createAndSendNotification).toHaveBeenCalledWith(
        'admin-uuid-1',
        expect.any(String),
        expect.stringContaining('Maria Slopes'),
        expect.any(String),
      );
    });
  });

  describe('getFlaggedForCm', () => {
    it('scopes results to the given CM and PENDING/REJECTED statuses only', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([]);

      await service.getFlaggedForCm('cm-uuid-1');

      expect(mockPrismaService.cvFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uploadedByUserId: 'cm-uuid-1',
            securityReviewStatus: { in: ['PENDING', 'REJECTED'] },
          },
        }),
      );
    });

    it('maps results with consultant details and status', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([
        {
          id: 'cvfile-uuid-1',
          fileName: 'cv.pdf',
          uploadedAt: new Date('2026-09-01'),
          userId: 'consultant-uuid-1',
          securityReviewStatus: 'REJECTED',
          parsedData: { securityFlags: [] },
          user: { fullName: 'Maria Slopes', email: 'maria@example.com' },
        },
      ]);

      const result = await service.getFlaggedForCm('cm-uuid-1');

      expect(result).toEqual([
        expect.objectContaining({
          cvFileId: 'cvfile-uuid-1',
          consultantUserId: 'consultant-uuid-1',
          consultantName: 'Maria Slopes',
          securityReviewStatus: 'REJECTED',
        }),
      ]);
    });
  });

  describe('getResolvedHistory', () => {
    it('maps reviewer ids to names, defaulting to Unknown when not found', async () => {
      mockPrismaService.cvFile.findMany.mockResolvedValue([
        {
          id: 'cvfile-uuid-1',
          fileName: 'cv.pdf',
          securityReviewStatus: 'CLEARED',
          securityReviewedAt: new Date('2026-09-10'),
          securityReviewedBy: 'sa-uuid-1',
          userId: 'consultant-uuid-1',
          user: { fullName: 'Maria Slopes' },
        },
        {
          id: 'cvfile-uuid-2',
          fileName: 'cv2.pdf',
          securityReviewStatus: 'REJECTED',
          securityReviewedAt: new Date('2026-09-11'),
          securityReviewedBy: 'deleted-user-id',
          userId: 'consultant-uuid-2',
          user: { fullName: 'John Doe' },
        },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'sa-uuid-1', fullName: 'Super Admin' },
      ]);

      const result = await service.getResolvedHistory();

      expect(result[0].reviewedByName).toBe('Super Admin');
      expect(result[1].reviewedByName).toBe('Unknown');
    });
  });

  describe('getDashboardStats', () => {
    it('computes flag rate percentage and average resolution hours', async () => {
      mockPrismaService.cvFile.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(4);
      mockPrismaService.cvFile.findMany.mockResolvedValue([
        { uploadedAt: new Date('2026-09-01T00:00:00Z'), securityReviewedAt: new Date('2026-09-01T02:00:00Z') },
        { uploadedAt: new Date('2026-09-02T00:00:00Z'), securityReviewedAt: new Date('2026-09-02T04:00:00Z') },
      ]);

      const result = await service.getDashboardStats();

      expect(result.totalProcessed).toBe(10);
      expect(result.flagRatePercent).toBe(40);
      expect(result.avgResolutionHours).toBe(3);
    });

    it('returns zero counts and null average when there is no data', async () => {
      mockPrismaService.cvFile.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockPrismaService.cvFile.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats();

      expect(result.totalProcessed).toBe(0);
      expect(result.flagRatePercent).toBe(0);
      expect(result.avgResolutionHours).toBeNull();
    });
  });
});