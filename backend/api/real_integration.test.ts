import request = require('supertest');
import { Pool } from 'pg';
import { createApp, initDb } from './app';
import { config } from './config';

// Mock VisualForensicsService to avoid pixelmatch ESM issues
jest.mock('./VisualForensicsService', () => ({
    VisualForensicsService: {
        generateVisualDiff: jest.fn().mockResolvedValue('forensics/test/diff.png')
    }
}));

// Mock LocalAIService in CI to avoid connection issues since Ollama is not available
if (process.env.CI) {
    jest.mock('./LocalAIService', () => ({
        LocalAIService: {
            suggestRootCause: jest.fn().mockResolvedValue({
                response: 'CI Mock Suggestion: Success confirmed via mock.',
                modelUsed: 'mock-llama',
                status: 'success'
            })
        }
    }));
}

describe('Real Data Integration - Smoke Test', () => {
    // Skip this test in CI environments where Ollama/Postgres might not be configured for real AI triage
    if (process.env.CI) {
        test.skip('Skipping real integration in CI', () => { });
        return;
    }

    let pool: Pool;
    let app: any;

    beforeAll(async () => {
        pool = new Pool({
            user: config.postgres.user,
            password: config.postgres.password,
            host: config.postgres.host,
            database: config.postgres.database,
            port: config.postgres.port,
        });
        await initDb(pool);
        app = createApp({ pool });
    });

    afterAll(async () => {
        await pool.end();
    });

    test('Full Flow: Health -> Upload -> Triage', async () => {
        // 1. Health Check
        const healthRes = await request(app).get('/api/health');
        expect(healthRes.status).toBe(200);
        expect(healthRes.body.ok).toBe(true);

        // 2. Recording Upload
        const recordingPayload = {
            sessionId: `jest-real-${Date.now()}`,
            appVersion: '1.1.0-jest-real',
            environment: { browser: 'jest', os: 'windows' },
            steps: [
                { action: 'click', selector: '#start', timestamp: Date.now() }
            ]
        };

        const uploadRes = await request(app)
            .post('/api/recordings')
            .send(recordingPayload);

        expect(uploadRes.status).toBe(201);
        const recordingId = uploadRes.body.id;
        expect(recordingId).toBeDefined();

        // 3. AI Triage
        const triageRes = await request(app)
            .post(`/api/triage/${recordingId}`)
            .send({ error: "Integration test error" });

        expect(triageRes.status).toBe(200);
        expect(triageRes.body.suggestion).toBeDefined();
    }, 120000); // 2 min timeout for AI
});
