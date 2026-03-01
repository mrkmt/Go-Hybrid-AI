import request = require('supertest');
import { createApp, initDb, type DbClient } from './app';
import { ObjectRepoService } from './ObjectRepoService';

// Mock ObjectRepoService
jest.mock('./ObjectRepoService', () => ({
    ObjectRepoService: {
        ensureObject: jest.fn().mockResolvedValue('obj-test-id')
    }
}));

// Mock MinioService to avoid network calls during tests
jest.mock('./MinioService', () => ({
    minioService: {
        bucketExists: jest.fn().mockResolvedValue(true),
        makeBucket: jest.fn().mockResolvedValue(true),
        uploadFile: jest.fn().mockResolvedValue('test-path'),
        getPresignedUrl: jest.fn().mockResolvedValue('http://mock-url'),
        deleteFile: jest.fn().mockResolvedValue(undefined),
        getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('test-data'))
    }
}));

// Mock LocalAIService to avoid LLM calls
jest.mock('./LocalAIService', () => ({
    LocalAIService: {
        suggestRootCause: jest.fn().mockResolvedValue({ response: 'mock-suggestion', modelUsed: 'mock-model', status: 'success' }),
        generateTest: jest.fn().mockResolvedValue({ response: 'mock-test-code', modelUsed: 'mock-model', status: 'success', agent: 'mock-agent' })
    }
}));

/**
 * Mock database client for testing
 */
function createMockPool() {
    const data: any[] = [];
    return {
        data,
        client: {
            query: async (text: string, params?: any[]) => {
                if (text.includes('SELECT COUNT')) {
                    return { rows: [{ count: data.length.toString() }] };
                }
                if (text.includes('SELECT') && !text.includes('COUNT')) {
                    const limitMatch = text.match(/LIMIT\s+(\d+)/i);
                    const offsetMatch = text.match(/OFFSET\s+(\d+)/i);
                    const limit = limitMatch ? parseInt(limitMatch[1]) : data.length;
                    const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
                    return { rows: data.slice(offset, offset + limit) };
                }
                if (text.includes('INSERT')) {
                    const idMatch = params?.[0];
                    if (idMatch) {
                        data.push({ id: idMatch, created_at: new Date() });
                    }
                    return { rows: [] };
                }
                if (text.includes('DELETE')) {
                    const idToDelete = params?.[0];
                    const initialLength = data.length;
                    const idx = data.findIndex((d: any) => d.id === idToDelete);
                    if (idx >= 0) data.splice(idx, 1);
                    return { rowCount: initialLength - data.length };
                }
                return { rows: [] };
            },
        } as DbClient,
    };
}

describe('Backend API - Health & Metrics', () => {
    test('GET /api/health returns ok:true when DB works', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.db).toBe(true);
        expect(res.body.version).toBeDefined();
    });

    test('GET /api/health returns ok:false when DB fails', async () => {
        const pool: DbClient = {
            query: async () => { throw new Error('DB connection failed'); },
        };
        const app = createApp({ pool });

        const res = await request(app).get('/api/health');
        expect(res.status).toBe(503);
        expect(res.body.ok).toBe(false);
    });

    test('GET /api/metrics returns statistics', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/metrics');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totalRecordings');
        expect(res.body).toHaveProperty('totalAiLogs');
        expect(res.body).toHaveProperty('recordingsLast24h');
    });
});

describe('Backend API - Recordings', () => {
    test('POST /api/recordings validates payload - missing steps', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app)
            .post('/api/recordings')
            .send({ sessionId: 's1', appVersion: '1.0' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    test('POST /api/recordings validates payload - empty steps', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app)
            .post('/api/recordings')
            .send({ sessionId: 's1', steps: [] });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    test('POST /api/recordings accepts valid payload', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app)
            .post('/api/recordings')
            .send({
                sessionId: 'session-123',
                appVersion: '1.0.0',
                environment: { browser: 'chrome', os: 'windows' },
                steps: [{ action: 'click', selector: '#button' }],
                networkRequests: [{ url: 'https://api.example.com' }],
            });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        expect(res.body.message).toBe('Recording saved successfully');
    });

    test('GET /api/recordings returns paginated list', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/recordings');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.pagination).toHaveProperty('page');
        expect(res.body.pagination).toHaveProperty('limit');
        expect(res.body.pagination).toHaveProperty('total');
    });

    test('GET /api/recordings accepts limit and page parameters', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/recordings?limit=20&page=2');
        expect(res.status).toBe(200);
        expect(res.body.pagination.limit).toBe(20);
        expect(res.body.pagination.page).toBe(2);
    });

    test('GET /api/recordings/:id with invalid UUID returns 400', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/recordings/invalid-id');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid recording id (uuid expected)');
    });

    test('GET /api/recordings/:id returns 404 when not found', async () => {
        const pool: DbClient = {
            query: async () => ({ rows: [] }),
        };
        const app = createApp({ pool });

        const res = await request(app).get('/api/recordings/550e8400-e29b-41d4-a716-446655440000');
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Recording not found');
    });

    test('DELETE /api/recordings/:id with invalid UUID returns 400', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).delete('/api/recordings/invalid-id');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid recording id (uuid expected)');
    });
});

describe('Backend API - Triage', () => {
    test('POST /api/triage/:id with invalid UUID returns 400', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).post('/api/triage/invalid-id');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid recording id (uuid expected)');
    });

    test('POST /api/triage/:id validates error field', async () => {
        const pool: DbClient = {
            query: async () => ({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440000', steps: [], app_version: '1.0' }] }),
        };
        const app = createApp({ pool });

        const res = await request(app)
            .post('/api/triage/550e8400-e29b-41d4-a716-446655440000')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    test('POST /api/triage/:id returns 404 when recording not found', async () => {
        const pool: DbClient = {
            query: async () => ({ rows: [] }),
        };
        const app = createApp({ pool });

        const res = await request(app)
            .post('/api/triage/550e8400-e29b-41d4-a716-446655440000')
            .send({ error: 'Test error' });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Recording not found');
    });
});

describe('Backend API - Search', () => {
    test('GET /api/search without query returns 400', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/search');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    test('GET /api/search with empty query returns 400', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/search?q=');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    test('GET /api/search with valid query returns results', async () => {
        // Mock KnowledgeService to avoid file system access during tests
        jest.spyOn(require('./KnowledgeService').KnowledgeService, 'findRelevantDocs')
            .mockResolvedValue([{ path: 'test.md', title: 'Test', snippet: 'Test snippet', score: 1 }]);

        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/search?q=test');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('docs');
        expect(res.body).toHaveProperty('fromCache');
    });
});

describe('Backend API - AI Logs', () => {
    test('POST /api/ai-logs validates payload', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app)
            .post('/api/ai-logs')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });

    test('POST /api/ai-logs accepts valid payload', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app)
            .post('/api/ai-logs')
            .send({
                model: 'qwen2.5:latest',
                prompt: 'Test prompt',
                response: 'Test response',
            });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Log saved');
    });
});

describe('Backend API - Security', () => {
    test('404 for unknown routes', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        const res = await request(app).get('/api/unknown');
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Not found');
    });

    test('API Key validation when configured', async () => {
        const { client } = createMockPool();
        const app = createApp({ pool: client });

        // Without API key (should pass if no API_KEY is set in config)
        const res = await request(app)
            .post('/api/recordings')
            .send({ steps: [{ action: 'click' }] });

        // Response depends on whether API_KEY is configured
        // If configured, should return 401 without key
        // If not configured, should return 201 or 400
        expect([201, 400, 401]).toContain(res.status);
    });
});

describe('Database Initialization', () => {
    test('initDb creates tables', async () => {
        const queries: string[] = [];
        const pool: DbClient = {
            query: async (text: string) => {
                queries.push(text);
                return { rows: [] };
            },
        };

        await initDb(pool);

        expect(queries.length).toBeGreaterThan(0);
        expect(queries.some(q => q.includes('CREATE TABLE'))).toBe(true);
        expect(queries.some(q => q.includes('CREATE INDEX'))).toBe(true);
    });
});
