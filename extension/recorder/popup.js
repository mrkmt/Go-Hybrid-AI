const apiKeyEl = document.getElementById('apiKey');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const statusEl = document.getElementById('status');

chrome.storage.local.get({ apiKey: '', isRecording: false }, (data) => {
    if (apiKeyEl) apiKeyEl.value = data.apiKey;
    updateUI(data.isRecording);
});

function updateUI(recording) {
    const noteArea = document.getElementById('noteArea');
    if (recording) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        if (noteArea) noteArea.style.display = 'block';
        statusEl.innerText = '🔴 Recording...';
        statusEl.style.color = '#f44336';
    } else {
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        if (noteArea) noteArea.style.display = 'none';
        statusEl.innerText = 'Ready';
        statusEl.style.color = '#666';
    }
}

document.getElementById('addNote').onclick = () => {
    const noteText = document.getElementById('noteText');
    if (noteText.value) {
        chrome.runtime.sendMessage({ action: 'ADD_ANNOTATION', text: noteText.value });
        noteText.value = '';
        statusEl.innerText = 'Note added !';
        setTimeout(() => statusEl.innerText = '🔴 Recording...', 1500);
    }
};

if (apiKeyEl) {
    apiKeyEl.addEventListener('input', () => chrome.storage.local.set({ apiKey: apiKeyEl.value }));
}

startBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { action: 'START_RECORDING' }, (response) => {
            if (chrome.runtime.lastError) {
                chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['content.js']
                }, () => {
                    chrome.tabs.sendMessage(tabId, { action: 'START_RECORDING' });
                });
            }
            chrome.storage.local.set({ isRecording: true });
            updateUI(true);
        });
    });
};

stopBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_RECORDING' });
        chrome.storage.local.set({ isRecording: false });
        updateUI(false);
    });
};

document.getElementById('upload').onclick = () => {
    statusEl.innerText = 'Uploading...';
    chrome.runtime.sendMessage({ action: 'UPLOAD_RECORDING' }, (response) => {
        statusEl.innerText = 'Uploaded ✅';
        setTimeout(() => statusEl.innerText = 'Ready', 2000);
    });
};
