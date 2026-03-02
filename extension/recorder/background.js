let currentRecording = {
    sessionId: '',
    module: 'default', // Autodetected module
    appVersion: 'extension-1.1',
    environment: {},
    steps: [],
    networkRequests: [],
    annotations: []
};

// Capture network requests
chrome.webRequest.onCompleted.addListener(
    (details) => {
        if (!currentRecording.sessionId) return; // Only capture if recording is active
        
        // Skip data URLs and small requests
        if (details.url.startsWith('data:') || details.url.includes('chrome-extension://')) return;
        
        currentRecording.networkRequests.push({
            url: details.url,
            method: details.method,
            statusCode: details.statusCode,
            timestamp: details.timeStamp,
            type: details.type
        });
    },
    { urls: ['<all_urls>'] }
);

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

        // Send recording to backend
        const response = await fetch('http://localhost:3000/api/recordings', {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Upload successful, recording ID:', result.id);

        // Upload annotation screenshots to MinIO if any exist
        if (data.annotations && data.annotations.length > 0) {
            const firstWithShot = data.annotations.find(a => a.screenshot);
            if (firstWithShot) {
                try {
                    const shotBlob = await (await fetch(firstWithShot.screenshot)).blob();
                    const shotFile = new File([shotBlob], 'manual_annotation.jpg', { type: 'image/jpeg' });

                    const shotFormData = new FormData();
                    shotFormData.append('file', shotFile);
                    shotFormData.append('type', 'manual');

                    const uploadHeaders = {};
                    if (apiKey) uploadHeaders['x-api-key'] = apiKey;

                    await fetch(`http://localhost:3000/api/recordings/${result.id}/assets`, {
                        method: 'POST',
                        headers: uploadHeaders,
                        body: shotFormData
                    });
                    console.log('✅ Annotation screenshot uploaded to MinIO');
                } catch (err) {
                    console.error('⚠️ Failed to upload annotation screenshot:', err);
                }
            }
        }

        // Notify Dashboard to refresh via WebSocket
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'UPLOAD_COMPLETE', recordingId: result.id }));
            console.log('📡 Notified dashboard to refresh');
        }

        // Reset recording state
        currentRecording = {
            sessionId: '',
            module: 'default',
            appVersion: 'extension-1.1',
            environment: {},
            steps: [],
            networkRequests: [],
            annotations: []
        };

        console.log('🎉 Upload complete!');
    } catch (err) {
        console.error('❌ Upload failed:', err.message);
        // Don't reset currentRecording so user can retry
    }
}
