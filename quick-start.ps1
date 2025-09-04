# SkillUp Platform PowerShell 启动脚本
# 版本: 3.2 - PowerShell 专用版
# 描述: 一键启动 SkillUp Platform 在线考试系统

# 设置控制台标题
$Host.UI.RawUI.WindowTitle = "SkillUp Platform - PowerShell 启动工具 v3.2"

# 清屏并显示欢迎信息
Clear-Host
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "    🚀 SkillUp Platform - PowerShell 启动工具" -ForegroundColor Green
Write-Host ""
Write-Host "    一键启动 + 自动打开浏览器" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 显示启动方式说明
Write-Host "[提示] 如果脚本无法正常运行，请尝试以下方式：" -ForegroundColor Yellow
Write-Host "  1. 在 PowerShell 中运行: .\quick-start.ps1"
Write-Host "  2. 在 CMD 中运行: quick-start-simple.bat"
Write-Host "  3. 备用方式: npm run dev"
Write-Host "  4. 手动方式: node start.js"
Write-Host ""

# 检查执行策略
Write-Host "[检查] PowerShell 执行策略检查..." -ForegroundColor Yellow
$executionPolicy = Get-ExecutionPolicy
if ($executionPolicy -eq "Restricted") {
    Write-Host "[警告] PowerShell 执行策略受限" -ForegroundColor Red
    Write-Host "建议运行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[信息] 执行策略: $executionPolicy" -ForegroundColor Green
}

# 快速环境检查
Write-Host "⚡ 快速环境检查..." -ForegroundColor Blue

# 检查Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
    Write-Host "请先安装 Node.js 或检查 PATH 环境变量" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

# 检查项目文件
if (-not (Test-Path "package.json")) {
    Write-Host "❌ 项目文件不完整" -ForegroundColor Red
    Write-Host "请确保在项目根目录运行" -ForegroundColor Yellow
    Write-Host "当前目录: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
} else {
    Write-Host "✅ 项目文件检查通过" -ForegroundColor Green
}

# 检查环境变量文件
if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.example") {
        Write-Host "[提示] 正在创建 .env.local 文件..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env.local"
        Write-Host "✅ 已创建 .env.local 文件" -ForegroundColor Green
    } else {
        Write-Host "[警告] 未找到环境变量配置文件" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ 环境变量配置文件存在" -ForegroundColor Green
}

# 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "⚡ 正在安装依赖..." -ForegroundColor Yellow
    Write-Host "这可能需要几分钟时间，请耐心等待..." -ForegroundColor Yellow
    
    $installResult = Start-Process -FilePath "npm" -ArgumentList "install" -Wait -PassThru -NoNewWindow
    if ($installResult.ExitCode -ne 0) {
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        Write-Host "请检查网络连接或尝试使用淘宝镜像" -ForegroundColor Yellow
        Read-Host "按任意键退出"
        exit 1
    }
    Write-Host "✅ 依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "✅ 项目依赖已存在" -ForegroundColor Green
}

Write-Host "✅ 环境检查通过" -ForegroundColor Green
Write-Host ""

# 创建必要目录
@("data", "logs", "uploads") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "[创建] $_ 目录" -ForegroundColor Green
    }
}

Write-Host "✅ 目录结构检查完成" -ForegroundColor Green

# 检查端口
Write-Host "🔍 检查端口状态..." -ForegroundColor Blue
$port = 3000

$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚡ 发现端口占用，尝试清理..." -ForegroundColor Yellow
    $portInUse | ForEach-Object {
        $processId = $_.OwningProcess
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "已清理进程 PID: $processId" -ForegroundColor Green
        } catch {
            Write-Host "无法清理进程 PID: $processId" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "✅ 端口 3000 可用" -ForegroundColor Green
}

# 启动应用
Write-Host "🚀 启动应用..." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "使用端口: $port"
Write-Host ""

# 启动开发服务器
Write-Host "[开发模式] 启动开发服务器..." -ForegroundColor Yellow
$devServer = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm", "run", "dev" -PassThru -WindowStyle Minimized

# 等待服务器启动
Write-Host "⏳ 等待服务器启动..." -ForegroundColor Blue
$count = 0
$maxAttempts = 20

do {
    $count++
    Start-Sleep -Seconds 1
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            break
        }
    } catch {
        # 继续等待
    }
    
    Write-Host "等待中... ($count/$maxAttempts)" -ForegroundColor Yellow
    
    if ($count -ge $maxAttempts) {
        Write-Host "❌ 服务器启动超时" -ForegroundColor Red
        Write-Host "请尝试手动运行: npm run dev" -ForegroundColor Yellow
        Read-Host "按任意键退出"
        exit 1
    }
} while ($true)

Write-Host "✅ 服务器启动成功" -ForegroundColor Green
Write-Host ""

# 显示启动信息
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "    🎉 SkillUp Platform 启动成功！" -ForegroundColor Green
Write-Host ""
Write-Host "    📱 本地访问地址: http://localhost:3000" -ForegroundColor Yellow
Write-Host "    🌐 网络访问地址: http://[您的IP]:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "    💡 提示: 浏览器将自动打开应用页面" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 自动打开浏览器
Write-Host "🌐 正在打开浏览器..." -ForegroundColor Blue
Start-Process "http://localhost:3000"
Write-Host "访问地址: http://localhost:3000" -ForegroundColor Green

# 显示控制选项
Write-Host ""
Write-Host "📋 控制选项:" -ForegroundColor Cyan
Write-Host "  按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host "  关闭此窗口也会停止服务器" -ForegroundColor Yellow
Write-Host "  访问 http://localhost:3000 使用应用" -ForegroundColor Yellow
Write-Host ""
Write-Host "系统信息:" -ForegroundColor Cyan
Write-Host "  Node.js: $nodeVersion"
Write-Host "  端口: 3000"
Write-Host "  环境: PowerShell"
Write-Host "  项目目录: $(Get-Location)"
Write-Host ""
Write-Host "🎯 SkillUp Platform 已准备就绪！" -ForegroundColor Green
Write-Host ""

# 保持窗口打开
Read-Host "按任意键退出"

# 清理：停止开发服务器
if ($devServer -and -not $devServer.HasExited) {
    Write-Host "正在停止开发服务器..." -ForegroundColor Yellow
    Stop-Process -Id $devServer.Id -Force -ErrorAction SilentlyContinue
}