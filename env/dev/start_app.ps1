$ErrorActionPreference = "Stop"
Write-Host "`nStarting development servers..." -ForegroundColor Cyan

# Check if frontend and backend directories exist
$frontendPath = ".\frontend"
$backendPath = ".\backend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "Error: Frontend directory not found at $frontendPath" -ForegroundColor Red
    Write-Host "Please run _setup.bat first to create the project structure." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $backendPath)) {
    Write-Host "Error: Backend directory not found at $backendPath" -ForegroundColor Red
    Write-Host "Please run _setup.bat first to create the project structure." -ForegroundColor Yellow
    exit 1
}

# Function to start a process in a new window
function Start-DevServer {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )

    Write-Host "Starting $Title..." -ForegroundColor Yellow

    $scriptBlock = @"
`$host.UI.RawUI.WindowTitle = '$Title'
Set-Location '$WorkingDirectory'
Write-Host 'Starting $Title in' (Get-Location) -ForegroundColor Cyan
$Command
if (`$LASTEXITCODE -ne 0) {
    Write-Host '$Title exited with error code' `$LASTEXITCODE -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
}
"@

    Start-Process pwsh -ArgumentList "-NoExit", "-Command", $scriptBlock
}

# Get absolute paths
$frontendAbsPath = (Resolve-Path $frontendPath).Path
$backendAbsPath = (Resolve-Path $backendPath).Path

# Start backend server (Hono + Cloudflare Workers)
Write-Host "Starting backend server (Hono + Wrangler) in separate window..." -ForegroundColor Cyan
Start-DevServer -Title "Japan Geographic - Backend (Hono)" -WorkingDirectory $backendAbsPath -Command "pnpm dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Backend server started in separate window." -ForegroundColor Green
Write-Host ""
Write-Host "Backend (Hono + Wrangler):" -ForegroundColor Cyan
Write-Host "  URL: http://localhost:8787" -ForegroundColor White
Write-Host ""
Write-Host "Starting frontend server (Next.js) in current window..." -ForegroundColor Cyan
Write-Host "Frontend (Next.js):" -ForegroundColor Cyan
Write-Host "  URL: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the frontend server." -ForegroundColor Yellow
Write-Host ""

# Start frontend server in current window
Set-Location $frontendAbsPath
& pnpm dev
