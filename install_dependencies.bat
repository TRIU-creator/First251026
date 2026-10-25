@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM ATSI-WMS - Dependency Installation Script
REM For first-time setup or when dependencies are missing
REM ==============================================================================
TITLE ATSI-WMS Dependency Installer

echo.
echo ========================================
echo   ATSI-WMS DEPENDENCY INSTALLER
echo ========================================
echo.

REM Check Node.js
echo [1/5] Checking prerequisites...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js first:
    echo 1. Download from https://nodejs.org/ (LTS recommended)
    echo 2. Install with default settings
    echo 3. Restart this script
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js %%i

npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found!
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm v%%i

echo.

REM Navigate to project dir
cd /d "%~dp0"
echo [OK] Project directory: %CD%

REM Check .env
echo [2/5] Environment setup...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] Created .env from .env.example
        echo [WARNING] Please edit .env with your actual credentials
    ) else (
        echo [ERROR] No .env or .env.example found!
        pause >nul
        exit /b 1
    )
) else (
    echo [OK] .env already exists
)

echo.

REM Clean install to avoid cache issues
echo [3/5] Preparing for clean install...
if exist "node_modules" (
    echo [INFO] Removing existing node_modules...
    rmdir /s /q node_modules 2>nul
)
if exist "package-lock.json" (
    echo [INFO] Removing package-lock.json to avoid peer conflicts...
    del /f /q package-lock.json 2>nul
)
echo [OK] Clean slate ready

REM Install dependencies
echo [4/5] Installing dependencies...
echo [INFO] This may take 3-10 minutes depending on internet speed...
echo [INFO] Using --legacy-peer-deps to resolve peer dependency conflicts...
echo.
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation failed with --legacy-peer-deps
    echo [INFO] Trying with --force flag...
    call npm install --force
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Installation failed!
        echo Please check:
        echo - Internet connection
        echo - Node.js/npm versions (Node 18+ recommended)
        echo - Disk space
        echo.
        pause >nul
        exit /b 1
    )
)
echo.
echo [OK] Dependencies installed

echo [5/5] Verifying critical packages...
if exist "node_modules\express" (echo [OK] express) else (echo [MISSING] express)
if exist "node_modules\vite" (echo [OK] vite) else (echo [MISSING] vite)
if exist "node_modules\tsx" (echo [OK] tsx) else (echo [MISSING] tsx)
if exist "node_modules\react" (echo [OK] react) else (echo [MISSING] react)

echo.
echo ========================================
echo   INSTALLATION COMPLETE
echo ========================================
echo.
echo Next steps:
echo 1. Review and update .env file with your credentials
echo 2. Run start_wms.bat to start the server
echo 3. Open http://localhost:3000 in your browser
echo.
echo Press any key to exit...
pause >nul
endlocal
