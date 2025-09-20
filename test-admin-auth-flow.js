/**
 * 管理员认证流程测试脚本
 * 模拟完整的管理员登录和用户列表访问流程
 */

const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 模拟localStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  
  getItem(key) {
    return this.store[key] || null;
  }
  
  setItem(key, value) {
    this.store[key] = value;
  }
  
  removeItem(key) {
    delete this.store[key];
  }
  
  clear() {
    this.store = {};
  }
}

const mockLocalStorage = new MockLocalStorage();

// 读取JWT工具函数
function loadJWTUtils() {
  const jwtPath = path.join(__dirname, 'src/utils/jwt.ts');
  if (!fs.existsSync(jwtPath)) {
    log('❌ JWT工具文件不存在', 'red');
    return null;
  }
  
  const content = fs.readFileSync(jwtPath, 'utf8');
  return content;
}

// 模拟JWT token验证函数
function mockJWTValidation() {
  log('\n=== 模拟JWT Token验证 ===', 'blue');
  
  // 模拟有效的管理员token
  const validAdminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJwaG9uZSI6IjEzODAwMDAwMDAwIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI0NjY2NjY2LCJleHAiOjk5OTk5OTk5OTl9.test';
  
  // 模拟过期的token
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJwaG9uZSI6IjEzODAwMDAwMDAwIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI0NjY2NjY2LCJleHAiOjE3MjQ2NjY2NjZ9.test';
  
  // 模拟普通用户token
  const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJwaG9uZSI6IjEzODAwMDAwMDAwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MjQ2NjY2NjYsImV4cCI6OTk5OTk5OTk5OX0.test';
  
  const testCases = [
    { name: '有效管理员Token', token: validAdminToken, expected: { valid: true, admin: true } },
    { name: '过期Token', token: expiredToken, expected: { valid: false, admin: false } },
    { name: '普通用户Token', token: userToken, expected: { valid: true, admin: false } },
    { name: '无效Token', token: 'invalid.token.here', expected: { valid: false, admin: false } },
    { name: '空Token', token: '', expected: { valid: false, admin: false } }
  ];
  
  testCases.forEach(testCase => {
    log(`\n测试: ${testCase.name}`, 'cyan');
    
    try {
      // 简单的JWT解析模拟
      if (!testCase.token || testCase.token === 'invalid.token.here') {
        log('❌ Token格式无效', 'red');
        return;
      }
      
      const parts = testCase.token.split('.');
      if (parts.length !== 3) {
        log('❌ Token格式错误', 'red');
        return;
      }
      
      // 解析payload（简化版）
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const now = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp && payload.exp < now;
        const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
        
        log(`📋 Token信息:`, 'blue');
        log(`   用户ID: ${payload.userId}`);
        log(`   手机号: ${payload.phone}`);
        log(`   角色: ${payload.role}`);
        log(`   过期时间: ${new Date(payload.exp * 1000).toLocaleString()}`);
        log(`   是否过期: ${isExpired ? '是' : '否'}`);
        log(`   是否管理员: ${isAdmin ? '是' : '否'}`);
        
        if (isExpired) {
          log('❌ Token已过期', 'red');
        } else if (isAdmin) {
          log('✅ 有效的管理员Token', 'green');
        } else {
          log('⚠️  有效但非管理员Token', 'yellow');
        }
        
      } catch (parseError) {
        log('❌ Token payload解析失败', 'red');
      }
      
    } catch (error) {
      log(`❌ Token验证失败: ${error.message}`, 'red');
    }
  });
}

// 模拟管理员登录流程
function simulateAdminLogin() {
  log('\n=== 模拟管理员登录流程 ===', 'blue');
  
  // 模拟登录请求
  const loginData = {
    phone: '13800000000',
    password: 'admin123',
    isAdmin: true
  };
  
  log(`📱 登录请求: ${JSON.stringify(loginData)}`, 'cyan');
  
  // 模拟成功的登录响应
  const mockLoginResponse = {
    success: true,
    message: '登录成功',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJwaG9uZSI6IjEzODAwMDAwMDAwIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI0NjY2NjY2LCJleHAiOjk5OTk5OTk5OTl9.test',
    user: {
      userId: '123456',
      phone: '13800000000',
      name: '管理员',
      role: 'admin',
      isAdmin: true
    }
  };
  
  log('✅ 登录成功，保存认证信息到localStorage', 'green');
  mockLocalStorage.setItem('token', mockLoginResponse.token);
  mockLocalStorage.setItem('user', JSON.stringify(mockLoginResponse.user));
  
  log(`🔑 Token: ${mockLoginResponse.token.substring(0, 50)}...`, 'blue');
  log(`👤 用户信息: ${JSON.stringify(mockLoginResponse.user)}`, 'blue');
  
  return mockLoginResponse;
}

// 模拟AdminGuard权限检查
function simulateAdminGuardCheck() {
  log('\n=== 模拟AdminGuard权限检查 ===', 'blue');
  
  const token = mockLocalStorage.getItem('token');
  const userStr = mockLocalStorage.getItem('user');
  
  if (!token || !userStr) {
    log('❌ 未找到认证信息', 'red');
    return false;
  }
  
  log('🔍 第一步: 本地token验证', 'cyan');
  
  try {
    // 简化的token验证
    const parts = token.split('.');
    if (parts.length !== 3) {
      log('❌ Token格式错误', 'red');
      return false;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    const isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
    
    if (isExpired) {
      log('❌ Token已过期', 'red');
      return false;
    }
    
    if (!isAdmin) {
      log('❌ 非管理员用户', 'red');
      return false;
    }
    
    log('✅ 本地token验证通过', 'green');
    
    // 模拟远程权限检查
    log('🌐 第二步: 远程权限验证', 'cyan');
    
    // 模拟API调用
    const mockApiResponse = {
      success: true,
      message: '管理员权限验证成功',
      user: {
        userId: payload.userId,
        phone: payload.phone,
        role: payload.role
      }
    };
    
    log('✅ 远程权限验证通过', 'green');
    log(`📋 API响应: ${JSON.stringify(mockApiResponse)}`, 'blue');
    
    return true;
    
  } catch (error) {
    log(`❌ 权限检查失败: ${error.message}`, 'red');
    return false;
  }
}

// 模拟用户列表API调用
function simulateUserListAPI() {
  log('\n=== 模拟用户列表API调用 ===', 'blue');
  
  const token = mockLocalStorage.getItem('token');
  
  if (!token) {
    log('❌ 未找到token', 'red');
    return false;
  }
  
  log('📡 发送用户列表请求', 'cyan');
  log(`🔑 Authorization: Bearer ${token.substring(0, 50)}...`, 'blue');
  
  // 模拟成功的API响应
  const mockUsersResponse = {
    success: true,
    data: {
      users: [
        {
          userId: '123456',
          phone: '13800000000',
          name: '管理员',
          role: 'admin',
          status: 'active'
        },
        {
          userId: '123457',
          phone: '13800000001',
          name: '普通用户',
          role: 'user',
          status: 'active'
        }
      ],
      total: 2,
      page: 1,
      pageSize: 10
    }
  };
  
  log('✅ 用户列表获取成功', 'green');
  log(`📋 返回 ${mockUsersResponse.data.users.length} 个用户`, 'blue');
  
  return true;
}

// 模拟认证失败场景
function simulateAuthFailureScenarios() {
  log('\n=== 模拟认证失败场景 ===', 'blue');
  
  const scenarios = [
    {
      name: 'Token过期',
      setup: () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJwaG9uZSI6IjEzODAwMDAwMDAwIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI0NjY2NjY2LCJleHAiOjE3MjQ2NjY2NjZ9.test';
        mockLocalStorage.setItem('token', expiredToken);
      }
    },
    {
      name: '非管理员用户',
      setup: () => {
        const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJwaG9uZSI6IjEzODAwMDAwMDAwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MjQ2NjY2NjYsImV4cCI6OTk5OTk5OTk5OX0.test';
        mockLocalStorage.setItem('token', userToken);
      }
    },
    {
      name: '无效Token',
      setup: () => {
        mockLocalStorage.setItem('token', 'invalid.token.format');
      }
    },
    {
      name: '缺少Token',
      setup: () => {
        mockLocalStorage.removeItem('token');
      }
    }
  ];
  
  scenarios.forEach(scenario => {
    log(`\n🧪 测试场景: ${scenario.name}`, 'cyan');
    
    // 设置测试环境
    mockLocalStorage.clear();
    scenario.setup();
    
    // 执行权限检查
    const hasPermission = simulateAdminGuardCheck();
    
    if (!hasPermission) {
      log(`✅ 正确拒绝了 ${scenario.name} 场景`, 'green');
    } else {
      log(`❌ 错误允许了 ${scenario.name} 场景`, 'red');
    }
  });
}

// 生成修复建议
function generateFixRecommendations() {
  log('\n=== 修复建议 ===', 'blue');
  
  const recommendations = [
    {
      issue: '重复权限检查',
      solution: '优化AdminGuard和UserList的权限检查逻辑，避免重复验证',
      priority: 'high'
    },
    {
      issue: 'Token过期处理',
      solution: '实现token自动刷新机制，或在过期时自动重定向到登录页',
      priority: 'high'
    },
    {
      issue: '错误处理不一致',
      solution: '统一认证错误处理逻辑，确保所有组件使用相同的错误处理方式',
      priority: 'medium'
    },
    {
      issue: '网络错误处理',
      solution: '改进网络错误时的降级策略，避免频繁的重新登录要求',
      priority: 'medium'
    },
    {
      issue: '调试信息不足',
      solution: '添加更详细的日志记录，帮助诊断认证问题',
      priority: 'low'
    }
  ];
  
  recommendations.forEach((rec, index) => {
    const priorityColor = rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'blue';
    log(`\n${index + 1}. ${rec.issue} [${rec.priority.toUpperCase()}]`, priorityColor);
    log(`   解决方案: ${rec.solution}`);
  });
}

// 主函数
function main() {
  log('🚀 开始管理员认证流程测试...', 'blue');
  log('='.repeat(60), 'blue');
  
  try {
    // 1. JWT工具函数检查
    const jwtUtils = loadJWTUtils();
    if (jwtUtils) {
      log('✅ JWT工具函数加载成功', 'green');
    }
    
    // 2. JWT验证测试
    mockJWTValidation();
    
    // 3. 完整认证流程测试
    log('\n' + '='.repeat(60), 'blue');
    log('🔄 完整认证流程测试', 'blue');
    
    // 清理环境
    mockLocalStorage.clear();
    
    // 模拟登录
    const loginResult = simulateAdminLogin();
    
    // 模拟权限检查
    const hasPermission = simulateAdminGuardCheck();
    
    if (hasPermission) {
      // 模拟用户列表访问
      simulateUserListAPI();
    }
    
    // 4. 失败场景测试
    simulateAuthFailureScenarios();
    
    // 5. 生成修复建议
    generateFixRecommendations();
    
    log('\n' + '='.repeat(60), 'blue');
    log('✅ 认证流程测试完成', 'green');
    
  } catch (error) {
    log(`❌ 测试过程中发生错误: ${error.message}`, 'red');
    console.error(error);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  simulateAdminLogin,
  simulateAdminGuardCheck,
  simulateUserListAPI,
  simulateAuthFailureScenarios,
  generateFixRecommendations
};