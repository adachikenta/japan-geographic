$ErrorActionPreference = "Stop"
Write-Host "`nStarting setup packages..." -ForegroundColor Cyan

# Check if frontend directory exists
$frontendPath = ".\frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Host "Frontend directory not found. Creating Next.js app..." -ForegroundColor Yellow
    try {
        # Create Next.js app with TypeScript and Tailwind CSS
        pnpm create next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm --no-git
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create Next.js app"
        }
        Write-Host "Next.js app created successfully." -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create Next.js app: $_" -ForegroundColor Red
        exit 1
    }
}

# Install frontend dependencies
if (Test-Path $frontendPath) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $frontendPath
    try {
        # Install core dependencies
        pnpm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install frontend dependencies"
        }

        # Install additional required packages
        Write-Host "Installing additional frontend packages..." -ForegroundColor Yellow
        pnpm add "react-map-gl@^7.1" "mapbox-gl@^2.15"
        pnpm add "@kepler.gl/components@^3.0" "@kepler.gl/reducers"
        pnpm add "@reduxjs/toolkit" "react-redux"
        pnpm add "framer-motion"
        pnpm add "@turf/turf"
        pnpm add "zod"

        # Install dev dependencies
        pnpm add -D "@types/mapbox-gl"
    }
    catch {
        Write-Host "Failed to install frontend dependencies: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Check if backend directory exists
$backendPath = ".\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "Backend directory not found. Creating..." -ForegroundColor Yellow
    New-Item -Path $backendPath -ItemType Directory -Force | Out-Null

    # Initialize backend package.json
    Push-Location $backendPath
    try {
        # Create package.json for Hono + Cloudflare Workers
        $packageJson = @{
            name = "japan-geographic-backend"
            version = "1.0.0"
            type = "module"
            scripts = @{
                dev = "wrangler dev"
                deploy = "wrangler deploy"
                typecheck = "tsc --noEmit"
            }
            dependencies = @{
                "hono" = "^4.0.0"
                "@turf/turf" = "^7.0.0"
                "zod" = "^3.22.0"
            }
            devDependencies = @{
                "@cloudflare/workers-types" = "^4.0.0"
                "typescript" = "^5.6.0"
                "wrangler" = "^3.0.0"
                "better-sqlite3" = "^11.0.0"
            }
        } | ConvertTo-Json -Depth 10

        Set-Content -Path "package.json" -Value $packageJson
        Write-Host "Backend package.json created." -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create backend package.json: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Install backend dependencies
if (Test-Path $backendPath) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location $backendPath
    try {
        pnpm install
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
}

# Create wrangler.toml if it doesn't exist
$wranglerConfigPath = Join-Path $backendPath "wrangler.toml"
if (-not (Test-Path $wranglerConfigPath)) {
    Write-Host "Creating wrangler.toml..." -ForegroundColor Yellow
    Push-Location $backendPath
    try {
        $wranglerConfig = @"
name = "japan-geographic-api"
main = "src/index.ts"
compatibility_date = "2026-01-17"

[vars]
ENVIRONMENT = "development"

# D1 Database configuration
[[d1_databases]]
binding = "DB"
database_name = "japan-geographic"
database_id = "your-database-id-here"

# R2 Bucket configuration
[[r2_buckets]]
binding = "GEO_DATA"
bucket_name = "japan-geographic-data"

# KV Namespace (optional)
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id-here"
"@
        Set-Content -Path "wrangler.toml" -Value $wranglerConfig
        Write-Host "wrangler.toml created." -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create wrangler.toml: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Create basic TypeScript configuration for backend
$tsconfigPath = Join-Path $backendPath "tsconfig.json"
if (-not (Test-Path $tsconfigPath)) {
    Write-Host "Creating backend tsconfig.json..." -ForegroundColor Yellow
    Push-Location $backendPath
    try {
        $tsconfig = @{
            compilerOptions = @{
                target = "ES2022"
                module = "ES2022"
                lib = @("ES2022")
                moduleResolution = "bundler"
                types = @("@cloudflare/workers-types")
                strict = true
                esModuleInterop = true
                skipLibCheck = true
                forceConsistentCasingInFileNames = true
                resolveJsonModule = true
                isolatedModules = true
            }
            include = @("src/**/*")
            exclude = @("node_modules", "dist")
        } | ConvertTo-Json -Depth 10

        Set-Content -Path "tsconfig.json" -Value $tsconfig
        Write-Host "Backend tsconfig.json created." -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create backend tsconfig.json: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Create basic backend structure
$backendSrcPath = Join-Path $backendPath "src"
if (-not (Test-Path $backendSrcPath)) {
    Write-Host "Creating backend src directory..." -ForegroundColor Yellow
    New-Item -Path $backendSrcPath -ItemType Directory -Force | Out-Null

    # Create basic index.ts
    $indexPath = Join-Path $backendSrcPath "index.ts"
    $indexContent = @"
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    DB: D1Database;
    GEO_DATA: R2Bucket;
    CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use('/*', cors());

// Health check
app.get('/', (c) => {
    return c.json({
        status: 'ok',
        message: 'Japan Geographic API',
        version: '1.0.0'
    });
});

// API routes
app.get('/api/prefectures', async (c) => {
    // TODO: Implement prefecture data retrieval
    return c.json({ message: 'Prefectures endpoint' });
});

app.get('/api/geo/:type', async (c) => {
    const type = c.req.param('type');
    // TODO: Implement GeoJSON data retrieval from R2
    return c.json({ message: `GeoJSON data for ${type}` });
});

export default app;
"@
    Set-Content -Path $indexPath -Value $indexContent
    Write-Host "Backend index.ts created." -ForegroundColor Green
}

Write-Host "Package setup completed successfully." -ForegroundColor Green
