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

1. **Prerequisites**: Node.js, PostgreSQL, MinIO, Ollama.
2. **Install Dependencies**: `npm install`
3. **Database**: Create a database named `ai_testing_platform` in PostgreSQL. Configure credentials in `.env`.
4. **Run API**: `npm run start-api`
5. **Run Dashboard**: `npm run start-kb`
6. **Run Tests**: `npm test`
