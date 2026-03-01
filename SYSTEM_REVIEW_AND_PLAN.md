# System Review & Implementation Plan

This document consolidates the findings from a code‑level review of the AI‑Aero Testing Platform, highlights current issues and risks, and proposes a phased implementation roadmap to address them.

---

## ✅ What the System Does Today

- **Frontend**: React/Vite dashboard (`/frontend/kb-ui`) that lists test recordings and shows AI triage results.
- **Extension**: Chrome MV3 recorder (`/extension/recorder`) sending captured steps to backend.
- **Backend API** (`/backend/api`): Express server with PostgreSQL storage, AI orchestration, and a lightweight knowledge search helper.
- **Validator** (`/backend/validator`): Business–rule engine for leave/holiday logic with unit tests.
- **AI Integration**: Local Ollama models are queried via `LocalAIService` & `AgentOrchestrator`; skills defined in `SkillRegistry`; context trimmed by `ContextManager`.
- **Testing**: A handful of unit tests for the validator and a placeholder integration test; Playwright replayer spec and performance scripts exist but with hard‑coded endpoints.
- **Documentation**: Several markdown guides (setup, architecture, security, scalability, etc.).


## ⚠️ Key Issues & Risks Identified

| Area | Issue | Severity | Remarks |
|------|-------|----------|---------|
| Config & Secrets | Database credentials, model URLs and file paths are hard‑coded in source (`server.ts`, `LocalAIService.ts`, `KnowledgeService.ts`). | **MEDIUM** | Mentioned in existing `SECURITY_ANALYSIS.md` but not fixed. |
| Security & Access | No real authentication/authorization; `authMiddleware` merely reads a header. | **HIGH** | User‑aware queries are spoofable; leads to data leak/race. |
| Input Validation | Many endpoints accept arbitrary JSON without schema checks (e.g. recordings, triage payload). | **MEDIUM** | Could lead to runtime errors or injection exploits. |
| Error Handling | API handlers often respond with generic 500 and swallow errors; frontend ignores failures. | **LOW** | Hard to diagnose production issues. |
| Testing | Server tests are placeholders; no coverage for most endpoints or AI logic. E2E tests missing. | **MEDIUM** | Risks regression and drift. |
| Hard‑coded Paths | Local user paths in `KnowledgeService` tie code to a single developer machine. | **LOW** | Non‑portable and non‑configurable. |
| Architecture | Simple token trimming algorithm; no real vector DB; fallback models are simulated. | **LOW** | Acceptable for prototype but scale‑up requires improvement. |
| Documentation | Several docs exist, but there’s no “next‑step” developer plan or checklist. | **LOW** | Good starting point, but lacking actionables. |


## 🛠 Implementation Plan

Work should be split into logical phases so incremental changes can be reviewed and deployed.

### Phase 1 – Hygiene & Configuration

1. **Env configuration**
   - Introduce `dotenv` (or similar) and move all hostnames, ports, passwords, model names, and file paths into environment variables.
   - Add `.env.example` with placeholders.

2. **Remove hard‑coded local paths**
   - Replace `KnowledgeService` constants with configurable paths or a plugin system.
   - Add defensive checks for path existence.

3. **Strict typing & linting**
   - Enable `strict` mode in `tsconfig.json`.
   - Add ESLint/Prettier (if not already) and apply to backend/frontend.

### Phase 2 – Security & Validation

1. **Authentication/Authorization**
   - Replace header middleware with JWT or session‑based auth.
   - Add role checks (tester vs admin) across endpoints.

2. **Request validation**
   - Use a library like `zod`/`joi` for every incoming JSON payload (recording, triage, search, ai‑log).
   - Sanitize strings before embedding in prompts to prevent injection.

3. **Database safety**
   - Keep using parameterized queries; add indexes on frequently‑queried columns (e.g., `user_id`, `created_at`).
   - Consider using a migration tool (e.g. `knex`, `typeorm`, `drizzle`) for schema management.

4. **AI service security**
   - Support API key for Ollama (w/ env var).
   - Validate responses against expected JSON schemas (use `ajv`).

### Phase 3 – Testing & Quality

1. **Expand unit tests**
   - Add tests for every API handler using supertest (export app instead of starting listener).
   - Cover `LocalAIService`, `AgentOrchestrator`, `ContextManager`, `SkillRegistry` with mocks/fakes.

2. **Integration/E2E**
   - Write Playwright tests for the dashboard plus extension (simulate recording upload using local server). Use `testing/replayer` as base.
   - Add a GitHub Action or npm script to run tests and measure coverage (goal ≥80%).

3. **Static analysis**
   - Add TypeScript type checks to CI.
   - Run `npm run lint` as part of build.

### Phase 4 – Feature & Architectural Enhancements

1. **Knowledge base improvements**
   - Persist embeddings in a lightweight vector DB (e.g. `sqlite` with `pgvector` or `faiss`).
   - Improve `calculateSimilarity` using cosine product and cache embeddings.

2. **Context management**
   - Introduce dynamic token budgeting based on model metadata.
   - Optionally add “rolling window” + prioritization of error messages.

3. **AI orchestration**
   - Real agentic chain‑of‑thought logging; support streaming responses.
   - Store model version in `ai_logs` and surface it in UI for audit.

4. **Performance & scalability**
   - Add basic pagination on `GET /api/recordings`.
   - Support bulk upload from extension/replayer.

5. **Operational readiness**
   - Add health check endpoint (`/api/health`) verifying DB and AI connectivity.
   - Build docker-compose configuration for local development (Postgres + Ollama).
   - Provide a simple deployment guide.

### Phase 5 – Documentation & Onboarding

- Update `STARTUP_CHECKLIST.md` and other guides to reflect new env variables, setup commands, and test instructions.
- Add a `CHANGELOG.md` with semantic‑versioned entries.
- Create a high‑level roadmap in the repo root for future features (e.g. multi‑tenant support, cloud AI integration).

---

## 🎯 Next Steps

- Review and commit Phase 1 changes as a self‑contained PR.
- Run `tdd-guide` agent to write tests before implementing each feature in subsequent phases.
- Schedule a security review after Phase 2 is complete.
- Monitor coverage and performance during Phase 3 to verify improvements.

This structured approach will transform the prototype into a secure, maintainable platform capable of scaling beyond a single developer’s machine.

---

*Generated 2026‑03‑01 by GitHub Copilot (Raptor mini).*