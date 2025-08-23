# SkillUp Platform 文档中心

欢迎来到 SkillUp Platform 文档中心！这里包含了所有相关的技术文档和 API 参考。

## 📚 文档目录

### API 文档
- [API 文档总览](./api-documentation.md) - 完整的 API 使用指南
- [OpenAPI 规范](./openapi.yaml) - 标准的 OpenAPI 3.0 规范文件
- [Postman 集合](./postman-collection.json) - 可导入的 Postman 测试集合

### 配置文档
- [监控配置指南](./monitoring.md) - 监控服务配置和使用
- [安全配置文档](./security-config.md) - 安全密钥和配置管理

### 开发文档
- [数据库使用示例](../examples/database-usage.js) - 数据库操作示例代码
- [E2E 测试文档](../src/tests/e2e/README.md) - 端到端测试指南

## 🚀 快速开始

### 1. API 测试
1. 导入 [Postman 集合](./postman-collection.json)
2. 设置环境变量 `base_url`
3. 运行登录接口获取 JWT Token
4. 测试其他 API 接口

### 2. 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test:e2e
```

### 3. 监控配置
```bash
# 配置监控服务
npm run setup:monitoring

# 生成安全配置
npm run generate:security

# 执行数据库迁移
npm run db:migrate
```

## 📊 API 概览

### 认证 API
- `POST /auth/login` - 用户登录
- `POST /auth/logout` - 用户登出
- `POST /auth/refresh` - 刷新 Token

### 监控 API
- `GET /api/monitoring/stats` - 获取监控统计
- `GET /api/monitoring/health` - 健康检查

### 人脸识别 API
- `POST /api/face/detect` - 人脸检测
- `POST /api/face/template/generate` - 生成人脸模板
- `POST /api/face/verify` - 人脸验证

### 短信验证 API
- `POST /api/sms/send` - 发送验证码
- `POST /api/sms/verify` - 验证验证码

### 学习进度 API
- `POST /api/learning/progress` - 更新学习进度
- `GET /api/learning/progress/{userId}/{courseId}` - 获取学习进度

## 🔧 工具和资源

### 在线工具
- [Swagger Editor](https://editor.swagger.io/) - 编辑 OpenAPI 规范
- [Postman](https://www.postman.com/) - API 测试工具
- [JSON Formatter](https://jsonformatter.org/) - JSON 格式化工具

### 开发资源
- [OpenAPI 3.0 规范](https://swagger.io/specification/)
- [JWT 调试工具](https://jwt.io/)
- [Base64 编码工具](https://www.base64encode.org/)

## 📞 支持

如有问题，请联系：
- **技术支持**: api-support@skillup.com
- **文档反馈**: docs@skillup.com
- **GitHub Issues**: https://github.com/skillup/platform/issues

## 📝 更新日志

### v1.0.0 (2025-08-22)
- 初始版本发布
- 完整的 API 文档
- OpenAPI 3.0 规范
- Postman 集合
- 监控和安全配置文档

---

*最后更新: 2025-08-22*
