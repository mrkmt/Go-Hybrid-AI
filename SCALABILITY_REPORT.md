# AI-Aero Testing Platform: Scalability & Performance Report (10-Tester Scenario)

This report analyzes the platform's ability to support 10 concurrent testers in a local-only environment and provides guidance on hardware and configuration.

## 1. System Load Analysis (10 Users)

| Component | Load Profile | Potential Bottleneck |
|---|---|---|
| **Recorder API** | Low | Node.js handles 10 concurrent HTTP requests easily. |
| **PostgreSQL** | Low/Medium | 10 users frequently reading/writing JSONB data. Standard configs handle this, but pool size needs adjustment. |
| **KB-UI (Vite)** | Very Low | Handled by the browser; backend API serves the JSON. |
| **Ollama (AI)** | **CRITICAL** | Requesting 10 simultaneous AI triage diagnosis (Qwen) can saturate GPU VRAM and CPU, leading to slow responses or timeouts. |

## 2. Hardware Recommendations (Target: 10 Users)

To maintain a "snappy" feel for 10 users running AI triage:

- **GPU**: NVIDIA RTX 3080/4080 (12GB+ VRAM) - *Essential for running Qwen/Llama models at speed.*
- **RAM**: 32GB+ (Postgres + Node + Ollama can consume considerable memory).
- **CPU**: 8-Core / 16-Thread (Core i7/i9 or Ryzen 7/9).
- **Storage**: NVMe SSD (High-speed I/O for Postgres JSONB operations).

## 3. Configuration Optimizations

### Backend (server.ts)
- **Postgres Pool**: Increase `max` connections from default (10) to **20** to avoid "connection timeout" errors during high activity.
- **AI Queuing**: If hardware is weak, consider adding a simple task queue (e.g., `bullmq`) so AI triage requests are processed 1-by-1 instead of crashing the GPU.

### AI Model
- Use **GGUF Quantized** versions of models (e.g., `q4_k_m`) via Ollama to reduce VRAM footprint while maintaining 10-user throughput.

## 4. Pros & Cons of Local Multi-User Setup

### Pros
- **Zero Latency**: No internet speed bottlenecks between users and the recorder.
- **Privacy**: High-security environment for "tester players" inside the company LAN.
- **Data Speed**: Fast persistence to local SSD compared to cloud DBs.

### Cons
- **Hardware Heavy**: The host machine must be powerful enough to act as a "Local AI Server."
- **Single Point of Failure**: If the host machine goes down, all 10 testers are blocked.

## 5. Summary Result
**The system is ready for 10 users**, provided the host machine meets the recommended GPU specs. The codebase is already optimized with asynchronous handling and loading states in the UI to prevent browser freezing during long AI tasks.

---
*Created by Antigravity AI for High-Performance Local Testing.*
