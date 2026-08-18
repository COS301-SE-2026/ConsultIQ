import { Module } from '@nestjs/common';
import { CVUploadService } from './services/cv-upload.service';
import { S3Service } from './services/s3.service';
import { CvController } from '../controllers/cv/cv.controller';

@Module({
  controllers: [CvController],
  providers: [CVUploadService, S3Service],
})
export class CvParsingModule { }
