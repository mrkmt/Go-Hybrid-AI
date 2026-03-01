import fetch from 'node-fetch';

async function simulateSuccess() {
    console.log("📤 Simulating KMTCD-206 SUCCESS Recording Upload...");

    const API_URL = "http://localhost:3000/api";

    const successPayload = {
        sessionId: `kmtcd-206-success-${Date.now()}`,
        appVersion: 'global-hr-1.0',
        module: 'auth',
        environment: { browser: 'chrome', url: 'https://www.globalhr.app/abcd#/login' },
        steps: [
            { type: 'input', selector: '#id_number', value: 'kmtcd-206', timestamp: Date.now() - 5000 },
            { type: 'input', selector: '#username', value: 'ursa', timestamp: Date.now() - 4000 },
            { type: 'input', selector: '#password', value: 'Global@2024', timestamp: Date.now() - 3000 },
            { type: 'click', selector: '#login_btn', timestamp: Date.now() - 2000 }
        ],
        annotations: [
            { text: "အောင်မြင်စွာ log in ဝင်ရောက်နိုင်ခဲ့သည်။", timestamp: Date.now() }
        ]
    };

    try {
        const res = await fetch(`${API_URL}/recordings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(successPayload)
        });
        const data = await res.json();
        console.log("✅ Success Recording Created ID:", data.id);
    } catch (err) {
        console.error("❌ Success Simulation Failed:", err);
    }
}

simulateSuccess();
