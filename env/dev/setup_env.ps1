$ErrorActionPreference = "Stop"
Write-Host "`nStarting setup base environment..." -ForegroundColor Cyan

$nodeVersion = "nodejs-lts"
$pnpmPackage = "pnpm"

function Install-ScoopPackage {
    param(
        [string]$PackageName,
        [string]$ExecutablePath,
        [int]$MaxRetries = 2
    )

    $attempt = 0
    while ($attempt -lt $MaxRetries) {
        try {
            # Check if already installed and working
            if (Test-Path $ExecutablePath) {
                Write-Host "$PackageName is already installed." -ForegroundColor Green
                return $true
            }

            # Check if package exists but is broken
            $scoopList = scoop list 2>&1 | Out-String
            if ($scoopList -match $PackageName) {
                Write-Host "$PackageName is installed but not working. Reinstalling..." -ForegroundColor Yellow
                scoop uninstall $PackageName 2>&1 | Out-Null
                Start-Sleep -Seconds 2
            }

            # Install the package
            Write-Host "$PackageName is not installed. Installing $PackageName..." -ForegroundColor Yellow
            $output = scoop install $PackageName 2>&1

            # Wait for installation to complete
            Start-Sleep -Seconds 3

            # Verify installation
            if (Test-Path $ExecutablePath) {
                Write-Host "$PackageName installed successfully." -ForegroundColor Green
                return $true
            } else {
                $errorMsg = "$PackageName installation completed but executable not found at $ExecutablePath"
                if ($output) {
                    $errorMsg += "`nInstallation output: $output"
                }
                throw $errorMsg
            }
        }
        catch {
            $attempt++
            Write-Host "Attempt $attempt failed: $_" -ForegroundColor Red
            Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
            if ($attempt -lt $MaxRetries) {
                Write-Host "Retrying..." -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                Write-Host "Failed to install $PackageName after $MaxRetries attempts." -ForegroundColor Red
                return $false
            }
        }
    }
    return $false
}

# check if scoop is installed
if (Get-Command scoop -ErrorAction SilentlyContinue) {
    Write-Host "scoop is already installed." -ForegroundColor Green
} else {
    # install scoop
    Write-Host "scoop is not installed. Installing scoop..." -ForegroundColor Yellow
    try {
        Invoke-Expression "& {$(Invoke-RestMethod get.scoop.sh)}"
        Write-Host "scoop installed successfully." -ForegroundColor Green

        # Reload environment variables to make scoop available in current session
        Write-Host "Reloading environment variables..." -ForegroundColor Yellow
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        # Verify scoop is now available
        if (Get-Command scoop -ErrorAction SilentlyContinue) {
            Write-Host "scoop is now available in current session." -ForegroundColor Green
        } else {
            Write-Host "Warning: scoop installed but not found in PATH. You may need to restart the terminal." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Failed to install scoop: $_" -ForegroundColor Red
        exit 1
    }
}

# check if git of scoop is installed
$scoopgit = "$env:USERPROFILE\scoop\apps\git\current\bin\git.exe"
$gitInstalled = Install-ScoopPackage -PackageName "git" -ExecutablePath $scoopgit
if (-not $gitInstalled) {
    Write-Host "Failed to install git. Exiting..." -ForegroundColor Red
    exit 1
}

# Configure git settings
Write-Host "Configuring git settings..." -ForegroundColor Yellow
try {
    # Create .gitconfig if it doesn't exist
    $gitConfigPath = "$env:USERPROFILE\.gitconfig"
    if (-not (Test-Path $gitConfigPath)) {
        Write-Host ".gitconfig not found. Creating..." -ForegroundColor Yellow
        New-Item -Path $gitConfigPath -ItemType File -Force | Out-Null
    }

    # Set schannel for SSL backend
    & $scoopgit config --global http.sslbackend schannel 2>&1 | Out-Null
    Write-Host "git sslbackend set to schannel." -ForegroundColor Green

    # Disable SSL revocation check to avoid CRYPT_E_NO_REVOCATION_CHECK error
    & $scoopgit config --global http.schannelCheckRevoke false 2>&1 | Out-Null
    Write-Host "git SSL revocation check disabled." -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not configure git settings: $_" -ForegroundColor Yellow
    Write-Host "Attempting to continue anyway..." -ForegroundColor Yellow
}

# Install Node.js
$scoopnode = "$env:USERPROFILE\scoop\apps\$nodeVersion\current\node.exe"
$nodeInstalled = Install-ScoopPackage -PackageName $nodeVersion -ExecutablePath $scoopnode
if (-not $nodeInstalled) {
    Write-Host "Failed to install Node.js. Exiting..." -ForegroundColor Red
    exit 1
}

# Verify Node.js is working
try {
    $nodeVersionOutput = & $scoopnode --version 2>&1
    Write-Host "Node.js version: $nodeVersionOutput" -ForegroundColor Green
}
catch {
    Write-Host "Node.js executable exists but is not working properly: $_" -ForegroundColor Red
    exit 1
}

# Install pnpm
Write-Host "Installing pnpm..." -ForegroundColor Yellow
try {
    # First check if pnpm is already installed via Scoop
    $scooppnpm = "$env:USERPROFILE\scoop\shims\pnpm.exe"
    if (Test-Path $scooppnpm) {
        Write-Host "pnpm is already installed via Scoop." -ForegroundColor Green
    } else {
        # Install pnpm via Scoop
        $pnpmInstalled = Install-ScoopPackage -PackageName $pnpmPackage -ExecutablePath $scooppnpm
        if (-not $pnpmInstalled) {
            Write-Host "Failed to install pnpm via Scoop. Trying npm fallback..." -ForegroundColor Yellow
            # Fallback: Install pnpm via npm
            & npm install -g pnpm
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to install pnpm"
            }
        }
    }

    # Verify pnpm installation
    $pnpmVersion = pnpm --version 2>&1
    Write-Host "pnpm version: $pnpmVersion" -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not install pnpm: $_" -ForegroundColor Yellow
    Write-Host "You may need to install it manually." -ForegroundColor Yellow
}

# Install wrangler for Cloudflare Workers development
Write-Host "Checking wrangler installation..." -ForegroundColor Yellow
try {
    $wranglerCheck = npm list -g wrangler 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing wrangler globally..." -ForegroundColor Yellow
        npm install -g wrangler
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install wrangler"
        }
        Write-Host "wrangler installed successfully." -ForegroundColor Green
    } else {
        Write-Host "wrangler is already installed." -ForegroundColor Green
    }

    # Verify wrangler
    $wranglerVersion = wrangler --version 2>&1
    Write-Host "wrangler version: $wranglerVersion" -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not install wrangler: $_" -ForegroundColor Yellow
    Write-Host "Cloudflare Workers features may not work." -ForegroundColor Yellow
}

Write-Host "Setup completed successfully." -ForegroundColor Green
