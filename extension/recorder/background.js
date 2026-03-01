let currentRecording = {
    sessionId: '',
    appVersion: 'extension-1.0',
    environment: {},
    steps: [],
    networkRequests: []
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'CAPTURE_STEP') {
        ensureSession();
        currentRecording.steps.push(message.step);
    } else if (message.action === 'UPLOAD_RECORDING') {
        uploadToApi(currentRecording);
    }
});

function ensureSession() {
    if (!currentRecording.sessionId) {
        currentRecording.sessionId = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
            ? globalThis.crypto.randomUUID()
            : String(Date.now());
    }

    if (!currentRecording.environment || typeof currentRecording.environment !== 'object') {
        currentRecording.environment = {};
    }
}

async function uploadToApi(data) {
    try {
        const { apiKey } = await chrome.storage.local.get({ apiKey: '' });
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['x-api-key'] = apiKey;

        const response = await fetch('http://localhost:3000/api/recordings', {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        const result = await response.json();
        console.log('Recording uploaded:', result.id);

        currentRecording = {
            sessionId: '',
            appVersion: 'extension-1.0',
            environment: {},
            steps: [],
            networkRequests: []
        };
    } catch (err) {
        console.error('Upload failed:', err);
    }
}
