# Go-Hybrid AI

This repository contains the core components of the **Go-Hybrid AI** local-first testing platform. It combines high-speed web automation with advanced AI triage and diagnostic capabilities.

## Structure

- **`/backend`**:
  - `/api`: Node.js Express server with PostgreSQL integration.
  - `/validator`: TypeScript business-rule engine.
- **`/frontend`**:
  - `/kb-ui`: Knowledge Base dashboard (React + Vite).
- **`/extension`**:
  - `/recorder`: Chrome Extension (MV3) for capturing actions.
- **`/testing`**:
  - `/replayer`: Playwright replayer for executing recorded flows.
  - `/scripts`: Performance (k6) and API (Postman) test scripts.

## Setup

1. **Prerequisites**: Node.js, PostgreSQL.
2. **Install Dependencies**: `npm install`
3. **Database**: Create a database named `ai_testing_platform` in PostgreSQL. Configure credentials via environment variables (copy `.env.example` to `.env`).
4. **Run API**: `npm run start-api`
5. **Run Dashboard**: `npm run start-kb`
6. **Run Tests**: `npm test`
7. **Run Performance Test**: `k6 run testing/scripts/performance.k6.js`

## Key Scenarios

### Leave vs Holiday Bug Detection
Use `LeavePolicyValidator.test.ts` to verify the logic. The validator detects if the system correctly handles holidays based on the policy.

### Replay & Triage
The `replayer/replayer.spec.ts` demonstrates how to consume a recording and execute it via Playwright, capturing screenshots for visual diffing.
