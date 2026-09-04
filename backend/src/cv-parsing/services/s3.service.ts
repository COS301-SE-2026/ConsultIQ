import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly presignedUrlExpiry: number;
  private readonly endpoint?: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('AWS_S3_BUCKET') ?? '';
    this.endpoint = this.config.get<string>('AWS_ENDPOINT_URL_S3');
    this.presignedUrlExpiry = parseInt(
      this.config.get<string>('AWS_S3_PRESIGNED_URL_EXPIRY') ?? '900',
      10,
    );

    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is not set.');
    }

    this.s3Client = new S3Client({
      region: this.config.get<string>('AWS_REGION') ?? 'af-south-1',
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  getObjectUrl(key: string): string {
    const baseUrl = this.endpoint ?? `https://${this.bucket}.s3.${this.config.get<string>('AWS_REGION') ?? 'af-south-1'}.amazonaws.com`;
    return `${baseUrl.replace(/\/$/, '')}/${this.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  /**
   * Generates S3 key for a CV file.
   * Format: cvs/{userId}/{uuid}-{sanitisedFileName}
   */
  generateS3Key(userId: string, fileName: string): string {
    const sanitisedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueId = randomUUID();
    return `cvs/${userId}/${uniqueId}-${sanitisedFileName}`;
  }

  /**
   * Uploads a file buffer to S3 under the given key.
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ServerSideEncryption: 'AES256',
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw new InternalServerErrorException(
        'Failed to upload file to storage.',
      );
    }
  }

  /**
   * Downloads a file from S3 and returns it as a Buffer post upload in order to do OCR parsing.
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      const body = response.Body;
      if (!body) {
        throw new Error('S3 object body is empty.');
      }

      const chunks: Uint8Array[] = [];
      // @ts-expect-error - Body is a readable stream in Node.js runtime
      for await (const chunk of body) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to download file from S3: ${key}`, error);
      throw new InternalServerErrorException(
        'Failed to retrieve file from storage.',
      );
    }
  }

  /**
   * Generates a temporary link for opening/downloading a file from S3.
   */
  async generatePresignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: this.presignedUrlExpiry,
      });
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for: ${key}`, error);
      throw new InternalServerErrorException(
        'Failed to generate file access link.',
      );
    }
  }

  /**
   * Permanently deletes a file from S3.
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      throw new InternalServerErrorException(
        'Failed to delete file from storage.',
      );
    }
  }
}
