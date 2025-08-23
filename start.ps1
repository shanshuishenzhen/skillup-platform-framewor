# SkillUp Platform - PowerShell 启动脚本
# 适用于 PowerShell 环境的一键启动工具

# 设置控制台编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "SkillUp Platform - 一键启动工具"

# 定义颜色函数
function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

function Write-Success {
    param([string]$Text)
    Write-ColorText "✅ $Text" "Green"
}

function Write-Error {
    param([string]$Text)
    Write-ColorText "❌ $Text" "Red"
}

function Write-Warning {
    param([string]$Text)
    Write-ColorText "⚠️  $Text" "Yellow"
}

function Write-Info {
    param([string]$Text)
    Write-ColorText "🔍 $Text" "Cyan"
}

function Write-Header {
    Write-Host ""
    Write-ColorText "╔══════════════════════════════════════════════════════════════╗" "Blue"
    Write-ColorText "║                                                              ║" "Blue"
    Write-ColorText "║    🚀 SkillUp Platform - 一键启动工具                        ║" "Blue"
    Write-ColorText "║                                                              ║" "Blue"
    Write-ColorText "║    正在检查环境并启动应用...                                  ║" "Blue"
    Write-ColorText "║                                                              ║" "Blue"
    Write-ColorText "╚══════════════════════════════════════════════════════════════╝" "Blue"
    Write-Host ""
}

# 显示启动横幅
Write-Header

# 检查 Node.js 是否安装
Write-Info "检查 Node.js 环境..."
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Success "Node.js 环境检查通过"
    Write-ColorText "   Node.js 版本: $nodeVersion" "Blue"
} catch {
    Write-Error "未找到 Node.js"
    Write-Warning "请先运行 setup-environment.bat 进行环境重构"
    Write-Warning "或手动安装 Node.js: https://nodejs.org/"
    Read-Host "按任意键退出"
    exit 1
}

# 检查 npm 是否可用
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "npm not found"
    }
    Write-ColorText "   npm 版本: $npmVersion" "Blue"
} catch {
    Write-Error "未找到 npm"
    Write-Warning "请重新安装 Node.js: https://nodejs.org/"
    Read-Host "按任意键退出"
    exit 1
}
Write-Host ""

# 检查 package.json 是否存在
Write-Info "检查项目配置..."
if (-not (Test-Path "package.json")) {
    Write-Error "未找到 package.json 文件"
    Write-Warning "请确保在项目根目录运行此脚本"
    Read-Host "按任意键退出"
    exit 1
}
Write-Success "项目配置检查通过"
Write-Host ""

# 检查依赖是否已安装
Write-Info "检查项目依赖..."
if (-not (Test-Path "node_modules")) {
    Write-Warning "未找到 node_modules 目录，正在安装依赖..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "依赖安装失败"
        Write-Warning "请运行 setup-environment.bat 进行完整环境重构"
        Read-Host "按任意键退出"
        exit 1
    }
    Write-Success "依赖安装完成"
} else {
    Write-Success "项目依赖检查通过"
}
Write-Host ""

# 检查环境变量配置
Write-Info "检查环境配置..."
if (-not (Test-Path ".env")) {
    Write-Warning "未找到 .env 配置文件"
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success "已创建 .env 配置文件"
        Write-Warning "请编辑 .env 文件配置实际值"
    } else {
        Write-Warning "请手动创建 .env 配置文件"
    }
} else {
    Write-Success "环境配置检查通过"
}
Write-Host ""

# 创建必要目录
Write-Info "检查目录结构..."
@("data", "logs", "uploads") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}
Write-Success "目录结构检查通过"
Write-Host ""

# 检查端口占用
Write-Info "检查端口占用..."
$portInUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Warning "端口 3000 已被占用"
    Write-Warning "正在尝试终止占用进程..."
    $portInUse | ForEach-Object {
        try {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        } catch {
            # 忽略错误
        }
    }
    Start-Sleep -Seconds 2
}
Write-Success "端口检查通过"
Write-Host ""

# 启动应用
Write-ColorText "🚀 启动 SkillUp Platform..." "Green"
Write-ColorText "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"

# 启动 Node.js 应用
node start.js

# 如果启动失败，暂停以查看错误信息
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Error "应用启动失败"
    Write-Warning "建议运行 setup-environment.bat 进行环境重构"
    Read-Host "按任意键退出"
}

exit $LASTEXITCODE