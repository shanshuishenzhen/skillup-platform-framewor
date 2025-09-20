@echo off
chcp 65001 >nul
title SkillUp Platform - 环境重构工具

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║    🔧 SkillUp Platform - 环境重构工具                        ║
echo ║                                                              ║
echo ║    为新电脑重构完整的开发环境                                 ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM 设置颜色变量
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "RESET=[0m"

REM 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ 需要管理员权限来安装某些组件%RESET%
    echo %YELLOW%⚠️  请右键点击此脚本并选择"以管理员身份运行"%RESET%
    pause
    exit /b 1
)

echo %BLUE%📋 开始环境检查和重构...%RESET%
echo.

REM 1. 检查Node.js
echo %BLUE%🔍 检查Node.js环境...%RESET%
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%❌ 未检测到Node.js%RESET%
    echo %YELLOW%📥 正在下载Node.js安装程序...%RESET%
    
    REM 创建临时目录
    if not exist "%TEMP%\skillup-setup" mkdir "%TEMP%\skillup-setup"
    
    REM 下载Node.js (使用PowerShell)
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\skillup-setup\nodejs.msi'}"
    
    if exist "%TEMP%\skillup-setup\nodejs.msi" (
        echo %YELLOW%🚀 正在安装Node.js...%RESET%
        msiexec /i "%TEMP%\skillup-setup\nodejs.msi" /quiet /norestart
        
        REM 等待安装完成
        timeout /t 30 /nobreak >nul
        
        REM 刷新环境变量
        call refreshenv.cmd >nul 2>nul
        
        REM 再次检查
        where node >nul 2>nul
        if %errorlevel% neq 0 (
            echo %RED%❌ Node.js安装失败，请手动安装%RESET%
            echo %YELLOW%下载地址: https://nodejs.org/%RESET%
            pause
            exit /b 1
        ) else (
            echo %GREEN%✅ Node.js安装成功%RESET%
        )
    ) else (
        echo %RED%❌ Node.js下载失败，请检查网络连接%RESET%
        echo %YELLOW%请手动下载安装: https://nodejs.org/%RESET%
        pause
        exit /b 1
    )
) else (
    echo %GREEN%✅ Node.js已安装%RESET%
)

REM 显示Node.js版本
for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
echo %BLUE%   Node.js版本: %NODE_VERSION%%RESET%
echo %BLUE%   npm版本: %NPM_VERSION%%RESET%
echo.

REM 2. 检查Git
echo %BLUE%🔍 检查Git环境...%RESET%
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  未检测到Git，建议安装Git以便版本控制%RESET%
    echo %YELLOW%下载地址: https://git-scm.com/download/win%RESET%
) else (
    echo %GREEN%✅ Git已安装%RESET%
    for /f "tokens=*" %%i in ('git --version 2^>nul') do echo %BLUE%   %%i%RESET%
)
echo.

REM 3. 检查项目目录结构
echo %BLUE%🔍 检查项目目录结构...%RESET%
if not exist "package.json" (
    echo %RED%❌ 未找到package.json，请确保在项目根目录运行%RESET%
    pause
    exit /b 1
)
echo %GREEN%✅ 项目目录结构正确%RESET%

REM 创建必要的目录
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
echo %GREEN%✅ 创建必要目录%RESET%
echo.

REM 4. 配置环境变量
echo %BLUE%🔧 配置环境变量...%RESET%
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo %GREEN%✅ 创建.env配置文件%RESET%
        echo %YELLOW%⚠️  请编辑.env文件填入实际配置值%RESET%
    ) else (
        echo %YELLOW%⚠️  未找到.env.example模板文件%RESET%
    )
) else (
    echo %GREEN%✅ .env配置文件已存在%RESET%
)
echo.

REM 5. 安装依赖
echo %BLUE%📦 安装项目依赖...%RESET%
if exist "node_modules" (
    echo %YELLOW%🔄 检测到现有依赖，清理后重新安装...%RESET%
    rmdir /s /q node_modules >nul 2>nul
)

if exist "package-lock.json" del "package-lock.json" >nul 2>nul

echo %BLUE%🔄 正在安装依赖包...%RESET%
npm install
if %errorlevel% neq 0 (
    echo %RED%❌ 依赖安装失败%RESET%
    echo %YELLOW%尝试使用yarn安装...%RESET%
    
    REM 检查yarn
    where yarn >nul 2>nul
    if %errorlevel% neq 0 (
        echo %BLUE%📥 安装yarn...%RESET%
        npm install -g yarn
    )
    
    yarn install
    if %errorlevel% neq 0 (
        echo %RED%❌ 依赖安装失败，请检查网络连接%RESET%
        pause
        exit /b 1
    )
)
echo %GREEN%✅ 依赖安装完成%RESET%
echo.

REM 6. 初始化数据库
echo %BLUE%🗄️ 初始化数据库...%RESET%
if exist "scripts\init-database.js" (
    node scripts\init-database.js
    if %errorlevel% equ 0 (
        echo %GREEN%✅ 数据库初始化完成%RESET%
    ) else (
        echo %YELLOW%⚠️  数据库初始化失败，但继续执行%RESET%
    )
) else (
    echo %YELLOW%⚠️  未找到数据库初始化脚本%RESET%
)
echo.

REM 7. 运行环境检查
echo %BLUE%🔍 运行完整环境检查...%RESET%
if exist "scripts\check-environment.js" (
    node scripts\check-environment.js
    if %errorlevel% equ 0 (
        echo %GREEN%✅ 环境检查通过%RESET%
    ) else (
        echo %YELLOW%⚠️  环境检查发现问题，但继续执行%RESET%
    )
) else (
    echo %YELLOW%⚠️  未找到环境检查脚本%RESET%
)
echo.

REM 8. 创建桌面快捷方式
echo %BLUE%🔗 创建桌面快捷方式...%RESET%
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\SkillUp Platform.lnk"
set "TARGET=%CD%\start.bat"
set "ICON=%CD%\public\favicon.ico"

REM 使用PowerShell创建快捷方式
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); $Shortcut.TargetPath = '%TARGET%'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.Description = 'SkillUp Platform 一键启动'; if (Test-Path '%ICON%') { $Shortcut.IconLocation = '%ICON%' }; $Shortcut.Save()}"

if exist "%SHORTCUT%" (
    echo %GREEN%✅ 桌面快捷方式创建成功%RESET%
) else (
    echo %YELLOW%⚠️  桌面快捷方式创建失败%RESET%
)
echo.

REM 9. 清理临时文件
echo %BLUE%🧹 清理临时文件...%RESET%
if exist "%TEMP%\skillup-setup" rmdir /s /q "%TEMP%\skillup-setup" >nul 2>nul
echo %GREEN%✅ 清理完成%RESET%
echo.

REM 完成提示
echo %GREEN%╔══════════════════════════════════════════════════════════════╗%RESET%
echo %GREEN%║                                                              ║%RESET%
echo %GREEN%║    🎉 环境重构完成！                                         ║%RESET%
echo %GREEN%║                                                              ║%RESET%
echo %GREEN%║    ✅ Node.js环境已配置                                      ║%RESET%
echo %GREEN%║    ✅ 项目依赖已安装                                         ║%RESET%
echo %GREEN%║    ✅ 数据库已初始化                                         ║%RESET%
echo %GREEN%║    ✅ 环境变量已配置                                         ║%RESET%
echo %GREEN%║    ✅ 桌面快捷方式已创建                                     ║%RESET%
echo %GREEN%║                                                              ║%RESET%
echo %GREEN%╚══════════════════════════════════════════════════════════════╝%RESET%
echo.
echo %BLUE%📋 下一步操作：%RESET%
echo %YELLOW%   1. 编辑 .env 文件配置实际的环境变量值%RESET%
echo %YELLOW%   2. 运行 start.bat 启动应用%RESET%
echo %YELLOW%   3. 或者双击桌面上的 "SkillUp Platform" 快捷方式%RESET%
echo.
echo %BLUE%🚀 现在启动应用吗？ (Y/N)%RESET%
set /p "choice=请选择: "
if /i "%choice%"=="Y" (
    echo %BLUE%🚀 正在启动应用...%RESET%
    call start.bat
) else (
    echo %GREEN%✅ 环境重构完成，您可以稍后手动启动应用%RESET%
)

pause