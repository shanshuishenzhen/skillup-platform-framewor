# 考试系统测试指南

## 概述

本文档提供了考试系统自动化测试的完整指南，包括测试类型、运行方法、调试工具和最佳实践。

## 测试架构

### 测试类型

1. **API测试** (`src/tests/api/exams.test.ts`)
   - 测试考试系统的所有API端点
   - 覆盖CRUD操作、权限验证、数据验证
   - 包含错误处理和边界条件测试

2. **端到端测试** (`src/tests/e2e/exam-flow.e2e.test.ts`)
   - 模拟真实用户操作流程
   - 测试完整的考试生命周期
   - 包含UI交互和业务流程验证

3. **性能测试** (`src/tests/performance/exam-performance.test.ts`)
   - 负载测试和压力测试
   - 并发用户场景模拟
   - 性能指标监控和分析

4. **调试工具** (`src/tests/utils/examDebugger.ts`)
   - 实时监控考试状态
   - 性能分析和问题诊断
   - 安全事件监控

5. **测试数据生成器** (`src/tests/utils/examDataGenerator.ts`)
   - 生成模拟考试数据
   - 支持不同规模的测试场景
   - 提供完整的数据关系

## 快速开始

### 环境准备

1. 确保已安装必要的依赖：
```bash
npm install
```

2. 检查测试配置：
```bash
# 检查Jest配置
cat jest.config.js

# 检查测试依赖
npm list jest @types/jest ts-jest
```

### 运行测试

#### 运行所有考试系统测试
```bash
node src/tests/run-tests.js exam
```

#### 运行特定类型的测试
```bash
# API测试
node src/tests/run-tests.js integration --testPathPattern="exams.test.ts"

# 端到端测试
node src/tests/run-tests.js e2e --testPathPattern="exam-flow"

# 性能测试
node src/tests/run-tests.js performance
```

#### 运行测试并生成覆盖率报告
```bash
node src/tests/run-tests.js exam --coverage
```

#### 监听模式（开发时使用）
```bash
node src/tests/run-tests.js exam --watch
```

## 测试详细说明

### API测试

#### 测试覆盖范围
- 考试管理（创建、更新、删除、查询）
- 题目管理（添加、编辑、排序）
- 用户报名（注册、取消、状态查询）
- 答题流程（开始、保存、提交）
- 评分系统（自动评分、手动评分）
- 证书生成（条件检查、生成、下载）
- 权限控制（角色验证、操作权限）
- 数据验证（输入验证、业务规则）

#### 运行示例
```bash
# 运行所有API测试
npm test -- --testPathPattern="api/exams"

# 运行特定测试套件
npm test -- --testNamePattern="考试创建"

# 详细输出模式
npm test -- --testPathPattern="api/exams" --verbose
```

### 端到端测试

#### 测试场景
1. **管理员流程**
   - 登录系统
   - 创建考试
   - 添加题目
   - 发布考试
   - 监控考试进度
   - 查看统计报告

2. **学生流程**
   - 用户注册/登录
   - 浏览可用考试
   - 报名参加考试
   - 参加考试（答题、保存、提交）
   - 查看成绩和证书

3. **防作弊监控**
   - 页面切换检测
   - 时间限制监控
   - 异常行为记录

#### 运行示例
```bash
# 运行端到端测试
npm run test:e2e

# 指定浏览器
npm run test:e2e -- --project=chromium

# 调试模式
npm run test:e2e -- --debug
```

### 性能测试

#### 测试类型
1. **负载测试**
   - 模拟正常用户负载
   - 验证系统稳定性
   - 响应时间监控

2. **压力测试**
   - 超出正常负载
   - 找出系统瓶颈
   - 故障恢复测试

3. **峰值测试**
   - 突发流量处理
   - 系统弹性测试
   - 资源使用监控

#### 性能指标
- 响应时间（平均、最大、P95、P99）
- 吞吐量（每秒请求数）
- 错误率
- 资源使用率（CPU、内存、数据库连接）

#### 运行示例
```bash
# 运行性能测试
node src/tests/run-tests.js performance

# 自定义并发用户数
PERF_CONCURRENT_USERS=50 npm run test:performance

# 自定义测试时长
PERF_DURATION=300 npm run test:performance
```

## 调试工具使用

### 考试调试器

```typescript
import { ExamDebugger } from '../utils/examDebugger';

// 初始化调试器
const debugger = ExamDebugger.getInstance();

// 开始监控
debugger.startMonitoring();

// 记录考试状态
debugger.logExamState({
  examId: 'exam-123',
  userId: 'user-456',
  status: 'in_progress',
  currentQuestion: 5,
  timeRemaining: 1800
});

// 记录性能指标
debugger.logPerformance({
  operation: 'submit_answer',
  duration: 250,
  success: true
});

// 生成调试报告
const report = debugger.generateReport();
console.log(report);
```

### 实时监控

调试器提供实时监控功能：
- 考试状态变化
- 性能指标统计
- 错误和异常记录
- 安全事件监控

## 测试数据管理

### 使用数据生成器

```typescript
import { examDataGenerator, generateTestData } from '../utils/examDataGenerator';

// 生成基础测试数据
const basicData = generateTestData.basic();

// 生成中等规模数据
const mediumData = generateTestData.medium();

// 生成大规模数据
const largeData = generateTestData.large();

// 自定义数据生成
const customData = examDataGenerator.generateCompleteExamScenario({
  examCount: 5,
  userCount: 30,
  questionsPerExam: 25
});
```

### 数据清理

```typescript
// 清除生成的数据
examDataGenerator.clearData();

// 导出数据用于调试
const jsonData = examDataGenerator.exportToJSON();
console.log(jsonData);
```

## 最佳实践

### 测试编写原则

1. **独立性**
   - 每个测试应该独立运行
   - 不依赖其他测试的结果
   - 使用beforeEach/afterEach进行清理

2. **可重复性**
   - 测试结果应该一致
   - 避免依赖外部状态
   - 使用模拟数据和服务

3. **清晰性**
   - 测试名称应该描述测试内容
   - 使用describe和it组织测试结构
   - 添加必要的注释

### 性能测试建议

1. **渐进式测试**
   - 从小负载开始
   - 逐步增加负载
   - 观察系统行为变化

2. **监控关键指标**
   - 响应时间
   - 错误率
   - 资源使用率
   - 数据库性能

3. **环境一致性**
   - 使用与生产环境相似的配置
   - 确保网络条件一致
   - 控制测试变量

### 调试技巧

1. **日志记录**
   - 记录关键操作
   - 包含时间戳和上下文
   - 使用不同的日志级别

2. **错误处理**
   - 捕获和记录异常
   - 提供有意义的错误信息
   - 实现优雅的降级

3. **监控告警**
   - 设置性能阈值
   - 配置异常告警
   - 实时监控系统状态

## 持续集成

### CI/CD集成

```yaml
# .github/workflows/exam-tests.yml
name: 考试系统测试

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run API tests
      run: node src/tests/run-tests.js integration --testPathPattern="exams"
    
    - name: Run E2E tests
      run: node src/tests/run-tests.js e2e --testPathPattern="exam-flow"
    
    - name: Run performance tests
      run: node src/tests/run-tests.js performance
      env:
        PERF_CONCURRENT_USERS: 10
        PERF_DURATION: 60
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

### 测试报告

测试完成后，可以查看以下报告：
- 覆盖率报告：`coverage/lcov-report/index.html`
- 性能测试报告：`test-results/performance-report.html`
- 端到端测试报告：`test-results/e2e-report.html`

## 故障排除

### 常见问题

1. **测试超时**
   ```bash
   # 增加超时时间
   npm test -- --testTimeout=30000
   ```

2. **内存不足**
   ```bash
   # 增加Node.js内存限制
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

3. **数据库连接问题**
   ```bash
   # 检查数据库配置
   npm run db:status
   
   # 重置测试数据库
   npm run db:reset:test
   ```

4. **端口冲突**
   ```bash
   # 检查端口使用情况
   netstat -tulpn | grep :3000
   
   # 使用不同端口
   PORT=3001 npm run test:e2e
   ```

### 调试命令

```bash
# 详细输出模式
npm test -- --verbose

# 只运行失败的测试
npm test -- --onlyFailures

# 运行特定测试文件
npm test -- src/tests/api/exams.test.ts

# 调试模式
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 贡献指南

### 添加新测试

1. 确定测试类型和位置
2. 遵循现有的命名约定
3. 添加适当的文档和注释
4. 确保测试通过CI检查

### 更新测试

1. 保持向后兼容性
2. 更新相关文档
3. 验证所有相关测试
4. 提交详细的变更说明

## 联系方式

如有问题或建议，请联系：
- 开发团队：dev-team@example.com
- 测试团队：qa-team@example.com
- 项目文档：https://docs.example.com/exam-system

---

*最后更新：2024年1月*