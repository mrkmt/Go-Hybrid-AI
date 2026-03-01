# Complete Startup Guide - AI Testing Platform

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend API
```bash
cd "d:\KMT\My class\AI\ai_37"
npm run start-api
```
**Expected Output:**
```
Recorder API running on http://localhost:3000
```

---

### Step 2: Start Frontend Dashboard (New Terminal)
```bash
cd "d:\KMT\My class\AI\ai_37"
npm run start-kb
```
**Expected Output:**
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

### Step 3: Install Chrome Extension

1. **Open Chrome** → Go to `chrome://extensions/`
2. **Enable "Developer mode"** (toggle in top-right)
3. **Click "Load unpacked"**
4. **Select folder:** `d:\KMT\My class\AI\ai_37\extension\recorder`
5. **Extension icon** appears in Chrome toolbar

---

## 📋 Full Setup (First Time Only)

### 1. Verify Prerequisites

```bash
# Check Node.js
node --version
# Should show: v18.x.x or v20.x.x

# Check PostgreSQL
pg_isready
# Should show: accepting connections

# Check database exists
psql -U postgres -c "\l"
# Should show: ai_testing_platform
```

### 2. Configure Environment

Your `.env` file is already configured with:
- ✅ PostgreSQL credentials
- ✅ Knowledge paths for your AI projects
- ✅ Ollama AI settings

### 3. Run Database Migration

```bash
cd "d:\KMT\My class\AI\ai_37"
npm run db:migrate
```

**Expected Output:**
```
Starting database migration...
✓ recordings table created/verified
✓ ai_logs table created/verified
✓ cache table created/verified
✓ idx_recordings_created_at index created
✓ idx_recordings_user_id index created
✓ idx_ai_logs_recording_id index created
✓ idx_ai_logs_created_at index created
✓ idx_cache_expires_at index created
✓ recordings.user_id default set to "public"

✅ Migration completed successfully!
```

---

## 🔍 How Each Component Works

### Backend API (`npm run start-api`)

**What it does:**
- Runs Express server on port 3000
- Handles recording storage in PostgreSQL
- Provides AI triage via Ollama
- Searches knowledge base (your AI projects)

**Endpoints:**
```
GET  /api/health          - Health check
GET  /api/metrics         - System stats
GET  /api/recordings      - List recordings
POST /api/recordings      - Save recording
GET  /api/recordings/:id  - Get recording details
POST /api/triage/:id      - AI root cause analysis
GET  /api/search?q=       - Search knowledge base
```

---

### Frontend Dashboard (`npm run start-kb`)

**What it does:**
- React + Vite UI on port 5173
- Shows recorded sessions
- Displays AI triage results
- Search knowledge base

**Tabs:**
- **Dashboard** - View recordings and AI analysis
- **Test Generator** - Generate Playwright tests with AI
- **Reports** - View test reports
- **Settings** - Configure API key

---

### Chrome Extension

**What it does:**
- Records your browser actions (clicks, typing)
- Captures network requests
- Uploads recordings to backend

**How to use:**
1. Click extension icon in Chrome
2. Click **"Start Recording"**
3. Perform actions on any website
4. Click **"Stop Recording"**
5. Click **"Upload Recording"**
6. View in dashboard at http://localhost:5173

---

## 🧪 Test the Setup

### 1. Test Backend
Open browser: http://localhost:3000/api/health

**Expected:**
```json
{
  "ok": true,
  "db": true,
  "time": "2026-03-01T...",
  "version": "1.0.0"
}
```

### 2. Test Frontend
Open browser: http://localhost:5173

**Expected:** Dashboard with "AI-Aero Testing Platform" header

### 3. Test Extension
1. Open any website (e.g., google.com)
2. Click extension → "Start Recording"
3. Click a few buttons
4. Click "Stop Recording"
5. Click "Upload Recording"
6. Check dashboard - new session should appear

---

## 🛠 Troubleshooting

### Backend won't start

**Error: Port 3000 already in use**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

**Error: Database connection failed**
```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials in .env
# PG_USER=postgres
# PG_PASSWORD=Global@2026
# PG_DATABASE=ai_testing_platform
```

---

### Frontend won't start

**Error: Port 5173 already in use**
```bash
# Kill process or use different port
# In frontend/kb-ui/vite.config.ts, add:
server: { port: 5174 }
```

---

### Extension doesn't upload

**Check:**
1. Backend is running on http://localhost:3000
2. Console logs (extension popup → right-click → Inspect)
3. Try setting API key in extension (optional)

**To set API key in extension:**
1. Click extension icon
2. Enter API key in input field
3. API key is saved automatically

---

## 📊 Knowledge Base Integration

Your knowledge base scans these folders for code patterns and fixes:

```
D:\KMT\My class\AI\ai-unified-platform
D:\KMT\My class\AI\AI-Aero-Playwright-Gen
D:\KMT\My class\AI\ai_36
D:\KMT\My class\AI (all subprojects)
```

**What gets indexed:**
- `.md` files - Documentation
- `.ts`, `.js` files - Code
- `.json`, `.yaml`, `.yml` - Configs
- `.log` files - Logs

**What's ignored:**
- `node_modules/` - Dependencies
- `dist/`, `build/` - Build output
- `.git/` - Version control
- `coverage/` - Test coverage
- `tmp/`, `temp/` - Temporary files

**How to search:**
1. Go to dashboard
2. Use search bar (top-right)
3. Enter query: "login test" or "selector repair"
4. Results show relevant code from your projects

---

## 🎯 Usage Workflow

### Record a Test Session

1. **Start backend** → `npm run start-api`
2. **Start frontend** → `npm run start-kb`
3. **Open Chrome extension**
4. **Click "Start Recording"**
5. **Navigate and interact** with your Angular/Kendo app
6. **Click "Stop Recording"**
7. **Click "Upload Recording"**
8. **View in dashboard** at http://localhost:5173

### Get AI Triage

1. **Select a recording** in dashboard
2. **AI automatically analyzes** the session
3. **View suggestion** in "Local AI Triage" section
4. **Search knowledge** for similar fixes

### Generate Test Code

1. **Go to "Test Generator" tab**
2. **Enter requirements:**
   ```
   Test login with valid credentials
   - Navigate to /login
   - Enter username and password
   - Click submit
   - Verify dashboard is shown
   ```
3. **Click "Generate Test"**
4. **Copy generated Playwright test**

---

## 📝 Environment Variables

Your current `.env` configuration:

```bash
# Server
PORT=3000

# Database
PG_USER=postgres
PG_PASSWORD=Global@2026
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=ai_testing_platform

# AI (Ollama)
DEFAULT_AI_MODEL=llama3.2:1b
EMBED_MODEL=mxbai-embed-large:latest

# Knowledge Paths
# MinIO Configuration for assets
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=ai-testing-recordings
```

---

## 🚦 Quick Commands Reference

| Command | Description |
|---------|-------------|
| `npm run start-api` | Start backend server |
| `npm run start-kb` | Start frontend dashboard |
| `npm run db:migrate` | Run database migrations |
| `npm test` | Run unit tests |
| `npm run test:all` | Run all backend tests |
| `npm run typecheck` | TypeScript type check |

---

## ✅ Success Checklist

- [ ] Backend running on http://localhost:3000
- [ ] Frontend running on http://localhost:5173
- [ ] Extension installed in Chrome
- [ ] Database migrated successfully
- [ ] Health check returns `ok: true`
- [ ] Can record and upload session
- [ ] Can view session in dashboard
- [ ] AI triage working (if Ollama running)

---

**Need Help?**
- Check `IMPLEMENTATION_REPORT.md` for detailed docs
- Check `QUICKSTART.md` for quick reference
- Check `AI_TESTING_PLATFORM_GUIDE.md` for architecture
