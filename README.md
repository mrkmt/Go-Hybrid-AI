# Go-Hybrid AI (v1.2.0)

**Go-Hybrid AI** is a high-speed, local-first forensic testing platform. It transforms manual testing into automated "investigations" using a unique Digital Detective methodology that bridges **Admin Ground Truth** (Standards) and **Current Executions** (Tests).

## 🕵️‍♂️ Core Features

- **Hybrid AI Bridge:** Combines **Local AI (Ollama)** for data privacy and **Cloud AI (Gemini)** for high-level reasoning and policy auditing.
- **Forensic Dashboard:** Side-by-side 3-frame visual audit (Admin vs. Manual vs. Automated).
- **Real-time Streaming:** Live WebSocket feed of recording steps appearing instantly in the dashboard.
- **Object Repository:** Centralized UI element management with **Self-Healing** AI repair.
- **Multi-Vector Ingestion:** Unified API to ingest intelligence from **Playwright, Selenium, Postman, and JMeter**.
- **Specialized Forensic Units:** Built-in logic for auditing HR modules like Payroll, Attendance, and Leave.

## 🏗️ Technical Stack

- **Backend:** Node.js, Express, TypeScript, PostgreSQL.
- **Frontend:** React, Vite (Cyber-Security Dark Theme).
- **Storage:** MinIO (Local S3-compatible asset storage).
- **AI:** Ollama (Qwen 2.5) & Gemini 1.5 Flash.
- **Extension:** Chrome MV3 Recorder with URL-based autodetection.

## 🚦 Quick Setup

1. **Prerequisites:** Install Node.js, PostgreSQL, MinIO, and Ollama.
2. **Environment:** Copy `.env.example` to `.env` and configure your credentials.
3. **Install:** 
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend/kb-ui && npm install
   ```
4. **Database:** Initialize the schema:
   ```bash
   npm run init-db
   ```
5. **Launch:**
   - Start API: `npm run start-api`
   - Start Dashboard: `npm run start-kb`
   - Load Extension: Load `extension/recorder` into Chrome via Developer Mode.

## 🔎 Investigation Workflow

1. **Capture:** Record a "Perfect" run and mark it as **Admin Standard** in the dashboard.
2. **Execute:** Run automated tests or capture manual failures.
3. **Audit:** Use the CLI (`gh-ai audit`) or Dashboard to compare executions against the Standard.
4. **Verdict:** Let the Hybrid AI issue a **[GUILTY]** or **[CLEAR]** verdict based on your company's policy MD files.

---
*Developed for high-integrity software environments. Privacy-first. Local-first.*
