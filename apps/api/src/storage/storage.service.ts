import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as mime from 'mime-types';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly region: string;

  constructor(private config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.region = config.getOrThrow<string>('AWS_REGION');
    this.endpoint = config.get<string>('STORAGE_ENDPOINT');

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
      ...(this.endpoint && {
        endpoint: this.endpoint,
        forcePathStyle: true,
      }),
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = mime.extension(file.mimetype) || 'bin';
    const key = `uploads/${Date.now()}-${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    this.logger.log(`Uploaded ${key} (${file.size} bytes)`);
    return this.buildPublicUrl(key);
  }

  private buildPublicUrl(key: string): string {
    if (this.endpoint) {
      // OCI / MinIO / LocalStack path-style URL
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }
    // AWS S3 virtual-hosted style
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
