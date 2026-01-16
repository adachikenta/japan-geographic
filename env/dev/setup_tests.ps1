$ErrorActionPreference = "Stop"
Write-Host "`nSetting up TypeScript test environment..." -ForegroundColor Cyan

# Check if frontend directory exists
$frontendPath = ".\frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "Error: Frontend directory not found at $frontendPath" -ForegroundColor Red
    Write-Host "Please run _setup.bat first to create the project structure." -ForegroundColor Yellow
    exit 1
}

Push-Location $frontendPath
try {
    Write-Host "Installing test dependencies..." -ForegroundColor Yellow

    # Install Vitest and testing utilities
    Write-Host "Installing Vitest..." -ForegroundColor Yellow
    pnpm add -D vitest @vitest/ui
    pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
    pnpm add -D jsdom

    # Install Playwright for E2E testing
    Write-Host "Installing Playwright..." -ForegroundColor Yellow
    pnpm add -D @playwright/test
    pnpm exec playwright install --with-deps

    # Install MSW for API mocking (optional but recommended)
    Write-Host "Installing MSW for API mocking..." -ForegroundColor Yellow
    pnpm add -D msw

    Write-Host "Test dependencies installed successfully." -ForegroundColor Green

    # Create vitest.config.ts
    Write-Host "Creating vitest.config.ts..." -ForegroundColor Yellow
    $vitestConfig = @"
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'out/',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
"@
    Set-Content -Path "vitest.config.ts" -Value $vitestConfig
    Write-Host "Created vitest.config.ts" -ForegroundColor Green

    # Create vitest.setup.ts
    Write-Host "Creating vitest.setup.ts..." -ForegroundColor Yellow
    $vitestSetup = @"
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
"@
    Set-Content -Path "vitest.setup.ts" -Value $vitestSetup
    Write-Host "Created vitest.setup.ts" -ForegroundColor Green

    # Create playwright.config.ts
    Write-Host "Creating playwright.config.ts..." -ForegroundColor Yellow
    $playwrightConfig = @"
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
"@
    Set-Content -Path "playwright.config.ts" -Value $playwrightConfig
    Write-Host "Created playwright.config.ts" -ForegroundColor Green

    # Create test directories
    Write-Host "Creating test directory structure..." -ForegroundColor Yellow
    New-Item -Path "__tests__" -ItemType Directory -Force | Out-Null
    New-Item -Path "e2e" -ItemType Directory -Force | Out-Null

    # Create example unit test
    $exampleUnitTest = @"
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Example component test
describe('Example Test', () => {
  it('should render correctly', () => {
    const { container } = render(<div>Hello World</div>);
    expect(container.textContent).toBe('Hello World');
  });
});
"@
    Set-Content -Path "__tests__/example.test.tsx" -Value $exampleUnitTest
    Write-Host "Created __tests__/example.test.tsx" -ForegroundColor Green

    # Create example E2E test
    $exampleE2ETest = @"
import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');

  // Add your assertions here
  await expect(page).toHaveTitle(/Japan Geographic/);
});
"@
    Set-Content -Path "e2e/example.spec.ts" -Value $exampleE2ETest
    Write-Host "Created e2e/example.spec.ts" -ForegroundColor Green

    # Update package.json scripts
    Write-Host "Updating package.json scripts..." -ForegroundColor Yellow
    $packageJsonPath = "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

        # Add test scripts
        if (-not $packageJson.scripts) {
            $packageJson | Add-Member -MemberType NoteProperty -Name "scripts" -Value @{}
        }

        $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test" -Value "vitest" -Force
        $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test:ui" -Value "vitest --ui" -Force
        $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test:coverage" -Value "vitest --coverage" -Force
        $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test:e2e" -Value "playwright test" -Force
        $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test:e2e:ui" -Value "playwright test --ui" -Force
        $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "type-check" -Value "tsc --noEmit" -Force

        $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
        Write-Host "Updated package.json with test scripts" -ForegroundColor Green
    }

    Write-Host "`nTypeScript test environment setup completed!" -ForegroundColor Green
    Write-Host "`nAvailable test commands:" -ForegroundColor Cyan
    Write-Host "  pnpm test          - Run unit tests with Vitest" -ForegroundColor White
    Write-Host "  pnpm test:ui       - Run unit tests with UI" -ForegroundColor White
    Write-Host "  pnpm test:coverage - Run tests with coverage report" -ForegroundColor White
    Write-Host "  pnpm test:e2e      - Run E2E tests with Playwright" -ForegroundColor White
    Write-Host "  pnpm test:e2e:ui   - Run E2E tests with Playwright UI" -ForegroundColor White
    Write-Host "  pnpm type-check    - Run TypeScript type checking" -ForegroundColor White

} catch {
    Write-Host "Error setting up test environment: $_" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}
