@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM ATSI-WMS - Automated Startup Script
REM Ammunition & Technical Store Inspection & Warehouse Management System
REM ==============================================================================
TITLE ATSI-WMS Startup

echo.
echo ========================================
echo   ATSI-WMS AUTOMATED STARTUP SCRIPT
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/ (LTS version recommended)
    echo Run install_dependencies.bat first if needed.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% found

REM Check if npm is installed
echo [2/6] Checking npm installation...
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH!
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo [OK] npm v%NPM_VER% found

REM Navigate to project directory
cd /d "%~dp0"
echo [OK] Working directory: %CD%

REM Check if .env exists
echo [3/6] Checking environment configuration...
if not exist ".env" (
    echo [WARNING] .env file not found!
    if exist ".env.example" (
        echo [INFO] Copying .env.example to .env...
        copy ".env.example" ".env" >nul
        echo [OK] .env created from .env.example
        echo [IMPORTANT] Please update .env with your credentials before running!
    ) else (
        echo [ERROR] Neither .env nor .env.example found!
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
) else (
    echo [OK] .env file found
)

REM Check node_modules
echo [4/6] Checking dependencies...
if not exist "node_modules" (
    echo [WARNING] node_modules not found!
    echo [INFO] Installing dependencies with --legacy-peer-deps...
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo [INFO] Retrying with --force...
        call npm install --force
        if %ERRORLEVEL% NEQ 0 (
            echo [ERROR] npm install failed!
            echo Run install_dependencies.bat for detailed troubleshooting.
            echo Press any key to exit...
            pause >nul
            exit /b 1
        )
    )
    echo [OK] Dependencies installed successfully
) else (
    echo [OK] node_modules found
)

REM Check if tsx is available
echo [5/6] Verifying tsx runtime...
if exist "node_modules\tsx\dist\cli.mjs" (
    echo [OK] tsx found
) else if exist "node_modules\.bin\tsx.cmd" (
    echo [OK] tsx found
) else (
    echo [WARNING] tsx not found, installing...
    call npm install tsx --save-dev --legacy-peer-deps
)

REM Start the server
echo [6/6] Starting ATSI-WMS Server...
echo.
echo ========================================
echo   SERVER STARTING ON PORT 3000
echo   URL: http://localhost:3000
echo   Health: http://localhost:3000/api/health
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start server using tsx
node node_modules\tsx\dist\cli.mjs server.ts

echo.
echo Server stopped.
pause
endlocal
