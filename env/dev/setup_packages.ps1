$ErrorActionPreference = "Stop"
Write-Host "`nStarting setup packages..." -ForegroundColor Cyan

# Verify frontend directory and structure
$frontendPath = ".\frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "Error: Frontend directory not found at $frontendPath" -ForegroundColor Red
    Write-Host "Please ensure you have cloned the repository correctly." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "$frontendPath\package.json")) {
    Write-Host "Error: Frontend package.json not found" -ForegroundColor Red
    Write-Host "Please ensure you have the latest code from Git." -ForegroundColor Yellow
    exit 1
}

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location $frontendPath
try {
    pnpm install --reporter=append-only
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install frontend dependencies"
    }
    Write-Host "Frontend dependencies installed successfully." -ForegroundColor Green
}
catch {
    Write-Host "Failed to install frontend dependencies: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
finally {
    Pop-Location
}

# Verify backend directory and structure
$backendPath = ".\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "Error: Backend directory not found at $backendPath" -ForegroundColor Red
    Write-Host "Please ensure you have cloned the repository correctly." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "$backendPath\package.json")) {
    Write-Host "Error: Backend package.json not found" -ForegroundColor Red
    Write-Host "Please ensure you have the latest code from Git." -ForegroundColor Yellow
    exit 1
}

# Verify critical backend files
$requiredBackendFiles = @(
    "$backendPath\wrangler.toml",
    "$backendPath\tsconfig.json",
    "$backendPath\src\index.ts"
)

$missingFiles = @()
foreach ($file in $requiredBackendFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "Warning: Missing backend files:" -ForegroundColor Yellow
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
    Write-Host "Please ensure you have the latest code from Git." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $backendPath
try {
    pnpm install --reporter=append-only
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install backend dependencies"
    }
    Write-Host "Backend dependencies installed successfully." -ForegroundColor Green
}
catch {
    Write-Host "Failed to install backend dependencies: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
finally {
    Pop-Location
}

Write-Host "`nPackage setup completed successfully!" -ForegroundColor Green
Write-Host "All dependencies have been installed." -ForegroundColor Cyan
