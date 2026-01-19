$ErrorActionPreference = "Stop"
Write-Host "`nStarting setup virtual environment..." -ForegroundColor Cyan

$checkVenvScript = Join-Path $PSScriptRoot "check_venv.ps1"
# Run common validation and activate venv
Write-Host "Validating Python environment..." -ForegroundColor Yellow
& $checkVenvScript -ActivateVenv
if ($LASTEXITCODE -ne 0) {
    exit 1
}

# Install required packages inside the activated venv
$setupResult = 0
try {
    # Check pip in venv
    Write-Host "Checking pip in virtual environment..." -ForegroundColor Yellow

    # Get pip path and version
    $pipPath = python -c "import sys; import os; print(os.path.join(sys.prefix, 'Scripts', 'pip.exe'))" 2>&1
    if (Test-Path $pipPath) {
        Write-Host "pip is installed in venv at: $pipPath" -ForegroundColor Green
    } else {
        # install pip using ensurepip
        Write-Host "pip is not found in venv. Installing pip..." -ForegroundColor Yellow
        python -m ensurepip --upgrade
        $setupResult = $LASTEXITCODE
        if ($setupResult -ne 0) {
            throw "Failed to install pip"
        }
        # Verify installation
        if (Test-Path $pipPath) {
            $pipVersion = & $pipPath --version 2>&1
            Write-Host "pip installed successfully at: $pipPath" -ForegroundColor Green
        } else {
            throw "pip installation completed but executable not found"
        }
    }
    # Get pip version
    $pipVersion = & $pipPath --version 2>&1
    Write-Host "pip version: $pipVersion" -ForegroundColor Green

    # upgrade pip to the latest version
    Write-Host "Upgrading pip to the latest version..." -ForegroundColor Yellow
    python -m pip install --upgrade pip --quiet
    $setupResult = $LASTEXITCODE
    if ($setupResult -ne 0) {
        throw "Failed to upgrade pip"
    }
    Write-Host "pip upgraded successfully." -ForegroundColor Green

    # install the required packages from data/processing/requirements.txt
    if (Test-Path ".\data\processing\requirements.txt") {
        Write-Host "Installing required packages for data processing from data/processing/requirements.txt..." -ForegroundColor Yellow
        pip install -r .\data\processing\requirements.txt
        $setupResult = $LASTEXITCODE
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install packages from data/processing/requirements.txt"
        }
        Write-Host "Data processing packages installed successfully." -ForegroundColor Green
    } else {
        Write-Host "Warning: data/processing/requirements.txt not found, skipping..." -ForegroundColor Yellow
    }
}
catch {
    $setupResult = $LASTEXITCODE
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
}
finally {
    # Deactivate virtual environment
    if (Get-Command deactivate -ErrorAction SilentlyContinue) {
        Write-Host "Deactivating virtual environment..." -ForegroundColor Yellow
        deactivate
    }
    if ($setupResult -eq 0) {
        Write-Host "Virtual environment setup completed successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Virtual environment setup failed. Exit code: $setupResult" -ForegroundColor Red
        exit $setupResult
    }
}
