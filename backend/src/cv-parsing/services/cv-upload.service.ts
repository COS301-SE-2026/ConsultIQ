import {
    Injectable,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from './s3.service';

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
    ) {}

    async uploadCV( userId: string, 
        file: Express.Multer.File
    ): Promise<{cvFileId: string; message: string}> {

        if(!ALLOWED_MIME_TYPES.includes(file.mimetype)){
            throw new BadRequestException(
                'Only PDF and DOCX filesare supported.',
            );
        }

        if(file.size > MAX_FILE_SIZE_BYTES){
            throw new BadRequestException(
                'Oops! File size must not exceed 10MB.',
            );
        }

        const user =await this.prisma.user.findUnique({
            where: {id: userId},
            select: {
                id: true,
                role: true,
                status: true,
            },
        });

        if(!user || user.role !== "CONSULTANT") {
            throw new BadRequestException(
                `Consultant with id ${userId} not found.`,
            );
        }

        // Generate the s3 key and upload
        const s3Key = this.s3Service.generateS3Key(userId, file.originalname);
        await this.s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

        const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        // Then create record
        const cvFile = await this.prisma.cvFile.create({
            data: {
                userId,
                consultantId: null,
                fileName: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                s3Key,
                s3Url,
                uploadStatus: 'UPLOADED',
                extractionStatus: 'PENDING',
            },
        });

        this.logger.log(`CV uploaded for consultant ${userId}: ${cvFile.id}`);

        return {
            cvFileId: cvFile.id,
            message: 'CV uploaded successfully.',
        };
    }

    async getPresignedUrl(cvFileId: string): Promise<{url: string}> {
        const cvFile = await this.prisma.cvFile.findUnique({
            where: {id: cvFileId},
        });

        if(!cvFile) {
            throw new BadRequestException(`CV file with id ${cvFileId} not found.`);
        }

        const url = await this.s3Service.generatePresignedUrl(cvFile.s3Key);

        return {url};
    }
    
}