import { Pool } from 'pg';
import { config } from './config';

async function initDatabase() {
    const pool = new Pool({
        user: config.postgres.user,
        host: config.postgres.host,
        database: config.postgres.database,
        password: config.postgres.password,
        port: config.postgres.port,
    });

    try {
        // Create tables
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
                user_id VARCHAR(255) DEFAULT 'public',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Ensure columns exist if table was already created
        try {
            await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS video_url TEXT;`);
            await pool.query(`ALTER TABLE recordings ADD COLUMN IF NOT EXISTS screenshot_url TEXT;`);
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

        console.log('Database initialized successfully!');
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    initDatabase()
        .then(() => {
            console.log('Database initialization completed.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Database initialization failed:', err);
            process.exit(1);
        });
}