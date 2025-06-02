@echo off
echo ===================================================
echo Rainbow Paws Production Deployment
echo ===================================================
echo.
echo This script will build and start the application in production mode.
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Checking for MySQL...
sc query MySQL >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo WARNING: MySQL service not found. Make sure your database is running.
    echo The application requires a running MySQL database.
    echo.
    set /p continue=Do you want to continue anyway? (y/n): 
    if /i not "%continue%"=="y" (
        echo Exiting...
        pause
        exit /b 1
    )
)

echo.
echo Step 1: Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install dependencies.
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Building the application for production...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed.
    echo Please check the error messages above and fix any issues.
    echo.
    pause
    exit /b 1
)

echo.
echo Step 3: Starting the production server...
echo.
echo The application is now running in production mode!
echo Press Ctrl+C to stop the server.
echo.
echo Access the application at:
echo http://localhost:3001 (or your configured port)
echo.

call npm start

REM This part will only execute if the server is stopped
echo.
echo Server stopped. Thank you for using Rainbow Paws!
echo.
pause
