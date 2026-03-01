import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10,
    duration: '30s',
};

export default function () {
    const url = 'http://localhost:3000/api/recordings';
    const payload = JSON.stringify({
        sessionId: 'k6-test-session',
        steps: [{ type: 'perf-test', timestamp: Date.now() }]
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);
    check(res, {
        'status is 201': (r) => r.status === 201,
    });
    sleep(1);
}
