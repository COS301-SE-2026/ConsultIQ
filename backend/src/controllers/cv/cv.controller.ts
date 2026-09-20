import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Body,
  Delete,
  Req,
  Patch
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CVUploadService } from '../../cv-parsing/services/cv-upload.service';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { UploadCvDto } from '../../cv-parsing/dto/upload-cv.dto';
import { ResolveSecurityReviewDto } from '../../cv-parsing/dto/resolve-security-review.dto';

@Controller('cv')
export class CvController {
  constructor(private readonly cvUploadService: CVUploadService) {}

  @Post('upload/:userId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.CONSULTANT_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCv(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body() dto?: UploadCvDto,
  ): Promise<{ cvFileId: string; message: string }> {
    if (!file) {
      throw new BadRequestException('No file was uploaded.');
    }

    return this.cvUploadService.uploadCV(userId, req.user.id, file, dto?.parsingMethod);
  }

  @Get(':cvFileId/url')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CONSULTANT_MANAGER)
  async getPresignedUrl(
    @Param('cvFileId') cvFileId: string,
  ): Promise<{ url: string }> {
    return this.cvUploadService.getPresignedUrl(cvFileId);
  }

  @Get('security-review-queue')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN)
  async getSecurityReviewQueue() {
    return this.cvUploadService.getSecurityReviewQueue();
  }

  @Get('security-review-stats')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN)
  async getDashboardStats() {
    return this.cvUploadService.getDashboardStats();
  }

  @Get('flagged')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CONSULTANT_MANAGER)
  async getFlagged(@Req() req: any) {
    return this.cvUploadService.getFlaggedForCm(req.user.id);
  }

  @Get('security-review-history')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN)
  async getSecurityReviewHistory() {
    return this.cvUploadService.getResolvedHistory();
  }

  @Get(':cvFileId')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CONSULTANT_MANAGER)
  async getCvFile(@Param('cvFileId') cvFileId: string): Promise<{
    cvFileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadStatus: string;
    extractionStatus: string;
    parsedData?: any;
    updatedAt: Date;
  }> {
    return this.cvUploadService.getCvFile(cvFileId);
  }

  @Delete(':cvFileId')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CONSULTANT_MANAGER)
  async discardCvFile(
    @Param('cvFileId') cvFileId: string,
  ): Promise<{ message: string }> {
    return this.cvUploadService.discardCvFile(cvFileId);
  }

  @Patch(':cvFileId/security-review')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN)
  async resolveSecurityReview(
    @Param('cvFileId') cvFileId: string,
    @Body() dto: ResolveSecurityReviewDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.cvUploadService.resolveSecurityReview(
      cvFileId,
      dto.decision,
      req.user.id,
    );
  }
}
