# SkillUp Platform 局域网快速部署脚本
# PowerShell 脚本，适用于 Windows 环境

param(
    [string]$ServerIP = "192.168.1.100",
    [string]$Mode = "docker",  # docker 或 manual
    [switch]$SkipFirewall = $false,
    [switch]$SkipDependencies = $false,
    [switch]$Help = $false
)

# 显示帮助信息
if ($Help) {
    Write-Host @"
===========================================
SkillUp Platform 局域网部署脚本
===========================================

用法:
    .\deploy.ps1 [参数]

参数:
    -ServerIP <IP地址>     服务器IP地址 (默认: 192.168.1.100)
    -Mode <模式>           部署模式: docker 或 manual (默认: docker)
    -SkipFirewall         跳过防火墙配置
    -SkipDependencies     跳过依赖检查
    -Help                 显示此帮助信息

示例:
    .\deploy.ps1 -ServerIP 192.168.1.200 -Mode docker
    .\deploy.ps1 -Mode manual -SkipFirewall

"@
    exit 0
}

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️  $Message" "Cyan"
}

# 检查管理员权限
function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查依赖软件
function Test-Dependencies {
    Write-Info "检查系统依赖..."
    
    $dependencies = @(
        @{Name="Node.js"; Command="node"; Version="--version"; MinVersion="18.0.0"},
        @{Name="npm"; Command="npm"; Version="--version"; MinVersion="8.0.0"},
        @{Name="Git"; Command="git"; Version="--version"; MinVersion="2.0.0"}
    )
    
    if ($Mode -eq "docker") {
        $dependencies += @{Name="Docker"; Command="docker"; Version="--version"; MinVersion="20.0.0"}
    }
    
    $allDepsOk = $true
    
    foreach ($dep in $dependencies) {
        try {
            $output = & $dep.Command $dep.Version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$($dep.Name) 已安装: $output"
            } else {
                Write-Error "$($dep.Name) 未安装或版本过低"
                $allDepsOk = $false
            }
        } catch {
            Write-Error "$($dep.Name) 未安装"
            $allDepsOk = $false
        }
    }
    
    return $allDepsOk
}

# 获取本机IP地址
function Get-LocalIP {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*"
        } | Select-Object -First 1 -ExpandProperty IPAddress
        return $ip
    } catch {
        return "192.168.1.100"
    }
}

# 配置防火墙
function Set-FirewallRules {
    if ($SkipFirewall) {
        Write-Warning "跳过防火墙配置"
        return
    }
    
    Write-Info "配置防火墙规则..."
    
    $rules = @(
        @{Name="SkillUp-HTTP"; Port=3000; Protocol="TCP"},
        @{Name="SkillUp-HTTPS"; Port=443; Protocol="TCP"},
        @{Name="SkillUp-Supabase"; Port=54321; Protocol="TCP"},
        @{Name="SkillUp-Redis"; Port=6379; Protocol="TCP"},
        @{Name="SkillUp-Nginx"; Port=80; Protocol="TCP"}
    )
    
    foreach ($rule in $rules) {
        try {
            # 删除已存在的规则
            Remove-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
            
            # 添加新规则
            New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol $rule.Protocol -LocalPort $rule.Port -Action Allow | Out-Null
            Write-Success "防火墙规则已添加: $($rule.Name) (端口 $($rule.Port))"
        } catch {
            Write-Error "添加防火墙规则失败: $($rule.Name)"
        }
    }
}

# 创建环境配置文件
function New-EnvironmentConfig {
    Write-Info "创建环境配置文件..."
    
    $envContent = @"
# SkillUp Platform 局域网部署配置
# 自动生成于 $(Get-Date)

NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://${ServerIP}:3000

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=http://${ServerIP}:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.6nTh4fcSpjsuKt4RrKSiYhFRJHPiXOBLqiehiDMdJO0

# Redis 配置
REDIS_URL=redis://${ServerIP}:6379
REDIS_PASSWORD=skillup123

# 安全配置
ENCRYPTION_KEY=$(([char[]]([char]33..[char]126) | Get-Random -Count 32) -join '')
API_SECRET_KEY=$(([char[]]([char]33..[char]126) | Get-Random -Count 32) -join '')
SESSION_SECRET=$(([char[]]([char]33..[char]126) | Get-Random -Count 32) -join '')

# CORS 配置
ALLOWED_ORIGINS=http://${ServerIP}:3000,http://192.168.1.*,http://localhost:3000

# 文件上传配置
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads

# 数据库配置
POSTGRES_PASSWORD=skillup123
JWT_SECRET=$(([char[]]([char]33..[char]126) | Get-Random -Count 32) -join '')

# Docker 配置
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=admin123

# 服务器配置
SERVER_IP=${ServerIP}
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "环境配置文件已创建: .env"
}

# Docker 部署
function Start-DockerDeployment {
    Write-Info "开始 Docker 部署..."
    
    try {
        # 停止现有容器
        Write-Info "停止现有容器..."
        docker-compose -f deploy/lan/docker-compose.yml down 2>$null
        
        # 构建并启动容器
        Write-Info "构建并启动容器..."
        docker-compose -f deploy/lan/docker-compose.yml up -d --build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker 容器启动成功"
            
            # 等待服务启动
            Write-Info "等待服务启动..."
            Start-Sleep -Seconds 30
            
            # 检查服务状态
            Test-ServiceHealth
        } else {
            Write-Error "Docker 容器启动失败"
            return $false
        }
    } catch {
        Write-Error "Docker 部署失败: $($_.Exception.Message)"
        return $false
    }
    
    return $true
}

# 手动部署
function Start-ManualDeployment {
    Write-Info "开始手动部署..."
    
    try {
        # 安装依赖
        Write-Info "安装 Node.js 依赖..."
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "依赖安装失败"
            return $false
        }
        
        # 构建应用
        Write-Info "构建应用..."
        npm run build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "应用构建失败"
            return $false
        }
        
        # 启动应用
        Write-Info "启动应用..."
        Start-Process -FilePath "npm" -ArgumentList "run", "start" -NoNewWindow
        
        # 等待服务启动
        Start-Sleep -Seconds 10
        
        # 检查服务状态
        Test-ServiceHealth
        
        Write-Success "手动部署完成"
    } catch {
        Write-Error "手动部署失败: $($_.Exception.Message)"
        return $false
    }
    
    return $true
}

# 检查服务健康状态
function Test-ServiceHealth {
    Write-Info "检查服务健康状态..."
    
    $maxRetries = 10
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://${ServerIP}:3000/api/health" -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "服务健康检查通过"
                return $true
            }
        } catch {
            $retryCount++
            Write-Warning "健康检查失败，重试 $retryCount/$maxRetries"
            Start-Sleep -Seconds 5
        }
    }
    
    Write-Error "服务健康检查失败"
    return $false
}

# 显示部署信息
function Show-DeploymentInfo {
    Write-ColorOutput "`n===========================================" "Green"
    Write-ColorOutput "🎉 SkillUp Platform 部署完成!" "Green"
    Write-ColorOutput "===========================================" "Green"
    
    Write-ColorOutput "`n📍 访问地址:" "Cyan"
    Write-ColorOutput "   主页: http://${ServerIP}:3000" "White"
    Write-ColorOutput "   管理后台: http://${ServerIP}:3000/admin" "White"
    Write-ColorOutput "   API文档: http://${ServerIP}:3000/api/docs" "White"
    
    if ($Mode -eq "docker") {
        Write-ColorOutput "`n🐳 Docker 服务:" "Cyan"
        Write-ColorOutput "   Supabase: http://${ServerIP}:54321" "White"
        Write-ColorOutput "   Redis: ${ServerIP}:6379" "White"
        Write-ColorOutput "   Nginx: http://${ServerIP}:80" "White"
    }
    
    Write-ColorOutput "`n🔧 管理命令:" "Cyan"
    if ($Mode -eq "docker") {
        Write-ColorOutput "   查看日志: docker-compose -f deploy/lan/docker-compose.yml logs" "White"
        Write-ColorOutput "   停止服务: docker-compose -f deploy/lan/docker-compose.yml down" "White"
        Write-ColorOutput "   重启服务: docker-compose -f deploy/lan/docker-compose.yml restart" "White"
    } else {
        Write-ColorOutput "   停止服务: Ctrl+C (在运行窗口中)" "White"
        Write-ColorOutput "   重启服务: npm run start" "White"
    }
    
    Write-ColorOutput "`n📱 客户端访问:" "Cyan"
    Write-ColorOutput "   确保客户端与服务器在同一局域网" "White"
    Write-ColorOutput "   在浏览器中访问: http://${ServerIP}:3000" "White"
    
    Write-ColorOutput "`n📚 更多信息:" "Cyan"
    Write-ColorOutput "   部署文档: deploy/lan/README.md" "White"
    Write-ColorOutput "   故障排除: deploy/lan/README.md#故障排除" "White"
    
    Write-ColorOutput "`n===========================================" "Green"
}

# 主函数
function Main {
    Write-ColorOutput "`n===========================================" "Cyan"
    Write-ColorOutput "🚀 SkillUp Platform 局域网部署脚本" "Cyan"
    Write-ColorOutput "===========================================" "Cyan"
    
    # 检查管理员权限
    if (-not (Test-AdminRights)) {
        Write-Error "请以管理员身份运行此脚本"
        exit 1
    }
    
    # 自动检测IP地址
    if ($ServerIP -eq "192.168.1.100") {
        $detectedIP = Get-LocalIP
        if ($detectedIP) {
            $ServerIP = $detectedIP
            Write-Info "自动检测到服务器IP: $ServerIP"
        }
    }
    
    Write-Info "服务器IP: $ServerIP"
    Write-Info "部署模式: $Mode"
    
    # 检查依赖
    if (-not $SkipDependencies) {
        if (-not (Test-Dependencies)) {
            Write-Error "依赖检查失败，请安装缺失的软件"
            exit 1
        }
    }
    
    # 配置防火墙
    Set-FirewallRules
    
    # 创建环境配置
    New-EnvironmentConfig
    
    # 执行部署
    $deploymentSuccess = $false
    
    if ($Mode -eq "docker") {
        $deploymentSuccess = Start-DockerDeployment
    } elseif ($Mode -eq "manual") {
        $deploymentSuccess = Start-ManualDeployment
    } else {
        Write-Error "无效的部署模式: $Mode"
        exit 1
    }
    
    # 显示结果
    if ($deploymentSuccess) {
        Show-DeploymentInfo
    } else {
        Write-Error "部署失败，请检查错误信息"
        exit 1
    }
}

# 错误处理
trap {
    Write-Error "脚本执行出错: $($_.Exception.Message)"
    Write-Error "错误位置: $($_.InvocationInfo.ScriptLineNumber) 行"
    exit 1
}

# 执行主函数
Main