# ==============================================================================
# Go-Hybrid AI - Unified Forensic Setup & Launch Script
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n🕵️‍♂️ Initializing Go-Hybrid AI Forensic Platform...`n" -ForegroundColor Cyan

# 1. Prerequisite Checks
Write-Host "[1/5] Checking System Prerequisites..." -ForegroundColor Yellow

function Check-Command($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "   ❌ $cmd not found. Please install it before proceeding." -ForegroundColor Red
        return $false
    }
    Write-Host "   ✅ $cmd is ready." -ForegroundColor Green
    return $true
}

if (-not (Check-Command "node") -or -not (Check-Command "npm")) { exit 1 }

# 2. Infrastructure Checks (PostgreSQL & MinIO)
Write-Host "`n[2/5] Verifying Infrastructure..." -ForegroundColor Yellow

# Try to check if Postgres is running (standard port 5432)
$pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet
if ($pgTest) {
    Write-Host "   ✅ PostgreSQL is online." -ForegroundColor Green
} else {
    Write-Host "   ⚠️ PostgreSQL is not detected on port 5432. Please ensure it is running." -ForegroundColor Yellow
}

# Try to check if MinIO is running (standard port 9000)
$minioTest = Test-NetConnection -ComputerName localhost -Port 9000 -InformationLevel Quiet
if ($minioTest) {
    Write-Host "   ✅ MinIO is online." -ForegroundColor Green
} else {
    Write-Host "   ⚠️ MinIO is not detected on port 9000. Please ensure it is running." -ForegroundColor Yellow
}

# 3. Database Creation
Write-Host "`n[3/5] Setting up Forensic Database..." -ForegroundColor Yellow
try {
    # Attempt to create DB using npx and a small inline script to avoid psql dependency
    Write-Host "   Creating 'ai_testing_platform' if it doesn't exist..."
    npx ts-node -e "const { Client } = require('pg'); const client = new Client({ user: 'postgres', host: 'localhost', database: 'postgres', password: '' }); client.connect().then(() => client.query('CREATE DATABASE ai_testing_platform').then(() => { console.log('   ✅ Database created.'); client.end(); }).catch(e => { if (e.code === '42P04') { console.log('   ✅ Database already exists.'); } else { console.error('   ❌ Error:', e.message); } client.end(); }))"
} catch {
    Write-Host "   ⚠️ Automatic DB creation failed. Please create 'ai_testing_platform' manually in Postgres." -ForegroundColor Yellow
}

# 4. Dependency Installation
Write-Host "`n[4/5] Installing Forensic Suite Dependencies..." -ForegroundColor Yellow
Write-Host "   Root packages..."
npm install --silent
Write-Host "   Backend packages..."
cd backend
npm install --silent
cd ..
Write-Host "   Frontend packages..."
cd frontend/kb-ui
npm install --silent
cd ../..
Write-Host "   ✅ All dependencies synchronized." -ForegroundColor Green

# 5. Schema Initialization
Write-Host "`n[5/5] Initializing Forensic Schema..." -ForegroundColor Yellow
npx ts-node backend/api/init-db.ts
Write-Host "   ✅ Database tables initialized." -ForegroundColor Green

Write-Host "`n🕵️‍♂️ GO-HYBRID AI SETUP COMPLETE!`n" -ForegroundColor Green

$launch = Read-Host "Would you like to launch the Forensic Dashboard now? (Y/N)"
if ($launch -eq "Y" -or $launch -eq "y") {
    Write-Host "`n🚀 Launching Backend & Frontend... (Press Ctrl+C to stop)`n" -ForegroundColor Cyan
    # Run both in background/parallel (simplified for PS)
    Start-Process powershell -ArgumentList "npm run start-api"
    npm run start-kb
}
