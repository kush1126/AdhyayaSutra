@echo off
setlocal enabledelayedexpansion
title AdhyayaSutra - Local Development Server

cd /d "%~dp0"

echo ===================================================
echo             AdhyayaSutra - Launching App           
echo ===================================================
echo.

:: Check for Node.js installation
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH.
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check for package.json
if not exist "package.json" (
    echo [ERROR] package.json not found in %cd%
    echo Please make sure this script is located in the project root folder.
    echo.
    pause
    exit /b 1
)

:: Check for node_modules and install dependencies if missing
if not exist "node_modules\" (
    echo [INFO] node_modules folder not found.
    echo Installing dependencies via npm install...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b %ERRORLEVEL%
    )
    echo [SUCCESS] Dependencies installed successfully.
    echo.
)

:: Check for .env file
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] .env file not found. Creating from .env.example...
        copy ".env.example" ".env" >nul
        echo [NOTE] Created .env file. You can configure your API keys (e.g., VITE_GEMINI_API_KEY) in .env.
        echo.
    )
)

echo [INFO] Starting Vite development server...
echo [INFO] Your default browser will open http://localhost:5173 automatically.
echo.
echo Press Ctrl+C in this terminal window to stop the server.
echo ===================================================
echo.

call npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Development server exited with an error.
    pause
)
