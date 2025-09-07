/**
 * 权限控制和安全机制测试
 * 
 * 功能说明：
 * - 测试用户权限验证
 * - 测试JWT令牌安全
 * - 测试防作弊机制
 * - 测试数据保护措施
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class PermissionControlTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.testName = '权限控制和安全机制测试';
  }

  /**
   * 执行所有权限控制相关测试
   * @returns {Promise<Object>} 测试结果
   */
  async runAllTests() {
    this.testUtils.log(`开始执行 ${this.testName}`, 'info');
    
    try {
      // 测试用例列表
      const testCases = [
        { name: 'JWT令牌验证测试', method: 'testJWTValidation' },
        { name: '令牌过期处理测试', method: 'testTokenExpiration' },
        { name: '管理员权限验证', method: 'testAdminPermissions' },
        { name: '学生权限验证', method: 'testStudentPermissions' },
        { name: '跨用户访问控制', method: 'testCrossUserAccess' },
        { name: '无效令牌处理', method: 'testInvalidToken' },
        { name: '防作弊机制测试', method: 'testAntiCheatingMechanisms' },
        { name: '数据保护测试', method: 'testDataProtection' },
        { name: '会话安全测试', method: 'testSessionSecurity' },
        { name: '输入验证测试', method: 'testInputValidation' }
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
   * 测试JWT令牌验证
   */
  async testJWTValidation() {
    const testName = 'JWT令牌验证测试';
    
    try {
      // 先登录获取有效令牌
      const loginResult = await this.testUtils.login('admin');
      if (!loginResult.success) {
        this.testUtils.recordTestResult(
          testName,
          false,
          '无法获取有效令牌进行测试',
          { loginResult }
        );
        return;
      }

      // 使用有效令牌访问受保护资源
      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.exams.list
      );

      const validTokenAccess = this.testUtils.validateResponse(response, 200);
      
      this.testUtils.recordTestResult(
        testName,
        validTokenAccess,
        validTokenAccess ? 'JWT令牌验证成功' : 'JWT令牌验证失败',
        {
          tokenPresent: !!this.testUtils.tokens.admin,
          responseStatus: response.status
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
   * 测试令牌过期处理
   */
  async testTokenExpiration() {
    const testName = '令牌过期处理测试';
    
    try {
      // 使用过期或无效的令牌
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.exams.list,
        null,
        {
          'Authorization': `Bearer ${expiredToken}`,
          'Content-Type': 'application/json'
        }
      );

      // 应该返回401未授权错误
      const correctlyRejected = response.status === 401 || response.status === 403;
      
      this.testUtils.recordTestResult(
        testName,
        correctlyRejected,
        correctlyRejected ? '过期令牌正确被拒绝' : '过期令牌未被正确处理',
        {
          responseStatus: response.status,
          tokenRejected: correctlyRejected
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
   * 测试管理员权限验证
   */
  async testAdminPermissions() {
    const testName = '管理员权限验证';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      // 测试管理员专有功能
      const adminOnlyEndpoints = [
        { url: config.endpoints.questions.create, method: 'POST', data: config.testData.sampleQuestion },
        { url: config.endpoints.exams.create, method: 'POST', data: config.testData.sampleExam },
        { url: config.endpoints.grades.list, method: 'GET' },
        { url: config.endpoints.grades.statistics, method: 'GET' }
      ];

      let passedCount = 0;
      const results = [];

      for (const endpoint of adminOnlyEndpoints) {
        const response = await this.testUtils.authRequest(
          'admin',
          endpoint.method,
          endpoint.url,
          endpoint.data
        );

        const hasAccess = this.testUtils.validateResponse(response, [200, 201]);
        if (hasAccess) passedCount++;
        
        results.push({
          endpoint: endpoint.url,
          method: endpoint.method,
          hasAccess,
          status: response.status
        });
      }

      const allPermissionsValid = passedCount === adminOnlyEndpoints.length;
      this.testUtils.recordTestResult(
        testName,
        allPermissionsValid,
        `管理员权限验证 ${passedCount}/${adminOnlyEndpoints.length} 通过`,
        { results }
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
   * 测试学生权限验证
   */
  async testStudentPermissions() {
    const testName = '学生权限验证';
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      // 测试学生应该被拒绝的管理员功能
      const adminOnlyEndpoints = [
        { url: config.endpoints.questions.create, method: 'POST', data: config.testData.sampleQuestion },
        { url: config.endpoints.exams.create, method: 'POST', data: config.testData.sampleExam },
        { url: config.endpoints.grades.list, method: 'GET' }
      ];

      let correctlyDeniedCount = 0;
      const results = [];

      for (const endpoint of adminOnlyEndpoints) {
        const response = await this.testUtils.authRequest(
          'student',
          endpoint.method,
          endpoint.url,
          endpoint.data
        );

        const correctlyDenied = response.status === 403 || response.status === 401;
        if (correctlyDenied) correctlyDeniedCount++;
        
        results.push({
          endpoint: endpoint.url,
          method: endpoint.method,
          correctlyDenied,
          status: response.status
        });
      }

      // 测试学生允许的功能
      const studentAllowedEndpoints = [
        { url: config.endpoints.exams.available, method: 'GET' },
        { url: config.endpoints.grades.myGrades, method: 'GET' }
      ];

      let allowedAccessCount = 0;
      for (const endpoint of studentAllowedEndpoints) {
        const response = await this.testUtils.authRequest(
          'student',
          endpoint.method,
          endpoint.url
        );

        const hasAccess = this.testUtils.validateResponse(response, 200);
        if (hasAccess) allowedAccessCount++;
        
        results.push({
          endpoint: endpoint.url,
          method: endpoint.method,
          hasAccess,
          status: response.status
        });
      }

      const allPermissionsCorrect = correctlyDeniedCount === adminOnlyEndpoints.length &&
                                   allowedAccessCount === studentAllowedEndpoints.length;
      
      this.testUtils.recordTestResult(
        testName,
        allPermissionsCorrect,
        `学生权限验证 - 拒绝: ${correctlyDeniedCount}/${adminOnlyEndpoints.length}, 允许: ${allowedAccessCount}/${studentAllowedEndpoints.length}`,
        { results }
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
   * 测试跨用户访问控制
   */
  async testCrossUserAccess() {
    const testName = '跨用户访问控制';
    
    try {
      // 学生尝试访问其他学生的数据
      await this.testUtils.login('student');
      
      const otherStudentId = 'other-student-123';
      const response = await this.testUtils.authRequest(
        'student',
        'GET',
        `${config.endpoints.grades.byStudent}/${otherStudentId}`
      );

      const correctlyDenied = response.status === 403 || response.status === 401;
      
      this.testUtils.recordTestResult(
        testName,
        correctlyDenied,
        correctlyDenied ? '跨用户访问控制正常' : '跨用户访问控制异常',
        {
          attemptedAccess: `grades for student ${otherStudentId}`,
          responseStatus: response.status,
          accessDenied: correctlyDenied
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
   * 测试无效令牌处理
   */
  async testInvalidToken() {
    const testName = '无效令牌处理';
    
    try {
      const invalidTokens = [
        'invalid-token',
        '',
        'Bearer invalid',
        'malformed.jwt.token'
      ];

      let correctlyRejectedCount = 0;
      const results = [];

      for (const token of invalidTokens) {
        const response = await this.testUtils.makeRequest(
          'GET',
          config.endpoints.exams.list,
          null,
          {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        );

        const correctlyRejected = response.status === 401 || response.status === 403;
        if (correctlyRejected) correctlyRejectedCount++;
        
        results.push({
          token: token.substring(0, 20) + '...',
          correctlyRejected,
          status: response.status
        });
      }

      const allInvalidTokensRejected = correctlyRejectedCount === invalidTokens.length;
      
      this.testUtils.recordTestResult(
        testName,
        allInvalidTokensRejected,
        `无效令牌处理 ${correctlyRejectedCount}/${invalidTokens.length} 正确拒绝`,
        { results }
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
   * 测试防作弊机制
   */
  async testAntiCheatingMechanisms() {
    const testName = '防作弊机制测试';
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      // 测试考试状态监控
      const examId = 'test-exam-1';
      
      // 开始考试
      const startResponse = await this.testUtils.authRequest(
        'student',
        'POST',
        `${config.endpoints.exams.start}/${examId}`
      );

      if (this.testUtils.validateResponse(startResponse, 200)) {
        // 测试切屏检测模拟
        const cheatingEvents = [
          { type: 'tab_switch', timestamp: Date.now() },
          { type: 'window_blur', timestamp: Date.now() + 1000 },
          { type: 'fullscreen_exit', timestamp: Date.now() + 2000 }
        ];

        let detectionCount = 0;
        const detectionResults = [];

        for (const event of cheatingEvents) {
          const response = await this.testUtils.authRequest(
            'student',
            'POST',
            `${config.endpoints.exams.reportEvent}/${examId}`,
            event
          );

          const eventRecorded = this.testUtils.validateResponse(response, 200);
          if (eventRecorded) detectionCount++;
          
          detectionResults.push({
            eventType: event.type,
            recorded: eventRecorded,
            status: response.status
          });
        }

        const antiCheatingWorking = detectionCount > 0;
        
        this.testUtils.recordTestResult(
          testName,
          antiCheatingWorking,
          antiCheatingWorking ? `防作弊机制正常，检测到 ${detectionCount} 个事件` : '防作弊机制未正常工作',
          {
            examId,
            detectedEvents: detectionCount,
            totalEvents: cheatingEvents.length,
            detectionResults
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '无法开始考试进行防作弊测试',
          { examId, startResponse }
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
   * 测试数据保护
   */
  async testDataProtection() {
    const testName = '数据保护测试';
    
    try {
      // 测试敏感信息是否被正确保护
      await this.testUtils.login('student');
      
      // 获取用户信息，检查是否包含敏感数据
      const response = await this.testUtils.authRequest(
        'student',
        'GET',
        config.endpoints.auth.profile
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const userData = response.data;
        
        // 检查敏感信息是否被脱敏
        const sensitiveFields = ['password', 'passwordHash', 'salt'];
        let protectedFieldsCount = 0;
        
        for (const field of sensitiveFields) {
          if (!(field in userData)) {
            protectedFieldsCount++;
          }
        }

        // 检查手机号是否被脱敏
        const phoneProtected = !userData.phone || 
                              userData.phone.includes('*') || 
                              userData.phone.length < 11;
        
        if (phoneProtected) protectedFieldsCount++;

        const dataProtected = protectedFieldsCount >= sensitiveFields.length;
        
        this.testUtils.recordTestResult(
          testName,
          dataProtected,
          dataProtected ? '数据保护机制正常' : '存在敏感信息泄露风险',
          {
            protectedFields: protectedFieldsCount,
            totalSensitiveFields: sensitiveFields.length + 1,
            phoneProtected,
            userData: {
              hasPassword: 'password' in userData,
              hasPasswordHash: 'passwordHash' in userData,
              phoneFormat: userData.phone ? userData.phone.substring(0, 3) + '***' : 'not present'
            }
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '无法获取用户信息进行数据保护测试',
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
   * 测试会话安全
   */
  async testSessionSecurity() {
    const testName = '会话安全测试';
    
    try {
      // 测试会话超时机制
      await this.testUtils.login('student');
      
      // 获取当前会话信息
      const sessionResponse = await this.testUtils.authRequest(
        'student',
        'GET',
        config.endpoints.auth.session
      );

      if (this.testUtils.validateResponse(sessionResponse, 200)) {
        const sessionData = sessionData.data || sessionResponse.data;
        
        // 检查会话是否有过期时间
        const hasExpiration = sessionData.expiresAt || sessionData.expires_at || sessionData.exp;
        
        // 测试会话刷新
        const refreshResponse = await this.testUtils.authRequest(
          'student',
          'POST',
          config.endpoints.auth.refresh
        );

        const canRefresh = this.testUtils.validateResponse(refreshResponse, 200);
        
        const sessionSecure = hasExpiration && canRefresh;
        
        this.testUtils.recordTestResult(
          testName,
          sessionSecure,
          sessionSecure ? '会话安全机制正常' : '会话安全机制存在问题',
          {
            hasExpiration: !!hasExpiration,
            canRefresh,
            expirationTime: hasExpiration
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '无法获取会话信息进行安全测试',
          { sessionResponse }
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
   * 测试输入验证
   */
  async testInputValidation() {
    const testName = '输入验证测试';
    
    try {
      // 测试各种恶意输入
      const maliciousInputs = [
        {
          description: 'SQL注入测试',
          data: { username: "admin'; DROP TABLE users; --", password: 'password' }
        },
        {
          description: 'XSS脚本测试',
          data: { username: '<script>alert("xss")</script>', password: 'password' }
        },
        {
          description: '超长输入测试',
          data: { username: 'a'.repeat(1000), password: 'password' }
        },
        {
          description: '特殊字符测试',
          data: { username: '../../etc/passwd', password: 'password' }
        }
      ];

      let validationCount = 0;
      const results = [];

      for (const input of maliciousInputs) {
        const response = await this.testUtils.makeRequest(
          'POST',
          config.endpoints.auth.login,
          input.data
        );

        // 应该返回400错误或登录失败，而不是500服务器错误
        const properlyValidated = response.status !== 500 && 
                                 (response.status === 400 || response.status === 401);
        
        if (properlyValidated) validationCount++;
        
        results.push({
          description: input.description,
          properlyValidated,
          status: response.status,
          inputSample: input.data.username.substring(0, 20) + '...'
        });
      }

      const inputValidationWorking = validationCount === maliciousInputs.length;
      
      this.testUtils.recordTestResult(
        testName,
        inputValidationWorking,
        `输入验证 ${validationCount}/${maliciousInputs.length} 正确处理`,
        { results }
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

module.exports = PermissionControlTest;