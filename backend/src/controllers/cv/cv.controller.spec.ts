import { Test, TestingModule } from '@nestjs/testing';
import { CvController } from './cv.controller';
import { CVUploadService } from '../../cv-parsing/services/cv-upload.service';
import { BadRequestException } from '@nestjs/common';

const mockCVUploadService = {
  uploadCV: jest.fn(),
  getPresignedUrl: jest.fn(),
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
    it('should call service with consultantId and file and return result', async () => {
      mockCVUploadService.uploadCV.mockResolvedValue({
        cvFileId: 'cvfile-uuid-1',
        message: 'CV uploaded successfully.',
      });

      const file = mockFile();
      const result = await controller.uploadCv('consultant-uuid-1', file);

      expect(mockCVUploadService.uploadCV).toHaveBeenCalledWith('consultant-uuid-1', file);
      expect(result.cvFileId).toBe('cvfile-uuid-1');
      expect(result.message).toBe('CV uploaded successfully.');
    });

    it('should throw BadRequestException if no file is uploaded', async () => {
      await expect(
        controller.uploadCv('consultant-uuid-1', undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate errors from service', async () => {
      mockCVUploadService.uploadCV.mockRejectedValue(
        new BadRequestException('Only PDF and DOCX files are supported.'),
      );

      await expect(
        controller.uploadCv('consultant-uuid-1', mockFile()),
      ).rejects.toThrow(BadRequestException);
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
});