const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', function open() {
    console.log('✅ Connected to WebSocket server');
    ws.close();
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
});

setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
        console.log('⏳ Timeout waiting for connection. State:', ws.readyState);
        ws.terminate();
    }
}, 5000);
