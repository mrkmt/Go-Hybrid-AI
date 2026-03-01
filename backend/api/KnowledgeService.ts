import fs from 'fs';
import path from 'path';
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
    ].filter(Boolean);

    // In-memory cache for embeddings and file contents
    private static embeddingCache = new Map<string, CachedEmbedding>();
    private static fileCache = new Map<string, FileCache>();
    private static readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

    /**
     * Finds relevant local docs using a fast keyword-based ranker with caching.
     */
    static async findRelevantDocs(query: string): Promise<any[]> {
        const q = (query || '').trim();
        if (!q) return [];

        // Check cache for this query
        const cacheKey = `query:${q.toLowerCase()}`;
        const cached = this.fileCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return JSON.parse(cached.content);
        }

        const roots = await this.getExistingRoots();
        if (roots.length === 0) return [];

        const terms = this.tokenize(q);
        const files = await this.collectCandidateFiles(roots);
        const results: Array<{ path: string; title: string; snippet: string; score: number }> = [];

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
        
        // Cache the results
        this.fileCache.set(cacheKey, {
            content: JSON.stringify(sorted),
            score: 0,
            snippet: '',
            timestamp: Date.now(),
        });

        return sorted;
    }

    /**
     * Gets embeddings with caching support.
     */
    static async getEmbeddingWithCache(text: string): Promise<number[]> {
        const cacheKey = `embed:${this.hash(text)}`;
        const cached = this.embeddingCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.embedding;
        }

        const embedding = await LocalAIService.getEmbeddings(text);
        
        if (embedding.length > 0) {
            this.embeddingCache.set(cacheKey, {
                embedding,
                timestamp: Date.now(),
                ttl: this.CACHE_TTL,
            });
        }

        return embedding;
    }

    /**
     * Clears the embedding cache.
     */
    static clearEmbeddingCache(): void {
        this.embeddingCache.clear();
    }

    /**
     * Clears the file cache.
     */
    static clearFileCache(): void {
        this.fileCache.clear();
    }

    /**
     * Gets cache statistics.
     */
    static getCacheStats(): { embeddingCacheSize: number; fileCacheSize: number } {
        return {
            embeddingCacheSize: this.embeddingCache.size,
            fileCacheSize: this.fileCache.size,
        };
    }

    private static async getExistingRoots(): Promise<string[]> {
        const existing: string[] = [];
        for (const root of this.DEFAULT_ROOTS) {
            try {
                if (!root) continue;
                const stat = await fs.promises.stat(root);
                if (stat.isDirectory()) existing.push(root);
            } catch {
                // ignore missing/unreadable roots
            }
        }
        return existing;
    }

    private static tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .split(/[^a-z0-9_\-]+/g)
            .map(t => t.trim())
            .filter(t => t.length >= 2)
            .slice(0, 12);
    }

    private static async collectCandidateFiles(roots: string[]): Promise<string[]> {
        const maxFiles = config.knowledge.maxFiles;
        const acceptedExt = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.log', '.ts', '.js']);
        const out: string[] = [];

        const walk = async (dir: string, depth: number) => {
            if (out.length >= maxFiles) return;
            if (depth > 5) return;

            let entries: fs.Dirent[] = [];
            try {
                entries = await fs.promises.readdir(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                if (out.length >= maxFiles) return;
                if (entry.name.startsWith('.')) continue;

                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip installation and build folders
                    if (this.shouldSkipDirectory(entry.name)) continue;
                    await walk(full, depth + 1);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!acceptedExt.has(ext)) continue;
                    out.push(full);
                }
            }
        };

        for (const root of roots) {
            await walk(root, 0);
            if (out.length >= maxFiles) break;
        }

        return out;
    }

    private static shouldSkipDirectory(name: string): boolean {
        const skipDirs = new Set([
            'node_modules',
            'dist',
            'build',
            '.git',
            'coverage',
            'tmp',
            'temp',
            'vendor',
            'bin',
            'obj',
            '.vscode',
            '.idea',
            '__pycache__',
            'venv',
            'env',
            '.venv',
        ]);
        return skipDirs.has(name.toLowerCase());
    }

    private static async scoreFile(filePath: string, terms: string[]): Promise<{ score: number; snippet: string }> {
        const cacheKey = `file:${filePath}:${terms.join(',')}`;
        const cached = this.fileCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return { score: cached.score, snippet: cached.snippet };
        }

        try {
            const stat = await fs.promises.stat(filePath);
            if (stat.size > config.knowledge.maxFileBytes) return { score: 0, snippet: '' };

            const buf = await fs.promises.readFile(filePath);
            const text = buf.toString('utf8');
            const lower = text.toLowerCase();

            let score = 0;
            for (const term of terms) {
                const idx = lower.indexOf(term);
                if (idx >= 0) score += 10;
                score += this.countOccurrences(lower, term);
            }

            if (score <= 0) return { score: 0, snippet: '' };

            const snippet = this.makeSnippet(text, terms);
            
            // Cache the result
            this.fileCache.set(cacheKey, {
                content: '',
                score,
                snippet,
                timestamp: Date.now(),
            });

            return { score, snippet };
        } catch {
            return { score: 0, snippet: '' };
        }
    }

    private static countOccurrences(text: string, term: string): number {
        let count = 0;
        let fromIndex = 0;
        while (true) {
            const idx = text.indexOf(term, fromIndex);
            if (idx < 0) return count;
            count++;
            fromIndex = idx + term.length;
            if (count > 50) return count;
        }
    }

    private static makeSnippet(text: string, terms: string[]): string {
        const limit = config.knowledge.maxSnippetChars;
        const lower = text.toLowerCase();
        const matchIdx = terms
            .map(t => lower.indexOf(t))
            .filter(i => i >= 0)
            .sort((a, b) => a - b)[0];

        if (matchIdx === undefined) return text.slice(0, limit);

        const start = Math.max(0, matchIdx - Math.floor(limit / 3));
        return text.slice(start, start + limit);
    }

    private static hash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}
