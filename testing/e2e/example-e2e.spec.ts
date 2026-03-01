/**
 * E2E Example Tests for AI Testing Platform
 * 
 * These tests demonstrate the full workflow of the platform:
 * 1. Creating recordings
 * 2. Retrieving recordings
 * 3. AI triage
 * 4. Knowledge search
 */

import { test, expect } from './e2e-setup';

test.describe('Recording Management', () => {
  test('should create a new recording', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/recordings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: `test-session-${Date.now()}`,
        appVersion: '1.0.0',
        environment: { browser: 'chrome', os: 'windows' },
        steps: [
          { action: 'click', selector: '#login-button', timestamp: Date.now() },
          { action: 'type', selector: '#username', value: 'testuser', timestamp: Date.now() + 100 },
          { action: 'type', selector: '#password', value: 'testpass', timestamp: Date.now() + 200 },
          { action: 'click', selector: '#submit', timestamp: Date.now() + 300 },
        ],
        networkRequests: [
          { url: 'https://api.example.com/login', method: 'POST', status: 200 },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.message).toBe('Recording saved successfully');
  });

  test('should retrieve recordings list with pagination', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/recordings?limit=10&page=1`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
  });

  test('should retrieve a specific recording by ID', async ({ apiServer }) => {
    // First create a recording
    const createResponse = await fetch(`${apiServer.url}/api/recordings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: `test-session-${Date.now()}`,
        steps: [{ action: 'click', selector: '#test' }],
      }),
    });

    expect(createResponse.status).toBe(201);
    const createData = await createResponse.json();
    const recordingId = createData.id;

    // Then retrieve it
    const getResponse = await fetch(`${apiServer.url}/api/recordings/${recordingId}`);
    expect(getResponse.status).toBe(200);
    const getData = await getResponse.json();
    expect(getData.id).toBe(recordingId);
  });
});

test.describe('Health & Metrics', () => {
  test('should return healthy status', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/health`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.db).toBe(true);
    expect(data.version).toBeDefined();
  });

  test('should return metrics', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/metrics`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('totalRecordings');
    expect(data).toHaveProperty('totalAiLogs');
    expect(data).toHaveProperty('recordingsLast24h');
  });
});

test.describe('Knowledge Search', () => {
  test('should search knowledge base', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/search?q=test`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('docs');
    expect(data).toHaveProperty('fromCache');
  });

  test('should reject empty search query', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/search?q=`);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

test.describe('Validation & Error Handling', () => {
  test('should reject recording with empty steps', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/recordings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test',
        steps: [],
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
  });

  test('should reject recording without steps field', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/recordings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test',
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
  });

  test('should return 404 for non-existent recording', async ({ apiServer }) => {
    const fakeId = '550e8400-e29b-41d4-a716-446655440000';
    const response = await fetch(`${apiServer.url}/api/recordings/${fakeId}`);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Recording not found');
  });

  test('should return 400 for invalid UUID', async ({ apiServer }) => {
    const response = await fetch(`${apiServer.url}/api/recordings/invalid-id`);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid recording id (uuid expected)');
  });
});
