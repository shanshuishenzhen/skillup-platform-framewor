/**
 * 成绩查看和统计功能测试
 * 测试管理员查看成绩、统计分析、数据导出等功能
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class GradeStatisticsTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.adminUser = config.testUsers.admin;
    this.adminToken = null;
    this.testExamId = null;
    this.sampleGrades = [];
  }

  /**
   * 执行所有成绩统计相关测试
   */
  async runAllTests() {
    console.log('\n📊 开始执行成绩查看和统计测试套件');
    console.log('='.repeat(50));

    try {
      // 管理员登录
      await this.loginAsAdmin();
      
      // 成绩查看测试
      await this.testViewAllGrades();
      await this.testViewExamGrades();
      await this.testViewStudentGrades();
      
      // 统计分析测试
      await this.testGradeStatistics();
      await this.testExamAnalysis();
      await this.testStudentPerformance();
      
      // 数据导出测试
      await this.testExportGrades();
      await this.testExportStatistics();
      
      // 高级功能测试
      await this.testGradeDistribution();
      await this.testCompareExams();
      
    } catch (error) {
      console.error('测试执行出错:', error.message);
    }

    this.testUtils.printSummary();
    await this.testUtils.saveReport('grade-statistics-test-report.json');
  }

  /**
   * 管理员登录
   */
  async loginAsAdmin() {
    this.testUtils.startTest('管理员登录', '获取管理员访问权限');

    try {
      const loginData = {
        phone: this.adminUser.phone,
        password: this.adminUser.password,
        loginType: 'password'
      };

      this.testUtils.addStep(`管理员登录: ${this.adminUser.phone}`);
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      if (response.success && response.status === 200) {
        const userData = response.data.data;
        if (userData && userData.token) {
          this.adminToken = userData.token;
          this.testUtils.addStep('管理员登录成功', true, {
            role: userData.user.role,
            hasToken: !!userData.token
          });
          this.testUtils.endTest(true, '管理员登录成功');
        } else {
          this.testUtils.endTest(false, '管理员登录返回数据异常');
        }
      } else {
        this.testUtils.endTest(false, `管理员登录失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `管理员登录测试失败: ${error.message}`);
    }
  }

  /**
   * 测试查看所有成绩
   */
  async testViewAllGrades() {
    this.testUtils.startTest('查看所有成绩', '测试管理员查看系统中所有学生成绩');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过查看所有成绩测试');
        return;
      }

      this.testUtils.addStep('发送查看所有成绩请求');
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.admin.grades,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回成绩数据');
        
        if (response.data.data && Array.isArray(response.data.data)) {
          const grades = response.data.data;
          this.sampleGrades = grades;
          
          this.testUtils.addStep('获取所有成绩成功', true, {
            gradeCount: grades.length
          });
          
          // 验证成绩数据格式
          if (grades.length > 0) {
            const firstGrade = grades[0];
            this.testUtils.assert(typeof firstGrade.score !== 'undefined', '成绩应该包含分数');
            this.testUtils.assert(firstGrade.studentId || firstGrade.studentName, '成绩应该包含学生信息');
            this.testUtils.assert(firstGrade.examId || firstGrade.examTitle, '成绩应该包含考试信息');
            
            this.testUtils.addStep('成绩数据格式验证通过', true, {
              hasScore: typeof firstGrade.score !== 'undefined',
              hasStudent: !!(firstGrade.studentId || firstGrade.studentName),
              hasExam: !!(firstGrade.examId || firstGrade.examTitle)
            });
          }
        } else {
          this.testUtils.addStep('获取成绩成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '查看所有成绩功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('成绩查看接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '成绩查看接口需要实现');
      } else {
        this.testUtils.addStep('查看所有成绩失败', false, response.data);
        this.testUtils.endTest(false, `查看所有成绩失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `查看所有成绩测试失败: ${error.message}`);
    }
  }

  /**
   * 测试查看特定考试成绩
   */
  async testViewExamGrades() {
    this.testUtils.startTest('查看考试成绩', '测试查看特定考试的所有学生成绩');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过查看考试成绩测试');
        return;
      }

      const examId = this.testExamId || 'test-exam-id';
      
      this.testUtils.addStep(`发送查看考试成绩请求: ${examId}`);
      const response = await this.testUtils.makeRequest(
        'GET',
        `${config.endpoints.admin.examGrades}/${examId}`,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回考试成绩数据');
        
        if (response.data.data) {
          const examGrades = response.data.data;
          this.testUtils.addStep('获取考试成绩成功', true, {
            examId: examId,
            studentCount: Array.isArray(examGrades.grades) ? examGrades.grades.length : 0
          });
          
          // 验证考试统计信息
          if (examGrades.statistics) {
            this.testUtils.addStep('考试统计信息验证', true, {
              hasAverage: typeof examGrades.statistics.average !== 'undefined',
              hasHighest: typeof examGrades.statistics.highest !== 'undefined',
              hasLowest: typeof examGrades.statistics.lowest !== 'undefined'
            });
          }
        } else {
          this.testUtils.addStep('获取考试成绩成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '查看考试成绩功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('考试成绩接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '考试成绩接口需要实现');
      } else {
        this.testUtils.addStep('查看考试成绩失败', false, response.data);
        this.testUtils.endTest(false, `查看考试成绩失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `查看考试成绩测试失败: ${error.message}`);
    }
  }

  /**
   * 测试查看学生成绩
   */
  async testViewStudentGrades() {
    this.testUtils.startTest('查看学生成绩', '测试查看特定学生的所有考试成绩');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过查看学生成绩测试');
        return;
      }

      const studentId = 'test-student-id';
      
      this.testUtils.addStep(`发送查看学生成绩请求: ${studentId}`);
      const response = await this.testUtils.makeRequest(
        'GET',
        `${config.endpoints.admin.studentGrades}/${studentId}`,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回学生成绩数据');
        
        if (response.data.data) {
          const studentGrades = response.data.data;
          this.testUtils.addStep('获取学生成绩成功', true, {
            studentId: studentId,
            examCount: Array.isArray(studentGrades.grades) ? studentGrades.grades.length : 0
          });
          
          // 验证学生统计信息
          if (studentGrades.statistics) {
            this.testUtils.addStep('学生统计信息验证', true, {
              hasAverage: typeof studentGrades.statistics.averageScore !== 'undefined',
              hasBest: typeof studentGrades.statistics.bestScore !== 'undefined',
              hasWorst: typeof studentGrades.statistics.worstScore !== 'undefined'
            });
          }
        } else {
          this.testUtils.addStep('获取学生成绩成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '查看学生成绩功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('学生成绩接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '学生成绩接口需要实现');
      } else {
        this.testUtils.addStep('查看学生成绩失败', false, response.data);
        this.testUtils.endTest(false, `查看学生成绩失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `查看学生成绩测试失败: ${error.message}`);
    }
  }

  /**
   * 测试成绩统计分析
   */
  async testGradeStatistics() {
    this.testUtils.startTest('成绩统计分析', '测试系统整体成绩统计分析功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过成绩统计测试');
        return;
      }

      this.testUtils.addStep('发送成绩统计分析请求');
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.admin.statistics,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回统计数据');
        
        if (response.data.data) {
          const statistics = response.data.data;
          this.testUtils.addStep('获取成绩统计成功', true, {
            hasOverall: !!statistics.overall,
            hasDistribution: !!statistics.distribution,
            hasTrends: !!statistics.trends
          });
          
          // 验证统计数据完整性
          if (statistics.overall) {
            this.testUtils.assert(typeof statistics.overall.totalStudents !== 'undefined', '应该包含学生总数');
            this.testUtils.assert(typeof statistics.overall.totalExams !== 'undefined', '应该包含考试总数');
            this.testUtils.assert(typeof statistics.overall.averageScore !== 'undefined', '应该包含平均分');
            
            this.testUtils.addStep('整体统计数据验证通过', true, statistics.overall);
          }
          
          // 验证分数分布
          if (statistics.distribution) {
            this.testUtils.addStep('分数分布数据验证', true, {
              hasRanges: Array.isArray(statistics.distribution.ranges),
              rangeCount: statistics.distribution.ranges ? statistics.distribution.ranges.length : 0
            });
          }
        } else {
          this.testUtils.addStep('获取统计数据成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '成绩统计分析功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('统计分析接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '统计分析接口需要实现');
      } else {
        this.testUtils.addStep('获取成绩统计失败', false, response.data);
        this.testUtils.endTest(false, `获取成绩统计失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `成绩统计分析测试失败: ${error.message}`);
    }
  }

  /**
   * 测试考试分析
   */
  async testExamAnalysis() {
    this.testUtils.startTest('考试分析', '测试单个考试的详细分析功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过考试分析测试');
        return;
      }

      const examId = this.testExamId || 'test-exam-id';
      
      this.testUtils.addStep(`发送考试分析请求: ${examId}`);
      const response = await this.testUtils.makeRequest(
        'GET',
        `${config.endpoints.admin.examAnalysis}/${examId}`,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回考试分析数据');
        
        if (response.data.data) {
          const analysis = response.data.data;
          this.testUtils.addStep('获取考试分析成功', true, {
            examId: examId,
            hasQuestionAnalysis: !!analysis.questionAnalysis,
            hasScoreDistribution: !!analysis.scoreDistribution
          });
          
          // 验证题目分析
          if (analysis.questionAnalysis && Array.isArray(analysis.questionAnalysis)) {
            this.testUtils.addStep('题目分析数据验证', true, {
              questionCount: analysis.questionAnalysis.length
            });
            
            // 检查第一个题目的分析数据
            if (analysis.questionAnalysis.length > 0) {
              const firstQuestion = analysis.questionAnalysis[0];
              this.testUtils.assert(typeof firstQuestion.correctRate !== 'undefined', '应该包含正确率');
              this.testUtils.assert(typeof firstQuestion.difficulty !== 'undefined', '应该包含难度分析');
            }
          }
        } else {
          this.testUtils.addStep('获取考试分析成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '考试分析功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('考试分析接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '考试分析接口需要实现');
      } else {
        this.testUtils.addStep('获取考试分析失败', false, response.data);
        this.testUtils.endTest(false, `获取考试分析失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `考试分析测试失败: ${error.message}`);
    }
  }

  /**
   * 测试学生表现分析
   */
  async testStudentPerformance() {
    this.testUtils.startTest('学生表现分析', '测试学生表现趋势分析功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过学生表现分析测试');
        return;
      }

      this.testUtils.addStep('发送学生表现分析请求');
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.admin.studentPerformance,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回学生表现数据');
        
        if (response.data.data) {
          const performance = response.data.data;
          this.testUtils.addStep('获取学生表现分析成功', true, {
            hasTopPerformers: !!performance.topPerformers,
            hasImprovementNeeded: !!performance.improvementNeeded,
            hasTrends: !!performance.trends
          });
          
          // 验证优秀学生列表
          if (performance.topPerformers && Array.isArray(performance.topPerformers)) {
            this.testUtils.addStep('优秀学生数据验证', true, {
              topCount: performance.topPerformers.length
            });
          }
          
          // 验证需要改进的学生列表
          if (performance.improvementNeeded && Array.isArray(performance.improvementNeeded)) {
            this.testUtils.addStep('待改进学生数据验证', true, {
              improvementCount: performance.improvementNeeded.length
            });
          }
        } else {
          this.testUtils.addStep('获取学生表现分析成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '学生表现分析功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('学生表现分析接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '学生表现分析接口需要实现');
      } else {
        this.testUtils.addStep('获取学生表现分析失败', false, response.data);
        this.testUtils.endTest(false, `获取学生表现分析失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `学生表现分析测试失败: ${error.message}`);
    }
  }

  /**
   * 测试成绩导出功能
   */
  async testExportGrades() {
    this.testUtils.startTest('成绩导出', '测试成绩数据导出功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过成绩导出测试');
        return;
      }

      const exportParams = {
        format: 'excel',
        examId: this.testExamId || 'all',
        includeStatistics: true
      };

      this.testUtils.addStep('发送成绩导出请求');
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.admin.exportGrades,
        exportParams,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回导出结果');
        
        if (response.data.data) {
          const exportResult = response.data.data;
          this.testUtils.addStep('成绩导出成功', true, {
            hasDownloadUrl: !!exportResult.downloadUrl,
            hasFileName: !!exportResult.fileName,
            format: exportParams.format
          });
          
          // 验证导出文件信息
          if (exportResult.downloadUrl) {
            this.testUtils.assert(exportResult.downloadUrl.includes('.xlsx') || exportResult.downloadUrl.includes('.xls'), '导出文件应该是Excel格式');
            this.testUtils.addStep('导出文件格式验证通过', true);
          }
        } else {
          this.testUtils.addStep('成绩导出成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '成绩导出功能正常');
      } else if (response.status === 404 || response.status === 405) {
        this.testUtils.addStep('成绩导出接口不存在或方法不允许', true, { status: response.status });
        this.testUtils.endTest(true, '成绩导出接口需要实现');
      } else {
        this.testUtils.addStep('成绩导出失败', false, response.data);
        this.testUtils.endTest(false, `成绩导出失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `成绩导出测试失败: ${error.message}`);
    }
  }

  /**
   * 测试统计数据导出
   */
  async testExportStatistics() {
    this.testUtils.startTest('统计数据导出', '测试统计分析数据导出功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过统计数据导出测试');
        return;
      }

      const exportParams = {
        format: 'pdf',
        type: 'comprehensive',
        includeCharts: true
      };

      this.testUtils.addStep('发送统计数据导出请求');
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.admin.exportStatistics,
        exportParams,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回导出结果');
        
        if (response.data.data) {
          const exportResult = response.data.data;
          this.testUtils.addStep('统计数据导出成功', true, {
            hasDownloadUrl: !!exportResult.downloadUrl,
            hasFileName: !!exportResult.fileName,
            format: exportParams.format
          });
          
          // 验证导出文件信息
          if (exportResult.downloadUrl) {
            this.testUtils.assert(exportResult.downloadUrl.includes('.pdf'), '导出文件应该是PDF格式');
            this.testUtils.addStep('导出文件格式验证通过', true);
          }
        } else {
          this.testUtils.addStep('统计数据导出成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '统计数据导出功能正常');
      } else if (response.status === 404 || response.status === 405) {
        this.testUtils.addStep('统计数据导出接口不存在或方法不允许', true, { status: response.status });
        this.testUtils.endTest(true, '统计数据导出接口需要实现');
      } else {
        this.testUtils.addStep('统计数据导出失败', false, response.data);
        this.testUtils.endTest(false, `统计数据导出失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `统计数据导出测试失败: ${error.message}`);
    }
  }

  /**
   * 测试成绩分布分析
   */
  async testGradeDistribution() {
    this.testUtils.startTest('成绩分布分析', '测试成绩分布图表和分析功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过成绩分布分析测试');
        return;
      }

      const analysisParams = {
        examId: this.testExamId || 'all',
        groupBy: 'score_range',
        includePercentiles: true
      };

      this.testUtils.addStep('发送成绩分布分析请求');
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.admin.gradeDistribution,
        analysisParams,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回分布分析数据');
        
        if (response.data.data) {
          const distribution = response.data.data;
          this.testUtils.addStep('获取成绩分布分析成功', true, {
            hasDistribution: !!distribution.distribution,
            hasPercentiles: !!distribution.percentiles,
            hasChartData: !!distribution.chartData
          });
          
          // 验证分布数据
          if (distribution.distribution && Array.isArray(distribution.distribution)) {
            this.testUtils.addStep('分布数据验证', true, {
              rangeCount: distribution.distribution.length
            });
          }
          
          // 验证百分位数据
          if (distribution.percentiles) {
            this.testUtils.assert(typeof distribution.percentiles.p25 !== 'undefined', '应该包含25%分位数');
            this.testUtils.assert(typeof distribution.percentiles.p50 !== 'undefined', '应该包含50%分位数');
            this.testUtils.assert(typeof distribution.percentiles.p75 !== 'undefined', '应该包含75%分位数');
            this.testUtils.addStep('百分位数据验证通过', true, distribution.percentiles);
          }
        } else {
          this.testUtils.addStep('获取成绩分布分析成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '成绩分布分析功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('成绩分布分析接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '成绩分布分析接口需要实现');
      } else {
        this.testUtils.addStep('获取成绩分布分析失败', false, response.data);
        this.testUtils.endTest(false, `获取成绩分布分析失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `成绩分布分析测试失败: ${error.message}`);
    }
  }

  /**
   * 测试考试对比分析
   */
  async testCompareExams() {
    this.testUtils.startTest('考试对比分析', '测试多个考试之间的对比分析功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过考试对比分析测试');
        return;
      }

      const compareParams = {
        examIds: ['exam-1', 'exam-2', 'exam-3'],
        metrics: ['average', 'distribution', 'difficulty']
      };

      this.testUtils.addStep('发送考试对比分析请求');
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.admin.compareExams,
        compareParams,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回对比分析数据');
        
        if (response.data.data) {
          const comparison = response.data.data;
          this.testUtils.addStep('获取考试对比分析成功', true, {
            hasComparison: !!comparison.comparison,
            hasRecommendations: !!comparison.recommendations,
            examCount: compareParams.examIds.length
          });
          
          // 验证对比数据
          if (comparison.comparison && Array.isArray(comparison.comparison)) {
            this.testUtils.addStep('对比数据验证', true, {
              comparisonCount: comparison.comparison.length
            });
          }
          
          // 验证建议
          if (comparison.recommendations && Array.isArray(comparison.recommendations)) {
            this.testUtils.addStep('改进建议验证', true, {
              recommendationCount: comparison.recommendations.length
            });
          }
        } else {
          this.testUtils.addStep('获取考试对比分析成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '考试对比分析功能正常');
      } else if (response.status === 404 || response.status === 405) {
        this.testUtils.addStep('考试对比分析接口不存在或方法不允许', true, { status: response.status });
        this.testUtils.endTest(true, '考试对比分析接口需要实现');
      } else {
        this.testUtils.addStep('获取考试对比分析失败', false, response.data);
        this.testUtils.endTest(false, `获取考试对比分析失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `考试对比分析测试失败: ${error.message}`);
    }
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const test = new GradeStatisticsTest();
  test.runAllTests().catch(console.error);
}

module.exports = GradeStatisticsTest;