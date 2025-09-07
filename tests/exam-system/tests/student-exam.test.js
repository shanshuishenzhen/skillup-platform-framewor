/**
 * 学生登录和考试参与功能测试
 * 
 * 功能说明：
 * - 测试学生账号登录功能
 * - 测试学生查看考试列表
 * - 测试学生参加考试流程
 * - 测试答题和提交功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class StudentExamTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.testName = '学生登录和考试参与测试';
    this.examId = null;
    this.examSessionId = null;
  }

  /**
   * 执行所有学生考试相关测试
   * @returns {Promise<Object>} 测试结果
   */
  async runAllTests() {
    this.testUtils.log(`开始执行 ${this.testName}`, 'info');
    
    try {
      // 测试用例列表
      const testCases = [
        { name: '学生正常登录', method: 'testStudentLogin' },
        { name: '学生权限验证', method: 'testStudentPermissions' },
        { name: '查看可参加考试列表', method: 'testGetAvailableExams' },
        { name: '开始考试', method: 'testStartExam' },
        { name: '获取考试题目', method: 'testGetExamQuestions' },
        { name: '提交答案', method: 'testSubmitAnswer' },
        { name: '保存草稿', method: 'testSaveDraft' },
        { name: '提交考试', method: 'testSubmitExam' },
        { name: '查看考试结果', method: 'testViewExamResult' },
        { name: '错误登录测试', method: 'testInvalidLogin' }
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
   * 测试学生正常登录
   */
  async testStudentLogin() {
    const testName = '学生正常登录';
    
    try {
      const loginData = {
        username: config.accounts.student.username,
        password: config.accounts.student.password
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

        if (hasAllFields && response.data.role === 'student') {
          this.testUtils.recordTestResult(
            testName,
            true,
            '学生登录成功，返回正确的令牌和用户信息',
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
          '学生登录请求失败',
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
   * 测试学生权限验证
   */
  async testStudentPermissions() {
    const testName = '学生权限验证';
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      // 测试学生可以访问的接口
      const allowedTests = [
        { endpoint: '/api/exams/available', description: '可参加考试列表' },
        { endpoint: '/api/profile', description: '个人资料' }
      ];

      // 测试学生不应该访问的管理员接口
      const forbiddenTests = [
        { endpoint: '/api/users', description: '用户管理接口' },
        { endpoint: '/api/exams/create', description: '创建考试接口' },
        { endpoint: '/api/questions/create', description: '创建题目接口' }
      ];

      let allowedPassed = 0;
      let forbiddenPassed = 0;
      const results = [];

      // 测试允许访问的接口
      for (const test of allowedTests) {
        const response = await this.testUtils.authRequest(
          'student',
          'GET',
          test.endpoint
        );

        const passed = response.success && (response.status === 200 || response.status === 404);
        if (passed) allowedPassed++;
        
        results.push({
          endpoint: test.endpoint,
          description: test.description,
          type: 'allowed',
          status: response.status,
          passed
        });
      }

      // 测试禁止访问的接口
      for (const test of forbiddenTests) {
        const response = await this.testUtils.authRequest(
          'student',
          'GET',
          test.endpoint
        );

        // 应该返回403或401错误
        const passed = !response.success || response.status === 403 || response.status === 401;
        if (passed) forbiddenPassed++;
        
        results.push({
          endpoint: test.endpoint,
          description: test.description,
          type: 'forbidden',
          status: response.status,
          passed
        });
      }

      const totalPassed = allowedPassed + forbiddenPassed;
      const totalTests = allowedTests.length + forbiddenTests.length;
      const allPassed = totalPassed === totalTests;
      
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `学生权限验证 ${totalPassed}/${totalTests} 通过`,
        { 
          allowedPassed: `${allowedPassed}/${allowedTests.length}`,
          forbiddenPassed: `${forbiddenPassed}/${forbiddenTests.length}`,
          results 
        }
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
   * 测试查看可参加考试列表
   */
  async testGetAvailableExams() {
    const testName = '查看可参加考试列表';
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      const response = await this.testUtils.authRequest(
        'student',
        'GET',
        config.endpoints.exams.available
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const exams = response.data.exams || response.data;
        const isArray = Array.isArray(exams);
        
        // 如果有考试，记录第一个考试ID用于后续测试
        if (isArray && exams.length > 0) {
          this.examId = exams[0].id;
        }
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `获取可参加考试列表成功，共 ${exams.length} 场考试` : '考试列表格式错误',
          {
            examCount: isArray ? exams.length : 0,
            firstExamId: this.examId
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取可参加考试列表失败',
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
   * 测试开始考试
   */
  async testStartExam() {
    const testName = '开始考试';
    
    if (!this.examId) {
      // 如果没有可用考试，创建一个测试考试ID
      this.examId = 'test-exam-1';
    }
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      const response = await this.testUtils.authRequest(
        'student',
        'POST',
        `${config.endpoints.exams.start}/${this.examId}`
      );

      if (this.testUtils.validateResponse(response, 200)) {
        this.examSessionId = response.data.sessionId || response.data.id;
        
        this.testUtils.recordTestResult(
          testName,
          true,
          '开始考试成功',
          {
            examId: this.examId,
            sessionId: this.examSessionId,
            startTime: response.data.startTime
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '开始考试失败',
          { 
            examId: this.examId,
            response 
          }
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
   * 测试获取考试题目
   */
  async testGetExamQuestions() {
    const testName = '获取考试题目';
    
    if (!this.examId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可用的考试ID',
        {}
      );
      return;
    }
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      const response = await this.testUtils.authRequest(
        'student',
        'GET',
        `${config.endpoints.exams.questions}/${this.examId}`
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const questions = response.data.questions || response.data;
        const isArray = Array.isArray(questions);
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `获取考试题目成功，共 ${questions.length} 道题目` : '题目列表格式错误',
          {
            examId: this.examId,
            questionCount: isArray ? questions.length : 0
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取考试题目失败',
          { 
            examId: this.examId,
            response 
          }
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
   * 测试提交答案
   */
  async testSubmitAnswer() {
    const testName = '提交答案';
    
    if (!this.examId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可用的考试ID',
        {}
      );
      return;
    }
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      const answerData = {
        questionId: 'test-question-1',
        answer: 'A',
        timeSpent: 30 // 30秒
      };

      const response = await this.testUtils.authRequest(
        'student',
        'POST',
        `${config.endpoints.exams.answer}/${this.examId}`,
        answerData
      );

      if (this.testUtils.validateResponse(response, 200)) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '提交答案成功',
          {
            examId: this.examId,
            questionId: answerData.questionId,
            answer: answerData.answer,
            timeSpent: answerData.timeSpent
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '提交答案失败',
          { 
            examId: this.examId,
            answerData,
            response 
          }
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
   * 测试保存草稿
   */
  async testSaveDraft() {
    const testName = '保存草稿';
    
    if (!this.examId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可用的考试ID',
        {}
      );
      return;
    }
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      const draftData = {
        answers: {
          'question-1': 'A',
          'question-2': 'B'
        },
        progress: 50 // 50%完成度
      };

      const response = await this.testUtils.authRequest(
        'student',
        'POST',
        `${config.endpoints.exams.draft}/${this.examId}`,
        draftData
      );

      if (this.testUtils.validateResponse(response, 200)) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '保存草稿成功',
          {
            examId: this.examId,
            answerCount: Object.keys(draftData.answers).length,
            progress: draftData.progress
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '保存草稿失败',
          { 
            examId: this.examId,
            draftData,
            response 
          }
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
   * 测试提交考试
   */
  async testSubmitExam() {
    const testName = '提交考试';
    
    if (!this.examId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可用的考试ID',
        {}
      );
      return;
    }
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      const submitData = {
        answers: {
          'question-1': 'A',
          'question-2': 'B',
          'question-3': 'C'
        },
        submitTime: new Date().toISOString()
      };

      const response = await this.testUtils.authRequest(
        'student',
        'POST',
        `${config.endpoints.exams.submit}/${this.examId}`,
        submitData
      );

      if (this.testUtils.validateResponse(response, 200)) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '提交考试成功',
          {
            examId: this.examId,
            answerCount: Object.keys(submitData.answers).length,
            submitTime: submitData.submitTime,
            score: response.data.score
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '提交考试失败',
          { 
            examId: this.examId,
            submitData,
            response 
          }
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
   * 测试查看考试结果
   */
  async testViewExamResult() {
    const testName = '查看考试结果';
    
    if (!this.examId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可用的考试ID',
        {}
      );
      return;
    }
    
    try {
      // 确保学生已登录
      await this.testUtils.login('student');

      const response = await this.testUtils.authRequest(
        'student',
        'GET',
        `${config.endpoints.exams.result}/${this.examId}`
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const result = response.data;
        const hasRequiredFields = result.score !== undefined && result.status !== undefined;
        
        this.testUtils.recordTestResult(
          testName,
          hasRequiredFields,
          hasRequiredFields ? '查看考试结果成功' : '考试结果数据不完整',
          {
            examId: this.examId,
            score: result.score,
            status: result.status,
            totalQuestions: result.totalQuestions,
            correctAnswers: result.correctAnswers
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '查看考试结果失败',
          { 
            examId: this.examId,
            response 
          }
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
   * 测试错误登录
   */
  async testInvalidLogin() {
    const testName = '错误登录测试';
    
    try {
      const invalidLogins = [
        {
          username: config.accounts.student.username,
          password: 'wrongpassword',
          description: '错误密码'
        },
        {
          username: '99999999999',
          password: config.accounts.student.password,
          description: '不存在用户'
        },
        {
          username: '',
          password: '',
          description: '空用户名密码'
        }
      ];

      let allRejected = true;
      const results = [];

      for (const loginData of invalidLogins) {
        const response = await this.testUtils.request(
          'POST',
          config.endpoints.auth.login,
          { username: loginData.username, password: loginData.password }
        );

        const rejected = !response.success || 
                        response.status === 401 || 
                        response.status === 400 ||
                        !response.data?.token;
        
        if (!rejected) {
          allRejected = false;
        }
        
        results.push({
          description: loginData.description,
          rejected,
          status: response.status
        });
      }

      this.testUtils.recordTestResult(
        testName,
        allRejected,
        allRejected ? '所有错误登录都被正确拒绝' : '存在错误登录被允许的情况',
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

module.exports = StudentExamTest;