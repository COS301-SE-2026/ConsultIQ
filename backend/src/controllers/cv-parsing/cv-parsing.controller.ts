import { BadRequestException, Controller, Param, Delete,
Post, Req, UploadedFile, UseInterceptors,
HttpCode,
HttpStatus,
Body,
Get} from "@nestjs/common";
import {FileInterceptor} from "@nestjs/platform-express";
import {S3Service} from "../../cv-parsing/services/s3.service";
import {DeleteCVFileDto} from "../../cv-parsing/dto/cv-upload.dto"
import * as multer from 'multer';
import {Roles} from '../../common/guards/roles.guard';
import {Role} from '../../auth/enums/role.enum';

@Controller('cv-parsing')
export class CVParsingController{
    constructor(private readonly uploadService: S3Service){}
    @Post('upload/:consultantId')
    @Roles(Role.CONSULTANT_MANAGER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadCVFile(
        @UploadedFile() cv: Express.Multer.File,
        @Req() request: any,){
            if(!cv) {throw new BadRequestException('File not uploaded');}
            const consultantId= request.user?.userId ?? 'unknown user';
            const fileKey= this.uploadService.generateS3Key(consultantId, cv.originalname);
            await this.uploadService.uploadFile(fileKey, cv.buffer, cv.mimetype);
            return{ message: 'File successfully uploaded', fileKey,};
    }

    @Delete('delete')
    @Roles(Role.CONSULTANT_MANAGER)
    @HttpCode(HttpStatus.OK)
    async deleteCVFile(@Body() dto: DeleteCVFileDto){
        await this.uploadService.deleteFile(decodeURIComponent(dto.fileKey));
        return {message: " file successfully deleted."}
    }
}