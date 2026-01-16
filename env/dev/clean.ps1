$ErrorActionPreference = "Stop"
Write-Host "`nStarting clean up repository..." -ForegroundColor Cyan

# Function to find git executable
function Get-GitExecutable {
    # Check for Scoop-installed git
    $scoopGitPaths = @(
        "$env:USERPROFILE\scoop\shims\git.exe",
        "$env:USERPROFILE\scoop\apps\git\current\bin\git.exe",
        "$env:SCOOP\shims\git.exe",
        "$env:SCOOP\apps\git\current\bin\git.exe"
    )

    foreach ($path in $scoopGitPaths) {
        if (Test-Path $path) {
            Write-Host "Found git at $path via Scoop." -ForegroundColor Green
            # git version
            $version = & $path --version 2>&1
            Write-Host $version -ForegroundColor Green
            return $path
        }
    }

    return $null
}

# Get git executable path
$git = Get-GitExecutable
if (-not $git) {
    Write-Host "Warning: Git not found in PATH or Scoop installation." -ForegroundColor Yellow
    Write-Host "Git-related operations will be skipped." -ForegroundColor Yellow
}

# Kill Node.js processes if running
Write-Host "Checking for running Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es). Stopping..." -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force -ErrorAction Stop
            Write-Host "Node.js process with ID $($_.Id) stopped successfully." -ForegroundColor Green
        } catch {
            Write-Host "Failed to stop Node.js process with ID $($_.Id): $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No Node.js processes found running." -ForegroundColor Green
}

# Check if git repository exists
$gitPath = ".\.git"
if ($git -and -not (Test-Path $gitPath)) {
    Write-Host "Git repository not found. Initializing git repository with 'develop' branch..." -ForegroundColor Yellow
    try {
        # Initialize git repository
        & $git init
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Git repository initialized successfully." -ForegroundColor Green

            # Create and checkout develop branch
            & $git checkout -b develop
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Created and switched to 'develop' branch." -ForegroundColor Green
            } else {
                Write-Host "Warning: Failed to create 'develop' branch." -ForegroundColor Yellow
            }
        } else {
            Write-Host "Warning: Failed to initialize git repository." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error initializing git repository: $_" -ForegroundColor Red
    }
}

$gitignorePath = ".\.gitignore"
if ($git -and (Test-Path $gitignorePath)) {
    # Check if in a git repository
    & $git rev-parse --git-dir 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        try {
            Write-Host "Removing files ignored by .gitignore..." -ForegroundColor Yellow
            & $git clean -fdX
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Ignored files removed successfully." -ForegroundColor Green
            } else {
                Write-Host "Warning: git clean had issues." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Failed to clean git ignored files: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Not in a git repository. Skipping git clean." -ForegroundColor Yellow
    }
} else {
    if (-not $git) {
        Write-Host "Git not available. Skipping git clean operation." -ForegroundColor Yellow
    } elseif (-not (Test-Path $gitignorePath)) {
        Write-Host ".gitignore file not found at $gitignorePath" -ForegroundColor Yellow
        Write-Host "Skipping git clean operation." -ForegroundColor Yellow
    }
}

# Clean Node.js and build artifacts
Write-Host "Cleaning Node.js build artifacts..." -ForegroundColor Yellow

# Clean frontend directory
$frontendPath = ".\frontend"
if (Test-Path $frontendPath) {
    Push-Location $frontendPath
    try {
        # Remove node_modules
        if (Test-Path "node_modules") {
            Write-Host "Removing frontend node_modules..." -ForegroundColor Yellow
            Remove-Item -Path "node_modules" -Recurse -Force
            Write-Host "Frontend node_modules removed." -ForegroundColor Green
        }

        # Remove .next build directory
        if (Test-Path ".next") {
            Write-Host "Removing .next build directory..." -ForegroundColor Yellow
            Remove-Item -Path ".next" -Recurse -Force
            Write-Host ".next directory removed." -ForegroundColor Green
        }

        # Remove .turbo cache
        if (Test-Path ".turbo") {
            Write-Host "Removing .turbo cache..." -ForegroundColor Yellow
            Remove-Item -Path ".turbo" -Recurse -Force
            Write-Host ".turbo cache removed." -ForegroundColor Green
        }

        # Remove out directory if exists (static export)
        if (Test-Path "out") {
            Write-Host "Removing out directory..." -ForegroundColor Yellow
            Remove-Item -Path "out" -Recurse -Force
            Write-Host "out directory removed." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Error cleaning frontend: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

# Clean backend directory
$backendPath = ".\backend"
if (Test-Path $backendPath) {
    Push-Location $backendPath
    try {
        # Remove node_modules
        if (Test-Path "node_modules") {
            Write-Host "Removing backend node_modules..." -ForegroundColor Yellow
            Remove-Item -Path "node_modules" -Recurse -Force
            Write-Host "Backend node_modules removed." -ForegroundColor Green
        }

        # Remove dist build directory
        if (Test-Path "dist") {
            Write-Host "Removing dist build directory..." -ForegroundColor Yellow
            Remove-Item -Path "dist" -Recurse -Force
            Write-Host "dist directory removed." -ForegroundColor Green
        }

        # Remove .wrangler directory
        if (Test-Path ".wrangler") {
            Write-Host "Removing .wrangler directory..." -ForegroundColor Yellow
            Remove-Item -Path ".wrangler" -Recurse -Force
            Write-Host ".wrangler directory removed." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Error cleaning backend: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

# Clean root-level pnpm artifacts
if (Test-Path "node_modules") {
    Write-Host "Removing root node_modules..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "Root node_modules removed." -ForegroundColor Green
}

if (Test-Path "pnpm-lock.yaml") {
    Write-Host "Removing pnpm-lock.yaml..." -ForegroundColor Yellow
    Remove-Item -Path "pnpm-lock.yaml" -Force
    Write-Host "pnpm-lock.yaml removed." -ForegroundColor Green
}

Write-Host "Clean up completed successfully." -ForegroundColor Green
