@echo off
chcp 65001 >nul
title SkillUp Platform - 快速启动

REM 设置颜色变量
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "MAGENTA=[35m"
set "CYAN=[36m"
set "RESET=[0m"

echo.
echo %CYAN%╔══════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    🚀 SkillUp Platform - 快速启动工具                        ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    一键启动 + 自动打开浏览器                                  ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════╝%RESET%
echo.

REM 快速环境检查
echo %BLUE%⚡ 快速环境检查...%RESET%

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%❌ Node.js 未安装%RESET%
    echo %YELLOW%请运行 setup-environment.bat 进行环境重构%RESET%
    pause
    exit /b 1
)

REM 检查项目文件
if not exist "package.json" (
    echo %RED%❌ 项目文件不完整%RESET%
    echo %YELLOW%请确保在项目根目录运行%RESET%
    pause
    exit /b 1
)

REM 检查依赖
if not exist "node_modules" (
    echo %YELLOW%⚡ 正在快速安装依赖...%RESET%
    npm install --silent
    if %errorlevel% neq 0 (
        echo %RED%❌ 依赖安装失败%RESET%
        pause
        exit /b 1
    )
)

echo %GREEN%✅ 环境检查通过%RESET%
echo.

REM 创建必要目录
if not exist "data" mkdir data >nul 2>nul
if not exist "logs" mkdir logs >nul 2>nul
if not exist "uploads" mkdir uploads >nul 2>nul

REM 检查端口并清理
echo %BLUE%🔍 检查端口状态...%RESET%
netstat -an | find ":3000" | find "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo %YELLOW%⚡ 清理端口占用...%RESET%
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do (
        taskkill /PID %%a /F >nul 2>nul
    )
    timeout /t 1 /nobreak >nul
)

REM 启动应用
echo %GREEN%🚀 启动应用...%RESET%
echo %BLUE%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%RESET%
echo.

REM 在后台启动应用
start /min cmd /c "node start.js"

REM 等待服务器启动
echo %BLUE%⏳ 等待服务器启动...%RESET%
set /a "count=0"
:wait_loop
set /a "count+=1"
if %count% gtr 30 (
    echo %RED%❌ 服务器启动超时%RESET%
    goto :error_exit
)

REM 检查服务器是否启动
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    goto :server_ready
) else (
    timeout /t 1 /nobreak >nul
    goto :wait_loop
)

:server_ready
echo %GREEN%✅ 服务器启动成功%RESET%
echo.

REM 显示启动信息
echo %CYAN%╔══════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    🎉 SkillUp Platform 启动成功！                            ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    📱 本地访问地址: http://localhost:3000                     ║%RESET%
echo %CYAN%║    🌐 网络访问地址: http://[您的IP]:3000                      ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    💡 提示: 浏览器将自动打开应用页面                          ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════╝%RESET%
echo.

REM 自动打开浏览器
echo %BLUE%🌐 正在打开浏览器...%RESET%
start "" "http://localhost:3000"

REM 显示控制选项
echo.
echo %YELLOW%📋 控制选项:%RESET%
echo %YELLOW%   按 Ctrl+C 停止服务器%RESET%
echo %YELLOW%   关闭此窗口也会停止服务器%RESET%
echo %YELLOW%   访问 http://localhost:3000 使用应用%RESET%
echo.

REM 显示实时日志（可选）
echo %BLUE%📊 应用正在运行，按任意键查看实时日志...%RESET%
pause >nul

REM 显示日志文件内容（如果存在）
if exist "logs\app.log" (
    echo %BLUE%📋 最新日志:%RESET%
    echo %BLUE%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%RESET%
    powershell -Command "Get-Content 'logs\app.log' -Tail 10"
    echo %BLUE%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%RESET%
)

echo.
echo %GREEN%✨ 应用运行中，请保持此窗口打开%RESET%
echo %YELLOW%按任意键退出并停止服务器...%RESET%
pause >nul

REM 停止服务器
echo %BLUE%🛑 正在停止服务器...%RESET%
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>nul
)
echo %GREEN%✅ 服务器已停止%RESET%
exit /b 0

:error_exit
echo %RED%❌ 启动失败，请检查错误信息%RESET%
echo %YELLOW%建议运行 setup-environment.bat 进行环境重构%RESET%
pause
exit /b 1