#!/bin/bash

# OA办公系统一键启动脚本 (Linux/macOS)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 打印标题
print_header() {
    echo
    print_message $PURPLE "========================================"
    print_message $PURPLE "🏢 OA办公系统一键启动"
    print_message $PURPLE "========================================"
    echo
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查Python环境
check_python() {
    print_message $BLUE "检查Python环境..."
    
    if command_exists python3; then
        PYTHON_CMD="python3"
    elif command_exists python; then
        PYTHON_CMD="python"
    else
        print_message $RED "❌ Python未安装或未添加到PATH"
        print_message $YELLOW "请访问 https://www.python.org 下载安装Python 3.7+"
        exit 1
    fi
    
    # 检查Python版本
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
    print_message $GREEN "✅ Python版本: $PYTHON_VERSION"
}

# 检查启动脚本
check_script() {
    if [ ! -f "start_oa_system.py" ]; then
        print_message $RED "❌ 启动脚本不存在: start_oa_system.py"
        print_message $YELLOW "请确保在正确的目录中运行此脚本"
        exit 1
    fi
}

# 设置权限
set_permissions() {
    # 确保脚本有执行权限
    chmod +x "$0" 2>/dev/null
    
    # 确保Python脚本可读
    chmod +r start_oa_system.py 2>/dev/null
}

# 主函数
main() {
    print_header
    
    # 检查环境
    check_python
    check_script
    set_permissions
    
    echo
    print_message $CYAN "🚀 启动OA系统..."
    echo
    
    # 运行Python启动脚本
    $PYTHON_CMD start_oa_system.py
    
    # 检查退出状态
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        echo
        print_message $RED "❌ 启动失败，退出码: $EXIT_CODE"
        print_message $YELLOW "请查看上方错误信息"
        echo
        read -p "按Enter键退出..." dummy
    fi
    
    exit $EXIT_CODE
}

# 信号处理
cleanup() {
    echo
    print_message $YELLOW "收到退出信号，正在清理..."
    # 这里可以添加清理逻辑
    exit 0
}

# 注册信号处理器
trap cleanup SIGINT SIGTERM

# 运行主函数
main "$@"
