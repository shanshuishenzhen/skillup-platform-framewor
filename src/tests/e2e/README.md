# 端到端测试 (E2E Tests)

本目录包含 SkillUp Platform 的端到端测试，用于测试完整的用户流程和系统集成。

## 📁 目录结构

```
src/tests/e2e/
├── README.md                 # 本文档
├── config/                   # 测试配置
│   ├── jest.e2e.config.js   # Jest E2E 配置
│   └── test-env.ts          # 测试环境配置
├── fixtures/                 # 测试数据和固定装置
│   ├── users.json           # 测试用户数据
│   ├── courses.json         # 测试课程数据
│   └── media/               # 测试媒体文件
├── helpers/                  # 测试辅助工具
│   ├── auth.helper.ts       # 认证相关辅助函数
│   ├── database.helper.ts   # 数据库操作辅助函数
│   ├── api.helper.ts        # API 调用辅助函数
│   └── browser.helper.ts    # 浏览器操作辅助函数
├── specs/                    # 测试规范文件
│   ├── auth/                # 认证相关测试
│   ├── courses/             # 课程相关测试
│   ├── learning/            # 学习流程测试
│   ├── face-auth/           # 人脸认证测试
│   └── admin/               # 管理功能测试
└── utils/                    # 通用工具函数
    ├── setup.ts             # 测试环境设置
    ├── teardown.ts          # 测试环境清理
    └── reporter.ts          # 自定义测试报告器
```

## 🚀 快速开始

### 安装依赖

```bash
# 安装 E2E 测试相关依赖
npm install --save-dev @playwright/test puppeteer supertest
```

### 运行测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定测试套件
npm run test:e2e -- --testPathPattern=auth

# 运行测试并生成报告
npm run test:e2e -- --coverage

# 调试模式运行
npm run test:e2e -- --detectOpenHandles --forceExit
```

## 📊 测试类型

### 1. 用户认证流程测试
- 用户注册流程
- 短信验证码验证
- 人脸识别注册
- 登录流程（密码 + 人脸识别）
- 权限验证

### 2. 课程学习流程测试
- 课程浏览和搜索
- 课程详情查看
- 视频播放和进度记录
- 学习进度统计
- 课程完成认证

### 3. 支付流程测试
- 课程购买流程
- 支付接口集成
- 订单状态更新
- 退款流程

### 4. 管理功能测试
- 管理员登录
- 课程管理（增删改查）
- 用户管理
- 数据统计和报表

### 5. 系统集成测试
- 数据库连接和操作
- 第三方服务集成（短信、人脸识别、支付）
- 文件上传和存储
- 缓存系统

## 🔧 配置说明

### Jest E2E 配置

E2E 测试使用独立的 Jest 配置文件 `config/jest.e2e.config.js`，包含：

- 测试环境设置（Node.js + jsdom）
- 数据库连接配置
- 超时设置（较长的超时时间）
- 测试覆盖率配置
- 自定义匹配器

### 测试环境

测试环境配置包括：

- 测试数据库设置
- 模拟第三方服务
- 测试用户和权限
- 临时文件和媒体资源

## 📝 编写测试

### 基本测试结构

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/setup';
import { createTestUser, loginUser } from '../helpers/auth.helper';

describe('用户认证流程', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  it('应该能够成功注册新用户', async () => {
    // 测试实现
  });

  it('应该能够通过人脸识别登录', async () => {
    // 测试实现
  });
});
```

### 测试最佳实践

1. **独立性**: 每个测试应该独立运行，不依赖其他测试的结果
2. **清理**: 测试后清理创建的数据和资源
3. **真实性**: 尽可能模拟真实用户操作
4. **稳定性**: 避免依赖时间、网络等不稳定因素
5. **可读性**: 测试名称和步骤应该清晰易懂

## 🐛 调试测试

### 常见问题

1. **数据库连接失败**
   - 检查测试数据库配置
   - 确保测试数据库已启动

2. **超时错误**
   - 增加测试超时时间
   - 检查异步操作是否正确等待

3. **权限错误**
   - 检查测试用户权限设置
   - 验证认证 token 是否有效

### 调试工具

- 使用 `console.log` 输出调试信息
- 启用详细错误日志
- 使用 Jest 的 `--verbose` 选项
- 检查测试数据库状态

## 📈 测试覆盖率

E2E 测试覆盖率目标：

- **关键用户流程**: 100%
- **API 端点**: 90%
- **错误处理**: 80%
- **边界情况**: 70%

## 🔄 持续集成

E2E 测试集成到 CI/CD 流程中：

1. **代码提交时**: 运行快速 E2E 测试
2. **合并请求时**: 运行完整 E2E 测试套件
3. **部署前**: 运行生产环境 E2E 测试
4. **定期检查**: 每日运行完整测试套件

## 📚 相关文档

- [Jest 测试框架文档](https://jestjs.io/docs/getting-started)
- [Playwright E2E 测试](https://playwright.dev/)
- [Supertest API 测试](https://github.com/visionmedia/supertest)
- [项目整体测试策略](../README.md)
