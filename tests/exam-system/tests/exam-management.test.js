/**
 * 考试创建和管理功能测试
 * 
 * 功能说明：
 * - 测试考试创建功能
 * - 测试试卷管理功能
 * - 测试题库管理功能
 * - 测试考试发布和状态管理
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class ExamManagementTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.testName = '考试创建和管理测试';
    this.createdExamId = null;
    this.createdQuestionId = null;
  }

  /**
   * 执行所有考试管理相关测试
   * @returns {Promise<Object>} 测试结果
   */
  async runAllTests() {
    this.testUtils.log(`开始执行 ${this.testName}`, 'info');
    
    try {
      // 确保管理员已登录
      const loginResult = await this.testUtils.login('admin');
      if (!loginResult.success) {
        throw new Error('管理员登录失败，无法进行考试管理测试');
      }

      // 测试用例列表
      const testCases = [
        { name: '创建题库题目', method: 'testCreateQuestion' },
        { name: '获取题库列表', method: 'testGetQuestions' },
        { name: '创建考试', method: 'testCreateExam' },
        { name: '获取考试列表', method: 'testGetExams' },
        { name: '更新考试信息', method: 'testUpdateExam' },
        { name: '发布考试', method: 'testPublishExam' },
        { name: '考试状态管理', method: 'testExamStatusManagement' },
        { name: '删除考试', method: 'testDeleteExam' },
        { name: '删除题目', method: 'testDeleteQuestion' }
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
   * 测试创建题库题目
   */
  async testCreateQuestion() {
    const testName = '创建题库题目';
    
    try {
      const questionData = {
        type: 'multiple_choice',
        subject: '计算机基础',
        difficulty: 'medium',
        question: '以下哪个不是编程语言？',
        options: [
          { text: 'JavaScript', correct: false },
          { text: 'Python', correct: false },
          { text: 'HTML', correct: true },
          { text: 'Java', correct: false }
        ],
        explanation: 'HTML是标记语言，不是编程语言',
        points: 5
      };

      const response = await this.testUtils.authRequest(
        'admin',
        'POST',
        config.endpoints.questions.create,
        questionData
      );

      if (this.testUtils.validateResponse(response, 201)) {
        this.createdQuestionId = response.data.id || response.data.questionId;
        
        this.testUtils.recordTestResult(
          testName,
          true,
          '题目创建成功',
          {
            questionId: this.createdQuestionId,
            subject: questionData.subject,
            type: questionData.type
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '题目创建失败',
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
   * 测试获取题库列表
   */
  async testGetQuestions() {
    const testName = '获取题库列表';
    
    try {
      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.questions.list
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const questions = response.data.questions || response.data;
        const isArray = Array.isArray(questions);
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `获取题库列表成功，共 ${questions.length} 道题目` : '题库列表格式错误',
          {
            questionCount: isArray ? questions.length : 0,
            hasCreatedQuestion: isArray && questions.some(q => q.id === this.createdQuestionId)
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取题库列表失败',
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
   * 测试创建考试
   */
  async testCreateExam() {
    const testName = '创建考试';
    
    try {
      const examData = {
        title: '计算机基础测试',
        description: '测试计算机基础知识掌握情况',
        duration: 60, // 60分钟
        totalPoints: 100,
        passingScore: 60,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天开始
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 一周后结束
        status: 'draft',
        questions: this.createdQuestionId ? [this.createdQuestionId] : []
      };

      const response = await this.testUtils.authRequest(
        'admin',
        'POST',
        config.endpoints.exams.create,
        examData
      );

      if (this.testUtils.validateResponse(response, 201)) {
        this.createdExamId = response.data.id || response.data.examId;
        
        this.testUtils.recordTestResult(
          testName,
          true,
          '考试创建成功',
          {
            examId: this.createdExamId,
            title: examData.title,
            duration: examData.duration,
            status: examData.status
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '考试创建失败',
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
   * 测试获取考试列表
   */
  async testGetExams() {
    const testName = '获取考试列表';
    
    try {
      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.exams.list
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const exams = response.data.exams || response.data;
        const isArray = Array.isArray(exams);
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `获取考试列表成功，共 ${exams.length} 场考试` : '考试列表格式错误',
          {
            examCount: isArray ? exams.length : 0,
            hasCreatedExam: isArray && exams.some(e => e.id === this.createdExamId)
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取考试列表失败',
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
   * 测试更新考试信息
   */
  async testUpdateExam() {
    const testName = '更新考试信息';
    
    if (!this.createdExamId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可更新的考试ID',
        {}
      );
      return;
    }
    
    try {
      const updateData = {
        title: '计算机基础测试（已更新）',
        description: '更新后的考试描述',
        duration: 90 // 更新为90分钟
      };

      const response = await this.testUtils.authRequest(
        'admin',
        'PUT',
        `${config.endpoints.exams.update}/${this.createdExamId}`,
        updateData
      );

      if (this.testUtils.validateResponse(response, 200)) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '考试信息更新成功',
          {
            examId: this.createdExamId,
            updatedTitle: updateData.title,
            updatedDuration: updateData.duration
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '考试信息更新失败',
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
   * 测试发布考试
   */
  async testPublishExam() {
    const testName = '发布考试';
    
    if (!this.createdExamId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可发布的考试ID',
        {}
      );
      return;
    }
    
    try {
      const response = await this.testUtils.authRequest(
        'admin',
        'POST',
        `${config.endpoints.exams.publish}/${this.createdExamId}`
      );

      if (this.testUtils.validateResponse(response, 200)) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '考试发布成功',
          {
            examId: this.createdExamId,
            status: 'published'
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '考试发布失败',
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
   * 测试考试状态管理
   */
  async testExamStatusManagement() {
    const testName = '考试状态管理';
    
    if (!this.createdExamId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可管理的考试ID',
        {}
      );
      return;
    }
    
    try {
      const statusTests = [
        { status: 'active', description: '激活考试' },
        { status: 'paused', description: '暂停考试' },
        { status: 'ended', description: '结束考试' }
      ];

      let passedCount = 0;
      const results = [];

      for (const test of statusTests) {
        const response = await this.testUtils.authRequest(
          'admin',
          'PATCH',
          `${config.endpoints.exams.status}/${this.createdExamId}`,
          { status: test.status }
        );

        const passed = this.testUtils.validateResponse(response, 200);
        if (passed) passedCount++;
        
        results.push({
          status: test.status,
          description: test.description,
          passed,
          responseStatus: response.status
        });
      }

      const allPassed = passedCount === statusTests.length;
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `考试状态管理 ${passedCount}/${statusTests.length} 通过`,
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
   * 测试删除考试
   */
  async testDeleteExam() {
    const testName = '删除考试';
    
    if (!this.createdExamId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可删除的考试ID',
        {}
      );
      return;
    }
    
    try {
      const response = await this.testUtils.authRequest(
        'admin',
        'DELETE',
        `${config.endpoints.exams.delete}/${this.createdExamId}`
      );

      if (this.testUtils.validateResponse(response, 200) || response.status === 204) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '考试删除成功',
          {
            examId: this.createdExamId,
            status: response.status
          }
        );
        this.createdExamId = null; // 清除已删除的考试ID
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '考试删除失败',
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
   * 测试删除题目
   */
  async testDeleteQuestion() {
    const testName = '删除题目';
    
    if (!this.createdQuestionId) {
      this.testUtils.recordTestResult(
        testName,
        false,
        '没有可删除的题目ID',
        {}
      );
      return;
    }
    
    try {
      const response = await this.testUtils.authRequest(
        'admin',
        'DELETE',
        `${config.endpoints.questions.delete}/${this.createdQuestionId}`
      );

      if (this.testUtils.validateResponse(response, 200) || response.status === 204) {
        this.testUtils.recordTestResult(
          testName,
          true,
          '题目删除成功',
          {
            questionId: this.createdQuestionId,
            status: response.status
          }
        );
        this.createdQuestionId = null; // 清除已删除的题目ID
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '题目删除失败',
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
}

module.exports = ExamManagementTest;