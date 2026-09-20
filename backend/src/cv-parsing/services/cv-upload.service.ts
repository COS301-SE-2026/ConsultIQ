import { Injectable, BadRequestException,NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from './s3.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CvParsingMethodDto } from '../dto/upload-cv.dto';
import { SecurityReviewDecision } from '../dto/resolve-security-review.dto';
import { NotificationService } from '../../notification/service/notification.service';
import { AuditAction, Role } from '@prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';

import {
  CV_PROCESSING_QUEUE,
  CV_PARSE_JOB,
} from '../queues/cv-processing.queue';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class CVUploadService {
  private readonly logger = new Logger(CVUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly auditLog: AuditLogService,
    private readonly notificationService: NotificationService,
    @InjectQueue(CV_PROCESSING_QUEUE) private readonly cvQueue: Queue,
  ) {}

  async uploadCV(
    userId: string,
    uploadedByUserId: string,
    file: Express.Multer.File,
    parsingMethod?: CvParsingMethodDto,
  ): Promise<{ cvFileId: string; message: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX filesare supported.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Oops! File size must not exceed 10MB.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'CONSULTANT') {
      throw new BadRequestException(`Consultant with id ${userId} not found.`);
    }

    // Generate the s3 key and upload
    const s3Key = this.s3Service.generateS3Key(userId, file.originalname);
    await this.s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

    const s3Url = this.s3Service.getObjectUrl(s3Key);

    // Then create record
    const cvFile = await this.prisma.cvFile.create({
      data: {
        userId,
        uploadedByUserId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        s3Key,
        s3Url,
        uploadStatus: 'UPLOADED',
        extractionStatus: 'PENDING',
        parsingMethod: parsingMethod || 'RULE_BASED', // Default to RULE_BASED if not provided
      },
    });

    await this.cvQueue.add(CV_PARSE_JOB, { cvFileId: cvFile.id });

    this.logger.log(`CV uploaded for consultant ${userId}: ${cvFile.id}`);

    return {
      cvFileId: cvFile.id,
      message: 'CV uploaded successfully.',
    };
  }

  async getFlaggedForCm(cmUserId: string) {
    const cvFiles = await this.prisma.cvFile.findMany({
      where: {
        uploadedByUserId: cmUserId,
        securityReviewStatus: { in: ['PENDING', 'REJECTED'] },
      },
      select: {
        id: true,
        fileName: true,
        uploadedAt: true,
        userId: true,
        securityReviewStatus: true,
        parsedData: true,
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return cvFiles.map((cv) => ({
      cvFileId: cv.id,
      fileName: cv.fileName,
      uploadedAt: cv.uploadedAt,
      consultantUserId: cv.userId,
      consultantName: cv.user.fullName,
      consultantEmail: cv.user.email,
      securityReviewStatus: cv.securityReviewStatus as 'PENDING' | 'REJECTED',
      securityFlags: (cv.parsedData as any)?.securityFlags ?? [],
    }));
  }

  async getPresignedUrl(cvFileId: string): Promise<{ url: string }> {
    const cvFile = await this.prisma.cvFile.findUnique({
      where: { id: cvFileId },
    });

    if (!cvFile) {
      throw new BadRequestException(`CV file with id ${cvFileId} not found.`);
    }

    const url = await this.s3Service.generatePresignedUrl(cvFile.s3Key);

    return { url };
  }

  async getCvFile(cvFileId: string) {
    const cvFile = await this.prisma.cvFile.findUnique({
      where: { id: cvFileId },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
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

    if (!cvFile) {
      throw new BadRequestException(`CV file with id ${cvFileId} not found.`);
    }

    const { id, ...rest } = cvFile;
    return { cvFileId: id, ...rest };
  }

  async discardCvFile(cvFileId: string): Promise<{ message: string }> {
    const cvFile = await this.prisma.cvFile.findUnique({
      where: { id: cvFileId },
    });

    if (!cvFile) {
      throw new BadRequestException(`CV file with if ${cvFileId} not found.`);
    }

    if (cvFile.consultantId) {
      throw new BadRequestException(
        'Cannot discard a CV that has already been linked to a consultant profile.',
      );
    }

    await this.s3Service.deleteFile(cvFile.s3Key);
    await this.prisma.cvFile.delete({ where: { id: cvFileId } });

    return { message: 'CV discarded successfully.' };
  }

   async getSecurityReviewQueue() {
    const cvFiles = await this.prisma.cvFile.findMany({
      where: { securityReviewStatus: 'PENDING' },
      select: {
        id: true,
        fileName: true,
        uploadedAt: true,
        userId: true,
        consultantId: true,
        parsedData: true,
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { uploadedAt: 'asc' },
    });

    return cvFiles.map((cv) => ({
      cvFileId: cv.id,
      fileName: cv.fileName,
      uploadedAt: cv.uploadedAt,
      consultantUserId: cv.userId,
      consultantName: cv.user.fullName,
      consultantEmail: cv.user.email,
      securityFlags: (cv.parsedData as any)?.securityFlags ?? [],
    }));
  }

  async resolveSecurityReview(
    cvFileId: string,
    decision: SecurityReviewDecision,
    superAdminUserId: string,
  ): Promise<{ message: string }> {
    const cvFile = await this.prisma.cvFile.findUnique({
      where: { id: cvFileId },
    });

    if (!cvFile) {
      throw new NotFoundException(`CV file with id ${cvFileId} not found.`);
    }

    if (cvFile.securityReviewStatus !== 'PENDING') {
      throw new BadRequestException(
        `This CV is not pending security review (current status: ${cvFile.securityReviewStatus}).`,
      );
    }

    await this.prisma.cvFile.update({
      where: { id: cvFileId },
      data: {
        securityReviewStatus: decision,
        securityReviewedAt: new Date(),
        securityReviewedBy: superAdminUserId,
        extractionStatus:
          decision === SecurityReviewDecision.REJECTED
            ? 'SECURITY_REJECTED'
            : undefined,
      },
    });

    await this.auditLog.log({
      action:
        decision === SecurityReviewDecision.CLEARED
          ? AuditAction.CV_SECURITY_CLEARED
          : AuditAction.CV_SECURITY_REJECTED,
      actingUserId: superAdminUserId,
      entityType: 'CvFile',
      entityId: cvFileId,
    });

    if (decision === SecurityReviewDecision.REJECTED) {
      await this.notifyAdminsOfRejection(cvFile.id, cvFile.userId);
    }

    return {
      message: `CV security review resolved as ${decision}.`,
    };
  }

  private async notifyAdminsOfRejection(
    cvFileId: string,
    consultantUserId: string,
  ): Promise<void> {
    const [consultantUser, admins] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: consultantUserId },
        select: { fullName: true },
      }),
      this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      }),
    ]);

    await Promise.all(
      admins.map((admin) =>
        this.notificationService.createAndSendNotification(
          admin.id,
          'CV rejected in security review',
          `A super admin rejected ${consultantUser?.fullName ?? 'a consultant'}'s CV after detecting a manipulation attempt. Review this user's account.`,
          `/consultants/security/${consultantUserId}`,
        ),
      ),
    );
  }
}
