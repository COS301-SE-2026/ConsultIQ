import {
    Injectable,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from './s3.service';

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];