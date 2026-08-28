import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CVUploadService } from './services/cv-upload.service';
import { S3Service } from './services/s3.service';
import { CvController } from '../controllers/cv/cv.controller';
import { BullModule } from '@nestjs/bullmq';
import { CvOcrService } from './services/cv-ocr.service';
import { ClaudeExtractionService } from './services/claude-extraction.service';
import { CvFormReaderService } from './services/cv-form-reader.service';
import { CvParsingService } from './services/cv-parsing.service';
import { CvFieldValidatorService } from './services/cv-field-validator.service';
import { CvExtractionService } from './services/cv-extraction.service';
import { CV_PROCESSING_QUEUE } from './queues/cv-processing.queue';
import { CvProcessingProcessor } from './queues/cv-processing.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: CV_PROCESSING_QUEUE }),
  ],

  controllers: [CvController],
  providers: [
    CVUploadService, 
    S3Service,
    CvOcrService,
    ClaudeExtractionService,
    CvFormReaderService,
    CvParsingService,
    CvFieldValidatorService,
    CvExtractionService,
    CvProcessingProcessor,
  ],
})
export class CvParsingModule {}
