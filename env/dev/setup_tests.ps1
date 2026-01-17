$ErrorActionPreference = "Stop"
Write-Host "`nSetting up frontend test environment..." -ForegroundColor Cyan

# Verify frontend directory
$frontendPath = ".\frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "Error: Frontend directory not found at $frontendPath" -ForegroundColor Red
    Write-Host "Please run _setup.bat first." -ForegroundColor Yellow
    exit 1
}

Push-Location $frontendPath
try {
    Write-Host "Installing test dependencies..." -ForegroundColor Yellow

    # Install Vitest and testing utilities
    pnpm add -D vitest @vitest/ui
    pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
    pnpm add -D jsdom

    # Install Playwright for E2E testing
    pnpm add -D @playwright/test
    pnpm exec playwright install --with-deps

    Write-Host "Test dependencies installed successfully." -ForegroundColor Green

    # Verify test configuration files exist
    $requiredFiles = @(
        "vitest.config.ts",
        "vitest.setup.ts",
        "playwright.config.ts"
    )

    $missingFiles = @()
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $missingFiles += $file
        }
    }

    if ($missingFiles.Count -gt 0) {
        Write-Host "Warning: Missing test configuration files:" -ForegroundColor Yellow
        foreach ($file in $missingFiles) {
            Write-Host "  - $file" -ForegroundColor Yellow
        }
        Write-Host "Please ensure you have the latest code from Git." -ForegroundColor Yellow
    }

    # Verify test directories exist
    if (-not (Test-Path "__tests__")) {
        Write-Host "Warning: __tests__ directory not found" -ForegroundColor Yellow
        Write-Host "Creating __tests__ directory..." -ForegroundColor Yellow
        New-Item -Path "__tests__" -ItemType Directory -Force | Out-Null
    }

    if (-not (Test-Path "e2e")) {
        Write-Host "Warning: e2e directory not found" -ForegroundColor Yellow
        Write-Host "Creating e2e directory..." -ForegroundColor Yellow
        New-Item -Path "e2e" -ItemType Directory -Force | Out-Null
    }

    # Update package.json scripts if needed
    Write-Host "Verifying package.json test scripts..." -ForegroundColor Yellow
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

        $scriptsToAdd = @{
            "test" = "vitest run"
            "test:ui" = "vitest --ui"
            "test:watch" = "vitest"
            "test:coverage" = "vitest run --coverage"
            "test:e2e" = "playwright test"
            "test:e2e:ui" = "playwright test --ui"
            "type-check" = "tsc --noEmit"
        }

        $updated = $false
        foreach ($script in $scriptsToAdd.GetEnumerator()) {
            if (-not $packageJson.scripts.PSObject.Properties[$script.Key]) {
                $packageJson.scripts | Add-Member -MemberType NoteProperty -Name $script.Key -Value $script.Value -Force
                $updated = $true
            }
        }

        if ($updated) {
            $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
            Write-Host "Updated package.json with test scripts" -ForegroundColor Green
        } else {
            Write-Host "All test scripts already present" -ForegroundColor Green
        }
    }

    Write-Host "`nFrontend test environment setup completed!" -ForegroundColor Green
    Write-Host "`nAvailable test commands:" -ForegroundColor Cyan
    Write-Host "  pnpm test          - Run unit tests" -ForegroundColor White
    Write-Host "  pnpm test:ui       - Run unit tests with UI" -ForegroundColor White
    Write-Host "  pnpm test:watch    - Run unit tests in watch mode" -ForegroundColor White
    Write-Host "  pnpm test:coverage - Run tests with coverage report" -ForegroundColor White
    Write-Host "  pnpm test:e2e      - Run E2E tests" -ForegroundColor White
    Write-Host "  pnpm test:e2e:ui   - Run E2E tests with UI" -ForegroundColor White
    Write-Host "  pnpm type-check    - Run TypeScript type checking" -ForegroundColor White

} catch {
    Write-Host "Error setting up test environment: $_" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}
