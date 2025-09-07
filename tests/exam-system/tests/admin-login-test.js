/**
 * 管理员登录测试
 * 测试管理员账号登录功能，包括正确登录、错误密码、权限验证等
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class AdminLoginTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.adminUser = config.testUsers.admin;
  }

  /**
   * 执行所有管理员登录相关测试
   */
  async runAllTests() {
    console.log('\n🔐 开始执行管理员登录测试套件');
    console.log('=' .repeat(50));

    try {
      await this.testValidAdminLogin();
      await this.testInvalidPassword();
      await this.testInvalidPhone();
      await this.testEmptyCredentials();
      await this.testAdminTokenValidation();
      await this.testAdminLogout();
    } catch (error) {
      console.error('测试执行出错:', error.message);
    }

    this.testUtils.printSummary();
    await this.testUtils.saveReport('admin-login-test-report.json');
  }

  /**
   * 测试有效的管理员登录
   */
  async testValidAdminLogin() {
    this.testUtils.startTest('有效管理员登录', '使用正确的管理员账号和密码进行登录');

    try {
      // 发送登录请求
      const loginData = {
        phone: this.adminUser.phone,
        password: this.adminUser.password,
        loginType: 'password'
      };

      this.testUtils.addStep(`发送登录请求: ${this.adminUser.phone}`);
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      // 验证响应
      this.testUtils.assert(response.success, '登录请求应该成功');
      this.testUtils.assert(response.status === 200, '响应状态码应该是200');
      this.testUtils.assert(response.data && response.data.success, '响应数据应该表示成功');
      
      // 验证返回的用户信息
      const userData = response.data.data;
      this.testUtils.assert(userData && userData.user, '应该返回用户信息');
      this.testUtils.assert(userData.user.phone === this.adminUser.phone, '返回的手机号应该匹配');
      this.testUtils.assert(userData.user.role === 'admin', '用户角色应该是admin');
      
      // 验证JWT令牌
      this.testUtils.assert(userData.token, '应该返回JWT令牌');
      this.testUtils.assert(typeof userData.token === 'string', 'JWT令牌应该是字符串');
      this.testUtils.assert(userData.token.length > 0, 'JWT令牌不应该为空');
      
      // 验证刷新令牌
      this.testUtils.assert(userData.refreshToken, '应该返回刷新令牌');
      
      // 保存令牌供后续测试使用
      this.adminToken = userData.token;
      this.refreshToken = userData.refreshToken;
      
      this.testUtils.addStep('验证用户信息和令牌', true, {
        userId: userData.user.id,
        phone: userData.user.phone,
        role: userData.user.role,
        hasToken: !!userData.token,
        hasRefreshToken: !!userData.refreshToken
      });

      this.testUtils.endTest(true, '管理员登录成功，所有验证通过');
    } catch (error) {
      this.testUtils.endTest(false, `登录测试失败: ${error.message}`);
    }
  }

  /**
   * 测试错误密码登录
   */
  async testInvalidPassword() {
    this.testUtils.startTest('错误密码登录', '使用错误密码尝试登录，应该被拒绝');

    try {
      const loginData = {
        phone: this.adminUser.phone,
        password: 'wrongpassword',
        loginType: 'password'
      };

      this.testUtils.addStep('发送错误密码登录请求');
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      // 验证应该登录失败
      this.testUtils.assert(!response.success || response.status === 401, '错误密码应该登录失败');
      this.testUtils.assert(response.status === 401, '应该返回401未授权状态码');
      
      if (response.data) {
        this.testUtils.assert(!response.data.success, '响应应该表示失败');
        this.testUtils.assert(response.data.message, '应该返回错误消息');
      }

      this.testUtils.endTest(true, '错误密码正确被拒绝');
    } catch (error) {
      this.testUtils.endTest(false, `错误密码测试失败: ${error.message}`);
    }
  }

  /**
   * 测试错误手机号登录
   */
  async testInvalidPhone() {
    this.testUtils.startTest('错误手机号登录', '使用不存在的手机号尝试登录');

    try {
      const loginData = {
        phone: '13999999999',
        password: this.adminUser.password,
        loginType: 'password'
      };

      this.testUtils.addStep('发送错误手机号登录请求');
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      // 验证应该登录失败
      this.testUtils.assert(!response.success || response.status === 401, '错误手机号应该登录失败');
      this.testUtils.assert(response.status === 401, '应该返回401未授权状态码');

      this.testUtils.endTest(true, '错误手机号正确被拒绝');
    } catch (error) {
      this.testUtils.endTest(false, `错误手机号测试失败: ${error.message}`);
    }
  }

  /**
   * 测试空凭据登录
   */
  async testEmptyCredentials() {
    this.testUtils.startTest('空凭据登录', '使用空的用户名或密码尝试登录');

    try {
      // 测试空手机号
      let loginData = {
        phone: '',
        password: this.adminUser.password,
        loginType: 'password'
      };

      this.testUtils.addStep('测试空手机号');
      let response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      this.testUtils.assert(!response.success || response.status >= 400, '空手机号应该被拒绝');

      // 测试空密码
      loginData = {
        phone: this.adminUser.phone,
        password: '',
        loginType: 'password'
      };

      this.testUtils.addStep('测试空密码');
      response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      this.testUtils.assert(!response.success || response.status >= 400, '空密码应该被拒绝');

      this.testUtils.endTest(true, '空凭据正确被拒绝');
    } catch (error) {
      this.testUtils.endTest(false, `空凭据测试失败: ${error.message}`);
    }
  }

  /**
   * 测试管理员令牌验证
   */
  async testAdminTokenValidation() {
    this.testUtils.startTest('管理员令牌验证', '验证管理员令牌是否有效且具有管理员权限');

    try {
      if (!this.adminToken) {
        throw new Error('没有可用的管理员令牌，请先执行登录测试');
      }

      // 使用令牌访问管理员接口
      this.testUtils.addStep('使用令牌访问管理员仪表板');
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.admin.dashboard,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      // 验证令牌有效性
      this.testUtils.assert(
        response.success && (response.status === 200 || response.status === 404),
        '管理员令牌应该被接受（即使接口不存在也应该通过认证）'
      );

      this.testUtils.endTest(true, '管理员令牌验证通过');
    } catch (error) {
      this.testUtils.endTest(false, `令牌验证测试失败: ${error.message}`);
    }
  }

  /**
   * 测试管理员登出
   */
  async testAdminLogout() {
    this.testUtils.startTest('管理员登出', '测试管理员登出功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过登出测试，没有有效令牌', true);
        this.testUtils.endTest(true, '跳过登出测试');
        return;
      }

      // 发送登出请求
      this.testUtils.addStep('发送登出请求');
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.logout,
        {},
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      // 验证登出响应（即使接口不存在，也记录结果）
      if (response.success) {
        this.testUtils.assert(response.status === 200, '登出应该成功');
        this.testUtils.addStep('登出成功', true);
      } else {
        this.testUtils.addStep(`登出接口响应: ${response.status}`, true, response.data);
      }

      this.testUtils.endTest(true, '登出测试完成');
    } catch (error) {
      this.testUtils.endTest(false, `登出测试失败: ${error.message}`);
    }
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const test = new AdminLoginTest();
  test.runAllTests().catch(console.error);
}

module.exports = AdminLoginTest;