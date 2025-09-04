@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

REM SkillUp Platform 简化启动脚本
REM 版本: 3.1 - 简化版（专为PowerShell优化）
REM 描述: 一键启动 SkillUp Platform 在线考试系统

title SkillUp Platform - 简化启动工具 v3.1

echo.
echo ================================================================
echo.
echo    🚀 SkillUp Platform - 简化启动工具
echo.
echo    一键启动 + 自动打开浏览器
echo.
echo ================================================================
echo.

REM 检测执行环境
if defined PSModulePath (
    echo [INFO] 检测到 PowerShell 环境
    set "IS_POWERSHELL=1"
) else (
    echo [INFO] 检测到 CMD 环境
    set "IS_POWERSHELL=0"
)

echo [提示] 如果脚本无法正常运行，请尝试以下方式：
echo   1. 在 CMD 中运行: quick-start-simple.bat
echo   2. 在 PowerShell 中运行: .\quick-start-simple.bat
echo   3. 备用方式: npm run dev
echo   4. 手动方式: node start.js
echo.

REM 快速环境检查
echo ⚡ 快速环境检查...

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装
    echo 请先安装 Node.js 或检查 PATH 环境变量
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js 版本: !NODE_VERSION!
)

REM 检查项目文件
if not exist "package.json" (
    echo ❌ 项目文件不完整
    echo 请确保在项目根目录运行
    echo 当前目录: %CD%
    pause
    exit /b 1
) else (
    echo ✅ 项目文件检查通过
)

REM 检查环境变量文件
if not exist ".env.local" (
    if exist ".env.example" (
        echo [提示] 正在创建 .env.local 文件...
        copy ".env.example" ".env.local" >nul 2>&1
        echo ✅ 已创建 .env.local 文件
    ) else (
        echo [警告] 未找到环境变量配置文件
    )
) else (
    echo ✅ 环境变量配置文件存在
)

REM 检查依赖
if not exist "node_modules" (
    echo ⚡ 正在安装依赖...
    echo 这可能需要几分钟时间，请耐心等待...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        echo 请检查网络连接或尝试使用淘宝镜像
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 项目依赖已存在
)

echo ✅ 环境检查通过
echo.

REM 创建必要目录
if not exist "data" mkdir data >nul 2>nul
if not exist "logs" mkdir logs >nul 2>nul
if not exist "uploads" mkdir uploads >nul 2>nul

echo ✅ 目录结构检查完成

REM 检查端口
echo 🔍 检查端口状态...
set PORT=3000

netstat -an | find ":3000" | find "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo ⚡ 发现端口占用，尝试清理...
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do (
        taskkill /PID %%a /F >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
) else (
    echo ✅ 端口 3000 可用
)

REM 启动应用
echo 🚀 启动应用...
echo ================================================================
echo 使用端口: %PORT%
echo.

REM 启动开发服务器
echo [开发模式] 启动开发服务器...
start /min cmd /c "npm run dev"

REM 等待服务器启动
echo ⏳ 等待服务器启动...
set /a "count=0"
:wait_loop
set /a "count+=1"
if %count% gtr 20 (
    echo ❌ 服务器启动超时
    echo 请尝试手动运行: npm run dev
    pause
    exit /b 1
)

REM 简化的服务器检查
timeout /t 1 /nobreak >nul
netstat -an | find ":3000" | find "LISTENING" >nul 2>nul
if %errorlevel% neq 0 (
    echo 等待中... (%count%/20)
    goto :wait_loop
)

echo ✅ 服务器启动成功
echo.

REM 显示启动信息
echo ================================================================
echo.
echo    🎉 SkillUp Platform 启动成功！
echo.
echo    📱 本地访问地址: http://localhost:3000
echo    🌐 网络访问地址: http://[您的IP]:3000
echo.
echo    💡 提示: 浏览器将自动打开应用页面
echo.
echo ================================================================
echo.

REM 自动打开浏览器
echo 🌐 正在打开浏览器...
start "" "http://localhost:3000"
echo 访问地址: http://localhost:3000

REM 显示控制选项
echo.
echo 📋 控制选项:
echo   按 Ctrl+C 停止服务器
echo   关闭此窗口也会停止服务器
echo   访问 http://localhost:3000 使用应用
echo.
echo 系统信息:
echo   Node.js: %NODE_VERSION%
echo   端口: 3000
echo   环境: %IS_POWERSHELL% (0=CMD, 1=PowerShell)
echo   项目目录: %CD%
echo.
echo 🎯 SkillUp Platform 已准备就绪！
echo.

REM 保持窗口打开
pause