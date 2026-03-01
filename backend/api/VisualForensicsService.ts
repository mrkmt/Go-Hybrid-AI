import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { minioService } from './MinioService';

export class VisualForensicsService {
    /**
     * Compares two screenshots and generates a DIFF image highlighting changes.
     */
    static async generateVisualDiff(recordingId: string, standardPath: string, executionPath: string): Promise<string | null> {
        console.log(`[Detective-Visual] Comparing pixels: ${standardPath} vs ${executionPath}`);

        try {
            // 1. Download images from MinIO or read from local if it was direct
            // For now, assuming we handle the buffers directly
            const standardBuffer = await this.getImageBuffer(standardPath);
            const executionBuffer = await this.getImageBuffer(executionPath);

            if (!standardBuffer || !executionBuffer) return null;

            const img1 = PNG.sync.read(standardBuffer);
            const img2 = PNG.sync.read(executionBuffer);
            const { width, height } = img1;
            const diff = new PNG({ width, height });

            // 2. Perform pixel match
            const numDiffPixels = pixelmatch(
                img1.data,
                img2.data,
                diff.data,
                width,
                height,
                { threshold: 0.1 }
            );

            const mismatchPercentage = (numDiffPixels / (width * height)) * 100;
            console.log(`[Detective] Visual Mismatch: ${mismatchPercentage.toFixed(2)}%`);

            // 3. Save the Diff image to MinIO as evidence
            const diffBuffer = PNG.sync.write(diff);
            const diffObjectName = `forensics/${recordingId}/visual_diff_${Date.now()}.png`;
            
            await minioService.uploadFile(diffObjectName, diffBuffer, {
                'Content-Type': 'image/png',
                'Mismatch-Score': mismatchPercentage.toString()
            });

            return diffObjectName;
        } catch (e) {
            console.error('[VisualForensics] Comparison failed:', e);
            return null;
        }
    }

    private static async getImageBuffer(objectPath: string): Promise<Buffer | null> {
        try {
            return await minioService.getFileBuffer(objectPath);
        } catch {
            return null;
        }
    }
}
