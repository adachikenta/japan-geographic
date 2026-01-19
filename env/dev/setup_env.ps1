$ErrorActionPreference = "Stop"
Write-Host "`nStarting setup base environment..." -ForegroundColor Cyan

$venvPath = ".\venv"
$pythonVersion = "python312"
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
    # Check if scoop directory exists but command is not available
    $scoopPath = "$env:USERPROFILE\scoop"
    if (Test-Path $scoopPath) {
        Write-Host "scoop directory exists but scoop command is not available. Attempting to fix..." -ForegroundColor Yellow

        # Try to add scoop to PATH
        $scoopShimsPath = "$scoopPath\shims"
        if (Test-Path $scoopShimsPath) {
            $env:Path = "$scoopShimsPath;$env:Path"

            # Check if scoop works now
            if (Get-Command scoop -ErrorAction SilentlyContinue) {
                Write-Host "scoop is now available." -ForegroundColor Green
            } else {
                Write-Host "scoop installation appears corrupted. Cleaning up and reinstalling..." -ForegroundColor Yellow
                try {
                    Remove-Item -Path $scoopPath -Recurse -Force -ErrorAction Stop
                    Write-Host "Removed corrupted scoop installation." -ForegroundColor Yellow
                }
                catch {
                    Write-Host "Error: Could not remove corrupted scoop directory. Please manually delete: $scoopPath" -ForegroundColor Red
                    Write-Host "Then run this script again." -ForegroundColor Yellow
                    exit 1
                }
            }
        } else {
            Write-Host "scoop installation appears incomplete. Cleaning up..." -ForegroundColor Yellow
            try {
                Remove-Item -Path $scoopPath -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-Host "Error: Could not remove incomplete scoop directory. Please manually delete: $scoopPath" -ForegroundColor Red
                exit 1
            }
        }
    }

    # Install scoop if not available
    if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
        Write-Host "Installing scoop..." -ForegroundColor Yellow
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

# check versions bucket
Write-Host "Checking versions bucket..." -ForegroundColor Yellow
$buckets = scoop bucket list 2>&1 | Out-String

if ($buckets -match "versions") {
    Write-Host "versions bucket is already added." -ForegroundColor Green
} else {
    Write-Host "Adding versions bucket..." -ForegroundColor Yellow
    try {
        $addBucketOutput = scoop bucket add versions 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to add versions bucket. Exit code: $LASTEXITCODE`nOutput: $addBucketOutput"
        }

        # Verify the bucket was added
        Start-Sleep -Seconds 2
        $ErrorActionPreference = "Continue"
        $bucketsAfter = scoop bucket list 2>&1 | Out-String
        $ErrorActionPreference = "Stop"

        if ($bucketsAfter -notmatch "versions") {
            throw "versions bucket was not found after installation"
        }

        Write-Host "versions bucket added successfully." -ForegroundColor Green
    }
    catch {
        Write-Host "Error: Could not add versions bucket: $_" -ForegroundColor Red
        Write-Host "The versions bucket is required to install $pythonVersion" -ForegroundColor Red
        Write-Host "Please check your network connection and proxy settings." -ForegroundColor Yellow
        exit 1
    }
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
            # Reload PATH to ensure npm is available
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            # Fallback: Install pnpm via npm
            npm install -g pnpm
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to install pnpm"
            }
        }

        # Reload environment variables to make pnpm available in current session
        Write-Host "Reloading environment variables..." -ForegroundColor Yellow
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        # Wait a moment for PATH to update
        Start-Sleep -Seconds 1
    }

    # Verify pnpm installation using full path first, then check if it's in PATH
    if (Test-Path $scooppnpm) {
        $pnpmVersion = & $scooppnpm --version 2>&1
        Write-Host "pnpm version: $pnpmVersion" -ForegroundColor Green
    } else {
        $pnpmVersion = pnpm --version 2>&1
        Write-Host "pnpm version: $pnpmVersion" -ForegroundColor Green
    }
}
catch {
    Write-Host "Warning: Could not install pnpm: $_" -ForegroundColor Yellow
    Write-Host "You may need to install it manually." -ForegroundColor Yellow
}

# Install wrangler for Cloudflare Workers development
Write-Host "Checking wrangler installation..." -ForegroundColor Yellow
try {
    # Reload PATH to ensure npm is available
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

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

# check if python of scoop is installed
$scooppython = "$env:USERPROFILE\scoop\apps\$pythonVersion\current\python.exe"
$pythonInstalled = Install-ScoopPackage -PackageName $pythonVersion -ExecutablePath $scooppython
if (-not $pythonInstalled) {
    Write-Host "Failed to install Python. Exiting..." -ForegroundColor Red
    exit 1
}

# Verify Python is working
try {
    $pythonVersionOutput = & $scooppython --version 2>&1
    Write-Host "Python version: $pythonVersionOutput" -ForegroundColor Green
}
catch {
    Write-Host "Python executable exists but is not working properly: $_" -ForegroundColor Red
    exit 1
}

# create a Python virtual environment in the 'venv' directory
if (Test-Path -Path $venvPath) {
    Write-Host "Virtual environment directory exists. Checking validity..." -ForegroundColor Yellow

    # Check if pyvenv.cfg exists and has valid home path
    $pyvenvCfg = Join-Path $venvPath "pyvenv.cfg"
    $isValid = $false

    if (Test-Path $pyvenvCfg) {
        $cfgContent = Get-Content $pyvenvCfg -Raw
        # Extract home path from pyvenv.cfg
        if ($cfgContent -match "home\s*=\s*(.+)") {
            $venvHomePath = $matches[1].Trim()
            # Check if the home path exists and matches current user's Python
            if ((Test-Path $venvHomePath) -and ($venvHomePath -like "*$env:USERPROFILE*")) {
                Write-Host "Virtual environment is valid for current user." -ForegroundColor Green
                $isValid = $true
            } else {
                Write-Host "Virtual environment was created by different user or Python path is invalid." -ForegroundColor Yellow
                Write-Host "  Home path in venv: $venvHomePath" -ForegroundColor Gray
                Write-Host "  Current Python: $scooppython" -ForegroundColor Gray
            }
        }
    }

    if (-not $isValid) {
        Write-Host "Removing invalid virtual environment..." -ForegroundColor Yellow
        try {
            Remove-Item -Path $venvPath -Recurse -Force
            Write-Host "Invalid virtual environment removed." -ForegroundColor Green
        }
        catch {
            Write-Host "Error: Could not remove invalid venv. Please manually delete: $venvPath" -ForegroundColor Red
            exit 1
        }
    }
}

if (-not (Test-Path -Path $venvPath)) {
    Write-Host "Creating virtual environment ..." -ForegroundColor Yellow
    try {
        & $scooppython -m venv $venvPath
        if ($LASTEXITCODE -ne 0) {
            throw "venv creation failed with exit code $LASTEXITCODE"
        }
        # Verify venv was created
        $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
        if (-not (Test-Path $activateScript)) {
            throw "Virtual environment created but activation script not found"
        }
        Write-Host "Virtual environment created successfully." -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create virtual environment: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Virtual environment is located at $venvPath" -ForegroundColor Green
Write-Host "Setup completed successfully." -ForegroundColor Green
