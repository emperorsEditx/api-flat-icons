import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    CopyObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
    private readonly s3Client: S3Client;
    private readonly bucketName: string;

    constructor(private readonly configService: ConfigService) {
        this.bucketName = this.configService.getOrThrow<string>('R2_BUCKET_NAME');
        const accessKeyId = this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY');
        const accountId = this.configService.getOrThrow<string>('R2_ACCOUNT_ID');

        // Cloudflare R2 S3 Endpoint
        const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true, // Required for R2? Usually handled by aws-sdk correctly but good to be explicit
        });
    }

    /**
     * Upload file to R2
     */
    async putObject(key: string, body: Buffer | Uint8Array | Blob | string, contentType?: string) {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: body,
                ContentType: contentType,
            });
            await this.s3Client.send(command);
            return `https://${this.bucketName}.r2.cloudflarestorage.com/${key}`; // Or custom domain
        } catch (error) {
            console.error('R2 Upload Error:', error);
            throw new InternalServerErrorException('Failed to upload file to R2');
        }
    }

    /**
     * Delete file from R2
     */
    async deleteObject(key: string) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
        } catch (error) {
            console.error('R2 Delete Error:', error);
            throw new InternalServerErrorException('Failed to delete file from R2');
        }
    }

    /**
     * Copy file within R2 (e.g. Move/Rename)
     */
    async copyObject(sourceKey: string, destinationKey: string) {
        try {
            // Source must include bucket name for CopyObject in S3 API sometimes, but usually just Key if same bucket? 
            // AWS SDK uses "Bucket/Key" for CopySource usually.
            const copySource = `${this.bucketName}/${sourceKey}`;

            const command = new CopyObjectCommand({
                Bucket: this.bucketName,
                CopySource: copySource,
                Key: destinationKey,
            });
            await this.s3Client.send(command);
        } catch (error) {
            console.error('R2 Copy Error:', error);
            throw new InternalServerErrorException('Failed to move file in R2');
        }
    }

    /**
     * Get file metadata
     */
    async headObject(key: string) {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            return await this.s3Client.send(command);
        } catch (error) {
            // If 404, return null
            return null;
        }
    }
}
