import { Pool } from 'pg';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { createApp, initDb } from './app';
import { config } from './config';

const pool = new Pool({
    user: config.postgres.user,
    host: config.postgres.host,
    database: config.postgres.database,
    password: config.postgres.password,
    port: config.postgres.port,
    max: config.postgres.max,
    idleTimeoutMillis: config.postgres.idleTimeoutMillis,
    connectionTimeoutMillis: config.postgres.connectionTimeoutMillis,
});

async function startServer() {
    try {
        await initDb(pool);
        const app = createApp({ pool });
        const server = http.createServer(app);

        // Initialize WebSocket Server
        const wss = new WebSocketServer({ server });

        wss.on('connection', (ws) => {
            console.log('[Detective-WS] New dashboard client connected');
            
            ws.on('message', (message) => {
                // Handle incoming steps from the extension and broadcast to dashboard
                try {
                    const data = JSON.parse(message.toString());
                    if (data.type === 'LIVE_STEP') {
                        // Broadcast to all other clients (the dashboard)
                        wss.clients.forEach((client) => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(data));
                            }
                        });
                    }
                } catch (e) {
                    console.error('WS Message parsing error', e);
                }
            });
        });

        server.listen(config.server.port, () => {
            console.log(`[Go-Hybrid AI] Forensic Backend running at http://localhost:${config.server.port}`);
            console.log(`[Go-Hybrid AI] Live Streaming (WS) active on same port`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
