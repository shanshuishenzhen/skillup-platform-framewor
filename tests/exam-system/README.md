# 在线考试管理系统测试程序

## 概述

本测试程序是为在线考试管理系统设计的完整自动化测试套件，用于验证系统的各项功能是否正常工作。测试程序涵盖了从管理员登录到学生考试的完整流程。

## 测试功能

### 1. 管理员登录测试
- 验证管理员账号（13823738278）使用密码（123456）的登录功能
- 测试错误密码、错误手机号、空凭据等异常情况
- 验证令牌生成和验证机制
- 测试登出功能

### 2. 考试创建和管理功能测试
- 测试考试的创建、编辑、删除功能
- 验证考试列表查询和详情查看
- 测试题目的添加、编辑、删除
- 验证考试状态管理

### 3. 学生登录和考试参与测试
- 测试学生登录功能
- 验证学生查看可用考试列表
- 测试考试参与流程（开始考试、答题、提交）
- 验证考试时间控制和状态管理

### 4. 成绩查看和统计功能测试
- 测试管理员查看所有学生成绩
- 验证成绩统计和分析功能
- 测试成绩数据导出功能
- 验证学生查看个人成绩

### 5. 权限控制测试
- 验证不同角色用户的访问权限
- 测试跨角色访问限制
- 验证未授权访问的拦截
- 测试令牌过期和刷新机制

### 6. API接口完整性测试
- 验证所有API端点的可用性
- 测试API响应格式和数据完整性
- 验证错误处理和状态码
- 测试API安全性（防SQL注入、XSS等）

## 目录结构

```
tests/exam-system/
├── config/
│   └── test-config.js          # 测试配置文件
├── utils/
│   └── test-utils.js           # 测试工具类
├── tests/
│   ├── admin-login-test.js     # 管理员登录测试
│   ├── exam-management-test.js # 考试管理测试
│   ├── student-exam-test.js    # 学生考试测试
│   ├── grade-statistics-test.js # 成绩统计测试
│   ├── permission-control-test.js # 权限控制测试
│   └── api-integration-test.js  # API接口测试
├── reports/                    # 测试报告目录（自动生成）
├── package.json               # 项目依赖配置
├── run-tests.js              # 主测试执行脚本
└── README.md                 # 本文档
```

## 安装和使用

### 1. 安装依赖

```bash
cd tests/exam-system
npm install
```

### 2. 配置测试环境

编辑 `config/test-config.js` 文件，确保以下配置正确：
- API服务器地址
- 测试用户账号信息
- 数据库连接信息（如需要）

### 3. 运行测试

#### 运行所有测试
```bash
npm test
```

#### 运行特定测试模块
```bash
# 管理员登录测试
npm run test:admin

# 考试管理测试
npm run test:exam

# 学生考试测试
npm run test:student

# 成绩统计测试
npm run test:grade

# 权限控制测试
npm run test:permission

# API接口测试
npm run test:api
```

#### 生成测试报告
```bash
npm run report
```

## 测试报告

测试完成后，会在 `reports/` 目录下生成以下文件：
- `test-report-[timestamp].json` - JSON格式的详细测试结果
- `test-report-[timestamp].html` - HTML格式的可视化测试报告

## 配置说明

### 测试用户配置

默认测试用户配置：
```javascript
testUsers: {
    admin: {
        phone: '13823738278',
        password: '123456'
    },
    student: {
        phone: '13800138001',
        password: 'student123'
    }
}
```

### API端点配置

默认API配置：
```javascript
apiEndpoints: {
    baseUrl: 'http://localhost:3000',
    admin: {
        login: '/api/admin/login',
        exams: '/api/admin/exams',
        grades: '/api/admin/grades'
    },
    student: {
        login: '/api/student/login',
        exams: '/api/student/exams',
        grades: '/api/student/grades'
    }
}
```

## 注意事项

1. **测试环境**：确保测试运行在独立的测试环境中，避免影响生产数据
2. **数据清理**：测试会创建临时数据，建议在测试后清理测试数据
3. **网络连接**：确保测试环境能够访问API服务器
4. **权限配置**：确保测试用户具有相应的权限
5. **并发测试**：避免同时运行多个测试实例，可能会导致数据冲突

## 故障排除

### 常见问题

1. **连接失败**
   - 检查API服务器是否正常运行
   - 验证网络连接和防火墙设置
   - 确认API端点配置正确

2. **认证失败**
   - 验证测试用户账号和密码
   - 检查用户权限配置
   - 确认令牌生成和验证机制

3. **测试数据问题**
   - 清理之前的测试数据
   - 检查数据库连接和权限
   - 验证测试数据格式

4. **依赖问题**
   - 重新安装npm依赖：`npm install`
   - 检查Node.js版本兼容性
   - 清理npm缓存：`npm cache clean --force`

## 扩展测试

如需添加新的测试用例：

1. 在 `tests/` 目录下创建新的测试文件
2. 继承 `TestUtils` 类或使用其提供的工具方法
3. 在 `run-tests.js` 中注册新的测试套件
4. 更新 `package.json` 中的测试脚本

## 技术支持

如遇到问题，请检查：
1. 测试日志和错误信息
2. API服务器日志
3. 网络连接状态
4. 配置文件设置

测试程序设计遵循最佳实践，提供详