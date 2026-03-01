# AI-Assisted Testing Platform: Comprehensive Guide

This document provides a holistic overview of the AI-testing platform designed for complex Angular + Kendo business-rule applications.

## 1. Testing Methodologies & Stack

### Core Foundation
- **Primary Language**: TypeScript / Node.js
- **Browser Automation**: Playwright (TypeScript)
- **Storage**: PostgreSQL (Metadata), S3/MinIO (Blobs), Vector DB (Pinecone/Weaviate for RAG)

### Layered Testing Approach
| Layer | Tool | Description |
|---|---|---|
| **Unit** | Jest | Testing shared business libraries (e.g., `LeavePolicyValidator`). |
| **Component** | @testing-library/angular | Isolated testing of Kendo-wrapped Angular components. |
| **API** | Postman / Newman | Exploratory and CI-driven API collection runs. |
| **Contract** | Pact | Consumer-driven contract tests between Angular and Microservices. |
| **E2E** | Playwright | Record/Replay flows with multi-dimensional comparisons. |
| **Performance** | k6 | CI-friendly load testing (concurrency and race conditions). |
| **Security** | OWASP ZAP + Snyk | DAST and SCA integrated into nightly CI runs. |
| **Chaos** | Chaos Mesh | Resilience testing for backend job failures. |

---

## 2. Business Flow: Leave-vs-Holiday Example

### The Problem
Staff A has a 10-day allowance. A public holiday occurs. User records 2 days off *after* the holiday. The system incorrectly counts the holiday, resulting in 4 days consumed instead of 2.

### Automated Detection Strategy
### 1. Business-Rule Validator
- **File**: `backend/validator/LeavePolicyValidator.ts`
- **Purpose**: Detects discrepancies between expected and actual leave consumption.

### 2. Recorder Infrastructure
- **API**: `backend/api/server.ts`.
- **Extension**: `extension/recorder/manifest.json`.

---

## 4. Platform Architecture

### Recorder Extension (MV3)
- **Source**: `extension/recorder/`

### Replayer Service
- **Source**: `testing/replayer/`

### Validator Engine
- **Source**: `backend/validator/`

---

## 5. Local AI & Knowledge Integration

- **AI Engine**: Ollama (Running `qwen2.5:latest` for reasoning and `mxbai-embed-large:latest` for embeddings).
- **Knowledge Sources**:
  - `C:\\Users\\kaung myat thu\\.gemini`
  - `C:\\Users\\kaung myat thu\\.qwen`
  - `C:\\Users\\kaung myat thu\\.codex`
  - `AnythingLLM` desktop storage.
- **Workflow**: 
  - On failure, system context is sent to Ollama.
  - Ollama provides root cause analysis based on local patterns.
  - Search endpoint retrieves relevant local documentation for the fix.

## 6. Advanced AI & Test Orchestration

### AI Token & Context Control
The **`ContextManager`** handles token estimation and context trimming. It ensures that the most relevant information (system prompt + recent steps) is preserved while staying within the local model's context window (e.g., 4096 tokens).

### AI Skill Management (OpenClaw-style)
The **`SkillRegistry`** centralizes AI capabilities. Each skill (e.g., `ROOT_CAUSE_ANALYSIS`, `SELECTOR_REPAIR`) defines its own prompt template and expected JSON output schema. This allows for modular expansion of AI features without bloating the core logic.

### Structured Outputs
The platform enforces **JSON output** from local models (e.g., Qwen) via the `format: "json"` Ollama API parameter. This ensures that the frontend and replayer can reliably parse AI suggestions.

### JMeter Enterprise Load Testing
While `k6` is used for developer-oriented CI performance tests, **JMeter** is integrated for heavy-duty enterprise load scenarios.
- **File**: `testing/scripts/attendance_load.jmx`
- **Use Case**: Simulating 50+ concurrent users submitting attendance forms to detect thread-safety and database deadlock issues.
