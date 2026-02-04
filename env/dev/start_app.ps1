$ErrorActionPreference = "Stop"
Write-Host "`nStarting development servers..." -ForegroundColor Cyan

# Reload environment variables once at the beginning
Write-Host "Reloading environment variables..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify pnpm is available
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: pnpm not found in PATH." -ForegroundColor Red
    Write-Host "Please run the following commands to set up the environment:" -ForegroundColor Yellow
    Write-Host "  1. _clean.bat" -ForegroundColor Magenta
    Write-Host "  2. _setup.bat" -ForegroundColor Magenta
    exit 1
}

Write-Host "pnpm is available in PATH" -ForegroundColor Green

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

    # Build the script block with properly escaped variables
    $scriptBlock = @"
`$host.UI.RawUI.WindowTitle = '$Title'
`$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
Set-Location '$WorkingDirectory'
Write-Host 'Starting $Title in' (Get-Location) -ForegroundColor Cyan
pnpm dev
if (`$LASTEXITCODE -ne 0) {
    Write-Host '$Title exited with error code' `$LASTEXITCODE -ForegroundColor Red
    Read-Host 'Press Enter to close this window'
}
"@

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptBlock
}

# Start backend server (Hono + Cloudflare Workers)
Write-Host "Starting backend server (Hono + Wrangler) in separate window..." -ForegroundColor Cyan
$backendAbsPath = (Resolve-Path $backendPath).Path
Start-DevServer -Title "Japan Geographic - Backend (Hono)" -WorkingDirectory $backendAbsPath -Command "pnpm dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

Write-Host "Backend server started in separate window." -ForegroundColor Green
Write-Host "Backend (Hono + Wrangler):" -ForegroundColor Cyan
Write-Host "  URL: http://localhost:8787" -ForegroundColor White
Write-Host ""

# Run the application
$appResult = 0
try {
    Write-Host "Starting frontend server (Next.js) in current window..." -ForegroundColor Cyan
    Write-Host "Frontend (Next.js):" -ForegroundColor Cyan
    Write-Host "  URL: http://localhost:3000" -ForegroundColor White
    Write-Host "Press Ctrl+C to stop the frontend server." -ForegroundColor Yellow
    $frontendAbsPath = (Resolve-Path $frontendPath).Path
    Set-Location $frontendAbsPath
    pnpm dev
    $appResult = $LASTEXITCODE
} catch {
    $appResult = $LASTEXITCODE
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
} finally {
    if ($appResult -eq 0) {
        Write-Host "Application completed successfully!" -ForegroundColor Green
        Write-Host "Press N for keep terminal window open!" -ForegroundColor Magenta
        exit 0
    } else {
        Write-Host "Application exited with errors. Exit code: $appResult" -ForegroundColor Red
        exit $appResult
    }
}
