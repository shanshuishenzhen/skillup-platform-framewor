# SkillUp Platform 监控服务配置指南

本文档介绍如何配置和使用 SkillUp Platform 的监控服务。

## 📋 目录

- [概述](#概述)
- [支持的监控提供商](#支持的监控提供商)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [监控仪表板](#监控仪表板)
- [告警配置](#告警配置)
- [故障排除](#故障排除)

## 🔍 概述

SkillUp Platform 集成了全面的监控解决方案，包括：

- **错误追踪**: 自动捕获和上报应用错误
- **性能监控**: 监控 API 响应时间、数据库查询等
- **业务指标**: 用户行为、课程学习进度等业务数据
- **系统指标**: CPU、内存、网络等系统资源
- **告警通知**: 基于阈值的智能告警

## 🛠 支持的监控提供商

### 1. Sentry
- **优势**: 强大的错误追踪和性能监控
- **适用场景**: 中小型项目，注重错误追踪
- **配置**: 需要 Sentry DSN

### 2. DataDog
- **优势**: 全栈监控，强大的日志分析
- **适用场景**: 大型企业，需要全面监控
- **配置**: 需要 DataDog API Key

### 3. New Relic
- **优势**: APM 性能监控专家
- **适用场景**: 注重应用性能优化
- **配置**: 需要 New Relic License Key

### 4. 自定义监控
- **优势**: 完全可控，可定制
- **适用场景**: 有特殊需求或自建监控系统
- **配置**: 需要自定义端点和 API Key

## 🚀 快速开始

### 1. 环境配置

复制环境变量模板：
```bash
cp .env.monitoring.example .env.local
```

编辑 `.env.local` 文件，配置监控服务：
```bash
# 基础配置
MONITORING_ENABLED=true
MONITORING_PROVIDER=sentry  # 或 datadog, newrelic, custom
MONITORING_ENDPOINT=https://your-monitoring-endpoint.com
MONITORING_API_KEY=your-api-key-here

# 仪表板配置
MONITORING_DASHBOARD_URL=https://your-dashboard.com
```

### 2. 运行设置脚本

```bash
npm run setup:monitoring
```

这个脚本会：
- 检查环境变量配置
- 安装必要的依赖
- 创建配置文件
- 测试监控连接
- 生成设置报告

### 3. 验证配置

```bash
# 测试监控连接
npm run monitoring:test

# 打开监控仪表板
npm run monitoring:dashboard
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `MONITORING_ENABLED` | 是否启用监控 | `false` | 是 |
| `MONITORING_PROVIDER` | 监控提供商 | `custom` | 是 |
| `MONITORING_ENDPOINT` | 监控端点 URL | - | 是* |
| `MONITORING_API_KEY` | API 密钥 | - | 是* |
| `MONITORING_DASHBOARD_URL` | 仪表板 URL | - | 否 |
| `MONITORING_BATCH_SIZE` | 批量发送大小 | `10` | 否 |
| `MONITORING_FLUSH_INTERVAL` | 刷新间隔(ms) | `5000` | 否 |

*注：使用第三方提供商时需要

### 代码配置

在应用启动时初始化监控：

```typescript
import { initializeMonitoring } from '@/config/monitoring';

// 在应用启动时调用
await initializeMonitoring();
```

### 错误上报

监控服务会自动捕获错误，也可以手动上报：

```typescript
import { ErrorHandler } from '@/utils/errorHandler';

const errorHandler = ErrorHandler.getInstance();

try {
  // 业务逻辑
} catch (error) {
  errorHandler.logError(error, { userId: '123', action: 'purchase' });
}
```

## 📊 监控仪表板

### 预配置面板

1. **应用健康状态**: 服务可用性监控
2. **错误率**: 实时错误率统计
3. **响应时间**: P95 响应时间监控
4. **请求量**: QPS 监控
5. **HTTP 请求趋势**: 请求量趋势图
6. **错误分布**: 错误类型分布
7. **数据库连接池**: 数据库连接状态
8. **系统资源**: CPU、内存使用情况
9. **API 性能表**: 各端点性能对比

### 自定义面板

可以根据业务需求添加自定义面板：

```json
{
  "id": 11,
  "title": "课程学习进度",
  "type": "timeseries",
  "targets": [
    {
      "expr": "course_completion_rate{service=\"skillup-platform\"}",
      "legendFormat": "完成率"
    }
  ]
}
```

## 🚨 告警配置

### 预配置告警

1. **高错误率告警**: 错误率 > 5%
2. **高响应时间告警**: P95 > 2秒
3. **应用下线告警**: 服务不可用

### 告警通道

支持多种告警通道：

- **Webhook**: Slack、钉钉、企业微信
- **邮件**: SMTP 邮件通知
- **短信**: 集成短信服务商

### 自定义告警

```json
{
  "name": "数据库连接异常",
  "condition": "database_connections_active / database_connections_max > 0.8",
  "duration": "3m",
  "severity": "warning",
  "message": "数据库连接池使用率过高",
  "actions": [
    {
      "type": "webhook",
      "url": "https://hooks.slack.com/services/YOUR/WEBHOOK"
    }
  ]
}
```

## 🔧 故障排除

### 常见问题

#### 1. 监控数据未上报

**可能原因**:
- 环境变量配置错误
- 网络连接问题
- API 密钥无效

**解决方案**:
```bash
# 检查配置
npm run monitoring:test

# 查看日志
tail -f logs/monitoring.log
```

#### 2. 仪表板无数据

**可能原因**:
- 数据上报延迟
- 查询语句错误
- 时间范围设置问题

**解决方案**:
- 等待 1-2 分钟数据同步
- 检查查询语句语法
- 调整时间范围

#### 3. 告警未触发

**可能原因**:
- 告警规则配置错误
- 通知渠道配置问题
- 阈值设置不合理

**解决方案**:
- 验证告警规则语法
- 测试通知渠道
- 调整阈值设置

### 调试模式

启用调试模式获取详细日志：

```bash
# 设置环境变量
export DEBUG=monitoring:*

# 启动应用
npm run dev
```

### 日志分析

监控相关日志位置：
- 应用日志: `logs/app.log`
- 监控日志: `logs/monitoring.log`
- 错误日志: `logs/error.log`

## 📈 最佳实践

### 1. 监控指标选择

- **关键业务指标**: 用户注册、课程购买、学习完成
- **技术指标**: 错误率、响应时间、可用性
- **资源指标**: CPU、内存、磁盘、网络

### 2. 告警策略

- **分级告警**: Critical > Warning > Info
- **避免告警疲劳**: 合理设置阈值和频率
- **告警收敛**: 相关告警合并处理

### 3. 性能优化

- **采样率控制**: 生产环境建议 10-20%
- **批量发送**: 减少网络开销
- **异步处理**: 避免影响主业务

### 4. 数据保留

- **实时数据**: 保留 7 天
- **聚合数据**: 保留 30 天
- **历史数据**: 保留 1 年

## 🔗 相关链接

- [错误处理文档](./error-handling.md)
- [性能优化指南](./performance.md)
- [部署指南](./deployment.md)
- [API 文档](./api.md)

## 📞 支持

如有问题，请联系：
- 技术支持: tech-support@skillup.com
- 文档反馈: docs@skillup.com
