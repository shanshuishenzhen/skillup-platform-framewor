@echo off
chcp 65001 >nul
title SkillUp Platform - 一键启动

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║    🚀 SkillUp Platform - 一键启动                            ║
echo ║                                                              ║
echo ║    智能在线学习平台快速启动工具                               ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查npm是否安装
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到npm，请检查Node.js安装
    pause
    exit /b 1
)

REM 显示版本信息
echo 📋 环境信息:
node --version
npm --version
echo.

REM 检查package.json是否存在
if not exist "package.json" (
    echo ❌ 未找到package.json文件，请确保在项目根目录运行
    pause
    exit /b 1
)

REM 运行启动脚本
echo 🚀 启动应用...
echo.
node start.js

REM 如果启动失败，暂停以查看错误信息
if %errorlevel% neq 0 (
    echo.
    echo ❌ 启动失败，请检查错误信息
    pause
)
