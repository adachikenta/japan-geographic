@echo off
REM Setup Local R2 Mock Data

echo.
echo ================================================
echo Setup Local R2 Mock Data
echo ================================================
echo.

PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0env\dev\setup_local_r2.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Setup failed
    pause
    exit /b %ERRORLEVEL%
)

echo.
pause
