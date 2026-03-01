/**
 * E2E Test Setup for Playwright
 * 
 * This file provides utilities for end-to-end testing of the AI Testing Platform.
 * It includes setup/teardown for the API server and common test fixtures.
 */

import { test as base, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Test configuration
const API_PORT = 3001; // Use different port for tests
const API_URL = `http://localhost:${API_PORT}`;

// Extend Playwright test with fixtures
export const test = base.extend<{
  apiServer: {
    url: string;
    stop: () => Promise<void>;
  };
}>({
  apiServer: async ({}, use) => {
    let serverProcess: ChildProcess | null = null;

    try {
      // Start the API server
      console.log(`Starting API server on port ${API_PORT}...`);
      serverProcess = spawn('npx', ['ts-node', 'backend/api/server.ts'], {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          PORT: API_PORT.toString(),
          PG_USER: process.env.PG_USER || 'postgres',
          PG_PASSWORD: process.env.PG_PASSWORD || 'postgres',
          PG_HOST: process.env.PG_HOST || 'localhost',
          PG_PORT: process.env.PG_PORT || '5432',
          PG_DATABASE: process.env.PG_DATABASE || 'ai_testing_platform_test',
        },
        stdio: 'pipe',
      });

      // Wait for server to be ready
      await waitForServer(API_URL, 30000);
      console.log(`API server started on ${API_URL}`);

      await use({
        url: API_URL,
        stop: async () => {
          if (serverProcess) {
            serverProcess.kill();
            serverProcess = null;
          }
        },
      });
    } finally {
      if (serverProcess) {
        serverProcess.kill();
      }
    }
  },
});

// Helper function to wait for server to be ready
async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server failed to start within ${timeout}ms`);
}

// Export expect for convenience
export { expect };

/**
 * Example E2E Test: Recording Flow
 * 
 * Usage:
 * import { test, expect } from './e2e-setup';
 * 
 * test('should create and retrieve a recording', async ({ apiServer }) => {
 *   const response = await fetch(`${apiServer.url}/api/recordings`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       sessionId: 'test-session',
 *       steps: [{ action: 'click', selector: '#button' }],
 *     }),
 *   });
 *   
 *   expect(response.status).toBe(201);
 *   const data = await response.json();
 *   expect(data.id).toBeDefined();
 * });
 */
