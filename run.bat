@echo off
setlocal enabledelayedexpansion
title AdhyayaSutra - Local Development Server

cd /d "%~dp0"

:MAIN_MENU
cls
echo ================================================================
echo                   🎓 AdhyayaSutra Local Server                  
echo ================================================================
echo.

:: 1. Verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js from https://nodejs.org/ and retry.
    echo.
    goto HOLD_SCREEN
)

:: 2. Verify project root
if not exist "package.json" (
    echo [ERROR] package.json not found in %cd%
    echo Please ensure this batch script is inside the AdhyayaSutra root folder.
    echo.
    goto HOLD_SCREEN
)

:: 3. Check / Install dependencies
if not exist "node_modules\" (
    echo [INFO] First-time setup: node_modules folder not found.
    echo [INFO] Installing dependencies via npm install...
    echo [INFO] (This may take a minute or two. Please wait...)
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [ERROR] Failed to install npm dependencies.
        goto HOLD_SCREEN
    )
    echo.
    echo [SUCCESS] Dependencies installed successfully!
    echo.
)

:: 4. Check .env template
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env file from .env.example...
        copy ".env.example" ".env" >nul
        echo [NOTE] Created .env file. Add your API keys (e.g. VITE_GEMINI_API_KEY) when ready.
        echo.
    )
)

echo [INFO] Starting Vite server on port 3000...
echo [INFO] Local URL:   http://localhost:3000
echo [INFO] Network URL: http://127.0.0.1:3000
echo.
echo [INFO] Your default web browser will open automatically.
echo [INFO] Press Ctrl+C in this terminal if you ever want to stop the server.
echo ================================================================
echo.

:: 5. Launch Vite server
call npm run dev -- --port 3000 --host

echo.
echo ================================================================
echo [INFO] Dev server stopped.
echo ================================================================
echo.

:HOLD_SCREEN
echo Options:
echo   [R] Restart server
echo   [I] Reinstall / repair dependencies (npm install)
echo   [Q] Quit and close window
echo.
set /p USER_CHOICE="Enter your choice (R/I/Q) [Default: R]: "

if /i "%USER_CHOICE%"=="Q" exit /b 0
if /i "%USER_CHOICE%"=="I" (
    echo.
    echo [INFO] Running npm install...
    call npm install
    goto MAIN_MENU
)
goto MAIN_MENU
