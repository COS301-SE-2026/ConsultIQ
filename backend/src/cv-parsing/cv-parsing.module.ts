import { Module } from '@nestjs/common';
import { CVUploadService } from './services/cv-upload.service';
import { S3Service } from './services/s3.service';
import { CvController } from '../controllers/cv/cv.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CvController],
  providers: [CVUploadService, S3Service],
  exports: [S3Service],
})
export class CvParsingModule {}