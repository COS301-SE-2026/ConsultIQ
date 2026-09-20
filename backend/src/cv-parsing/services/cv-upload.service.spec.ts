import { Test, TestingModule } from '@nestjs/testing';
import { CVUploadService } from './cv-upload.service';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from './s3.service';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { CV_PROCESSING_QUEUE } from '../queues/cv-processing.queue';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  cvFile: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
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
      ],
    }).compile();

    service = module.get<CVUploadService>(CVUploadService);
    jest.clearAllMocks();
  });

  describe('uploadCV', () => {
    const userId = 'consultant-uuid-1';

    it('should throw BadRequestException for unsupported file type', async () => {
      const file = mockFile({ mimetype: 'image/jpeg' });

      await expect(
        service.uploadCV(userId, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds 10MB', async () => {
      const file = mockFile({ size: 11 * 1024 * 1024 });

      await expect(
        service.uploadCV(userId, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const file = mockFile();

      await expect(
        service.uploadCV(userId, file),
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
        service.uploadCV(userId, file),
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
      const result = await service.uploadCV(userId, file);

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

      const result = await service.uploadCV(userId, file);

      expect(result.cvFileId).toBe('cvfile-uuid-2');
    });

    it('should create CvFile record with correct userId, consultantId, upload and extraction status', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId, role: 'CONSULTANT', status: 'ACTIVE', });
      mockS3Service.generateS3Key.mockReturnValue('cvs/consultant-uuid-1/uuid-cv.pdf');
      mockS3Service.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.cvFile.create.mockResolvedValue({
        id: 'cvfile-uuid-1',
        userId,
        fileName: 'cv.pdf',
      });

      await service.uploadCV(userId, mockFile());

      expect(mockPrismaService.cvFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uploadStatus: 'UPLOADED',
          extractionStatus: 'PENDING',
        }),
      });
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
});