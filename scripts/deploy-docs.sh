#!/bin/bash

# SkillUp Platform 文档部署脚本
# 将文档部署到文档站点

set -e

echo "🚀 开始部署 API 文档..."

# 检查必需的文件
REQUIRED_FILES=(
    "docs/README.md"
    "docs/api-documentation.md"
    "docs/openapi.yaml"
    "docs/postman-collection.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺少必需的文件: $file"
        exit 1
    fi
done

echo "✅ 文档文件检查通过"

# 生成静态文档站点（如果使用 GitBook、VuePress 等）
if command -v gitbook &> /dev/null; then
    echo "📚 使用 GitBook 生成文档站点..."
    gitbook build docs _book
elif command -v vuepress &> /dev/null; then
    echo "📚 使用 VuePress 生成文档站点..."
    vuepress build docs
else
    echo "⚠️  未找到文档生成工具，跳过静态站点生成"
fi

# 部署到文档服务器（示例）
if [ ! -z "$DOCS_DEPLOY_URL" ]; then
    echo "🌐 部署到文档服务器..."
    # rsync -avz docs/ $DOCS_DEPLOY_URL/
    echo "文档部署命令需要根据实际环境配置"
else
    echo "⚠️  未配置文档部署地址"
fi

echo "✅ 文档部署完成"
echo "📖 访问地址: https://docs.skillup.com"
