import dotenv from 'dotenv';
import os from 'os';
import path from 'path';

dotenv.config();

function asInt(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function asBool(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    return value.toLowerCase() === 'true';
}

export const config = {
    server: {
        port: asInt(process.env.PORT, 3000),
        apiKey: process.env.API_KEY || '',
    },
    postgres: {
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE || 'ai_testing_platform',
        password: process.env.PG_PASSWORD || '',
        port: asInt(process.env.PG_PORT, 5432),
        max: asInt(process.env.PG_MAX_CLIENTS, 20),
        idleTimeoutMillis: asInt(process.env.PG_IDLE_TIMEOUT, 30000),
        connectionTimeoutMillis: asInt(process.env.PG_CONN_TIMEOUT, 2000),
    },
    ai: {
        ollamaGenerateUrl: process.env.OLLAMA_GENERATE_URL || 'http://localhost:11434/api/generate',
        ollamaEmbedUrl: process.env.OLLAMA_EMBED_URL || 'http://localhost:11434/api/embeddings',
        defaultModel: process.env.DEFAULT_AI_MODEL || 'qwen2.5:latest',
        embedModel: process.env.EMBED_MODEL || 'mxbai-embed-large:latest',
        fallbackModel: process.env.FALLBACK_AI_MODEL || '',
        timeoutMs: asInt(process.env.AI_TIMEOUT_MS, 15000),
    },
    knowledge: {
        geminiPath: process.env.GEMINI_PATH || path.join(os.homedir(), '.gemini'),
        qwenPath: process.env.QWEN_PATH || path.join(os.homedir(), '.qwen'),
        codexPath: process.env.CODEX_PATH || path.join(os.homedir(), '.codex'),
        anythingLlmPath: process.env.ANYTHINGLLM_PATH || '',
        // Always include the project root itself
        extraPaths: [
            path.join(__dirname, '../../'), // Go up from backend/api
        ],
        maxFiles: asInt(process.env.KNOWLEDGE_MAX_FILES, 1000), // increased as we focus on project root
        maxFileBytes: asInt(process.env.KNOWLEDGE_MAX_FILE_BYTES, 1024 * 1024), // 1MB
        maxSnippetChars: asInt(process.env.KNOWLEDGE_MAX_SNIPPET_CHARS, 3000),
    },
    minio: {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: asInt(process.env.MINIO_PORT, 9000),
        useSSL: asBool(process.env.MINIO_USE_SSL, false),
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        bucketName: process.env.MINIO_BUCKET_NAME || 'ai-testing-recordings',
    },
    security: {
        rateLimitWindowMs: asInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
        rateLimitMax: asInt(process.env.RATE_LIMIT_MAX, 30),
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
            .split(',')
            .map(o => o.trim())
            .filter(Boolean),
    },
};
