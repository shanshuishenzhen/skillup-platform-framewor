# 测试文档

本文档介绍了项目的测试结构、运行方法和编写指南。

## 📁 测试结构

```
src/tests/
├── __mocks__/              # 模拟文件
│   ├── fileMock.js         # 静态资源模拟
│   ├── nextImageMock.js    # Next.js Image组件模拟
│   ├── nextRouterMock.js   # Next.js Router模拟
│   └── nextNavigationMock.js # Next.js Navigation模拟
├── api/                    # API集成测试
│   ├── auth.test.ts        # 认证API测试
│   ├── courses.test.ts     # 课程API测试
│   ├── users.test.ts       # 用户API测试
│   ├── progress.test.ts    # 学习进度API测试
│   ├── quizzes.test.ts     # 测验API测试
│   └── learning-paths.test.ts # 学习路径API测试
├── middleware/             # 中间件测试
│   └── security.test.ts    # 安全中间件测试
├── services/               # 服务类测试
│   ├── aiService.test.ts   # AI服务测试
│   ├── cloudStorageService.test.ts # 云存储服务测试
│   ├── faceRecognitionService.test.ts # 人脸识别服务测试
│   └── monitoringService.test.ts # 监控服务测试
├── utils/                  # 工具函数测试
│   ├── apiMonitor.test.ts  # API监控测试
│   └── errorHandler.test.ts # 错误处理测试
├── e2e/                    # 端到端测试（待创建）
├── setup.ts                # 测试环境配置
├── run-tests.js            # 测试运行脚本
└── README.md               # 测试文档
```

## 🚀 快速开始

### 安装依赖

```bash
npm install --save-dev jest ts-jest @types/jest jest-html-reporters
```

### 运行测试

```bash
# 运行所有测试
npm test

# 或使用自定义脚本
node src/tests/run-tests.js all

# 运行单元测试
node src/tests/run-tests.js unit

# 运行集成测试
node src/tests/run-tests.js integration

# 运行测试并生成覆盖率报告
node src/tests/run-tests.js all --coverage

# 监听模式（文件变化时自动重新运行）
node src/tests/run-tests.js all --watch
```

## 📊 测试类型

### 1. 单元测试 (Unit Tests)

测试独立的函数、类和组件。

**位置**: `src/tests/{utils,services,middleware}/`

**特点**:
- 快速执行
- 隔离测试
- 高覆盖率
- 模拟外部依赖

**示例**:
```typescript
import { ApiMonitor } from '@/utils/apiMonitor';

describe('ApiMonitor', () => {
  it('应该正确记录API调用', async () => {
    const monitor = new ApiMonitor();
    await monitor.recordRequest('/api/test', 'GET', 200, 150);
    
    const stats = await monitor.getStats();
    expect(stats.totalRequests).toBe(1);
  });
});
```

### 2. 集成测试 (Integration Tests)

测试多个组件之间的交互，特别是API路由。

**位置**: `src/tests/api/`

**特点**:
- 测试真实的API端点
- 模拟数据库和外部服务
- 验证数据流
- 测试错误处理

**示例**:
```typescript
import { testUtils } from '../setup';

describe('/api/courses', () => {
  it('GET - 应该返回课程列表', async () => {
    const request = testUtils.createMockRequest('GET', '/api/courses');
    const response = await GET(request);
    const data = await testUtils.parseResponse(response);
    
    testUtils.expectSuccessResponse(data);
    expect(data.data).toHaveProperty('courses');
  });
});
```

### 3. 端到端测试 (E2E Tests)

测试完整的用户流程。

**位置**: `src/tests/e2e/`

**特点**:
- 模拟真实用户操作
- 测试完整流程
- 较慢但更可靠
- 发现集成问题

## 🛠️ 测试工具

### 测试框架
- **Jest**: 主要测试框架
- **ts-jest**: TypeScript支持
- **@types/jest**: TypeScript类型定义

### 模拟工具
- **jest.fn()**: 函数模拟
- **jest.mock()**: 模块模拟
- **testUtils**: 自定义测试工具

### 覆盖率报告
- **HTML报告**: `coverage/lcov-report/index.html`
- **LCOV格式**: `coverage/lcov.info`
- **JSON格式**: `coverage/coverage-final.json`

## 📝 编写测试指南

### 1. 测试文件命名

- 单元测试: `*.test.ts`
- 集成测试: `*.test.ts`
- 端到端测试: `*.e2e.test.ts`

### 2. 测试结构

```typescript
// 导入必要的模块
import { functionToTest } from '@/path/to/module';
import { testUtils } from '../setup';

// 描述测试套件
describe('模块名称', () => {
  // 测试前设置
  beforeEach(() => {
    // 重置模拟、清理数据等
  });
  
  // 测试后清理
  afterEach(() => {
    testUtils.cleanup();
  });
  
  // 描述测试组
  describe('功能名称', () => {
    // 单个测试用例
    it('应该执行预期行为', async () => {
      // 准备 (Arrange)
      const input = 'test input';
      
      // 执行 (Act)
      const result = await functionToTest(input);
      
      // 断言 (Assert)
      expect(result).toBe('expected output');
    });
  });
});
```

### 3. 测试最佳实践

#### 命名规范
- 使用描述性的测试名称
- 遵循 "应该..." 的格式
- 明确测试的预期行为

```typescript
// ✅ 好的命名
it('应该在用户未登录时返回401错误', () => {});
it('应该正确计算课程完成百分比', () => {});

// ❌ 不好的命名
it('测试登录', () => {});
it('计算百分比', () => {});
```

#### 测试隔离
- 每个测试应该独立运行
- 不依赖其他测试的结果
- 使用 `beforeEach` 和 `afterEach` 进行清理

```typescript
beforeEach(() => {
  // 重置模拟
  jest.clearAllMocks();
  
  // 清理测试数据
  testUtils.cleanup();
});
```

#### 模拟外部依赖
- 模拟数据库调用
- 模拟API请求
- 模拟文件系统操作

```typescript
// 模拟Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }
}));
```

#### 测试边界情况
- 测试正常情况
- 测试错误情况
- 测试边界值
- 测试异常输入

```typescript
describe('用户注册', () => {
  it('应该成功注册有效用户', () => {});
  it('应该拒绝无效邮箱', () => {});
  it('应该拒绝弱密码', () => {});
  it('应该处理数据库错误', () => {});
});
```

## 🔧 配置说明

### Jest配置 (`jest.config.js`)

主要配置项：
- `testEnvironment`: 测试环境 (node)
- `preset`: 预设配置 (ts-jest)
- `testMatch`: 测试文件匹配模式
- `moduleNameMapper`: 模块路径映射
- `coverageThreshold`: 覆盖率阈值

### 测试环境 (`src/tests/setup.ts`)

提供：
- 全局模拟对象
- 测试工具函数
- 环境变量设置
- 清理函数

## 📈 覆盖率要求

### 全局阈值
- 分支覆盖率: 70%
- 函数覆盖率: 70%
- 行覆盖率: 70%
- 语句覆盖率: 70%

### 核心模块阈值
- `src/utils/`: 80%
- `src/services/`: 75%

### 查看覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 打开HTML报告
open coverage/lcov-report/index.html
```

## 🐛 调试测试

### 1. 运行单个测试文件

```bash
npx jest src/tests/utils/apiMonitor.test.ts
```

### 2. 运行特定测试用例

```bash
npx jest --testNamePattern="应该正确记录API调用"
```

### 3. 调试模式

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### 4. 详细输出

```bash
npx jest --verbose
```

## 🚨 常见问题

### 1. 模块解析错误

**问题**: 无法解析 `@/` 路径别名

**解决**: 检查 `jest.config.js` 中的 `moduleNameMapper` 配置

### 2. 异步测试超时

**问题**: 测试超时失败

**解决**: 增加超时时间或使用 `async/await`

```typescript
it('异步测试', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
}, 10000); // 10秒超时
```

### 3. 模拟不生效

**问题**: 模拟函数没有被调用

**解决**: 确保模拟在正确的位置，使用 `jest.clearAllMocks()`

### 4. 内存泄漏

**问题**: 测试运行时内存持续增长

**解决**: 在 `afterEach` 中清理资源，使用 `testUtils.cleanup()`

## 📚 参考资源

- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [ts-jest文档](https://kulshekhar.github.io/ts-jest/)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Next.js测试指南](https://nextjs.org/docs/testing)

## 🤝 贡献指南

1. 为新功能编写测试
2. 确保测试覆盖率达到要求
3. 遵循测试命名规范
4. 添加必要的文档说明
5. 运行完整测试套件确保无回归

---

**注意**: 在提交代码前，请确保所有测试通过并且覆盖率达到要求。