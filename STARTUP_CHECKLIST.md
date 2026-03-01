# Platform Startup Checklist: Getting Started

Follow these 5 steps to run the complete AI-Aero Testing Platform on your local machine.

## 1. Prerequisites (Setup Once)
- **Node.js**: Install latest LTS.
- **PostgreSQL**: Create a database named `ai_testing_platform`.
- **Ollama**: Install and run `ollama pull qwen2.5:latest` and `ollama pull mxbai-embed-large:latest`.
- **Chrome**: For the recorder extension.

## 2. Backend Initialization
```bash
cd backend/api
npm install
# Update server.ts with your Postgres password
npm start
```
*Note: The server will automatically create your tables on first run.*

## 3. Frontend Dashboard
```bash
cd frontend/kb-ui
npm install
npm run dev
```
*Access at: http://localhost:5173* (Vite default).

## 4. Recorder Extension
1. Open Chrome -> `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" -> Select the `extension/recorder` folder.
4. Open your Angular app and start recording!

## 5. Verification & Testing
To run all automated verification scripts:
```bash
# From the root directory
npm test:all
```
To run the high-concurrency JMeter load test:
- Open JMeter -> Load `testing/scripts/attendance_load.jmx` -> Run.

---
### What's next?
- **AI Triage**: Open a recording in the KB-UI; click "Triage" to see the agent reasoning.
- **Search**: Use the search bar to query your local `.gemini` or `.qwen` documentation.
- **CLI Tools**: Use `scripts/ai_cli_wrapper.ps1` to log results from local Qwen/Gemini CLI results.

**Everything is local. No Python. No cloud usage.**
