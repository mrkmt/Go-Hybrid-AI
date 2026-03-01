let isRecording = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_RECORDING') {
        isRecording = true;
        console.log('AI-Aero: Recording started');
    } else if (message.action === 'STOP_RECORDING') {
        isRecording = false;
        console.log('AI-Aero: Recording stopped');
    }
});

// Capture clicks and typing
document.addEventListener('click', (e) => {
    if (!isRecording) return;

    const target = e.target;
    const step = {
        type: 'click',
        selector: getBestSelector(target),
        timestamp: Date.now(),
        html: target.outerHTML
    };

    chrome.runtime.sendMessage({ action: 'CAPTURE_STEP', step });
}, true);

document.addEventListener('input', (e) => {
    if (!isRecording) return;

    const target = e.target;
    const step = {
        type: 'input',
        selector: getBestSelector(target),
        value: target.value,
        timestamp: Date.now()
    };

    chrome.runtime.sendMessage({ action: 'CAPTURE_STEP', step });
}, true);

function getBestSelector(el) {
    if (el.getAttribute('data-test-id')) {
        return `[data-test-id="${el.getAttribute('data-test-id')}"]`;
    }
    if (el.id) {
        return `#${el.id}`;
    }
    // Fallback to basic tag+class selector
    return el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ').join('.')}` : '');
}
