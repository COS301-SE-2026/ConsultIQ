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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CVUploadService } from '../../cv-parsing/services/cv-upload.service';
import { Roles } from '../../common/guards/roles.guard';
import { Role } from '../../auth/enums/role.enum';
import { UploadCvDto } from '../../cv-parsing/dto/upload-cv.dto';

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
        @Body() dto?: UploadCvDto,
    ): Promise<{ cvFileId: string; message: string }> {
        if (!file) {
        throw new BadRequestException('No file was uploaded.');
        }
    
    return this.cvUploadService.uploadCV(userId, file, dto?.parsingMethod);
  }

  @Get(':cvFileId/url')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CONSULTANT_MANAGER)
  async getPresignedUrl(
    @Param('cvFileId') cvFileId: string,
  ): Promise<{ url: string }> {
    return this.cvUploadService.getPresignedUrl(cvFileId);
  }
}
