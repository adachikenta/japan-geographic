$ErrorActionPreference = "Stop"
Write-Host "`nSetting up backend TypeScript test environment..." -ForegroundColor Cyan

# Check if backend directory exists
$backendPath = ".\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "Error: Backend directory not found at $backendPath" -ForegroundColor Red
    Write-Host "Please run _setup.bat first to create the project structure." -ForegroundColor Yellow
    exit 1
}

Push-Location $backendPath
try {
    Write-Host "Installing test dependencies for backend..." -ForegroundColor Yellow

    # Install Vitest for backend testing
    pnpm add -D vitest
    pnpm add -D @cloudflare/vitest-pool-workers

    Write-Host "Backend test dependencies installed successfully." -ForegroundColor Green

    # Create vitest.config.ts for backend
    Write-Host "Creating backend vitest.config.ts..." -ForegroundColor Yellow
    $vitestConfig = @"
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
"@
    Set-Content -Path "vitest.config.ts" -Value $vitestConfig
    Write-Host "Created backend vitest.config.ts" -ForegroundColor Green

    # Create example API test in src directory
    Write-Host "Creating backend test file..." -ForegroundColor Yellow
    $exampleTest = @"
import { describe, it, expect } from 'vitest';
import app from './index';

describe('Health Check', () => {
  it('should return health status', async () => {
    const req = new Request('http://localhost/health');
    const res = await app.request(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('service', 'japan-geographic-backend');
  });
});

describe('API Endpoints', () => {
  it('should return version info', async () => {
    const req = new Request('http://localhost/api/version');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('api');
    expect(data).toHaveProperty('environment');
  });

  it('should return geography data', async () => {
    const req = new Request('http://localhost/api/geography');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return prefectures data', async () => {
    const req = new Request('http://localhost/api/prefectures');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return statistics data', async () => {
    const req = new Request('http://localhost/api/statistics');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('totalPopulation');
  });
});

describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const req = new Request('http://localhost/unknown');
    const res = await app.request(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'Not Found');
  });
});
"@
    Set-Content -Path "src/index.test.ts" -Value $exampleTest
    Write-Host "Created src/index.test.ts" -ForegroundColor Green

    # Update package.json scripts
    Write-Host "Updating backend package.json scripts..." -ForegroundColor Yellow
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

        # Add test scripts
        if (-not $packageJson.scripts.test) {
            $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test" -Value "vitest run" -Force
        }
        if (-not $packageJson.scripts."test:watch") {
            $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test:watch" -Value "vitest" -Force
        }
        if (-not $packageJson.scripts."test:coverage") {
            $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test:coverage" -Value "vitest run --coverage" -Force
        }
        if (-not $packageJson.scripts.typecheck) {
            $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "typecheck" -Value "tsc --noEmit" -Force
        }

        $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
        Write-Host "Updated backend package.json with test scripts" -ForegroundColor Green
    }

    Write-Host "`nBackend test environment setup completed!" -ForegroundColor Green
    Write-Host "`nAvailable backend test commands:" -ForegroundColor Cyan
    Write-Host "  pnpm test          - Run backend tests" -ForegroundColor White
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
