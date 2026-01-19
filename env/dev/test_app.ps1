$ErrorActionPreference = "Stop"
Write-Host "`nRunning tests..." -ForegroundColor Cyan

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
    Write-Host "Warning: Frontend directory not found at $frontendPath" -ForegroundColor Yellow
}

if (-not (Test-Path $backendPath)) {
    Write-Host "Warning: Backend directory not found at $backendPath" -ForegroundColor Yellow
}

$testResult = 0

# Run type checking first
Write-Host "`nRunning type checking..." -ForegroundColor Cyan

if (Test-Path $frontendPath) {
    Write-Host "Type checking frontend..." -ForegroundColor Yellow
    Push-Location $frontendPath
    try {
        pnpm exec tsc --noEmit
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Frontend type checking passed." -ForegroundColor Green
        } else {
            $testResult = 1
            Write-Host "Frontend type checking failed." -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Error running frontend type check: $_" -ForegroundColor Red
        $testResult = 1
    }
    finally {
        Pop-Location
    }
}

if (Test-Path $backendPath) {
    Write-Host "Type checking backend..." -ForegroundColor Yellow
    Push-Location $backendPath
    try {
        pnpm run typecheck
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Backend type checking passed." -ForegroundColor Green
        } else {
            $testResult = 1
            Write-Host "Backend type checking failed." -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Error running backend type check: $_" -ForegroundColor Red
        $testResult = 1
    }
    finally {
        Pop-Location
    }
}

# Run unit tests
Write-Host "`nRunning unit tests..." -ForegroundColor Cyan

if (Test-Path $frontendPath) {
    Write-Host "Running frontend unit tests..." -ForegroundColor Yellow
    Push-Location $frontendPath
    try {
        # Check if test script exists
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        if ($packageJson.scripts.PSObject.Properties.Name -contains "test") {
            pnpm test
            if ($LASTEXITCODE -ne 0) {
                $testResult = 1
                Write-Host "Frontend unit tests failed." -ForegroundColor Red
            } else {
                Write-Host "Frontend unit tests passed." -ForegroundColor Green
            }
        } else {
            Write-Host "No test script found in frontend. Run setup_tests.ps1 first." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Error running frontend tests: $_" -ForegroundColor Red
        $testResult = 1
    }
    finally {
        Pop-Location
    }
}

if (Test-Path $backendPath) {
    Write-Host "Running backend unit tests..." -ForegroundColor Yellow
    Push-Location $backendPath
    try {
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        if ($packageJson.scripts.PSObject.Properties.Name -contains "test") {
            pnpm test
            if ($LASTEXITCODE -ne 0) {
                $testResult = 1
                Write-Host "Backend unit tests failed." -ForegroundColor Red
            } else {
                Write-Host "Backend unit tests passed." -ForegroundColor Green
            }
        } else {
            Write-Host "No test script found in backend. Run setup_backend_tests.ps1 first." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Error running backend tests: $_" -ForegroundColor Red
        $testResult = 1
    }
    finally {
        Pop-Location
    }
}

# Run E2E tests (optional - only if explicitly requested)
if ($args -contains "--e2e") {
    Write-Host "`nRunning E2E tests..." -ForegroundColor Cyan

    if (Test-Path $frontendPath) {
        Push-Location $frontendPath
        try {
            $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($packageJson.scripts.PSObject.Properties.Name -contains "test:e2e") {
                pnpm test:e2e
                if ($LASTEXITCODE -ne 0) {
                    $testResult = 1
                    Write-Host "E2E tests failed." -ForegroundColor Red
                } else {
                    Write-Host "E2E tests passed." -ForegroundColor Green
                }
            } else {
                Write-Host "No E2E test script found. Run setup_tests.ps1 first." -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "Error running E2E tests: $_" -ForegroundColor Red
            $testResult = 1
        }
        finally {
            Pop-Location
        }
    }
}

if ($testResult -eq 0) {
    Write-Host "`nAll tests completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nSome tests failed." -ForegroundColor Red
    exit 1
}
