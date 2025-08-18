#!/bin/bash

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示横幅
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    🚀 SkillUp Platform - 一键启动                            ║"
echo "║                                                              ║"
echo "║    智能在线学习平台快速启动工具                               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未检测到Node.js，请先安装Node.js${NC}"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 未检测到npm，请检查Node.js安装${NC}"
    exit 1
fi

# 显示版本信息
echo -e "${BLUE}📋 环境信息:${NC}"
echo -e "${GREEN}Node.js版本: $(node --version)${NC}"
echo -e "${GREEN}npm版本: $(npm --version)${NC}"
echo

# 检查package.json是否存在
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 未找到package.json文件，请确保在项目根目录运行${NC}"
    exit 1
fi

# 设置执行权限
chmod +x start.js

# 运行启动脚本
echo -e "${BLUE}🚀 启动应用...${NC}"
echo
node start.js

# 检查启动结果
if [ $? -ne 0 ]; then
    echo
    echo -e "${RED}❌ 启动失败，请检查错误信息${NC}"
    exit 1
fi
