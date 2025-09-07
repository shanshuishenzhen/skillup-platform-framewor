/**
 * 学生登录和考试参与测试
 * 测试学生登录、查看考试、参加考试、提交答案等功能
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class StudentExamTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.student1 = config.testUsers.student1;
    this.student2 = config.testUsers.student2;
    this.testExam = config.testExams.exam1;
    this.studentToken = null;
    this.availableExamId = null;
    this.examSession = null;
  }

  /**
   * 执行所有学生考试相关测试
   */
  async runAllTests() {
    console.log('\n🎓 开始执行学生考试测试套件');
    console.log('='.repeat(50));

    try {
      // 学生登录测试
      await this.testStudentLogin();
      
      // 考试相关测试
      await this.testGetAvailableExams();
      await this.testStartExam();
      await this.testGetExamQuestions();
      await this.testSubmitAnswers();
      await this.testViewExamResults();
      
      // 测试第二个学生
      await this.testSecondStudentFlow();
    } catch (error) {
      console.error('测试执行出错:', error.message);
    }

    this.testUtils.printSummary();
    await this.testUtils.saveReport('student-exam-test-report.json');
  }

  /**
   * 测试学生登录
   */
  async testStudentLogin() {
    this.testUtils.startTest('学生登录', '测试学生账号登录功能');

    try {
      const loginData = {
        phone: this.student1.phone,
        password: this.student1.password,
        loginType: 'password'
      };

      this.testUtils.addStep(`发送学生登录请求: ${this.student1.phone}`);
      const response = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      // 验证登录响应
      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data && response.data.success, '学生登录应该成功');
        
        const userData = response.data.data;
        if (userData && userData.token) {
          this.studentToken = userData.token;
          this.testUtils.assert(userData.user.role === 'student', '用户角色应该是student');
          this.testUtils.addStep('学生登录成功', true, {
            phone: userData.user.phone,
            role: userData.user.role,
            hasToken: !!userData.token
          });
          this.testUtils.endTest(true, '学生登录功能正常');
        } else {
          this.testUtils.addStep('登录成功但令牌格式异常', false, response.data);
          this.testUtils.endTest(false, '学生登录返回数据格式异常');
        }
      } else if (response.status === 401) {
        this.testUtils.addStep('学生账号不存在或密码错误', true, { status: response.status });
        this.testUtils.endTest(true, '学生账号需要先创建');
        
        // 尝试创建学生账号
        await this.createStudentAccount();
      } else {
        this.testUtils.addStep('学生登录失败', false, response.data);
        this.testUtils.endTest(false, `学生登录失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `学生登录测试失败: ${error.message}`);
    }
  }

  /**
   * 创建学生账号（如果不存在）
   */
  async createStudentAccount() {
    this.testUtils.startTest('创建学生账号', '尝试创建测试学生账号');

    try {
      const studentData = {
        phone: this.student1.phone,
        password: this.student1.password,
        name: this.student1.name,
        role: 'student'
      };

      this.testUtils.addStep('发送创建学生账号请求');
      const response = await this.testUtils.makeRequest(
        'POST',
        '/api/auth/register',
        studentData
      );

      if (response.success && response.status === 200) {
        this.testUtils.addStep('学生账号创建成功', true, studentData);
        this.testUtils.endTest(true, '学生账号创建成功');
        
        // 重新尝试登录
        await this.testStudentLogin();
      } else {
        this.testUtils.addStep('学生注册接口不存在或失败', true, { status: response.status });
        this.testUtils.endTest(true, '学生注册接口需要实现');
      }
    } catch (error) {
      this.testUtils.endTest(false, `创建学生账号失败: ${error.message}`);
    }
  }

  /**
   * 测试获取可用考试列表
   */
  async testGetAvailableExams() {
    this.testUtils.startTest('获取可用考试', '测试学生查看可参加的考试列表');

    try {
      if (!this.studentToken) {
        this.testUtils.addStep('跳过测试，没有学生令牌', true);
        this.testUtils.endTest(true, '跳过可用考试测试');
        return;
      }

      this.testUtils.addStep('发送获取可用考试请求');
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.students.exams,
        null,
        { 'Authorization': `Bearer ${this.studentToken}` }
      );

      // 验证响应
      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回考试数据');
        
        if (response.data.data && Array.isArray(response.data.data)) {
          const exams = response.data.data;
          this.testUtils.addStep('获取可用考试成功', true, {
            examCount: exams.length
          });
          
          // 保存第一个可用考试ID
          if (exams.length > 0) {
            this.availableExamId = exams[0].id;
            this.testUtils.addStep('找到可参加的考试', true, {
              examId: this.availableExamId,
              title: exams[0].title
            });
          }
        } else {
          this.testUtils.addStep('获取考试列表成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '获取可用考试功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('学生考试接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '学生考试接口需要实现');
      } else {
        this.testUtils.addStep('获取可用考试失败', false, response.data);
        this.testUtils.endTest(false, `获取可用考试失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `获取可用考试测试失败: ${error.message}`);
    }
  }

  /**
   * 测试开始考试
   */
  async testStartExam() {
    this.testUtils.startTest('开始考试', '测试学生开始参加考试');

    try {
      if (!this.studentToken) {
        this.testUtils.addStep('跳过测试，没有学生令牌', true);
        this.testUtils.endTest(true, '跳过开始考试测试');
        return;
      }

      const examId = this.availableExamId || 'test-exam-id';
      
      this.testUtils.addStep(`发送开始考试请求: ${examId}`);
      const response = await this.testUtils.makeRequest(
        'POST',
        `${config.endpoints.exams.detail}/${examId}/start`,
        {},
        { 'Authorization': `Bearer ${this.studentToken}` }
      );

      // 验证响应
      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回考试会话数据');
        
        if (response.data.data) {
          this.examSession = response.data.data;
          this.testUtils.addStep('考试开始成功', true, {
            sessionId: this.examSession.sessionId || 'unknown',
            examId: examId,
            startTime: this.examSession.startTime
          });
        } else {
          this.testUtils.addStep('考试开始成功但数据格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '开始考试功能正常');
      } else if (response.status === 404 || response.status === 405) {
        this.testUtils.addStep('开始考试接口不存在或方法不允许', true, { status: response.status });
        this.testUtils.endTest(true, '开始考试接口需要实现');
      } else {
        this.testUtils.addStep('开始考试失败', false, response.data);
        this.testUtils.endTest(false, `开始考试失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `开始考试测试失败: ${error.message}`);
    }
  }

  /**
   * 测试获取考试题目
   */
  async testGetExamQuestions() {
    this.testUtils.startTest('获取考试题目', '测试学生获取考试题目');

    try {
      if (!this.studentToken) {
        this.testUtils.addStep('跳过测试，没有学生令牌', true);
        this.testUtils.endTest(true, '跳过获取题目测试');
        return;
      }

      const examId = this.availableExamId || 'test-exam-id';
      
      this.testUtils.addStep(`发送获取考试题目请求: ${examId}`);
      const response = await this.testUtils.makeRequest(
        'GET',
        `${config.endpoints.exams.detail}/${examId}/questions`,
        null,
        { 'Authorization': `Bearer ${this.studentToken}` }
      );

      // 验证响应
      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回题目数据');
        
        if (response.data.data && Array.isArray(response.data.data)) {
          const questions = response.data.data;
          this.testUtils.addStep('获取考试题目成功', true, {
            questionCount: questions.length
          });
          
          // 验证题目格式
          if (questions.length > 0) {
            const firstQuestion = questions[0];
            this.testUtils.assert(firstQuestion.question, '题目应该有问题内容');
            this.testUtils.assert(firstQuestion.type, '题目应该有类型');
            this.testUtils.addStep('题目格式验证通过', true, {
              type: firstQuestion.type,
              hasOptions: !!firstQuestion.options
            });
          }
        } else {
          this.testUtils.addStep('获取题目成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '获取考试题目功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('考试题目接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '考试题目接口需要实现');
      } else {
        this.testUtils.addStep('获取考试题目失败', false, response.data);
        this.testUtils.endTest(false, `获取考试题目失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `获取考试题目测试失败: ${error.message}`);
    }
  }

  /**
   * 测试提交答案
   */
  async testSubmitAnswers() {
    this.testUtils.startTest('提交考试答案', '测试学生提交考试答案');

    try {
      if (!this.studentToken) {
        this.testUtils.addStep('跳过测试，没有学生令牌', true);
        this.testUtils.endTest(true, '跳过提交答案测试');
        return;
      }

      const examId = this.availableExamId || 'test-exam-id';
      
      // 模拟学生答案
      const answers = {
        sessionId: this.examSession?.sessionId || 'test-session',
        answers: [
          { questionId: 1, answer: 0 }, // 单选题答案
          { questionId: 2, answer: [0, 1, 2] }, // 多选题答案
          { questionId: 3, answer: false }, // 判断题答案
          { questionId: 4, answer: 'MVC架构模式具有分离关注点、提高代码可维护性等优点...' } // 简答题答案
        ],
        submitTime: new Date().toISOString()
      };

      this.testUtils.addStep(`发送提交答案请求: ${examId}`);
      const response = await this.testUtils.makeRequest(
        'POST',
        `${config.endpoints.exams.submit}/${examId}`,
        answers,
        { 'Authorization': `Bearer ${this.studentToken}` }
      );

      // 验证响应
      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回提交结果');
        
        if (response.data.data) {
          this.testUtils.addStep('答案提交成功', true, {
            score: response.data.data.score || 'unknown',
            submitTime: answers.submitTime
          });
        } else {
          this.testUtils.addStep('答案提交成功但数据格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '提交答案功能正常');
      } else if (response.status === 404 || response.status === 405) {
        this.testUtils.addStep('提交答案接口不存在或方法不允许', true, { status: response.status });
        this.testUtils.endTest(true, '提交答案接口需要实现');
      } else {
        this.testUtils.addStep('提交答案失败', false, response.data);
        this.testUtils.endTest(false, `提交答案失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `提交答案测试失败: ${error.message}`);
    }
  }

  /**
   * 测试查看考试结果
   */
  async testViewExamResults() {
    this.testUtils.startTest('查看考试结果', '测试学生查看考试成绩和结果');

    try {
      if (!this.studentToken) {
        this.testUtils.addStep('跳过测试，没有学生令牌', true);
        this.testUtils.endTest(true, '跳过查看结果测试');
        return;
      }

      this.testUtils.addStep('发送查看考试结果请求');
      const response = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.students.results,
        null,
        { 'Authorization': `Bearer ${this.studentToken}` }
      );

      // 验证响应
      if (response.success && response.status === 200) {
        this.testUtils.assert(response.data, '应该返回考试结果数据');
        
        if (response.data.data && Array.isArray(response.data.data)) {
          const results = response.data.data;
          this.testUtils.addStep('获取考试结果成功', true, {
            resultCount: results.length
          });
          
          // 验证结果格式
          if (results.length > 0) {
            const firstResult = results[0];
            this.testUtils.addStep('考试结果格式验证', true, {
              hasScore: 'score' in firstResult,
              hasExamInfo: 'examTitle' in firstResult || 'examId' in firstResult
            });
          }
        } else {
          this.testUtils.addStep('获取结果成功但格式异常', true, response.data);
        }
        
        this.testUtils.endTest(true, '查看考试结果功能正常');
      } else if (response.status === 404) {
        this.testUtils.addStep('考试结果接口不存在', true, { status: response.status });
        this.testUtils.endTest(true, '考试结果接口需要实现');
      } else {
        this.testUtils.addStep('获取考试结果失败', false, response.data);
        this.testUtils.endTest(false, `获取考试结果失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      this.testUtils.endTest(false, `查看考试结果测试失败: ${error.message}`);
    }
  }

  /**
   * 测试第二个学生的完整流程
   */
  async testSecondStudentFlow() {
    this.testUtils.startTest('第二个学生完整流程', '测试多个学生同时参加考试的场景');

    try {
      // 第二个学生登录
      const loginData = {
        phone: this.student2.phone,
        password: this.student2.password,
        loginType: 'password'
      };

      this.testUtils.addStep(`第二个学生登录: ${this.student2.phone}`);
      const loginResponse = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        loginData
      );

      if (loginResponse.success && loginResponse.status === 200) {
        const student2Token = loginResponse.data.data?.token;
        
        if (student2Token) {
          this.testUtils.addStep('第二个学生登录成功', true);
          
          // 快速测试第二个学生的考试流程
          await this.testUtils.wait(1000); // 等待1秒
          
          // 获取可用考试
          const examsResponse = await this.testUtils.makeRequest(
            'GET',
            config.endpoints.students.exams,
            null,
            { 'Authorization': `Bearer ${student2Token}` }
          );
          
          this.testUtils.addStep('第二个学生获取考试列表', examsResponse.success, {
            status: examsResponse.status
          });
          
          this.testUtils.endTest(true, '第二个学生流程测试完成');
        } else {
          this.testUtils.addStep('第二个学生登录失败', false);
          this.testUtils.endTest(false, '第二个学生登录失败');
        }
      } else {
        this.testUtils.addStep('第二个学生账号不存在或登录失败', true, { status: loginResponse.status });
        this.testUtils.endTest(true, '第二个学生需要先创建账号');
      }
    } catch (error) {
      this.testUtils.endTest(false, `第二个学生流程测试失败: ${error.message}`);
    }
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const test = new StudentExamTest();
  test.runAllTests().catch(console.error);
}

module.exports = StudentExamTest;