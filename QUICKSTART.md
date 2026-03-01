# Quick Start Guide - AI Testing Platform v2.0

This guide helps you get started with the updated AI Testing Platform.

## Prerequisites

- **Node.js** 18.x or later
- **PostgreSQL** 15 or later
- **Ollama** (optional, for AI features)

## Installation

### 1. Install Dependencies

```bash
cd "d:\KMT\My class\AI\ai_37"
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
copy .env.example .env

# Edit .env with your settings
# Required: PG_PASSWORD, knowledge paths
# Optional: API_KEY for write protection
```

### 3. Setup Database

```bash
# Create database in PostgreSQL
psql -U postgres
CREATE DATABASE ai_testing_platform;
\q

# Run migrations
npm run db:migrate
```

### 4. Start Services

```bash
# Terminal 1: Start API server
npm run start-api

# Terminal 2: Start frontend dashboard
npm run start-kb
```

### 5. Install Chrome Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/recorder` folder

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run start-api` | Start backend API server |
| `npm run start-kb` | Start frontend dashboard |
| `npm test` | Run unit tests |
| `npm run test:all` | Run all backend tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:migrate` | Run database migrations |
| `npm run typecheck` | TypeScript type checking |
| `npm run replay` | Run Playwright replayer tests |

## API Endpoints

### Health & Monitoring

```bash
# Health check
curl http://localhost:3000/api/health

# System metrics
curl http://localhost:3000/api/metrics
```

### Recordings

```bash
# List recordings (paginated)
curl http://localhost:3000/api/recordings?limit=20&page=1

# Get specific recording
curl http://localhost:3000/api/recordings/{uuid}

# Create recording
curl -X POST http://localhost:3000/api/recordings \
  -H "Content-Type: application/json" \
  -d '{"steps":[{"action":"click","selector":"#button"}]}'

# Delete recording
curl -X DELETE http://localhost:3000/api/recordings/{uuid}
```

### AI Features

```bash
# AI Triage (requires recording ID)
curl -X POST http://localhost:3000/api/triage/{uuid} \
  -H "Content-Type: application/json" \
  -d '{"error":"Element not found"}'

# Knowledge search
curl "http://localhost:3000/api/search?q=login+issue"

# Log AI interaction
curl -X POST http://localhost:3000/api/ai-logs \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5","prompt":"test","response":"result"}'
```

## Security Features

### API Key Protection

Set `API_KEY` in `.env` to enable:

```bash
# All write requests require x-api-key header
curl -X POST http://localhost:3000/api/recordings \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"steps":[...]}'
```

### Rate Limiting

- **General:** 30 requests/minute
- **Write operations:** 10 requests/minute
- **AI endpoints:** 6 requests/2 minutes

### CORS

Configure allowed origins in `.env`:

```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Testing

### Run Unit Tests

```bash
npm test
```

### Run All Backend Tests

```bash
npm run test:all
```

### Run with Coverage

```bash
npm run test:coverage
```

### Run E2E Tests

```bash
npx playwright test --config=testing/e2e/playwright.config.ts
```

## Knowledge Base Configuration

### Default Paths

The platform searches these locations for documentation:

- `C:\Users\<user>\.gemini`
- `C:\Users\<user>\.qwen`
- `C:\Users\<user>\.codex`
- `C:\Users\<user>\AppData\Roaming\anythingllm-desktop\storage`
- `D:\KMT\My class\AI` (centralized path)

### Add Custom Paths

```bash
# In .env
MINIO_BUCKET_NAME=ai-testing-recordings
MINIO_ENDPOINT=localhost
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials in .env
# PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DATABASE
```

### API Server Won't Start

```bash
# Check port availability
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <pid> /F
```

### AI Features Not Working

```bash
# Check Ollama is running
ollama list

# Pull required models
ollama pull qwen2.5:latest
ollama pull mxbai-embed-large:latest
```

### Tests Failing

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests in verbose mode
npm run test:all -- --verbose
```

## Performance Tips

### Enable Caching

Responses are automatically cached:
- AI triage: 30 minutes
- Search results: 1 hour
- Embeddings: 1 hour

### Optimize Database

```sql
-- Analyze tables
ANALYZE recordings;
ANALYZE ai_logs;

-- Vacuum
VACUUM;
```

### Increase Rate Limits

For high-traffic environments:

```bash
# In .env
RATE_LIMIT_WINDOW_MS=120000
RATE_LIMIT_MAX=60
```

## Migration from v1.0

### Breaking Changes

1. **Pagination:** `/api/recordings` now returns paginated response
   ```json
   {
     "data": [...],
     "pagination": {...}
   }
   ```

2. **Validation Errors:** Error format changed
   ```json
   {
     "error": "Validation failed",
     "details": [...]
   }
   ```

3. **Database Schema:** New tables and indexes added
   ```bash
   npm run db:migrate
   ```

### Upgrade Steps

1. Backup database
2. Update dependencies: `npm install`
3. Run migrations: `npm run db:migrate`
4. Update `.env` with new variables
5. Test all endpoints

## Support

For issues or questions:
- Check `IMPLEMENTATION_REPORT.md` for detailed documentation
- Review `AI_TESTING_PLATFORM_GUIDE.md` for architecture details
- See `SECURITY_ANALYSIS.md` for security information

---

**Version:** 2.0.0  
**Last Updated:** 2026-03-01
