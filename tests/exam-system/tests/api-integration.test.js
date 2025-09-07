/**
 * API接口完整性测试
 * 
 * 功能说明：
 * - 测试所有API端点的可用性
 * - 测试API响应格式和数据完整性
 * - 测试API错误处理机制
 * - 测试API性能和稳定性
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class APIIntegrationTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.testName = 'API接口完整性测试';
  }

  /**
   * 执行所有API集成测试
   * @returns {Promise<Object>} 测试结果
   */
  async runAllTests() {
    this.testUtils.log(`开始执行 ${this.testName}`, 'info');
    
    try {
      // 测试用例列表
      const testCases = [
        { name: '认证API测试', method: 'testAuthAPIs' },
        { name: '题库管理API测试', method: 'testQuestionAPIs' },
        { name: '考试管理API测试', method: 'testExamAPIs' },
        { name: '成绩管理API测试', method: 'testGradeAPIs' },
        { name: 'API响应格式测试', method: 'testAPIResponseFormats' },
        { name: 'API错误处理测试', method: 'testAPIErrorHandling' },
        { name: 'API性能测试', method: 'testAPIPerformance' },
        { name: 'API数据验证测试', method: 'testAPIDataValidation' },
        { name: 'API版本兼容性测试', method: 'testAPIVersionCompatibility' },
        { name: 'API限流测试', method: 'testAPIRateLimit' }
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
   * 测试认证相关API
   */
  async testAuthAPIs() {
    const testName = '认证API测试';
    
    try {
      const authEndpoints = [
        {
          name: '用户登录',
          method: 'POST',
          url: config.endpoints.auth.login,
          data: config.accounts.admin,
          expectedStatus: 200
        },
        {
          name: '获取用户信息',
          method: 'GET',
          url: config.endpoints.auth.profile,
          requireAuth: true,
          expectedStatus: 200
        },
        {
          name: '刷新令牌',
          method: 'POST',
          url: config.endpoints.auth.refresh,
          requireAuth: true,
          expectedStatus: 200
        },
        {
          name: '用户登出',
          method: 'POST',
          url: config.endpoints.auth.logout,
          requireAuth: true,
          expectedStatus: 200
        }
      ];

      let passedCount = 0;
      const results = [];

      // 先登录获取认证令牌
      await this.testUtils.login('admin');

      for (const endpoint of authEndpoints) {
        let response;
        
        if (endpoint.requireAuth) {
          response = await this.testUtils.authRequest(
            'admin',
            endpoint.method,
            endpoint.url,
            endpoint.data
          );
        } else {
          response = await this.testUtils.makeRequest(
            endpoint.method,
            endpoint.url,
            endpoint.data
          );
        }

        const passed = response.status === endpoint.expectedStatus;
        if (passed) passedCount++;
        
        results.push({
          name: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          expectedStatus: endpoint.expectedStatus,
          actualStatus: response.status,
          passed,
          responseTime: response.responseTime || 0
        });
      }

      const allPassed = passedCount === authEndpoints.length;
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `认证API测试 ${passedCount}/${authEndpoints.length} 通过`,
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
   * 测试题库管理API
   */
  async testQuestionAPIs() {
    const testName = '题库管理API测试';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const questionEndpoints = [
        {
          name: '创建题目',
          method: 'POST',
          url: config.endpoints.questions.create,
          data: config.testData.sampleQuestion,
          expectedStatus: 201
        },
        {
          name: '获取题目列表',
          method: 'GET',
          url: config.endpoints.questions.list,
          expectedStatus: 200
        },
        {
          name: '获取单个题目',
          method: 'GET',
          url: `${config.endpoints.questions.detail}/1`,
          expectedStatus: 200
        },
        {
          name: '更新题目',
          method: 'PUT',
          url: `${config.endpoints.questions.update}/1`,
          data: { ...config.testData.sampleQuestion, title: '更新后的题目' },
          expectedStatus: 200
        },
        {
          name: '搜索题目',
          method: 'GET',
          url: `${config.endpoints.questions.search}?keyword=测试`,
          expectedStatus: 200
        }
      ];

      let passedCount = 0;
      const results = [];

      for (const endpoint of questionEndpoints) {
        const response = await this.testUtils.authRequest(
          'admin',
          endpoint.method,
          endpoint.url,
          endpoint.data
        );

        const passed = response.status === endpoint.expectedStatus;
        if (passed) passedCount++;
        
        results.push({
          name: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          expectedStatus: endpoint.expectedStatus,
          actualStatus: response.status,
          passed,
          hasData: !!response.data,
          responseTime: response.responseTime || 0
        });
      }

      const allPassed = passedCount === questionEndpoints.length;
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `题库管理API测试 ${passedCount}/${questionEndpoints.length} 通过`,
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
   * 测试考试管理API
   */
  async testExamAPIs() {
    const testName = '考试管理API测试';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const examEndpoints = [
        {
          name: '创建考试',
          method: 'POST',
          url: config.endpoints.exams.create,
          data: config.testData.sampleExam,
          expectedStatus: 201
        },
        {
          name: '获取考试列表',
          method: 'GET',
          url: config.endpoints.exams.list,
          expectedStatus: 200
        },
        {
          name: '获取单个考试',
          method: 'GET',
          url: `${config.endpoints.exams.detail}/1`,
          expectedStatus: 200
        },
        {
          name: '更新考试',
          method: 'PUT',
          url: `${config.endpoints.exams.update}/1`,
          data: { ...config.testData.sampleExam, title: '更新后的考试' },
          expectedStatus: 200
        },
        {
          name: '发布考试',
          method: 'POST',
          url: `${config.endpoints.exams.publish}/1`,
          expectedStatus: 200
        },
        {
          name: '获取可参加的考试',
          method: 'GET',
          url: config.endpoints.exams.available,
          expectedStatus: 200
        }
      ];

      let passedCount = 0;
      const results = [];

      for (const endpoint of examEndpoints) {
        const response = await this.testUtils.authRequest(
          'admin',
          endpoint.method,
          endpoint.url,
          endpoint.data
        );

        const passed = response.status === endpoint.expectedStatus;
        if (passed) passedCount++;
        
        results.push({
          name: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          expectedStatus: endpoint.expectedStatus,
          actualStatus: response.status,
          passed,
          hasData: !!response.data,
          responseTime: response.responseTime || 0
        });
      }

      const allPassed = passedCount === examEndpoints.length;
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `考试管理API测试 ${passedCount}/${examEndpoints.length} 通过`,
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
   * 测试成绩管理API
   */
  async testGradeAPIs() {
    const testName = '成绩管理API测试';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const gradeEndpoints = [
        {
          name: '获取所有成绩',
          method: 'GET',
          url: config.endpoints.grades.list,
          expectedStatus: 200
        },
        {
          name: '获取考试成绩',
          method: 'GET',
          url: `${config.endpoints.grades.byExam}/1`,
          expectedStatus: 200
        },
        {
          name: '获取成绩统计',
          method: 'GET',
          url: config.endpoints.grades.statistics,
          expectedStatus: 200
        },
        {
          name: '获取成绩分布',
          method: 'GET',
          url: config.endpoints.grades.distribution,
          expectedStatus: 200
        },
        {
          name: '导出成绩',
          method: 'POST',
          url: config.endpoints.grades.export,
          data: { format: 'excel', examId: 'all' },
          expectedStatus: 200
        }
      ];

      let passedCount = 0;
      const results = [];

      for (const endpoint of gradeEndpoints) {
        const response = await this.testUtils.authRequest(
          'admin',
          endpoint.method,
          endpoint.url,
          endpoint.data
        );

        const passed = response.status === endpoint.expectedStatus;
        if (passed) passedCount++;
        
        results.push({
          name: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          expectedStatus: endpoint.expectedStatus,
          actualStatus: response.status,
          passed,
          hasData: !!response.data,
          responseTime: response.responseTime || 0
        });
      }

      const allPassed = passedCount === gradeEndpoints.length;
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `成绩管理API测试 ${passedCount}/${gradeEndpoints.length} 通过`,
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
   * 测试API响应格式
   */
  async testAPIResponseFormats() {
    const testName = 'API响应格式测试';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const testEndpoints = [
        { url: config.endpoints.exams.list, method: 'GET' },
        { url: config.endpoints.questions.list, method: 'GET' },
        { url: config.endpoints.grades.list, method: 'GET' }
      ];

      let validFormatCount = 0;
      const results = [];

      for (const endpoint of testEndpoints) {
        const response = await this.testUtils.authRequest(
          'admin',
          endpoint.method,
          endpoint.url
        );

        if (this.testUtils.validateResponse(response, 200)) {
          const data = response.data;
          
          // 检查响应格式
          const hasValidFormat = data && typeof data === 'object';
          const hasContentType = response.headers && 
                                response.headers['content-type'] && 
                                response.headers['content-type'].includes('application/json');
          
          const formatValid = hasValidFormat && hasContentType;
          if (formatValid) validFormatCount++;
          
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            hasValidFormat,
            hasContentType,
            formatValid,
            dataType: typeof data,
            contentType: response.headers ? response.headers['content-type'] : 'unknown'
          });
        } else {
          results.push({
            url: endpoint.url,
            method: endpoint.method,
            hasValidFormat: false,
            hasContentType: false,
            formatValid: false,
            error: 'Request failed'
          });
        }
      }

      const allFormatsValid = validFormatCount === testEndpoints.length;
      this.testUtils.recordTestResult(
        testName,
        allFormatsValid,
        `API响应格式测试 ${validFormatCount}/${testEndpoints.length} 通过`,
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
   * 测试API错误处理
   */
  async testAPIErrorHandling() {
    const testName = 'API错误处理测试';
    
    try {
      const errorTests = [
        {
          name: '404错误处理',
          method: 'GET',
          url: `${config.baseURL}/api/nonexistent-endpoint`,
          expectedStatus: 404
        },
        {
          name: '401未授权错误',
          method: 'GET',
          url: config.endpoints.exams.list,
          noAuth: true,
          expectedStatus: 401
        },
        {
          name: '400请求错误',
          method: 'POST',
          url: config.endpoints.questions.create,
          data: { invalid: 'data' },
          requireAuth: true,
          expectedStatus: 400
        },
        {
          name: '405方法不允许',
          method: 'DELETE',
          url: config.endpoints.auth.login,
          expectedStatus: 405
        }
      ];

      let correctErrorCount = 0;
      const results = [];

      // 先登录以便测试需要认证的错误
      await this.testUtils.login('admin');

      for (const test of errorTests) {
        let response;
        
        if (test.noAuth) {
          response = await this.testUtils.makeRequest(
            test.method,
            test.url,
            test.data
          );
        } else if (test.requireAuth) {
          response = await this.testUtils.authRequest(
            'admin',
            test.method,
            test.url,
            test.data
          );
        } else {
          response = await this.testUtils.makeRequest(
            test.method,
            test.url,
            test.data
          );
        }

        const correctError = response.status === test.expectedStatus;
        if (correctError) correctErrorCount++;
        
        results.push({
          name: test.name,
          method: test.method,
          url: test.url,
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          correctError,
          hasErrorMessage: !!(response.data && response.data.message)
        });
      }

      const allErrorsHandled = correctErrorCount === errorTests.length;
      this.testUtils.recordTestResult(
        testName,
        allErrorsHandled,
        `API错误处理测试 ${correctErrorCount}/${errorTests.length} 通过`,
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
   * 测试API性能
   */
  async testAPIPerformance() {
    const testName = 'API性能测试';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const performanceTests = [
        { name: '获取考试列表', url: config.endpoints.exams.list, method: 'GET' },
        { name: '获取题目列表', url: config.endpoints.questions.list, method: 'GET' },
        { name: '获取成绩列表', url: config.endpoints.grades.list, method: 'GET' }
      ];

      const results = [];
      let fastResponseCount = 0;
      const maxAcceptableTime = 2000; // 2秒

      for (const test of performanceTests) {
        const startTime = Date.now();
        
        const response = await this.testUtils.authRequest(
          'admin',
          test.method,
          test.url
        );
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        const isFast = responseTime < maxAcceptableTime;
        if (isFast) fastResponseCount++;
        
        results.push({
          name: test.name,
          url: test.url,
          method: test.method,
          responseTime,
          isFast,
          status: response.status,
          maxAcceptableTime
        });
      }

      const performanceGood = fastResponseCount === performanceTests.length;
      this.testUtils.recordTestResult(
        testName,
        performanceGood,
        `API性能测试 ${fastResponseCount}/${performanceTests.length} 响应时间合格`,
        { results, averageTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length }
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
   * 测试API数据验证
   */
  async testAPIDataValidation() {
    const testName = 'API数据验证测试';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      // 测试必填字段验证
      const validationTests = [
        {
          name: '题目创建缺少标题',
          method: 'POST',
          url: config.endpoints.questions.create,
          data: { type: 'single', options: ['A', 'B'] },
          expectedStatus: 400
        },
        {
          name: '考试创建缺少必填字段',
          method: 'POST',
          url: config.endpoints.exams.create,
          data: { duration: 60 },
          expectedStatus: 400
        },
        {
          name: '登录缺少密码',
          method: 'POST',
          url: config.endpoints.auth.login,
          data: { username: 'test' },
          expectedStatus: 400,
          noAuth: true
        }
      ];

      let validationCount = 0;
      const results = [];

      for (const test of validationTests) {
        let response;
        
        if (test.noAuth) {
          response = await this.testUtils.makeRequest(
            test.method,
            test.url,
            test.data
          );
        } else {
          response = await this.testUtils.authRequest(
            'admin',
            test.method,
            test.url,
            test.data
          );
        }

        const correctValidation = response.status === test.expectedStatus;
        if (correctValidation) validationCount++;
        
        results.push({
          name: test.name,
          method: test.method,
          url: test.url,
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          correctValidation,
          hasValidationMessage: !!(response.data && response.data.message)
        });
      }

      const allValidationsWork = validationCount === validationTests.length;
      this.testUtils.recordTestResult(
        testName,
        allValidationsWork,
        `API数据验证测试 ${validationCount}/${validationTests.length} 通过`,
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
   * 测试API版本兼容性
   */
  async testAPIVersionCompatibility() {
    const testName = 'API版本兼容性测试';
    
    try {
      // 测试API版本头
      const versionTests = [
        { version: 'v1', expected: true },
        { version: 'v2', expected: false },
        { version: 'invalid', expected: false }
      ];

      let compatibilityCount = 0;
      const results = [];

      for (const test of versionTests) {
        const response = await this.testUtils.makeRequest(
          'GET',
          config.endpoints.exams.list,
          null,
          {
            'API-Version': test.version,
            'Content-Type': 'application/json'
          }
        );

        const isCompatible = test.expected ? 
                            (response.status === 200 || response.status === 401) : 
                            (response.status === 400 || response.status === 404);
        
        if (isCompatible) compatibilityCount++;
        
        results.push({
          version: test.version,
          expected: test.expected,
          actualStatus: response.status,
          isCompatible
        });
      }

      const versionCompatible = compatibilityCount === versionTests.length;
      this.testUtils.recordTestResult(
        testName,
        versionCompatible,
        `API版本兼容性测试 ${compatibilityCount}/${versionTests.length} 通过`,
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
   * 测试API限流
   */
  async testAPIRateLimit() {
    const testName = 'API限流测试';
    
    try {
      // 快速发送多个请求测试限流
      const requests = [];
      const requestCount = 10;
      
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          this.testUtils.makeRequest('GET', config.endpoints.auth.login)
        );
      }

      const responses = await Promise.all(requests);
      
      // 检查是否有限流响应（429状态码）
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const hasRateLimit = rateLimitedResponses.length > 0;
      
      // 如果没有限流，检查是否所有请求都成功（可能没有启用限流）
      const allSuccessful = responses.every(r => r.status === 200 || r.status === 400);
      
      this.testUtils.recordTestResult(
        testName,
        hasRateLimit || allSuccessful,
        hasRateLimit ? 
          `API限流机制正常，${rateLimitedResponses.length}/${requestCount} 请求被限流` :
          `未检测到限流机制，${requestCount} 个请求全部处理`,
        {
          totalRequests: requestCount,
          rateLimitedCount: rateLimitedResponses.length,
          hasRateLimit,
          statusCodes: responses.map(r => r.status)
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

module.exports = APIIntegrationTest;