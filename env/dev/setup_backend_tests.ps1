$ErrorActionPreference = "Stop"
Write-Host "`nSetting up backend test environment..." -ForegroundColor Cyan

# Verify backend directory
$backendPath = ".\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "Error: Backend directory not found at $backendPath" -ForegroundColor Red
    Write-Host "Please run _setup.bat first." -ForegroundColor Yellow
    exit 1
}

Push-Location $backendPath
try {
    Write-Host "Installing test dependencies for backend..." -ForegroundColor Yellow

    # Install Vitest for backend testing
    pnpm add -D vitest

    Write-Host "Backend test dependencies installed successfully." -ForegroundColor Green

    # Verify test configuration exists
    if (-not (Test-Path "vitest.config.ts")) {
        Write-Host "Warning: vitest.config.ts not found" -ForegroundColor Yellow
        Write-Host "Please ensure you have the latest code from Git." -ForegroundColor Yellow
    }

    # Verify test files exist
    if (-not (Test-Path "src/index.test.ts")) {
        Write-Host "Warning: src/index.test.ts not found" -ForegroundColor Yellow
        Write-Host "Please ensure you have the latest code from Git." -ForegroundColor Yellow
    }

    # Update package.json scripts if needed
    Write-Host "Verifying package.json test scripts..." -ForegroundColor Yellow
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

        $scriptsToAdd = @{
            "test" = "vitest run"
            "test:watch" = "vitest"
            "test:coverage" = "vitest run --coverage"
            "typecheck" = "tsc --noEmit"
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

    Write-Host "`nBackend test environment setup completed!" -ForegroundColor Green
    Write-Host "`nAvailable backend test commands:" -ForegroundColor Cyan
    Write-Host "  pnpm test          - Run backend tests" -ForegroundColor White
    Write-Host "  pnpm test:watch    - Run tests in watch mode" -ForegroundColor White
    Write-Host "  pnpm test:coverage - Run tests with coverage" -ForegroundColor White
    Write-Host "  pnpm typecheck     - Run TypeScript type checking" -ForegroundColor White

} catch {
    Write-Host "Error setting up backend test environment: $_" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}
