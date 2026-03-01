let currentRecording = {
    sessionId: '',
    module: 'default', // Autodetected module
    appVersion: 'extension-1.1',
    environment: {},
    steps: [],
    networkRequests: [],
    annotations: []
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

let socket = null;

function connectWs() {
    socket = new WebSocket('ws://localhost:3000');
    socket.onopen = () => console.log('[Go-Hybrid-WS] Connected to live stream');
    socket.onclose = () => setTimeout(connectWs, 5000); // Reconnect loop
}

connectWs();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'CAPTURE_STEP') {
        ensureSession();

        // Autodetect module
        if (currentRecording.module === 'default' && sender.tab?.url) {
            currentRecording.module = detectModule(sender.tab.url);
        }

        currentRecording.steps.push(message.step);

        // Stream live step to Dashboard
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'LIVE_STEP',
                sessionId: currentRecording.sessionId,
                module: currentRecording.module,
                url: sender.tab?.url,
                step: message.step
            }));
        }
    } else if (message.action === 'ADD_ANNOTATION') {
        ensureSession();
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
            currentRecording.annotations.push({
                stepIndex: currentRecording.steps.length - 1,
                text: message.text,
                timestamp: Date.now(),
                screenshot: dataUrl
            });
            console.log('Annotation added with screenshot:', message.text);
        });
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
        // If we have annotations with screenshots, use the first one as a manual snapshot for the comparison grid
        if (recording.annotations && recording.annotations.length > 0) {
            const firstWithShot = recording.annotations.find(a => a.screenshot);
            if (firstWithShot) {
                const shotBlob = await (await fetch(firstWithShot.screenshot)).blob();
                const shotFile = new File([shotBlob], 'manual_annotation.jpg', { type: 'image/jpeg' });

                const shotFormData = new FormData();
                shotFormData.append('file', shotFile);
                shotFormData.append('type', 'manual');

                await fetch(`${API_URL}/recordings/${result.id}/assets`, {
                    method: 'POST',
                    headers: { 'x-api-key': apiKey },
                    body: shotFormData
                });
            }
        }

        // Notify Dashboard to refresh
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'UPLOAD_COMPLETE', recordingId: result.id }));
        }

        currentRecording = {
            sessionId: '',
            module: 'default',
            appVersion: 'extension-1.1',
            environment: {},
            steps: [],
            networkRequests: [],
            annotations: []
        };
    } catch (err) {
        console.error('Upload failed:', err);
    }
}
