@echo off
chcp 65001 >nul
title OA办公系统启动器

echo.
echo ========================================
echo 🏢 OA办公系统一键启动
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python未安装或未添加到PATH
    echo 请访问 https://www.python.org 下载安装Python 3.7+
    echo.
    pause
    exit /b 1
)

echo ✅ Python环境检查通过
echo.

REM 检查是否存在启动脚本
if not exist "start_oa_system.py" (
    echo ❌ 启动脚本不存在: start_oa_system.py
    echo 请确保在正确的目录中运行此脚本
    echo.
    pause
    exit /b 1
)

echo 🚀 启动OA系统...
echo.

REM 运行Python启动脚本
python start_oa_system.py

REM 如果脚本异常退出，暂停以查看错误信息
if %errorlevel% neq 0 (
    echo.
    echo ❌ 启动失败，请查看上方错误信息
    echo.
    pause
)

exit /b %errorlevel%
