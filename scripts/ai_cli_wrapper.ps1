param(
    [string]$Model = "qwen2.5",
    [string]$Prompt = "Analyze latest platform guide",
    [string]$UserId = "tester-1"
)

Write-Host "--- AI CLI Wrapper [$Model] ---" -ForegroundColor Cyan

# 1. Execute Local CLI (Simulated for this demo, usually would call gemini.exe or qwen-cli)
Write-Host "Executing local model $Model..."
$Result = ollama run $Model $Prompt

# 2. Log result back to the API
$Body = @{
    userId = $UserId
    model = $Model
    prompt = $Prompt
    response = $Result
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/ai-logs" -Method Post -Body $Body -ContentType "application/json"

Write-Host "Success: result logged to AI-Aero dashboard." -ForegroundColor Green
