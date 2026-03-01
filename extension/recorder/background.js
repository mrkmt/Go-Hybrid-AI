let currentRecording = {
    sessionId: '',
    module: 'default', // Autodetected module
    appVersion: 'extension-1.1',
    environment: {},
    steps: [],
    networkRequests: []
};

function detectModule(url) {
    if (!url) return 'default';
    const path = url.toLowerCase();
    if (path.includes('payroll') || path.includes('salary')) return 'payroll';
    if (path.includes('leave') || path.includes('holiday')) return 'leave';
    if (path.includes('attendance') || path.includes('roster') || path.includes('checkin')) return 'attendance';
    if (path.includes('employee') || path.includes('staff') || path.includes('profile')) return 'hr-profile';
    return 'default';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'CAPTURE_STEP') {
        ensureSession();
        
        // Autodetect module from the tab URL if it's still 'default'
        if (currentRecording.module === 'default' && sender.tab?.url) {
            currentRecording.module = detectModule(sender.tab.url);
            console.log('[Go-Hybrid] Autodetected Module:', currentRecording.module);
        }

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
            module: 'default',
            appVersion: 'extension-1.1',
            environment: {},
            steps: [],
            networkRequests: []
        };
    } catch (err) {
        console.error('Upload failed:', err);
    }
}
