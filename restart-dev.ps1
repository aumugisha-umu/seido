# Restart Next.js dev server with clean cache
Write-Host "🔄 Restarting Next.js development server..." -ForegroundColor Cyan

# 1. Kill all node processes
Write-Host "1️⃣ Killing all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Write-Host "   ✅ Node processes killed" -ForegroundColor Green

# 2. Delete .next cache
Write-Host "2️⃣ Deleting .next cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
    Write-Host "   ✅ Cache deleted" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No cache to delete" -ForegroundColor Gray
}

# 3. Start dev server
Write-Host "3️⃣ Starting Next.js dev server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory (Get-Location)
Start-Sleep -Seconds 5

Write-Host "✅ Development server restarted successfully!" -ForegroundColor Green
Write-Host "   Server should be running on http://localhost:3000" -ForegroundColor Cyan
