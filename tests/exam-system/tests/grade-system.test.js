/**
 * 成绩查看和统计功能测试
 * 
 * 功能说明：
 * - 测试成绩查看功能
 * - 测试成绩统计分析
 * - 测试成绩导出功能
 * - 测试成绩管理权限
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class GradeSystemTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.testName = '成绩查看和统计功能测试';
    this.testExamId = null;
    this.testStudentId = null;
  }

  /**
   * 执行所有成绩系统相关测试
   * @returns {Promise<Object>} 测试结果
   */
  async runAllTests() {
    this.testUtils.log(`开始执行 ${this.testName}`, 'info');
    
    try {
      // 测试用例列表
      const testCases = [
        { name: '管理员查看所有成绩', method: 'testAdminViewAllGrades' },
        { name: '管理员查看单个考试成绩', method: 'testAdminViewExamGrades' },
        { name: '学生查看个人成绩', method: 'testStudentViewOwnGrades' },
        { name: '成绩统计分析', method: 'testGradeStatistics' },
        { name: '成绩分布统计', method: 'testGradeDistribution' },
        { name: '考试通过率统计', method: 'testPassRateStatistics' },
        { name: '成绩导出功能', method: 'testGradeExport' },
        { name: '成绩搜索和筛选', method: 'testGradeSearchFilter' },
        { name: '成绩权限控制', method: 'testGradePermissions' },
        { name: '成绩历史记录', method: 'testGradeHistory' }
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
   * 测试管理员查看所有成绩
   */
  async testAdminViewAllGrades() {
    const testName = '管理员查看所有成绩';
    
    try {
      // 确保管理员已登录
      const loginResult = await this.testUtils.login('admin');
      if (!loginResult.success) {
        this.testUtils.recordTestResult(
          testName,
          false,
          '管理员登录失败',
          { loginResult }
        );
        return;
      }

      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.grades.list
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const grades = response.data.grades || response.data;
        const isArray = Array.isArray(grades);
        
        // 记录第一个成绩的考试ID和学生ID用于后续测试
        if (isArray && grades.length > 0) {
          this.testExamId = grades[0].examId || grades[0].exam_id;
          this.testStudentId = grades[0].studentId || grades[0].student_id;
        }
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `管理员查看所有成绩成功，共 ${grades.length} 条记录` : '成绩列表格式错误',
          {
            gradeCount: isArray ? grades.length : 0,
            sampleExamId: this.testExamId,
            sampleStudentId: this.testStudentId
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '管理员查看所有成绩失败',
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
   * 测试管理员查看单个考试成绩
   */
  async testAdminViewExamGrades() {
    const testName = '管理员查看单个考试成绩';
    
    // 使用测试考试ID或默认ID
    const examId = this.testExamId || 'test-exam-1';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        `${config.endpoints.grades.byExam}/${examId}`
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const grades = response.data.grades || response.data;
        const isArray = Array.isArray(grades);
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `查看考试成绩成功，共 ${grades.length} 条记录` : '考试成绩列表格式错误',
          {
            examId,
            gradeCount: isArray ? grades.length : 0
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '查看考试成绩失败',
          { examId, response }
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
   * 测试学生查看个人成绩
   */
  async testStudentViewOwnGrades() {
    const testName = '学生查看个人成绩';
    
    try {
      // 确保学生已登录
      const loginResult = await this.testUtils.login('student');
      if (!loginResult.success) {
        this.testUtils.recordTestResult(
          testName,
          false,
          '学生登录失败',
          { loginResult }
        );
        return;
      }

      const response = await this.testUtils.authRequest(
        'student',
        'GET',
        config.endpoints.grades.myGrades
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const grades = response.data.grades || response.data;
        const isArray = Array.isArray(grades);
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `学生查看个人成绩成功，共 ${grades.length} 条记录` : '个人成绩列表格式错误',
          {
            gradeCount: isArray ? grades.length : 0
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '学生查看个人成绩失败',
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
   * 测试成绩统计分析
   */
  async testGradeStatistics() {
    const testName = '成绩统计分析';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.grades.statistics
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const stats = response.data;
        const requiredFields = ['totalExams', 'totalStudents', 'averageScore'];
        let hasRequiredFields = true;
        
        for (const field of requiredFields) {
          if (!(field in stats)) {
            hasRequiredFields = false;
            break;
          }
        }
        
        this.testUtils.recordTestResult(
          testName,
          hasRequiredFields,
          hasRequiredFields ? '成绩统计分析成功' : '统计数据字段不完整',
          {
            totalExams: stats.totalExams,
            totalStudents: stats.totalStudents,
            averageScore: stats.averageScore,
            highestScore: stats.highestScore,
            lowestScore: stats.lowestScore
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取成绩统计分析失败',
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
   * 测试成绩分布统计
   */
  async testGradeDistribution() {
    const testName = '成绩分布统计';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.grades.distribution
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const distribution = response.data;
        const hasDistributionData = distribution && typeof distribution === 'object';
        
        this.testUtils.recordTestResult(
          testName,
          hasDistributionData,
          hasDistributionData ? '成绩分布统计成功' : '分布统计数据格式错误',
          {
            distribution,
            ranges: distribution.ranges,
            counts: distribution.counts
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取成绩分布统计失败',
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
   * 测试考试通过率统计
   */
  async testPassRateStatistics() {
    const testName = '考试通过率统计';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        config.endpoints.grades.passRate
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const passRateData = response.data;
        const hasPassRateFields = passRateData.totalParticipants !== undefined && 
                                 passRateData.passedCount !== undefined &&
                                 passRateData.passRate !== undefined;
        
        this.testUtils.recordTestResult(
          testName,
          hasPassRateFields,
          hasPassRateFields ? '考试通过率统计成功' : '通过率统计数据不完整',
          {
            totalParticipants: passRateData.totalParticipants,
            passedCount: passRateData.passedCount,
            passRate: passRateData.passRate,
            failedCount: passRateData.failedCount
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取考试通过率统计失败',
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
   * 测试成绩导出功能
   */
  async testGradeExport() {
    const testName = '成绩导出功能';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const exportParams = {
        format: 'excel',
        examId: this.testExamId || 'all',
        includeDetails: true
      };

      const response = await this.testUtils.authRequest(
        'admin',
        'POST',
        config.endpoints.grades.export,
        exportParams
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const exportResult = response.data;
        const hasExportData = exportResult.downloadUrl || exportResult.fileId || exportResult.data;
        
        this.testUtils.recordTestResult(
          testName,
          hasExportData,
          hasExportData ? '成绩导出功能成功' : '导出结果数据不完整',
          {
            format: exportParams.format,
            examId: exportParams.examId,
            downloadUrl: exportResult.downloadUrl,
            fileSize: exportResult.fileSize
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '成绩导出功能失败',
          { exportParams, response }
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
   * 测试成绩搜索和筛选
   */
  async testGradeSearchFilter() {
    const testName = '成绩搜索和筛选';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const searchTests = [
        {
          params: { studentName: '张三' },
          description: '按学生姓名搜索'
        },
        {
          params: { examTitle: '计算机基础' },
          description: '按考试标题搜索'
        },
        {
          params: { minScore: 80, maxScore: 100 },
          description: '按分数范围筛选'
        },
        {
          params: { status: 'passed' },
          description: '按通过状态筛选'
        }
      ];

      let passedCount = 0;
      const results = [];

      for (const test of searchTests) {
        const queryString = new URLSearchParams(test.params).toString();
        const response = await this.testUtils.authRequest(
          'admin',
          'GET',
          `${config.endpoints.grades.search}?${queryString}`
        );

        const passed = this.testUtils.validateResponse(response, 200);
        if (passed) passedCount++;
        
        results.push({
          description: test.description,
          params: test.params,
          passed,
          resultCount: passed ? (response.data.grades?.length || 0) : 0
        });
      }

      const allPassed = passedCount === searchTests.length;
      this.testUtils.recordTestResult(
        testName,
        allPassed,
        `成绩搜索和筛选 ${passedCount}/${searchTests.length} 通过`,
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
   * 测试成绩权限控制
   */
  async testGradePermissions() {
    const testName = '成绩权限控制';
    
    try {
      // 测试学生不能访问其他学生的成绩
      await this.testUtils.login('student');
      
      const otherStudentId = 'other-student-123';
      const response = await this.testUtils.authRequest(
        'student',
        'GET',
        `${config.endpoints.grades.byStudent}/${otherStudentId}`
      );

      // 应该返回403或401错误
      const correctlyDenied = !response.success || 
                             response.status === 403 || 
                             response.status === 401;

      this.testUtils.recordTestResult(
        testName,
        correctlyDenied,
        correctlyDenied ? '成绩权限控制正常，学生无法访问其他学生成绩' : '成绩权限控制异常，学生可以访问其他学生成绩',
        {
          attemptedStudentId: otherStudentId,
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
   * 测试成绩历史记录
   */
  async testGradeHistory() {
    const testName = '成绩历史记录';
    
    try {
      // 确保管理员已登录
      await this.testUtils.login('admin');

      const studentId = this.testStudentId || 'test-student-1';
      const response = await this.testUtils.authRequest(
        'admin',
        'GET',
        `${config.endpoints.grades.history}/${studentId}`
      );

      if (this.testUtils.validateResponse(response, 200)) {
        const history = response.data.history || response.data;
        const isArray = Array.isArray(history);
        
        this.testUtils.recordTestResult(
          testName,
          isArray,
          isArray ? `获取成绩历史记录成功，共 ${history.length} 条记录` : '成绩历史记录格式错误',
          {
            studentId,
            historyCount: isArray ? history.length : 0
          }
        );
      } else {
        this.testUtils.recordTestResult(
          testName,
          false,
          '获取成绩历史记录失败',
          { studentId, response }
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

module.exports = GradeSystemTest;