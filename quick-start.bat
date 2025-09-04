@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

REM SkillUp Platform 快速启动脚本
REM 版本: 3.0 - 优化版
REM 描述: 一键启动 SkillUp Platform 在线考试系统
REM 支持: CMD 和 PowerShell 环境

title SkillUp Platform - 快速启动工具 v3.0

REM 检测执行环境
if defined PSModulePath (
    echo [INFO] 检测到 PowerShell 环境
    set "IS_POWERSHELL=1"
) else (
    echo [INFO] 检测到 CMD 环境
    set "IS_POWERSHELL=0"
)

REM 设置颜色变量（兼容CMD和PowerShell）
REM 在PowerShell中禁用颜色以避免显示问题
if "%IS_POWERSHELL%"=="1" (
    set "GREEN="
    set "RED="
    set "YELLOW="
    set "BLUE="
    set "RESET="
    set "BOLD="
    set "CYAN="
    set "MAGENTA="
) else (
    REM CMD环境下启用颜色
    set "GREEN=[32m"
    set "RED=[31m"
    set "YELLOW=[33m"
    set "BLUE=[34m"
    set "MAGENTA=[35m"
    set "CYAN=[36m"
    set "RESET=[0m"
    set "BOLD=[1m"
)

echo.
echo %CYAN%╔══════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    🚀 SkillUp Platform - 快速启动工具                        ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    一键启动 + 自动打开浏览器                                  ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════╝%RESET%
echo.

REM 显示启动方式说明
echo %YELLOW%[提示]%RESET% 如果脚本无法正常运行，请尝试以下方式：
echo   1. 在 CMD 中运行: quick-start.bat
echo   2. 在 PowerShell 中运行: .\quick-start.bat
echo   3. 备用方式: npm run dev
echo   4. 手动方式: node start.js
echo.

REM 检查执行权限
if "%IS_POWERSHELL%"=="1" (
    echo [检查] PowerShell 执行策略检查...
    REM 简化PowerShell检查，避免嵌套调用问题
    echo [信息] 在PowerShell环境中运行
    echo [提示] 如遇到执行策略问题，请运行:
    echo         Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    echo.
)

REM 快速环境检查
echo %BLUE%⚡ 快速环境检查...%RESET%

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%❌ Node.js 未安装%RESET%
    echo %YELLOW%请运行 setup-environment.bat 进行环境重构%RESET%
    echo.
    echo %YELLOW%[备用方案]%RESET% 如果已安装 Node.js 但仍报错，请检查：
    echo   1. PATH 环境变量是否包含 Node.js 路径
    echo   2. 重启命令行工具
    echo   3. 使用完整路径运行 Node.js
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%✅ Node.js 版本: !NODE_VERSION!%RESET%
)

REM 检查项目文件
if not exist "package.json" (
    echo %RED%❌ 项目文件不完整%RESET%
    echo %YELLOW%请确保在项目根目录运行%RESET%
    echo 当前目录: %CD%
    echo.
    echo %YELLOW%[解决方案]%RESET%
    echo   1. 使用 cd 命令切换到项目根目录
    echo   2. 确认项目已正确下载/克隆
    echo   3. 检查文件权限
    pause
    exit /b 1
) else (
    echo %GREEN%✅ 项目文件检查通过%RESET%
)

REM 检查环境变量文件
if not exist ".env.local" (
    if exist ".env.example" (
        echo %YELLOW%[提示]%RESET% 未找到 .env.local 文件，正在从 .env.example 创建...
        copy ".env.example" ".env.local" >nul 2>&1
        echo %GREEN%✅ 已创建 .env.local 文件%RESET%
    ) else (
        echo %YELLOW%[警告]%RESET% 未找到环境变量配置文件
        echo 某些功能可能无法正常工作
    )
) else (
    echo %GREEN%✅ 环境变量配置文件存在%RESET%
)

REM 检查依赖
if not exist "node_modules" (
    echo %YELLOW%⚡ 正在快速安装依赖...%RESET%
    echo 这可能需要几分钟时间，请耐心等待...
    npm install --silent
    if %errorlevel% neq 0 (
        echo %RED%❌ 依赖安装失败%RESET%
        echo.
        echo %YELLOW%[故障排除]%RESET%
        echo   1. 检查网络连接
        echo   2. 尝试使用淘宝镜像: npm config set registry https://registry.npmmirror.com
        echo   3. 清理缓存: npm cache clean --force
        echo   4. 删除 node_modules 和 package-lock.json 后重试
        pause
        exit /b 1
    )
    echo %GREEN%✅ 依赖安装完成%RESET%
) else (
    echo %GREEN%✅ 项目依赖已存在%RESET%
    REM 检查依赖是否需要更新
    npm outdated >nul 2>&1
    if not errorlevel 1 (
        echo %YELLOW%[提示]%RESET% 发现可更新的依赖包，建议运行 npm update
    )
)

if "%IS_POWERSHELL%"=="1" (
    echo ✅ 环境检查通过
) else (
    echo %GREEN%✅ 环境检查通过%RESET%
)
echo.

REM 创建必要目录
if not exist "data" (
    mkdir data >nul 2>nul
    if "%IS_POWERSHELL%"=="1" (
        echo [创建] data 目录
    ) else (
        echo %GREEN%[创建]%RESET% data 目录
    )
)
if not exist "logs" (
    mkdir logs >nul 2>nul
    if "%IS_POWERSHELL%"=="1" (
        echo [创建] logs 目录
    ) else (
        echo %GREEN%[创建]%RESET% logs 目录
    )
)
if not exist "uploads" (
    mkdir uploads >nul 2>nul
    if "%IS_POWERSHELL%"=="1" (
        echo [创建] uploads 目录
    ) else (
        echo %GREEN%[创建]%RESET% uploads 目录
    )
)
if not exist ".next" (
    if "%IS_POWERSHELL%"=="1" (
        echo [提示] .next 目录将在首次构建时创建
    ) else (
        echo %YELLOW%[提示]%RESET% .next 目录将在首次构建时创建
    )
)

if "%IS_POWERSHELL%"=="1" (
    echo ✅ 目录结构检查完成
) else (
    echo %GREEN%✅ 目录结构检查完成%RESET%
)

REM 检查端口并清理
if "%IS_POWERSHELL%"=="1" (
    echo 🔍 检查端口状态...
) else (
    echo %BLUE%🔍 检查端口状态...%RESET%
)
set PORT=3000
set "ALTERNATIVE_PORT=3001"

netstat -an | find ":3000" | find "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    if "%IS_POWERSHELL%"=="1" (
        echo ⚡ 发现端口占用...
    ) else (
        echo %YELLOW%⚡ 发现端口占用...%RESET%
    )
    
    REM 尝试找到占用进程
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do (
        set PID=%%a
        echo 占用进程 PID: !PID!
        
        REM 检查是否是 Node.js 进程
        for /f "tokens=*" %%b in ('tasklist /FI "PID eq !PID!" /FO CSV /NH 2^>nul') do (
            echo 进程信息: %%b
        )
        
        echo %YELLOW%⚡ 自动清理端口占用...%RESET%
        taskkill /PID !PID! /F >nul 2>nul
        if not errorlevel 1 (
            echo %GREEN%✅ 已清理端口占用%RESET%
            timeout /t 1 /nobreak >nul
        ) else (
            echo %YELLOW%[警告]%RESET% 无法清理端口，将尝试使用备选端口 !ALTERNATIVE_PORT!
            set PORT=!ALTERNATIVE_PORT!
        )
    )
) else (
    echo %GREEN%✅ 端口 3000 可用%RESET%
)

REM 检查构建状态
echo %BLUE%🔧 检查项目构建状态...%RESET%
if not exist ".next\BUILD_ID" (
    echo %YELLOW%[提示]%RESET% 首次运行需要构建项目，这可能需要几分钟...
    echo 正在执行构建...
    npm run build >nul 2>&1
    if errorlevel 1 (
        echo %YELLOW%[警告]%RESET% 生产构建失败，将使用开发模式启动
        set "DEV_MODE=1"
    ) else (
        echo %GREEN%✅ 项目构建完成%RESET%
        set "DEV_MODE=0"
    )
) else (
    echo %GREEN%✅ 项目已构建%RESET%
    set "DEV_MODE=0"
)

REM 启动应用
echo %GREEN%🚀 启动应用...%RESET%
echo %BLUE%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%RESET%
echo 使用端口: %PORT%
echo.

REM 设置端口环境变量
set PORT=%PORT%

REM 在后台启动应用
if "%DEV_MODE%"=="1" (
    echo %YELLOW%[开发模式]%RESET% 启动开发服务器...
    start /min cmd /c "npm run dev"
) else (
    start /min cmd /c "node start.js"
)

REM 等待服务器启动
echo %BLUE%⏳ 等待服务器启动...%RESET%
set /a "count=0"
:wait_loop
set /a "count+=1"
if %count% gtr 30 (
    echo %RED%❌ 服务器启动超时%RESET%
    echo.
    echo %YELLOW%[故障排除]%RESET%
    echo   1. 检查是否有错误信息输出
    echo   2. 尝试手动运行: npm run dev
    echo   3. 检查端口是否真的可用
    echo   4. 查看 logs 目录下的日志文件
    goto :error_exit
)

REM 检查服务器是否启动（优先使用设定的端口）
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:%PORT%' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    goto :server_ready
)

REM 如果设定端口失败，尝试默认端口
if not "%PORT%"=="3000" (
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>nul
    if %errorlevel% equ 0 (
        set PORT=3000
        goto :server_ready
    )
)

echo 等待中... (%count%/30) - 检查端口 %PORT%
timeout /t 1 /nobreak >nul
goto :wait_loop

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
start "" "http://localhost:%PORT%"
echo 访问地址: http://localhost:%PORT%

REM 显示控制选项和系统信息
echo.
echo %CYAN%╔══════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    🎉 SkillUp Platform 启动成功！                            ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    📱 本地访问地址: http://localhost:%PORT%                     ║%RESET%
echo %CYAN%║    🌐 网络访问地址: http://[您的IP]:%PORT%                      ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%║    💡 提示: 浏览器已自动打开应用页面                          ║%RESET%
echo %CYAN%║                                                              ║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════╝%RESET%
echo.
echo %BLUE%系统信息:%RESET%
echo   Node.js: %NODE_VERSION%
echo   端口: %PORT%
echo   环境: %IS_POWERSHELL% (0=CMD, 1=PowerShell)
echo   项目目录: %CD%
echo.
echo %YELLOW%📋 控制选项:%RESET%
echo %YELLOW%   按 Ctrl+C 停止服务器%RESET%
echo %YELLOW%   关闭此窗口也会停止服务器%RESET%
echo %YELLOW%   访问 http://localhost:%PORT% 使用应用%RESET%
echo %YELLOW%   [R] 重启服务器 [D] 开发模式 [H] 帮助%RESET%
echo.

:control_loop
echo %GREEN%🎯 服务器正在运行中...%RESET%
echo %BLUE%请选择操作或直接关闭窗口停止服务器%RESET%
set /p "USER_CHOICE=请选择操作 (R/L/S/D/B/H/Q): "

if /i "!USER_CHOICE!"=="R" (
    echo %YELLOW%[重启]%RESET% 正在重启服务器...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 >nul
    start /min cmd /c "node start.js"
    echo %GREEN%[成功]%RESET% 服务器已重启
    goto :control_loop
) else if /i "!USER_CHOICE!"=="L" (
    goto :show_logs
) else if /i "!USER_CHOICE!"=="S" (
    goto :stop_server
) else if /i "!USER_CHOICE!"=="D" (
    echo %YELLOW%[开发模式]%RESET% 切换到开发模式...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 >nul
    echo 正在启动开发服务器 (npm run dev)...
    start /min cmd /c "npm run dev"
    echo %GREEN%[成功]%RESET% 已切换到开发模式
    goto :control_loop
) else if /i "!USER_CHOICE!"=="B" (
    echo %YELLOW%[构建]%RESET% 正在构建项目...
    npm run build
    if not errorlevel 1 (
        echo %GREEN%[成功]%RESET% 项目构建完成
    ) else (
        echo %RED%[错误]%RESET% 项目构建失败
    )
    goto :control_loop
) else if /i "!USER_CHOICE!"=="H" (
    goto :show_help
) else if /i "!USER_CHOICE!"=="Q" (
    goto :stop_server
) else (
    echo %RED%[错误]%RESET% 无效选择，请重新输入
    goto :control_loop
)

:show_logs
echo.
echo %BLUE%📊 实时日志 (按 Ctrl+C 返回主菜单):%RESET%
echo %BLUE%━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%RESET%

REM 尝试显示日志文件
if exist "logs\app.log" (
    type "logs\app.log" 2>nul | tail -50 2>nul
    echo.
    echo %YELLOW%[提示]%RESET% 以上是最近50行日志
) else (
    echo %YELLOW%暂无日志文件，服务器可能仍在启动中...%RESET%
)

echo 按任意键返回主菜单...
pause >nul
goto :control_loop

:show_help
echo.
echo %BLUE%========================================%RESET%
echo %BOLD%           帮助信息%RESET%
echo %BLUE%========================================%RESET%
echo.
echo %YELLOW%常用命令:%RESET%
echo   npm run dev     - 开发模式启动
echo   npm run build   - 构建生产版本
echo   npm run start   - 生产模式启动
echo   npm run lint    - 代码检查
echo   npm run test    - 运行测试
echo.
echo %YELLOW%故障排除:%RESET%
echo   1. 端口占用: netstat -ano ^| findstr :3000
echo   2. 清理缓存: npm cache clean --force
echo   3. 重装依赖: rmdir /s node_modules ^&^& npm install
echo   4. 检查日志: 查看 logs 目录
echo.
echo %YELLOW%环境要求:%RESET%
echo   Node.js: >= 18.0.0
echo   npm: >= 8.0.0
echo   操作系统: Windows 10/11
echo.
echo 按任意键返回主菜单...
pause >nul
goto :control_loop

:stop_server
echo.
echo %YELLOW%🛑 正在停止服务器...%RESET%
taskkill /F /IM node.exe >nul 2>&1
echo %GREEN%✅ 服务器已停止%RESET%
echo %BLUE%感谢使用 SkillUp Platform！%RESET%
echo.
pause
goto :end

:end
exit /b 0

:error_exit
echo.
echo %RED%❌ 启动失败，请检查以下问题：%RESET%
echo   1. Node.js 是否正确安装 (版本 >= 18.0.0)
echo   2. 项目依赖是否完整 (运行 npm install)
echo   3. 端口 %PORT% 是否被占用
echo   4. 防火墙设置是否阻止了应用
echo   5. 项目文件权限是否正确
echo   6. 环境变量配置是否正确
echo.
echo %YELLOW%[自动诊断]%RESET%
echo 正在运行诊断检查...
node --version >nul 2>&1 && echo Node.js: 正常 || echo Node.js: 异常
npm --version >nul 2>&1 && echo npm: 正常 || echo npm: 异常
if exist "package.json" (echo package.json: 存在) else (echo package.json: 缺失)
if exist "node_modules" (echo node_modules: 存在) else (echo node_modules: 缺失)
echo.
echo %YELLOW%[备用启动方案]%RESET%
echo 1. 开发模式: npm run dev
echo 2. 手动启动: node start.js
echo 3. 检查构建: npm run build
echo 4. 重装依赖: npm install
echo 5. 环境重构: setup-environment.bat
echo.
echo 按任意键退出...
pause >nul
exit /b 1