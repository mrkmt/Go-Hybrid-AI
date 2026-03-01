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

    async deleteFolder(prefix: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const objectsList: string[] = [];
            const stream = this.client.listObjectsV2(this.bucketName, prefix, true);

            stream.on('data', (obj) => {
                if (obj.name) objectsList.push(obj.name);
            });

            stream.on('error', (err) => {
                console.error('MinIO list error:', err);
                reject(err);
            });

            stream.on('end', async () => {
                try {
                    if (objectsList.length > 0) {
                        await this.client.removeObjects(this.bucketName, objectsList);
                        console.log(`[MinIO] Deleted ${objectsList.length} objects for prefix: ${prefix}`);
                    }
                    resolve();
                } catch (err) {
                    console.error('MinIO bulk delete error:', err);
                    reject(err);
                }
            });
        });
    }

    async getFileBuffer(objectName: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            this.client.getObject(this.bucketName, objectName).then((stream) => {
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            }).catch(reject);
        });
    }
}

export const minioService = new MinioService();
