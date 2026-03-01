import { Pool } from 'pg';
import { config } from './config';

/**
 * Database Migration Script
 * Run with: npm run db:migrate
 * 
 * This script creates/updates the database schema with proper indexes.
 */

async function migrate() {
    const pool = new Pool(config.postgres);

    console.log('Starting database migration...');

    try {
        // Create recordings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS recordings (
                id UUID PRIMARY KEY,
                session_id VARCHAR(255),
                app_version VARCHAR(50),
                environment JSONB,
                steps JSONB,
                network_requests JSONB,
                user_id VARCHAR(255) DEFAULT 'public',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ recordings table created/verified');

        // Create ai_logs table with foreign key
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
        console.log('✓ ai_logs table created/verified');

        // Create cache table for response caching
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cache (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ cache table created/verified');

        // Create indexes for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_recordings_created_at 
            ON recordings(created_at DESC);
        `);
        console.log('✓ idx_recordings_created_at index created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_recordings_user_id 
            ON recordings(user_id);
        `);
        console.log('✓ idx_recordings_user_id index created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_ai_logs_recording_id 
            ON ai_logs(recording_id);
        `);
        console.log('✓ idx_ai_logs_recording_id index created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at 
            ON ai_logs(created_at DESC);
        `);
        console.log('✓ idx_ai_logs_created_at index created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_cache_expires_at 
            ON cache(expires_at);
        `);
        console.log('✓ idx_cache_expires_at index created');

        // Ensure user_id default is set
        try {
            await pool.query(`
                ALTER TABLE recordings ALTER COLUMN user_id SET DEFAULT 'public';
            `);
            console.log('✓ recordings.user_id default set to "public"');
        } catch (err) {
            console.log('⚠ recordings.user_id default may already be set');
        }

        console.log('\n✅ Migration completed successfully!');
    } catch (err: any) {
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrate();
