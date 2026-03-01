import { Pool } from 'pg';
import { config } from './config';
import { createApp, initDb } from './app';

const pool = new Pool(config.postgres);

const app = createApp({ pool });

if (require.main === module) {
    initDb(pool)
        .then(() => {
            app.listen(config.server.port, () => {
                console.log(`Recorder API running on http://localhost:${config.server.port}`);
            });
        })
        .catch((err) => {
            console.error('DB init failed:', err);
            process.exitCode = 1;
        });
}

export { app };
