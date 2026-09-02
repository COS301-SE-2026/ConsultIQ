// The orchestrator: reads the per-upload parsing method off CvFile, routes
// to the correct extractor, runs the shared validator against whichever
// path ran, and persists the result.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // ASSUMPTION — adjust to your actual path/pattern
import { S3Service } from './s3.service';
import { CvOcrService } from './cv-ocr.service';
import { ClaudeExtractionService } from './claude-extraction.service';
import { CvParsingService } from './cv-parsing.service';
import { CvFieldValidatorService } from './cv-field-validator.service';
import { CvParsingResult } from '../types/parsed-cv.types';
import { Prisma, AuditAction } from '@prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';

@Injectable()
export class CvExtractionService {
  private readonly logger = new Logger(CvExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly ocr: CvOcrService,
    private readonly claudeExtraction: ClaudeExtractionService,
    private readonly ruleBasedParsing: CvParsingService,
    private readonly validator: CvFieldValidatorService,
    private readonly auditLog: AuditLogService,
  ) {}

  async processExtraction(cvFileId: string): Promise<void> {
    await this.prisma.cvFile.update({
      where: { id: cvFileId },
      data: { extractionStatus: 'PROCESSING' },
    });

    let result: CvParsingResult;

    try {
      const cvFile = await this.prisma.cvFile.findUniqueOrThrow({
        where: { id: cvFileId },
      });
      const fileBuffer = await this.s3.downloadFile(cvFile.s3Key);

      if (cvFile.parsingMethod === 'RULE_BASED') {
        result = await this.runRuleBased(fileBuffer, cvFile.mimeType);
      } else {
        result = await this.runAiAssisted(fileBuffer, cvFile.mimeType);
      }

      if (result.success && result.data) {
        result.fieldWarnings = this.validator.validate(result.data);
      }
    } catch (error) {
      this.logger.error(`Unhandled error processing CvFile ${cvFileId}`, error);
      result = {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during CV processing.',
        processingTimeMs: 0,
      };
    }

    await this.persistResult(cvFileId, result);
  }

  private async runRuleBased(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<CvParsingResult> {
    if (mimeType !== 'application/pdf') {
      return {
        success: false,
        error:
          'Rule-based parsing only supports the PDF CV template. This file is not a PDF.',
        processingTimeMs: 0,
      };
    }
    return this.ruleBasedParsing.parse(fileBuffer);
  }

  private async runAiAssisted(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<CvParsingResult> {
    const rawText = await this.ocr.extractText(fileBuffer, mimeType);
    return this.claudeExtraction.extractCvData(rawText);
  }

  private async persistResult(
    cvFileId: string,
    result: CvParsingResult,
  ): Promise<void> {
    await this.prisma.cvFile.update({
      where: { id: cvFileId },
      data: {
        extractionStatus: result.success ? 'REVIEW_REQUIRED' : 'FAILED',
        parsedData: result.success
          ? ({
              data: result.data,
              competencySignals: result.competencySignals ?? [],
              fieldWarnings: result.fieldWarnings ?? [],
            } as unknown as Prisma.InputJsonValue)
          : { error: result.error },
      },
    });

    if (result.success) {
      const cvFile = await this.prisma.cvFile.findUnique({
        where: { id: cvFileId },
        select: { userId: true, consultantId: true },
      });

      await this.auditLog.log({
        action: AuditAction.CV_EXTRACTED,
        actingUserId: cvFile?.userId ?? 'unknown',
        entityType: 'CvFile',
        entityId: cvFileId,
        metadata: {
          consultantId: cvFile?.consultantId,
          extractedData: result.data,
        } as unknown as Prisma.InputJsonValue 
      });
    } else {
      this.logger.error(
        `Extraction failed for CvFile ${cvFileId}: ${result.error}`,
      );
    }
  }
}
