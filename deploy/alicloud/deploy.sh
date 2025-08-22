#!/bin/bash

# 阿里云生产环境部署脚本
# 用于自动化部署 SkillUp Platform 到阿里云容器服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    log_info "检查部署依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 检查环境变量
check_env_vars() {
    log_info "检查环境变量..."
    
    required_vars=(
        "ALICLOUD_ACCESS_KEY_ID"
        "ALICLOUD_ACCESS_KEY_SECRET"
        "ALICLOUD_REGION"
        "ALICLOUD_OSS_BUCKET"
        "ALICLOUD_OSS_ENDPOINT"
        "ENCRYPTION_KEY"
        "API_SECRET_KEY"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "缺少以下环境变量:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_error "请设置这些环境变量后重新运行部署脚本"
        exit 1
    fi
    
    log_success "环境变量检查完成"
}

# 构建 Docker 镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    # 设置镜像标签
    IMAGE_TAG=${IMAGE_TAG:-"latest"}
    REGISTRY=${REGISTRY:-"registry.cn-shenzhen.aliyuncs.com"}
    NAMESPACE=${NAMESPACE:-"skillup"}
    
    # 构建应用镜像
    docker build -t "${REGISTRY}/${NAMESPACE}/skillup-platform:${IMAGE_TAG}" \
        -f deploy/alicloud/Dockerfile .
    
    log_success "镜像构建完成"
}

# 推送镜像到阿里云容器镜像服务
push_images() {
    log_info "推送镜像到阿里云容器镜像服务..."
    
    # 登录阿里云容器镜像服务
    echo "${ALICLOUD_ACCESS_KEY_SECRET}" | docker login \
        --username "${ALICLOUD_ACCESS_KEY_ID}" \
        --password-stdin \
        "${REGISTRY}"
    
    # 推送镜像
    docker push "${REGISTRY}/${NAMESPACE}/skillup-platform:${IMAGE_TAG}"
    
    log_success "镜像推送完成"
}

# 部署到容器服务
deploy_to_acs() {
    log_info "部署到阿里云容器服务..."
    
    # 停止现有服务
    docker-compose -f deploy/alicloud/docker-compose.yml down || true
    
    # 清理旧的容器和镜像
    docker system prune -f
    
    # 启动新服务
    docker-compose -f deploy/alicloud/docker-compose.yml up -d
    
    log_success "服务部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    max_attempts=30
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            log_success "应用健康检查通过"
            return 0
        fi
        
        log_warning "健康检查失败，重试中... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "健康检查失败，部署可能存在问题"
    return 1
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息:"
    echo "  应用地址: https://your-domain.com"
    echo "  健康检查: https://your-domain.com/api/health"
    echo "  Nginx 状态: https://your-domain.com/nginx-health"
    echo ""
    echo "容器状态:"
    docker-compose -f deploy/alicloud/docker-compose.yml ps
}

# 回滚函数
rollback() {
    log_warning "执行回滚..."
    
    # 停止当前服务
    docker-compose -f deploy/alicloud/docker-compose.yml down
    
    # 使用上一个版本的镜像
    PREVIOUS_TAG=${PREVIOUS_TAG:-"previous"}
    export IMAGE_TAG="$PREVIOUS_TAG"
    
    # 重新部署
    docker-compose -f deploy/alicloud/docker-compose.yml up -d
    
    log_success "回滚完成"
}

# 主函数
main() {
    log_info "开始部署 SkillUp Platform 到阿里云..."
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --rollback)
                rollback
                exit 0
                ;;
            --tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --rollback          回滚到上一个版本"
                echo "  --tag TAG           指定镜像标签 (默认: latest)"
                echo "  --registry URL      指定镜像仓库地址"
                echo "  --namespace NS      指定命名空间"
                echo "  --help              显示帮助信息"
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    # 执行部署步骤
    check_dependencies
    check_env_vars
    build_images
    push_images
    deploy_to_acs
    
    # 健康检查
    if health_check; then
        show_deployment_info
        log_success "部署成功完成！"
    else
        log_error "部署失败，请检查日志"
        exit 1
    fi
}

# 捕获错误并执行清理
trap 'log_error "部署过程中发生错误，正在清理..."' ERR

# 执行主函数
main "$@"