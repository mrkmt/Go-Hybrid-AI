import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import multer from 'multer';
import { LocalAIService } from './LocalAIService';
import { KnowledgeService } from './KnowledgeService';
import { ReportingService } from './ReportingService';
import { config } from './config';
import { minioService } from './MinioService';
import { IntegrityService } from './IntegrityService';
import { DetectiveDispatcher } from './DetectiveDispatcher';
import { ObjectRepoService } from './ObjectRepoService';
import { VisualForensicsService } from './VisualForensicsService';

export interface ReportFilter {
    startDate?: string;
    endDate?: string;
    reportType?: string;
    userId?: string;
}

export type DbClient = {
    query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

// Zod validation schemas
const RecordingSchema = z.object({
    sessionId: z.string().optional(),
    module: z.string().default('default'), 
    isAdmin: z.boolean().default(false), // Official Core 1 flag
    appVersion: z.string().optional(),
    environment: z.record(z.string(), z.unknown()).optional(),
    steps: z.array(z.unknown()).min(1, 'Steps array cannot be empty'),
    networkRequests: z.array(z.unknown()).optional(),
    annotations: z.array(z.unknown()).optional(),
    expectedResults: z.record(z.string(), z.unknown()).optional(),
});

const TriageSchema = z.object({
    error: z.string().min(1, 'Error message is required'),
});

const AiLogSchema = z.object({
    model: z.string().optional(),
    prompt: z.string().min(1, 'Prompt is required'),
    response: z.string().min(1, 'Response is required'),
});

const SearchQuerySchema = z.object({
    q: z.string().min(1, 'Search query is required'),
});

function parseLimit(value: unknown, fallback: number): number {
    if (typeof value !== 'string') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(500, Math.floor(n)));
}

function parsePage(value: unknown, fallback: number): number {
    if (typeof value !== 'string') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.floor(n));
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requireApiKey(req: express.Request, res: express.Response): boolean {
    if (!config.server.apiKey) return true;
    const provided = req.headers['x-api-key'];
    if (typeof provided === 'string' && provided === config.server.apiKey) return true;
    res.status(401).json({ error: 'Missing or invalid API key' });
    return false;
}

// Multer setup for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});

// Rate limiters
const generalLimiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

const writeLimiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: Math.floor(config.security.rateLimitMax / 3),
    message: { error: 'Too many write requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

const aiLimiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs * 2,
    max: Math.floor(config.security.rateLimitMax / 5),
    message: { error: 'AI rate limit exceeded, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

export async function initDb(pool: DbClient) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS recordings (
            id UUID PRIMARY KEY,
            session_id VARCHAR(255),
            app_version VARCHAR(50),
            environment JSONB,
            steps JSONB,
            network_requests JSONB,
            video_url TEXT,
            screenshot_url TEXT,
            manual_snapshot_url TEXT,
            annotations JSONB DEFAULT '[]',
            expected_results JSONB DEFAULT '{}',
            is_admin BOOLEAN DEFAULT false,
            user_id VARCHAR(255) DEFAULT 'public',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Ensure columns exist if table was already created
    try {
        await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS video_url TEXT;`);
        await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS screenshot_url TEXT;`);
        await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS manual_snapshot_url TEXT;`);
        await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT '[]';`);
        await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS expected_results JSONB DEFAULT '{}';`);
        await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;`);
    } catch (e) {
        console.warn('Could not add asset columns (might already exist):', e);
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255),
            recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
            model VARCHAR(50),
            prompt TEXT,
            response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS cache (
            key VARCHAR(255) PRIMARY KEY,
            value JSONB,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS object_repository (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255),
            app_profile VARCHAR(50) DEFAULT 'default',
            platform VARCHAR(50) DEFAULT 'web',
            selector_primary TEXT NOT NULL,
            selector_fallbacks JSONB DEFAULT '[]',
            locator_type VARCHAR(50) DEFAULT 'css',
            confidence FLOAT DEFAULT 0.8,
            reliability_score FLOAT DEFAULT 1.0,
            last_verified_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_actions (
            id SERIAL PRIMARY KEY,
            recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
            action_type VARCHAR(50),
            params JSONB,
            result JSONB,
            status VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    try {
        await pool.query(`ALTER TABLE recordings ALTER COLUMN user_id SET DEFAULT 'public';`);
    } catch {
        // ignore if permissions/restrictions block ALTER
    }

    // Create indexes for performance
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_ai_logs_recording_id ON ai_logs(recording_id);
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at DESC);
    `);
}

export function createApp(deps: { pool: DbClient }) {
    const app = express();
    const reportingService = new ReportingService(deps.pool);

    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    app.use(cors({
        origin: config.security.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-api-key'],
    }));

    // Body parser with size limit
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Apply general rate limiting to all routes
    app.use(generalLimiter);

    // Health check endpoint (no auth required)
    app.get('/api/health', async (_req, res) => {
        try {
            await deps.pool.query('SELECT 1 as ok');
            res.json({ 
                name: 'Go-Hybrid AI API',
                ok: true, 
                db: true, 
                ai: config.ai.ollamaGenerateUrl,
                minio: config.minio.endpoint,
                time: new Date().toISOString(),
                version: '1.1.0'
            });
        } catch (e) {
            res.status(503).json({ 
                ok: false, 
                db: false, 
                time: new Date().toISOString(),
                error: 'Database connection failed'
            });
        }
    });

    // External Tool Integration Endpoint
    app.post('/api/external-results', async (req, res) => {
        const { tool, results } = req.body;
        if (!tool || !results) return res.status(400).json({ error: 'Tool name and results required' });

        try {
            const id = await DetectiveDispatcher.ingestExternal(tool, results, deps.pool);
            res.status(201).json({ id, message: `Intelligence from ${tool} captured` });
        } catch (err: any) {
            res.status(500).json({ error: 'Failed to ingest external data' });
        }
    });

    // Monitoring endpoint
    app.get('/api/metrics', async (_req, res) => {
        try {
            const recordingsCount = await deps.pool.query('SELECT COUNT(*) FROM recordings');
            const aiLogsCount = await deps.pool.query('SELECT COUNT(*) FROM ai_logs');
            const recentRecordings = await deps.pool.query(
                'SELECT COUNT(*) FROM recordings WHERE created_at > NOW() - INTERVAL \'24 hours\''
            );
            
            res.json({
                totalRecordings: parseInt(recordingsCount.rows[0].count),
                totalAiLogs: parseInt(aiLogsCount.rows[0].count),
                recordingsLast24h: parseInt(recentRecordings.rows[0].count),
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            res.status(500).json({ error: 'Failed to retrieve metrics' });
        }
    });

    // Forensic Audit Endpoint for UI
    app.get('/api/audit/:id', async (req, res) => {
        const executionId = req.params.id;
        const standardId = req.query.standardId as string;

        if (!isUuid(executionId) || !standardId || !isUuid(standardId)) {
            return res.status(400).json({ error: 'Valid Execution and Standard IDs required' });
        }

        try {
            const auditReport = await IntegrityService.performForensicAudit(standardId, executionId, deps.pool);
            
            // Get asset paths
            const executionData = (await deps.pool.query('SELECT screenshot_url, video_url, manual_snapshot_url FROM recordings WHERE id = $1', [executionId])).rows[0];
            const standardData = (await deps.pool.query('SELECT screenshot_url, video_url FROM recordings WHERE id = $1', [standardId])).rows[0];

            // 2. Perform Automated Visual Regression (Pixel Match)
            let visualDiffUrl = null;
            if (standardData.screenshot_url && executionData.screenshot_url) {
                const diffPath = await VisualForensicsService.generateVisualDiff(executionId, standardData.screenshot_url, executionData.screenshot_url);
                if (diffPath) {
                    visualDiffUrl = await minioService.getPresignedUrl(diffPath);
                }
            }

            // Generate presigned URLs for assets
            const executionAssetUrls = {
                screenshot: executionData.screenshot_url ? await minioService.getPresignedUrl(executionData.screenshot_url) : null,
                video: executionData.video_url ? await minioService.getPresignedUrl(executionData.video_url) : null,
                manual: executionData.manual_snapshot_url ? await minioService.getPresignedUrl(executionData.manual_snapshot_url) : null,
                visualDiff: visualDiffUrl
            };

            const standardAssetUrls = {
                screenshot: standardData.screenshot_url ? await minioService.getPresignedUrl(standardData.screenshot_url) : null,
                video: standardData.video_url ? await minioService.getPresignedUrl(standardData.video_url) : null,
            };

            // 3. Fetch AI actions related to this case
            const actions = await deps.pool.query(
                'SELECT * FROM ai_actions WHERE recording_id = $1 ORDER BY created_at DESC',
                [executionId]
            );

            res.json({
                ...auditReport,
                assets: {
                    execution: executionAssetUrls,
                    standard: standardAssetUrls
                },
                aiActions: actions.rows
            });
        } catch (err: any) {
            console.error('Forensic audit error:', err);
            res.status(500).json({ error: 'Forensic audit failed', details: err.message });
        }
    });

    // Mark as Admin Standard Endpoint
    app.put('/api/recordings/:id/make-standard', async (req, res) => {
        const id = req.params.id;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid ID' });

        try {
            // 1. Get the module of this recording
            const { rows } = await deps.pool.query('SELECT app_version as module FROM recordings WHERE id = $1', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Recording not found' });
            const moduleName = rows[0].module;

            // 2. Unmark all other standards in this module
            await deps.pool.query('UPDATE recordings SET is_admin = false WHERE app_version = $1', [moduleName]);

            // 3. Mark this one as the standard
            await deps.pool.query('UPDATE recordings SET is_admin = true WHERE id = $1', [id]);

            res.json({ message: `Recording marked as Admin Standard for module: ${moduleName}` });
        } catch (err: any) {
            res.status(500).json({ error: 'Failed to update standard' });
        }
    });

    // Asset upload endpoint (MinIO)
    app.post('/api/recordings/:id/assets', writeLimiter, upload.single('file'), async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const id = req.params.id;
        if (!isUuid(id)) {
            return res.status(400).json({ error: 'Invalid recording id' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const type = req.body.type || 'screenshot'; // 'video', 'screenshot', or 'manual'
        const ext = req.file.originalname.split('.').pop();
        const objectName = `${id}/${type}_${Date.now()}.${ext}`;

        try {
            // Check if recording exists
            const { rows } = await deps.pool.query('SELECT id FROM recordings WHERE id = $1', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Recording not found' });
            }

            await minioService.uploadFile(objectName, req.file.buffer, {
                'Content-Type': req.file.mimetype,
                'Recording-ID': id
            });

            let column = 'screenshot_url';
            if (type === 'video') column = 'video_url';
            if (type === 'manual') column = 'manual_snapshot_url';

            await deps.pool.query(
                `UPDATE recordings SET ${column} = $1 WHERE id = $2`,
                [objectName, id]
            );

            res.json({ 
                message: 'Asset uploaded successfully', 
                path: objectName,
                type 
            });
        } catch (err: any) {
            console.error('Asset upload error:', err);
            res.status(500).json({ error: 'Failed to upload asset', details: err.message });
        }
    });

    // Asset preview URL endpoint
    app.get('/api/recordings/:id/assets/:type', async (req, res) => {
        const { id, type } = req.params;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid ID' });

        try {
            let column = 'screenshot_url';
            if (type === 'video') column = 'video_url';
            if (type === 'manual') column = 'manual_snapshot_url';

            const { rows } = await deps.pool.query(
                `SELECT ${column} as path FROM recordings WHERE id = $1`,
                [id]
            );

            if (rows.length === 0 || !rows[0].path) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            const url = await minioService.getPresignedUrl(rows[0].path);
            res.json({ url });
        } catch (err: any) {
            res.status(500).json({ error: 'Failed to get preview URL' });
        }
    });

    // Cache helper functions
    const getFromCache = async (key: string): Promise<any | null> => {
        try {
            const result = await deps.pool.query(
                'SELECT value FROM cache WHERE key = $1 AND expires_at > NOW()',
                [key]
            );
            return result.rows.length > 0 ? result.rows[0].value : null;
        } catch {
            return null;
        }
    };

    const setCache = async (key: string, value: any, ttlSeconds: number = 3600): Promise<void> => {
        try {
            await deps.pool.query(
                `INSERT INTO cache (key, value, expires_at) 
                 VALUES ($1, $2, NOW() + INTERVAL '${ttlSeconds} seconds')
                 ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '${ttlSeconds} seconds'`,
                [key, JSON.stringify(value)]
            );
        } catch {
            // Cache write failures are non-fatal
        }
    };

    // Triage endpoint with AI rate limiting
    app.post('/api/triage/:id', writeLimiter, aiLimiter, async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const id = req.params.id;
        if (!isUuid(id)) {
            return res.status(400).json({ error: 'Invalid recording id (uuid expected)' });
        }

        const validationResult = TriageSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.issues
            });
        }
        const { error } = validationResult.data;

        try {
            const { rows } = await deps.pool.query(
                'SELECT * FROM recordings WHERE id = $1',
                [id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Recording not found' });
            }

            const recording = rows[0];
            
            // Check cache for similar errors
            const cacheKey = `triage:${error.substring(0, 50)}`;
            const cached = await getFromCache(cacheKey);
            if (cached) {
                return res.json({ 
                    suggestion: cached.suggestion, 
                    modelUsed: cached.modelUsed, 
                    status: cached.status,
                    fromCache: true 
                });
            }

            const result = await LocalAIService.suggestRootCause({
                steps: recording.steps,
                error,
                appVersion: recording.app_version,
                annotations: recording.annotations,
                expectedResults: recording.expected_results
            });

            await deps.pool.query(
                'INSERT INTO ai_logs (user_id, recording_id, model, prompt, response) VALUES ($1, $2, $3, $4, $5)',
                ['public', id, result.modelUsed, 'ROOT_CAUSE_ANALYSIS', result.response]
            );

            // Cache the result
            await setCache(cacheKey, {
                suggestion: result.response,
                modelUsed: result.modelUsed,
                status: result.status
            }, 1800); // 30 minutes cache

            res.json({ 
                suggestion: result.response, 
                modelUsed: result.modelUsed, 
                status: result.status,
                fromCache: false 
            });
        } catch (err: any) {
            console.error('Triage error:', err);
            res.status(500).json({ error: 'AI Triage failed', details: err.message });
        }
    });

    // Search endpoint
    app.get('/api/search', async (req, res) => {
        const validationResult = SearchQuerySchema.safeParse(req.query);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.issues
            });
        }
        const { q } = validationResult.data;

        try {
            // Check cache
            const cacheKey = `search:${q.substring(0, 50)}`;
            const cached = await getFromCache(cacheKey);
            if (cached) {
                return res.json({ docs: cached, fromCache: true });
            }

            const docs = await KnowledgeService.findRelevantDocs(q);
            
            // Cache the result
            await setCache(cacheKey, docs, 3600); // 1 hour cache

            res.json({ docs, fromCache: false });
        } catch (err: any) {
            console.error('Search error:', err);
            res.status(500).json({ error: 'Knowledge search failed', details: err.message });
        }
    });


    // Test Generation endpoint
    app.post('/api/generate-test', aiLimiter, async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const { requirements } = req.body;
        if (!requirements || typeof requirements !== 'string') {
            return res.status(400).json({ error: 'Requirements are required and must be a string' });
        }

        try {
            const result = await LocalAIService.generateTest(requirements);
            
            await deps.pool.query(
                'INSERT INTO ai_logs (user_id, model, prompt, response) VALUES ($1, $2, $3, $4)',
                ['public', result.modelUsed, `TEST_GENERATION: ${requirements}`, result.response]
            );

            res.json({ 
                testCode: result.response,
                modelUsed: result.modelUsed,
                status: result.status,
                agent: result.agent
            });
        } catch (err: any) {
            console.error('Test generation error:', err);
            res.status(500).json({ error: 'Test generation failed', details: err.message });
        }
    });

    // Reporting endpoints
    app.post('/api/reports/generate', aiLimiter, async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const filter: ReportFilter = req.body;
        
        try {
            const report = await reportingService.generateTestReport(filter);
            res.json(report);
        } catch (err: any) {
            console.error('Report generation error:', err);
            res.status(500).json({ error: 'Report generation failed', details: err.message });
        }
    });

    app.get('/api/reports', async (req, res) => {
        try {
            const reports = await reportingService.listReports();
            res.json({ reports, count: reports.length });
        } catch (err: any) {
            console.error('Report listing error:', err);
            res.status(500).json({ error: 'Failed to list reports', details: err.message });
        }
    });

    app.get('/api/reports/:id', async (req, res) => {
        const id = req.params.id;
        
        try {
            const report = await reportingService.getReportById(id);
            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }
            res.json(report);
        } catch (err: any) {
            console.error('Report retrieval error:', err);
            res.status(500).json({ error: 'Failed to retrieve report', details: err.message });
        }
    });

    app.post('/api/reports/ai-analysis', aiLimiter, async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const { recordingIds } = req.body;
        if (!recordingIds || !Array.isArray(recordingIds)) {
            return res.status(400).json({ error: 'recordingIds array is required' });
        }

        try {
            const report = await reportingService.generateAIAnalysisReport(recordingIds);
            res.json(report);
        } catch (err: any) {
            console.error('AI analysis report generation error:', err);
            res.status(500).json({ error: 'AI analysis report generation failed', details: err.message });
        }
    });

    // AI Logs endpoint
    app.post('/api/ai-logs', writeLimiter, async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const validationResult = AiLogSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.issues
            });
        }
        const { model, prompt, response } = validationResult.data;

        try {
            await deps.pool.query(
                'INSERT INTO ai_logs (user_id, model, prompt, response) VALUES ($1, $2, $3, $4)',
                ['public', model, prompt, response]
            );
            res.status(201).json({ message: 'Log saved' });
        } catch (err: any) {
            console.error('AI log error:', err);
            res.status(500).json({ error: 'Failed to save log', details: err.message });
        }
    });

    // Recordings endpoints
    app.post('/api/recordings', writeLimiter, async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const validationResult = RecordingSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.issues
            });
        }
        const { sessionId, module, isAdmin, appVersion, environment, steps, networkRequests, annotations, expectedResults } = validationResult.data;

        const id = uuidv4();

        try {
            // Process steps to link with Object Repository
            const linkedSteps = await Promise.all((steps as any[]).map(async (step: any) => {
                if (step.selector) {
                    const objectId = await ObjectRepoService.ensureObject(deps.pool, {
                        selector: step.selector,
                        name: step.elementName,
                        appProfile: module
                    });
                    return { ...step, target_object_id: objectId };
                }
                return step;
            }));

            await deps.pool.query(
                `INSERT INTO recordings (
                    id, session_id, app_version, environment, steps, network_requests, 
                    annotations, expected_results, is_admin, user_id
                ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10)`,
                [
                    id,
                    sessionId || '',
                    appVersion || '',
                    JSON.stringify(environment || {}),
                    JSON.stringify(linkedSteps),
                    JSON.stringify(networkRequests || []),
                    JSON.stringify(annotations || []),
                    JSON.stringify(expectedResults || {}),
                    isAdmin || false,
                    'public'
                ]
            );
            res.status(201).json({ id, message: 'Recording saved successfully' });
        } catch (err: any) {
            console.error('Recording save error:', err);
            res.status(500).json({ error: 'Failed to save recording', details: err.message });
        }
    });

    app.get('/api/recordings', async (req, res) => {
        const limit = parseLimit(req.query.limit, 50);
        const page = parsePage(req.query.page, 1);
        const offset = (page - 1) * limit;

        try {
            const { rows } = await deps.pool.query(
                `SELECT id, session_id, app_version, environment, video_url, screenshot_url, manual_snapshot_url, is_admin, created_at 
                 FROM recordings 
                 ORDER BY created_at DESC 
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            
            // Get total count for pagination
            const countResult = await deps.pool.query('SELECT COUNT(*) FROM recordings');
            const total = parseInt(countResult.rows[0].count);

            res.json({ 
                data: rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: offset + rows.length < total,
                    hasPrev: page > 1
                }
            });
        } catch (err: any) {
            console.error('Recordings list error:', err);
            res.status(500).json({ error: 'Database error', details: err.message });
        }
    });

    app.get('/api/recordings/:id', async (req, res) => {
        const id = req.params.id;
        if (!isUuid(id)) {
            return res.status(400).json({ error: 'Invalid recording id (uuid expected)' });
        }

        try {
            const { rows } = await deps.pool.query(
                'SELECT * FROM recordings WHERE id = $1',
                [id]
            );
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Recording not found' });
            }
            res.json(rows[0]);
        } catch (err: any) {
            console.error('Recording fetch error:', err);
            res.status(500).json({ error: 'Database error', details: err.message });
        }
    });

    // Delete recording endpoint
    app.delete('/api/recordings/:id', writeLimiter, async (req, res) => {
        if (!requireApiKey(req, res)) return;
        
        const id = req.params.id;
        if (!isUuid(id)) {
            return res.status(400).json({ error: 'Invalid recording id (uuid expected)' });
        }

        try {
            // Get asset paths before deleting
            const { rows } = await deps.pool.query('SELECT video_url, screenshot_url, manual_snapshot_url FROM recordings WHERE id = $1', [id]);
            
            const result: any = await deps.pool.query(
                'DELETE FROM recordings WHERE id = $1',
                [id]
            );
            
            if ((result as any).rowCount === 0) {
                return res.status(404).json({ error: 'Recording not found' });
            }

            // Cleanup MinIO assets
            if (rows.length > 0) {
                const { video_url, screenshot_url, manual_snapshot_url } = rows[0];
                if (video_url) await minioService.deleteFile(video_url).catch(() => {});
                if (screenshot_url) await minioService.deleteFile(screenshot_url).catch(() => {});
                if (manual_snapshot_url) await minioService.deleteFile(manual_snapshot_url).catch(() => {});
            }

            res.json({ message: 'Recording and associated assets deleted' });
        } catch (err: any) {
            console.error('Recording delete error:', err);
            res.status(500).json({ error: 'Failed to delete recording', details: err.message });
        }
    });

    // Global error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });

    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({ error: 'Not found' });
    });

    return app;
}
