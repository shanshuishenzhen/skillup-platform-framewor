@echo off
chcp 65001 >nul
title SkillUp Platform - Startup

echo.
echo ===============================================================
echo.
echo    SkillUp Platform - Quick Start
echo.
echo    Intelligent Online Learning Platform Startup Tool
echo.
echo ===============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js not detected, please install Node.js first
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm not detected, please check Node.js installation
    pause
    exit /b 1
)

REM Display version information
echo Environment Information:
node --version
npm --version
echo.

REM Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found, please run from project root directory
    pause
    exit /b 1
)

REM Run startup script
echo Starting application...
echo.
node start.js

REM If startup fails, pause to view error information
if %errorlevel% neq 0 (
    echo.
    echo Error: Startup failed, please check error information
    pause
)
