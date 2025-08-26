/**
 * 管理员认证问题诊断脚本
 * 用于测试和修复管理员登录后查看用户列表时认证失败的问题
 * 
 * 功能：
 * 1. 测试管理员登录流程
 * 2. 验证token的有效性和权限
 * 3. 模拟用户列表API调用
 * 4. 检查权限检查API
 * 5. 输出详细的诊断信息和修复建议
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * 诊断结果类型定义
 */
class DiagnosticResult {
  constructor(test, status, message, details = null) {
    this.test = test;
    this.status = status; // 'pass', 'fail', 'warning'
    this.message = message;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 管理员认证诊断器
 */
class AdminAuthDiagnostic {
  constructor() {
    this.results = [];
    this.adminCredentials = {
      phone: '13800138000', // 默认管理员手机号
      password: 'admin123'   // 默认管理员密码
    };
    this.token = null;
    this.refreshToken = null;
  }

  /**
   * 添加诊断结果
   * @param {string} test - 测试名称
   * @param {string} status - 状态 ('pass', 'fail', 'warning')
   * @param {string} message - 消息
   * @param {object} details - 详细信息
   */
  addResult(test, status, message, details = null) {
    const result = new DiagnosticResult(test, status, message, details);
    this.results.push(result);
    console.log(`[${status.toUpperCase()}] ${test}: ${message}`);
    if (details) {
      console.log('详细信息:', details);
    }
  }

  /**
   * 测试管理员登录流程
   */
  async testAdminLogin() {
    console.log('\n=== 测试管理员登录流程 ===');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: this.adminCredentials.phone,
          password: this.adminCredentials.password,
          login_type: 'password'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.token = data.data.token;
        this.refreshToken = data.data.refreshToken;
        
        this.addResult(
          '管理员登录',
          'pass',
          '管理员登录成功',
          {
            userId: data.data.user?.id,
            userRole: data.data.user?.role,
            tokenLength: this.token?.length,
            hasRefreshToken: !!this.refreshToken
          }
        );
        
        return true;
      } else {
        this.addResult(
          '管理员登录',
          'fail',
          `管理员登录失败: ${data.message || '未知错误'}`,
          {
            statusCode: response.status,
            responseData: data
          }
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        '管理员登录',
        'fail',
        `管理员登录请求失败: ${error.message}`,
        { error: error.toString() }
      );
      return false;
    }
  }

  /**
   * 验证JWT token的有效性
   */
  async testTokenValidation() {
    console.log('\n=== 验证JWT Token有效性 ===');
    
    if (!this.token) {
      this.addResult(
        'Token验证',
        'fail',
        'Token不存在，无法进行验证'
      );
      return false;
    }

    try {
      // 解析JWT token（不验证签名，仅检查格式和内容）
      const tokenParts = this.token.split('.');
      if (tokenParts.length !== 3) {
        this.addResult(
          'Token格式验证',
          'fail',
          'Token格式无效，不是有效的JWT格式'
        );
        return false;
      }

      // 解码payload
      const payload = JSON.parse(atob(tokenParts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      this.addResult(
        'Token格式验证',
        'pass',
        'Token格式有效',
        {
          userId: payload.userId,
          role: payload.role,
          issuedAt: new Date(payload.iat * 1000).toISOString(),
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          isExpired: payload.exp < currentTime
        }
      );

      // 检查token是否过期
      if (payload.exp < currentTime) {
        this.addResult(
          'Token过期检查',
          'warning',
          'Token已过期，需要刷新',
          {
            expiredSeconds: currentTime - payload.exp
          }
        );
        return false;
      } else {
        this.addResult(
          'Token过期检查',
          'pass',
          'Token未过期',
          {
            remainingSeconds: payload.exp - currentTime
          }
        );
      }

      return true;
    } catch (error) {
      this.addResult(
        'Token验证',
        'fail',
        `Token解析失败: ${error.message}`,
        { error: error.toString() }
      );
      return false;
    }
  }

  /**
   * 测试权限检查API
   */
  async testPermissionCheck() {
    console.log('\n=== 测试权限检查API ===');
    
    if (!this.token) {
      this.addResult(
        '权限检查API',
        'fail',
        '无Token，跳过权限检查测试'
      );
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/auth/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.addResult(
          '权限检查API',
          'pass',
          '权限检查通过',
          {
            userId: data.data?.user?.id,
            userRole: data.data?.user?.role,
            permissions: data.data?.permissions
          }
        );
        return true;
      } else {
        this.addResult(
          '权限检查API',
          'fail',
          `权限检查失败: ${data.message || '未知错误'}`,
          {
            statusCode: response.status,
            responseData: data
          }
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        '权限检查API',
        'fail',
        `权限检查请求失败: ${error.message}`,
        { error: error.toString() }
      );
      return false;
    }
  }

  /**
   * 测试用户列表API调用
   */
  async testUserListAPI() {
    console.log('\n=== 测试用户列表API ===');
    
    if (!this.token) {
      this.addResult(
        '用户列表API',
        'fail',
        '无Token，跳过用户列表API测试'
      );
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users?page=1&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.addResult(
          '用户列表API',
          'pass',
          '用户列表获取成功',
          {
            userCount: data.data?.users?.length || 0,
            totalUsers: data.data?.pagination?.total || 0,
            currentPage: data.data?.pagination?.page || 1
          }
        );
        return true;
      } else {
        this.addResult(
          '用户列表API',
          'fail',
          `用户列表获取失败: ${data.message || '未知错误'}`,
          {
            statusCode: response.status,
            responseData: data
          }
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        '用户列表API',
        'fail',
        `用户列表请求失败: ${error.message}`,
        { error: error.toString() }
      );
      return false;
    }
  }

  /**
   * 测试Token刷新机制
   */
  async testTokenRefresh() {
    console.log('\n=== 测试Token刷新机制 ===');
    
    if (!this.refreshToken) {
      this.addResult(
        'Token刷新',
        'warning',
        '无RefreshToken，跳过刷新测试'
      );
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.addResult(
          'Token刷新',
          'pass',
          'Token刷新成功',
          {
            newTokenLength: data.data?.token?.length,
            newRefreshTokenLength: data.data?.refreshToken?.length
          }
        );
        return true;
      } else {
        this.addResult(
          'Token刷新',
          'fail',
          `Token刷新失败: ${data.message || '未知错误'}`,
          {
            statusCode: response.status,
            responseData: data
          }
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        'Token刷新',
        'fail',
        `Token刷新请求失败: ${error.message}`,
        { error: error.toString() }
      );
      return false;
    }
  }

  /**
   * 生成诊断报告
   */
  generateReport() {
    console.log('\n=== 诊断报告 ===');
    
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    
    console.log(`总测试数: ${this.results.length}`);
    console.log(`通过: ${passCount}`);
    console.log(`失败: ${failCount}`);
    console.log(`警告: ${warningCount}`);
    
    if (failCount > 0) {
      console.log('\n=== 失败的测试 ===');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(result => {
          console.log(`- ${result.test}: ${result.message}`);
        });
    }
    
    console.log('\n=== 修复建议 ===');
    this.generateFixSuggestions();
    
    return {
      summary: {
        total: this.results.length,
        passed: passCount,
        failed: failCount,
        warnings: warningCount
      },
      results: this.results
    };
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions() {
    const failedTests = this.results.filter(r => r.status === 'fail');
    
    if (failedTests.some(t => t.test === '管理员登录')) {
      console.log('1. 检查管理员账户配置:');
      console.log('   - 确认管理员账户存在且密码正确');
      console.log('   - 检查数据库连接是否正常');
      console.log('   - 验证登录API端点是否正确实现');
    }
    
    if (failedTests.some(t => t.test.includes('Token'))) {
      console.log('2. 检查JWT Token配置:');
      console.log('   - 验证JWT_SECRET环境变量是否设置');
      console.log('   - 检查token生成逻辑是否正确');
      console.log('   - 确认token过期时间设置合理');
    }
    
    if (failedTests.some(t => t.test === '权限检查API')) {
      console.log('3. 检查权限验证逻辑:');
      console.log('   - 确认AdminGuard组件配置正确');
      console.log('   - 检查权限检查API实现');
      console.log('   - 验证用户角色权限设置');
    }
    
    if (failedTests.some(t => t.test === '用户列表API')) {
      console.log('4. 检查用户列表API:');
      console.log('   - 确认API路由配置正确');
      console.log('   - 检查数据库查询逻辑');
      console.log('   - 验证响应数据格式');
    }
    
    console.log('\n5. 通用建议:');
    console.log('   - 检查网络连接和服务器状态');
    console.log('   - 查看服务器日志获取详细错误信息');
    console.log('   - 确认所有依赖包已正确安装');
    console.log('   - 验证环境变量配置完整');
  }

  /**
   * 运行完整诊断
   */
  async runFullDiagnostic() {
    console.log('开始管理员认证问题诊断...');
    console.log('='.repeat(50));
    
    // 1. 测试管理员登录
    const loginSuccess = await this.testAdminLogin();
    
    // 2. 验证Token
    if (loginSuccess) {
      await this.testTokenValidation();
    }
    
    // 3. 测试权限检查
    if (loginSuccess) {
      await this.testPermissionCheck();
    }
    
    // 4. 测试用户列表API
    if (loginSuccess) {
      await this.testUserListAPI();
    }
    
    // 5. 测试Token刷新
    if (loginSuccess) {
      await this.testTokenRefresh();
    }
    
    // 6. 生成报告
    const report = this.generateReport();
    
    console.log('\n诊断完成!');
    console.log('='.repeat(50));
    
    return report;
  }
}

// 如果直接运行此脚本
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  // Node.js环境
  const diagnostic = new AdminAuthDiagnostic();
  diagnostic.runFullDiagnostic().catch(console.error);
} else {
  // 浏览器环境
  window.AdminAuthDiagnostic = AdminAuthDiagnostic;
  console.log('AdminAuthDiagnostic类已加载，可以使用以下方式运行诊断:');
  console.log('const diagnostic = new AdminAuthDiagnostic();');
  console.log('diagnostic.runFullDiagnostic();');
}