import * as Minio from 'minio';
import { config } from './config';

export class MinioService {
    private client: Minio.Client;
    private bucketName: string;

    constructor() {
        this.client = new Minio.Client({
            endPoint: config.minio.endpoint,
            port: config.minio.port,
            useSSL: config.minio.useSSL,
            accessKey: config.minio.accessKey,
            secretKey: config.minio.secretKey,
        });
        this.bucketName = config.minio.bucketName;
        this.ensureBucket();
    }

    private async ensureBucket() {
        try {
            const exists = await this.client.bucketExists(this.bucketName);
            if (!exists) {
                await this.client.makeBucket(this.bucketName);
                console.log(`Bucket "${this.bucketName}" created successfully.`);
            }
        } catch (err) {
            console.error('Error ensuring MinIO bucket exists:', err);
        }
    }

    async uploadFile(objectName: string, buffer: Buffer, metaData: any = {}): Promise<string> {
        try {
            await this.client.putObject(this.bucketName, objectName, buffer, buffer.length, metaData);
            return objectName;
        } catch (err) {
            console.error('MinIO upload error:', err);
            throw new Error('Failed to upload file to storage');
        }
    }

    async getPresignedUrl(objectName: string, expiry: number = 3600): Promise<string> {
        try {
            return await this.client.presignedGetObject(this.bucketName, objectName, expiry);
        } catch (err) {
            console.error('MinIO presigned URL error:', err);
            throw new Error('Failed to generate preview URL');
        }
    }

    async deleteFile(objectName: string): Promise<void> {
        try {
            await this.client.removeObject(this.bucketName, objectName);
        } catch (err) {
            console.error('MinIO delete error:', err);
            throw new Error('Failed to delete file from storage');
        }
    }

    async getFileBuffer(objectName: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            this.client.getObject(this.bucketName, objectName, (err, stream) => {
                if (err) return reject(err);
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });
        });
    }
}

export const minioService = new MinioService();
