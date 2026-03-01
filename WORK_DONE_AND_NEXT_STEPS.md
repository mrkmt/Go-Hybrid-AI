# Work Done & Next Steps (2026-03-01)

This note summarizes what was changed in the repo during this session, and what you should implement next.

---

## What I did (implemented)

### Backend (API)
- Centralized configuration + env loading in `backend/api/config.ts`.
- Refactored API into a testable app factory in `backend/api/app.ts`:
  - `createApp({ pool })` to build the Express app without starting a listener.
  - `initDb(pool)` to initialize tables.
  - Added `GET /api/health` (checks DB connectivity).
- Improved request handling:
  - Basic payload validation for `POST /api/recordings` (requires non-empty `steps[]`).
  - Added `limit` support for `GET /api/recordings?limit=...` (default 50, max 200).
- Centralized/shared database mode (no per-user separation for now):
  - Removed reliance on `x-user-id` and removed `user_id` filtering in queries.
  - All users share the same recordings and AI logs (single shared dataset).
- Added optional API key protection (when `API_KEY` is set):
  - Protected endpoints: `POST /api/recordings`, `POST /api/triage/:id`, `POST /api/ai-logs`.
  - Header used: `x-api-key`.
- AI orchestration improvements:
  - Removed hard-coded model/URL values in `backend/api/AgentOrchestrator.ts` and read from config/env.
  - Added request timeouts + `Content-Type: application/json` for LLM calls.
  - Made fallback model optional via `FALLBACK_AI_MODEL` (if empty, no fallback is attempted).
- Knowledge search fix:
  - Replaced hard-coded personal Windows paths + random scoring in `backend/api/KnowledgeService.ts`.
  - Implemented portable keyword-based scanning of local knowledge roots (configurable via env).

### Frontend (KB UI)
- Made frontend consistently send optional API key on every request:
  - Wrapper `apiFetch()` in `frontend/kb-ui/src/App.tsx`.
  - Adds (if provided) `x-api-key`.
- Removed the “User Context” selector and stopped sending `x-user-id` (shared mode).
- Added lightweight error handling for recordings/details/triage load.
- Added an API key input stored in `localStorage` (optional).

### Extension (Recorder)
- Improved upload payload so backend has required fields:
  - Added `sessionId` auto-generation, `appVersion`, `environment`.
- Added optional `x-api-key` header on upload using `chrome.storage.local`.
- Updated `extension/recorder/popup.html` to allow setting an API key.
- Removed User ID input and stopped sending `x-user-id` (shared mode).

### Testing / TypeScript config
- Replaced placeholder backend API tests with real tests in `backend/api/server.test.ts` using `createApp()`.
- Added root `tsconfig.json` to make Jest/ts-jest happy (`esModuleInterop: true`) for backend tests.

---

## Files changed / added

- Added: `backend/api/app.ts`
- Added: `backend/api/config.ts`
- Updated: `backend/api/server.ts`
- Updated: `backend/api/AgentOrchestrator.ts`
- Updated: `backend/api/LocalAIService.ts`
- Updated: `backend/api/KnowledgeService.ts`
- Updated: `backend/api/server.test.ts`
- Updated: `frontend/kb-ui/src/App.tsx`
- Updated: `extension/recorder/background.js`
- Updated: `extension/recorder/popup.html`
- Updated: `.env.example`
- Updated: `README.md`
- Added: `tsconfig.json`

---

## What you need to do next (implementation roadmap)

### 1) Security (highest priority)
- Add real authentication/authorization (JWT/session + roles) when you’re ready (currently data is shared/centralized).
- Add rate limiting, request size limits (more strict), and structured error responses.
- Add request schema validation for every endpoint using `zod`/`joi` (not just basic checks).
- Add proper secrets management and deployment-safe config (no secrets in repo).

### 2) Data model + migrations
- Add a migration tool (e.g., `drizzle`, `knex`, or `typeorm`) instead of `CREATE TABLE IF NOT EXISTS` at startup.
- Add indexes (`recordings.user_id`, `recordings.created_at`, `ai_logs.recording_id`, etc.).
- Consider multi-tenant boundaries if you’ll support multiple orgs/projects.

### 3) Knowledge base (prototype → real)
- Decide on the KB strategy:
  - Minimal: persist a searchable index in SQLite.
  - Better: vector search (`pgvector` in Postgres, or a local vector DB).
- Add ingestion pipeline + caching and remove filesystem scanning from hot request path.

### 4) Tests & CI
- Add Supertest coverage for all API routes (happy path + error cases).
- Add Playwright E2E tests for the KB UI and recording/replay workflows.
- Add CI workflow to run: `jest`, TypeScript typecheck, and Playwright (optional).

### 5) Product/UX improvements
- KB UI: implement real search, pagination, and better error/empty states.
- Extension: capture more event types + network requests reliably; add “recording session reset” UX.
- Add admin tools: view AI logs, model versions, and auditing.

---

## Updated / new environment variables

See `.env.example`. Notable additions:
- `API_KEY` (optional; when set, required for write/AI endpoints)
- `AI_TIMEOUT_MS`
- `FALLBACK_AI_MODEL` (optional)
- `KNOWLEDGE_PATHS` (optional additional roots)
