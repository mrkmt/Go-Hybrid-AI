import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');
import { config } from './config';
import { LocalAIService } from './LocalAIService';

interface CachedEmbedding {
    embedding: number[];
    timestamp: number;
    ttl: number;
}

interface FileCache {
    content: string;
    score: number;
    snippet: string;
    timestamp: number;
}

export class KnowledgeService {
    private static DEFAULT_ROOTS = [
        config.knowledge.geminiPath,
        config.knowledge.qwenPath,
        config.knowledge.codexPath,
        config.knowledge.anythingLlmPath,
        ...config.knowledge.extraPaths,
        // Include External Logic for PDF manuals
        path.join(process.cwd(), 'External Logic/Domain Knowledge')
    ].filter(Boolean);

    private static embeddingCache = new Map<string, CachedEmbedding>();
    private static fileCache = new Map<string, FileCache>();
    private static readonly CACHE_TTL = 3600000;

    /**
     * Finds relevant local docs (including PDFs) using keyword ranking.
     */
    static async findRelevantDocs(query: string): Promise<any[]> {
        const q = (query || '').trim();
        if (!q) return [];

        const cacheKey = `query:${q.toLowerCase()}`;
        const cached = this.fileCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return JSON.parse(cached.content);
        }

        const roots = await this.getExistingRoots();
        const terms = this.tokenize(q);
        const files = await this.collectCandidateFiles(roots);
        const results: any[] = [];

        for (const filePath of files) {
            const { score, snippet } = await this.scoreFile(filePath, terms);
            if (score <= 0) continue;

            results.push({
                path: filePath,
                title: path.basename(filePath),
                snippet,
                score,
            });
        }

        const sorted = results.sort((a, b) => b.score - a.score).slice(0, 10);
        this.fileCache.set(cacheKey, { content: JSON.stringify(sorted), score: 0, snippet: '', timestamp: Date.now() });
        return sorted;
    }

    private static async getExistingRoots(): Promise<string[]> {
        const existing: string[] = [];
        for (const root of this.DEFAULT_ROOTS) {
            try {
                if (!root) continue;
                const stat = await fs.promises.stat(root);
                if (stat.isDirectory()) existing.push(root);
            } catch {}
        }
        return existing;
    }

    private static tokenize(text: string): string[] {
        return text.toLowerCase().split(/[^a-z0-9_\-]+/g).map(t => t.trim()).filter(t => t.length >= 2).slice(0, 12);
    }

    private static async collectCandidateFiles(roots: string[]): Promise<string[]> {
        const maxFiles = config.knowledge.maxFiles;
        const acceptedExt = new Set(['.md', '.txt', '.json', '.ts', '.js', '.pdf']);
        const out: string[] = [];

        const walk = async (dir: string, depth: number) => {
            if (out.length >= maxFiles || depth > 5) return;
            let entries: fs.Dirent[] = [];
            try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }

            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (this.shouldSkipDirectory(entry.name)) continue;
                    await walk(full, depth + 1);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (acceptedExt.has(ext)) out.push(full);
                }
            }
        };

        for (const root of roots) await walk(root, 0);
        return out;
    }

    private static shouldSkipDirectory(name: string): boolean {
        return new Set(['node_modules', 'dist', 'build', '.git', 'tmp']).has(name.toLowerCase());
    }

    private static async scoreFile(filePath: string, terms: string[]): Promise<{ score: number; snippet: string }> {
        try {
            let text = "";
            if (filePath.endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdf(dataBuffer);
                text = data.text;
            } else {
                text = fs.readFileSync(filePath, 'utf8');
            }

            const lower = text.toLowerCase();
            let score = 0;
            for (const term of terms) {
                if (lower.indexOf(term) >= 0) score += 10;
                score += (lower.split(term).length - 1);
            }

            if (score <= 0) return { score: 0, snippet: '' };
            return { score, snippet: text.substring(0, config.knowledge.maxSnippetChars) };
        } catch {
            return { score: 0, snippet: '' };
        }
    }
}
