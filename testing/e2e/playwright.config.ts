import { defineConfig } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * 
 * Run with: npx playwright test --config=testing/e2e/playwright.config.ts
 */

export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  
  // Timeout for each test
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  
  // Run tests in parallel
  fullyParallel: false,
  
  // Number of retries
  retries: 1,
  
  // Number of workers
  workers: 1,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: '../playwright-report' }],
    ['json', { outputFile: '../playwright-report/results.json' }],
    ['list'],
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL for the frontend
    baseURL: 'http://localhost:5173',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },
  
  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
  
  // Web server configuration (if needed)
  // webServer: {
  //   command: 'npm run start-api',
  //   url: 'http://localhost:3000/api/health',
  //   reuseExistingServer: true,
  // },
});
