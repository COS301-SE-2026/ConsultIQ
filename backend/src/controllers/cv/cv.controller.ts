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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CVUploadService } from 'src/cv-parsing/services/cv-upload.service';
import { Roles } from 'src/common/guards/roles.guard';
import { Role } from 'src/auth/enums/role.enum';

@Controller('cv')
@Controller('cv')
export class CvController {

    constructor(private readonly cvUploadService: CVUploadService) {}

    @Post('upload/:consultantId')
    @HttpCode(HttpStatus.CREATED)
    @Roles(Role.CONSULTANT_MANAGER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadCv(
        @Param('consultantId') consultantId: string,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<{ cvFileId: string; message: string }> {
        if (!file) {
        throw new BadRequestException('No file was uploaded.');
        }
        return this.cvUploadService.uploadCV(consultantId, file);
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