@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ========================================
REM 技能提升平台 - 自动化部署脚本 (Windows)
REM ========================================

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🚀 自动化部署工具                          ║
echo ║                  技能提升平台 - Windows版本                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 设置颜色
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "MAGENTA=%ESC%[35m"
set "CYAN=%ESC%[36m"
set "RESET=%ESC%[0m"

REM 记录开始时间
set START_TIME=%time%
echo %CYAN%📅 部署开始时间: %date% %time%%RESET%
echo.

REM 检查 Node.js
echo %CYAN%🔍 检查 Node.js...%RESET%
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Node.js 未安装或未添加到 PATH%RESET%
    echo %YELLOW%请访问 https://nodejs.org 下载并安装 Node.js%RESET%
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%✅ Node.js: !NODE_VERSION!%RESET%
)

REM 检查 npm
echo %CYAN%🔍 检查 npm...%RESET%
npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ npm 未安装%RESET%
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo %GREEN%✅ npm: !NPM_VERSION!%RESET%
)

REM 检查 Git
echo %CYAN%🔍 检查 Git...%RESET%
git --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%⚠️  Git 未安装，部分功能可能受限%RESET%
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo %GREEN%✅ Git: !GIT_VERSION!%RESET%
)

echo.
echo %MAGENTA%════════════════════════════════════════════════════════════════%RESET%
echo %MAGENTA%                        部署选项菜单                              %RESET%
echo %MAGENTA%════════════════════════════════════════════════════════════════%RESET%
echo.
echo %CYAN%请选择部署选项:%RESET%
echo %YELLOW%1.%RESET% 🚀 完整自动化部署 (推荐)
echo %YELLOW%2.%RESET% 🏗️  仅构建项目
echo %YELLOW%3.%RESET% 🔍 部署前检查
echo %YELLOW%4.%RESET% 📊 查看部署状态
echo %YELLOW%5.%RESET% 📋 查看部署日志
echo %YELLOW%6.%RESET% ❌ 退出
echo.
set /p choice=%CYAN%请输入选项 (1-6): %RESET%

if "%choice%"=="1" goto FULL_DEPLOY
if "%choice%"=="2" goto BUILD_ONLY
if "%choice%"=="3" goto CHECK_ONLY
if "%choice%"=="4" goto STATUS_ONLY
if "%choice%"=="5" goto LOGS_ONLY
if "%choice%"=="6" goto EXIT

echo %RED%❌ 无效选项，请重新选择%RESET%
pause
goto :eof

:FULL_DEPLOY
echo.
echo %MAGENTA%🚀 开始完整自动化部署...%RESET%
echo.

REM 确认部署
set /p confirm=%YELLOW%确认要部署到生产环境吗？(y/N): %RESET%
if /i not "%confirm%"=="y" (
    echo %YELLOW%部署已取消%RESET%
    goto EXIT
)

REM 执行自动化部署脚本
echo %CYAN%📦 执行自动化部署脚本...%RESET%
node deploy-auto.js
if errorlevel 1 (
    echo.
    echo %RED%💥 自动化部署失败%RESET%
    echo %YELLOW%请检查错误信息并重试%RESET%
    goto ERROR_HANDLER
) else (
    echo.
    echo %GREEN%🎉 自动化部署成功完成！%RESET%
    goto SUCCESS_HANDLER
)

:BUILD_ONLY
echo.
echo %MAGENTA%🏗️  开始构建项目...%RESET%
echo.

npm run deploy:build
if errorlevel 1 (
    echo %RED%❌ 项目构建失败%RESET%
    goto ERROR_HANDLER
) else (
    echo %GREEN%✅ 项目构建成功%RESET%
    goto SUCCESS_HANDLER
)

:CHECK_ONLY
echo.
echo %MAGENTA%🔍 开始部署前检查...%RESET%
echo.

npm run deploy:check
if errorlevel 1 (
    echo %RED%❌ 部署前检查失败%RESET%
    goto ERROR_HANDLER
) else (
    echo %GREEN%✅ 部署前检查通过%RESET%
    goto SUCCESS_HANDLER
)

:STATUS_ONLY
echo.
echo %MAGENTA%📊 查看部署状态...%RESET%
echo.

npm run deploy:status
goto SUCCESS_HANDLER

:LOGS_ONLY
echo.
echo %MAGENTA%📋 查看部署日志...%RESET%
echo.

npm run deploy:logs
goto SUCCESS_HANDLER

:ERROR_HANDLER
echo.
echo %RED%════════════════════════════════════════════════════════════════%RESET%
echo %RED%                           部署失败                                %RESET%
echo %RED%════════════════════════════════════════════════════════════════%RESET%
echo.
echo %YELLOW%🔧 故障排除建议:%RESET%
echo %YELLOW%1. 检查网络连接%RESET%
echo %YELLOW%2. 确认 Vercel 账户已登录%RESET%
echo %YELLOW%3. 检查项目配置文件%RESET%
echo %YELLOW%4. 查看详细错误日志%RESET%
echo.
echo %CYAN%📞 如需帮助，请查看 DEPLOYMENT_GUIDE.md%RESET%
echo.
pause
exit /b 1

:SUCCESS_HANDLER
REM 计算部署时间
set END_TIME=%time%
echo.
echo %GREEN%════════════════════════════════════════════════════════════════%RESET%
echo %GREEN%                          操作成功                                %RESET%
echo %GREEN%════════════════════════════════════════════════════════════════%RESET%
echo.
echo %CYAN%📅 开始时间: %START_TIME%%RESET%
echo %CYAN%📅 结束时间: %END_TIME%%RESET%
echo.
echo %GREEN%🎉 操作已成功完成！%RESET%
echo.
echo %CYAN%🔗 有用的链接:%RESET%
echo %YELLOW%• Vercel 控制台: https://vercel.com/dashboard%RESET%
echo %YELLOW%• 项目文档: ./DEPLOYMENT_GUIDE.md%RESET%
echo %YELLOW%• 部署报告: ./deployment-report.json%RESET%
echo.

:EXIT
echo %CYAN%感谢使用自动化部署工具！%RESET%
echo.
pause
exit /b 0