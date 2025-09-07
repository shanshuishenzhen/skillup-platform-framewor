/**
 * 管理员登录功能测试
 * 
 * 功能说明：
 * - 测试管理员账号登录功能
 * - 验证登录响应和令牌
 * - 测试权限验证
 * - 测试登录状态保持
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class AdminLoginTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.testName = '管理员登录测试';
  }

  /**
   * 执行所有管理员登录相关测试
   * @returns {Promise<Object>} 测试结果
   */
  async runAllTests() {
    this.testUtils.log(`开始执行 ${this.testName}`, 'info');
    
    try {
      // 测试用例列表
      const testCases = [
        { name: '管理员正常登录', method: 'testAdminLogin' },
        { name: '管理员登录验证令牌', method: 'testTokenValidation' },
        { name: '管理员权限验证', method: 'testAdminPermissions' },
        { name: '错误密码登录', method: 'testWrongPassword' },
        { name: '不存在用户登录', method: 'testNonExistentUser' },
        { name: '空参数登录', method: 'testEmptyCredentials' },
        { name: '登录状态保持', method: 'testLoginPersistence' }
      ];

      // 执行所有测试用例
      for (const testCase of testCases) {
        try {
          await this[testCase.method]();
        } catch (error) {
          this.testUtils.recordTestResult(
            testCase.name,
            false,
            `测试执行异常: ${error.message}`,
            { error: error.stack }
          );
        }
      }

      const statistics = this.testUtils.getTestStatistics();
      this.testUtils.log(`${this.testName} 完成 - 通过率: ${statistics.passRate}`, 'info');
      
      return {
        success: true,
        statistics,
        results: this.testUtils.testResults
      };
    } catch (error) {
      this.testUtils.log(`${this.testName} 执行失败: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试管理员正常登录
   */
  async testAdminLogin() {
    const testName = '管理员正常登录';
    
    try {
      const loginData = {
        phone: config.accounts.admin.username,
        password: config.accounts.admin.password
      };

      const response = await this.testUtils.request(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      // 验证响应
      if (this.testUtils.validateResponse(response, 200)) {
        // 验证响应数据结构
        const requiredFields = ['token', 'user', 'role'];
        let hasAllFields = true;
        
        for (const field of requiredFields) {
          if (!(field in response.data)) {
            hasAllFields = false;
            break;
          }
        }

        if (hasAllFields && response.data.role === 'admin') {
          this.testUtils.recordTestResult(
            testName,
            true,
            '管理员登录成功，返回正确的令牌和用户信息',
            {
              username: loginData.username,
              role: response.data.role,
              tokenLength: response.data.token?.length || 0
            }
          );
        } else {
          this.testUtils.recordTestResult(
            testName,
            false,
            '登录响应数据结构不完整或角色不正确',
            { responseData: response.data }
          );
        }
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '登录请求失败',
          { response }
        );
      }
    } catch (error) {
      this.testUtils.recordTestResult(
        testName,
        false,
        `测试异常: ${error.message}`,
        { error: error.stack }
      );
    }
  }

  /**
   * 测试令牌验证
   */
  async testTokenValidation() {
    const testName = '管理员登录验证令牌';
    
    try {
      // 先登录获取令牌
      const loginResult = await this.testUtils.login('admin');
      
      if (!loginResult.success) {
        this.testUtils.recordTestResult(
          testName,
          false,
          '无法获取管理员令牌',
          { loginResult }
        );
        return;
      }

      // 使用令牌验证身份
      const verifyResponse = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.auth.verify
      );

      if (this.testUtils.validateResponse(verifyResponse, 200)) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '令牌验证成功',
          { 
            tokenValid: true,
            userInfo: verifyResponse.data
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '令牌验证失败',
          { verifyResponse }
        );
      }
    } catch (error) {
      this.testUtils.recordTestResult(
        testName,
        false,
        `令牌验证异常: ${error.message}`,
        { error: error.stack }
      );
    }
  }

  /**
   * 测试管理员权限
   */
  async testAdminPermissions() {
    const testName = '管理员权限验证';
    
    try {
      // 确保已登录
      await this.testUtils.login('admin');

      // 测试访问管理员专用接口
      const permissionTests = [
        { endpoint: '/api/users', description: '用户管理接口' },
        { endpoint: '/api/exams', description: '考试管理接口' },
        { endpoint: '/api/questions', description: '题库管理接口' }
      ];

      let passedCount = 0;
      const results = [];

      for (const test of permissionTests) {
        const response = await this.testUtils.authRequest(
          'admin',
          'GET',
          test.endpoint
        );

        const passed = response.success && (response.status === 200 || response.status === 404);
        if (passed) passedCount++;
        
        results.push({
          endpoint: test.endpoint,
          description: test.description,
          status: response.status,
          passed
        });
      }

      const allPassed = passedCount === permissionTests.length;
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `管理员权限验证 ${passedCount}/${permissionTests.length} 通过`,
        { results }
      );
    } catch (error) {
      this.testUtils.recordTestResult(
        testName,
        false,
        `权限验证异常: ${error.message}`,
        { error: error.stack }
      );
    }
  }

  /**
   * 测试错误密码登录
   */
  async testWrongPassword() {
    const testName = '错误密码登录';
    
    try {
      const loginData = {
        username: config.accounts.admin.username,
        password: 'wrongpassword123'
      };

      const response = await this.testUtils.request(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      // 应该返回401或400错误
      const expectedFailure = !response.success || 
                            response.status === 401 || 
                            response.status === 400;

      this.testUtils.recordTestResult(
        testName,
        expectedFailure,
        expectedFailure ? '正确拒绝了错误密码登录' : '错误地允许了错误密码登录',
        {
          status: response.status,
          hasToken: !!(response.data && response.data.token)
        }
      );
    } catch (error) {
      this.testUtils.recordTestResult(
        testName,
        false,
        `测试异常: ${error.message}`,
        { error: error.stack }
      );
    }
  }

  /**
   * 测试不存在用户登录
   */
  async testNonExistentUser() {
    const testName = '不存在用户登录';
    
    try {
      const loginData = {
        username: '99999999999',
        password: 'anypassword'
      };

      const response = await this.testUtils.request(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      const expectedFailure = !response.success || 
                            response.status === 401 || 
                            response.status === 404;

      this.testUtils.recordTestResult(
        testName,
        expectedFailure,
        expectedFailure ? '正确拒绝了不存在用户登录' : '错误地允许了不存在用户登录',
        { status: response.status }
      );
    } catch (error) {
      this.testUtils.recordTestResult(
        testName,
        false,
        `测试异常: ${error.message}`,
        { error: error.stack }
      );
    }
  }

  /**
   * 测试空参数登录
   */
  async testEmptyCredentials() {
    const testName = '空参数登录';
    
    try {
      const testCases = [
        { username: '', password: '' },
        { username: config.accounts.admin.username, password: '' },
        { username: '', password: config.accounts.admin.password }
      ];

      let allRejected = true;

      for (const loginData of testCases) {
        const response = await this.testUtils.request(
          'POST',
          config.endpoints.auth.login,
          loginData
        );

        if (response.success && response.data && response.data.token) {
          allRejected = false;
          break;
        }
      }

      this.testUtils.recordTestResult(
        testName,
        allRejected,
        allRejected ? '正确拒绝了空参数登录' : '错误地允许了空参数登录',
        { testCases }
      );
    } catch (error) {
      this.testUtils.recordTestResult(
        testName,
        false,
        `测试异常: ${error.message}`,
        { error: error.stack }
      );
    }
  }

  /**
   * 测试登录状态保持
   */
  async testLoginPersistence() {
    const testName = '登录状态保持';
    
    try {
      // 登录
      await this.testUtils.login('admin');
      
      // 等待一段时间
      await this.testUtils.sleep(2000);
      
      // 再次验证令牌
      const verifyResponse = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.auth.verify
      );

      const persistent = this.testUtils.validateResponse(verifyResponse, 200);
      
      this.testUtils.recordTestResult(
        testName,
        persistent,
        persistent ? '登录状态保持正常' : '登录状态未能保持',
        { 
          verifyStatus: verifyResponse.status,
          waitTime: 2000
        }
      );
    } catch (error) {
      this.testUtils.recordTestResult(
        testName,
        false,
        `测试异常: ${error.message}`,
        { error: error.stack }
      );
    }
  }
}

module.exports = AdminLoginTest;