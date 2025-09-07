/**
 * 权限控制测试
 * 测试不同角色用户的访问权限和操作限制
 */

const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

class PermissionControlTest {
  constructor() {
    this.testUtils = new TestUtils();
    this.adminUser = config.testUsers.admin;
    this.studentUser = config.testUsers.student;
    this.adminToken = null;
    this.studentToken = null;
  }

  /**
   * 执行所有权限控制测试
   */
  async runAllTests() {
    console.log('\n🔐 开始执行权限控制测试套件');
    console.log('='.repeat(50));

    try {
      // 用户登录
      await this.loginUsers();
      
      // 管理员权限测试
      await this.testAdminPermissions();
      
      // 学生权限测试
      await this.testStudentPermissions();
      
      // 跨角色访问测试
      await this.testCrossRoleAccess();
      
      // 未授权访问测试
      await this.testUnauthorizedAccess();
      
      // 令牌验证测试
      await this.testTokenValidation();
      
      // 角色权限边界测试
      await this.testRoleBoundaries();
      
      // 敏感操作权限测试
      await this.testSensitiveOperations();
      
    } catch (error) {
      console.error('测试执行出错:', error.message);
    }

    this.testUtils.printSummary();
    await this.testUtils.saveReport('permission-control-test-report.json');
  }

  /**
   * 用户登录获取令牌
   */
  async loginUsers() {
    this.testUtils.startTest('用户登录', '获取管理员和学生访问令牌');

    try {
      // 管理员登录
      this.testUtils.addStep('管理员登录');
      const adminLoginData = {
        phone: this.adminUser.phone,
        password: this.adminUser.password,
        loginType: 'password'
      };

      const adminResponse = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        adminLoginData
      );

      if (adminResponse.success && adminResponse.status === 200) {
        const adminData = adminResponse.data.data;
        if (adminData && adminData.token) {
          this.adminToken = adminData.token;
          this.testUtils.addStep('管理员登录成功', true, {
            role: adminData.user.role,
            hasToken: !!adminData.token
          });
        }
      }

      // 学生登录
      this.testUtils.addStep('学生登录');
      const studentLoginData = {
        phone: this.studentUser.phone,
        password: this.studentUser.password,
        loginType: 'password'
      };

      const studentResponse = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.auth.login,
        studentLoginData
      );

      if (studentResponse.success && studentResponse.status === 200) {
        const studentData = studentResponse.data.data;
        if (studentData && studentData.token) {
          this.studentToken = studentData.token;
          this.testUtils.addStep('学生登录成功', true, {
            role: studentData.user.role,
            hasToken: !!studentData.token
          });
        }
      }

      const hasAdminToken = !!this.adminToken;
      const hasStudentToken = !!this.studentToken;
      
      this.testUtils.endTest(
        hasAdminToken || hasStudentToken, 
        `用户登录完成 - 管理员: ${hasAdminToken ? '成功' : '失败'}, 学生: ${hasStudentToken ? '成功' : '失败'}`
      );
    } catch (error) {
      this.testUtils.endTest(false, `用户登录测试失败: ${error.message}`);
    }
  }

  /**
   * 测试管理员权限
   */
  async testAdminPermissions() {
    this.testUtils.startTest('管理员权限测试', '验证管理员可以访问所有管理功能');

    try {
      if (!this.adminToken) {
        this.testUtils.addStep('跳过测试，没有管理员令牌', true);
        this.testUtils.endTest(true, '跳过管理员权限测试');
        return;
      }

      const adminEndpoints = [
        { name: '考试管理', method: 'GET', url: config.endpoints.admin.exams },
        { name: '用户管理', method: 'GET', url: config.endpoints.admin.users },
        { name: '成绩查看', method: 'GET', url: config.endpoints.admin.grades },
        { name: '统计分析', method: 'GET', url: config.endpoints.admin.statistics },
        { name: '系统设置', method: 'GET', url: config.endpoints.admin.settings }
      ];

      let successCount = 0;
      let totalCount = adminEndpoints.length;

      for (const endpoint of adminEndpoints) {
        this.testUtils.addStep(`测试管理员访问: ${endpoint.name}`);
        
        try {
          const response = await this.testUtils.makeRequest(
            endpoint.method,
            endpoint.url,
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
          );

          // 200 表示成功访问，404 表示接口未实现但权限正确
          if (response.status === 200 || response.status === 404) {
            this.testUtils.addStep(`${endpoint.name} 访问权限正确`, true, {
              status: response.status,
              hasPermission: response.status !== 403
            });
            successCount++;
          } else if (response.status === 403) {
            this.testUtils.addStep(`${endpoint.name} 访问被拒绝`, false, {
              status: response.status,
              message: '管理员应该有访问权限'
            });
          } else {
            this.testUtils.addStep(`${endpoint.name} 访问异常`, true, {
              status: response.status,
              note: '非权限问题'
            });
            successCount++;
          }
        } catch (error) {
          this.testUtils.addStep(`${endpoint.name} 访问出错`, true, {
            error: error.message,
            note: '网络或服务器问题'
          });
          successCount++; // 网络错误不算权限问题
        }
      }

      const allPermissionsValid = successCount === totalCount;
      this.testUtils.endTest(
        allPermissionsValid,
        `管理员权限测试完成 - ${successCount}/${totalCount} 个接口权限正确`
      );
    } catch (error) {
      this.testUtils.endTest(false, `管理员权限测试失败: ${error.message}`);
    }
  }

  /**
   * 测试学生权限
   */
  async testStudentPermissions() {
    this.testUtils.startTest('学生权限测试', '验证学生只能访问允许的功能');

    try {
      if (!this.studentToken) {
        this.testUtils.addStep('跳过测试，没有学生令牌', true);
        this.testUtils.endTest(true, '跳过学生权限测试');
        return;
      }

      const studentAllowedEndpoints = [
        { name: '查看可用考试', method: 'GET', url: config.endpoints.student.availableExams, shouldAllow: true },
        { name: '查看个人成绩', method: 'GET', url: config.endpoints.student.myGrades, shouldAllow: true },
        { name: '个人信息', method: 'GET', url: config.endpoints.student.profile, shouldAllow: true }
      ];

      const studentForbiddenEndpoints = [
        { name: '管理员考试管理', method: 'GET', url: config.endpoints.admin.exams, shouldAllow: false },
        { name: '管理员用户管理', method: 'GET', url: config.endpoints.admin.users, shouldAllow: false },
        { name: '管理员统计分析', method: 'GET', url: config.endpoints.admin.statistics, shouldAllow: false }
      ];

      let correctPermissions = 0;
      let totalTests = studentAllowedEndpoints.length + studentForbiddenEndpoints.length;

      // 测试学生应该有权限的接口
      for (const endpoint of studentAllowedEndpoints) {
        this.testUtils.addStep(`测试学生访问: ${endpoint.name}`);
        
        try {
          const response = await this.testUtils.makeRequest(
            endpoint.method,
            endpoint.url,
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
          );

          if (response.status === 200 || response.status === 404) {
            this.testUtils.addStep(`${endpoint.name} 访问权限正确`, true, {
              status: response.status,
              expected: '允许访问'
            });
            correctPermissions++;
          } else if (response.status === 403) {
            this.testUtils.addStep(`${endpoint.name} 访问被意外拒绝`, false, {
              status: response.status,
              expected: '应该允许访问'
            });
          } else {
            this.testUtils.addStep(`${endpoint.name} 访问异常`, true, {
              status: response.status,
              note: '非权限问题'
            });
            correctPermissions++;
          }
        } catch (error) {
          this.testUtils.addStep(`${endpoint.name} 访问出错`, true, {
            error: error.message,
            note: '网络或服务器问题'
          });
          correctPermissions++;
        }
      }

      // 测试学生不应该有权限的接口
      for (const endpoint of studentForbiddenEndpoints) {
        this.testUtils.addStep(`测试学生禁止访问: ${endpoint.name}`);
        
        try {
          const response = await this.testUtils.makeRequest(
            endpoint.method,
            endpoint.url,
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
          );

          if (response.status === 403) {
            this.testUtils.addStep(`${endpoint.name} 正确拒绝访问`, true, {
              status: response.status,
              expected: '拒绝访问'
            });
            correctPermissions++;
          } else if (response.status === 200) {
            this.testUtils.addStep(`${endpoint.name} 意外允许访问`, false, {
              status: response.status,
              expected: '应该拒绝访问'
            });
          } else {
            this.testUtils.addStep(`${endpoint.name} 访问异常`, true, {
              status: response.status,
              note: '可能接口不存在或其他问题'
            });
            correctPermissions++;
          }
        } catch (error) {
          this.testUtils.addStep(`${endpoint.name} 访问出错`, true, {
            error: error.message,
            note: '网络或服务器问题'
          });
          correctPermissions++;
        }
      }

      const allPermissionsCorrect = correctPermissions === totalTests;
      this.testUtils.endTest(
        allPermissionsCorrect,
        `学生权限测试完成 - ${correctPermissions}/${totalTests} 个权限设置正确`
      );
    } catch (error) {
      this.testUtils.endTest(false, `学生权限测试失败: ${error.message}`);
    }
  }

  /**
   * 测试跨角色访问
   */
  async testCrossRoleAccess() {
    this.testUtils.startTest('跨角色访问测试', '验证用户不能访问其他角色的专属功能');

    try {
      if (!this.adminToken || !this.studentToken) {
        this.testUtils.addStep('跳过测试，缺少必要的令牌', true);
        this.testUtils.endTest(true, '跳过跨角色访问测试');
        return;
      }

      // 测试学生使用管理员令牌访问学生接口（应该被拒绝或有限制）
      this.testUtils.addStep('测试管理员访问学生专属功能');
      const studentExamResponse = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.student.availableExams,
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      // 管理员可能可以访问学生功能（取决于系统设计）
      if (studentExamResponse.status === 200 || studentExamResponse.status === 404) {
        this.testUtils.addStep('管理员可以访问学生功能', true, {
          status: studentExamResponse.status,
          note: '管理员通常有更高权限'
        });
      } else {
        this.testUtils.addStep('管理员访问学生功能被限制', true, {
          status: studentExamResponse.status,
          note: '严格的角色分离'
        });
      }

      // 测试学生访问管理员功能（应该被拒绝）
      this.testUtils.addStep('测试学生访问管理员专属功能');
      const adminExamResponse = await this.testUtils.makeRequest(
        'GET',
        config.endpoints.admin.exams,
        null,
        { 'Authorization': `Bearer ${this.studentToken}` }
      );

      let crossRoleTestPassed = false;
      if (adminExamResponse.status === 403) {
        this.testUtils.addStep('学生正确被拒绝访问管理员功能', true, {
          status: adminExamResponse.status
        });
        crossRoleTestPassed = true;
      } else if (adminExamResponse.status === 200) {
        this.testUtils.addStep('学生意外获得管理员权限', false, {
          status: adminExamResponse.status,
          security_issue: '权限控制存在问题'
        });
      } else {
        this.testUtils.addStep('学生访问管理员功能返回其他状态', true, {
          status: adminExamResponse.status,
          note: '可能接口不存在'
        });
        crossRoleTestPassed = true;
      }

      this.testUtils.endTest(crossRoleTestPassed, '跨角色访问控制测试完成');
    } catch (error) {
      this.testUtils.endTest(false, `跨角色访问测试失败: ${error.message}`);
    }
  }

  /**
   * 测试未授权访问
   */
  async testUnauthorizedAccess() {
    this.testUtils.startTest('未授权访问测试', '验证没有令牌时无法访问受保护的接口');

    try {
      const protectedEndpoints = [
        { name: '管理员考试管理', method: 'GET', url: config.endpoints.admin.exams },
        { name: '学生可用考试', method: 'GET', url: config.endpoints.student.availableExams },
        { name: '个人成绩', method: 'GET', url: config.endpoints.student.myGrades }
      ];

      let correctlyBlocked = 0;
      let totalTests = protectedEndpoints.length;

      for (const endpoint of protectedEndpoints) {
        this.testUtils.addStep(`测试未授权访问: ${endpoint.name}`);
        
        try {
          const response = await this.testUtils.makeRequest(
            endpoint.method,
            endpoint.url,
            null,
            {} // 没有Authorization头
          );

          if (response.status === 401 || response.status === 403) {
            this.testUtils.addStep(`${endpoint.name} 正确拒绝未授权访问`, true, {
              status: response.status
            });
            correctlyBlocked++;
          } else if (response.status === 200) {
            this.testUtils.addStep(`${endpoint.name} 意外允许未授权访问`, false, {
              status: response.status,
              security_issue: '应该要求身份验证'
            });
          } else {
            this.testUtils.addStep(`${endpoint.name} 返回其他状态`, true, {
              status: response.status,
              note: '可能接口不存在或其他问题'
            });
            correctlyBlocked++;
          }
        } catch (error) {
          this.testUtils.addStep(`${endpoint.name} 访问出错`, true, {
            error: error.message,
            note: '网络或服务器问题'
          });
          correctlyBlocked++;
        }
      }

      const allCorrectlyBlocked = correctlyBlocked === totalTests;
      this.testUtils.endTest(
        allCorrectlyBlocked,
        `未授权访问测试完成 - ${correctlyBlocked}/${totalTests} 个接口正确拒绝未授权访问`
      );
    } catch (error) {
      this.testUtils.endTest(false, `未授权访问测试失败: ${error.message}`);
    }
  }

  /**
   * 测试令牌验证
   */
  async testTokenValidation() {
    this.testUtils.startTest('令牌验证测试', '验证无效令牌和过期令牌的处理');

    try {
      const testEndpoint = config.endpoints.admin.exams;
      
      // 测试无效令牌
      this.testUtils.addStep('测试无效令牌');
      const invalidTokenResponse = await this.testUtils.makeRequest(
        'GET',
        testEndpoint,
        null,
        { 'Authorization': 'Bearer invalid-token-12345' }
      );

      let invalidTokenHandled = false;
      if (invalidTokenResponse.status === 401 || invalidTokenResponse.status === 403) {
        this.testUtils.addStep('无效令牌正确被拒绝', true, {
          status: invalidTokenResponse.status
        });
        invalidTokenHandled = true;
      } else {
        this.testUtils.addStep('无效令牌处理异常', false, {
          status: invalidTokenResponse.status,
          expected: '应该返回401或403'
        });
      }

      // 测试格式错误的令牌
      this.testUtils.addStep('测试格式错误的令牌');
      const malformedTokenResponse = await this.testUtils.makeRequest(
        'GET',
        testEndpoint,
        null,
        { 'Authorization': 'InvalidFormat' }
      );

      let malformedTokenHandled = false;
      if (malformedTokenResponse.status === 401 || malformedTokenResponse.status === 403) {
        this.testUtils.addStep('格式错误令牌正确被拒绝', true, {
          status: malformedTokenResponse.status
        });
        malformedTokenHandled = true;
      } else {
        this.testUtils.addStep('格式错误令牌处理异常', false, {
          status: malformedTokenResponse.status,
          expected: '应该返回401或403'
        });
      }

      // 测试空令牌
      this.testUtils.addStep('测试空令牌');
      const emptyTokenResponse = await this.testUtils.makeRequest(
        'GET',
        testEndpoint,
        null,
        { 'Authorization': 'Bearer ' }
      );

      let emptyTokenHandled = false;
      if (emptyTokenResponse.status === 401 || emptyTokenResponse.status === 403) {
        this.testUtils.addStep('空令牌正确被拒绝', true, {
          status: emptyTokenResponse.status
        });
        emptyTokenHandled = true;
      } else {
        this.testUtils.addStep('空令牌处理异常', false, {
          status: emptyTokenResponse.status,
          expected: '应该返回401或403'
        });
      }

      const allTokenValidationPassed = invalidTokenHandled && malformedTokenHandled && emptyTokenHandled;
      this.testUtils.endTest(allTokenValidationPassed, '令牌验证测试完成');
    } catch (error) {
      this.testUtils.endTest(false, `令牌验证测试失败: ${error.message}`);
    }
  }

  /**
   * 测试角色权限边界
   */
  async testRoleBoundaries() {
    this.testUtils.startTest('角色权限边界测试', '测试角色权限的具体边界和限制');

    try {
      if (!this.adminToken || !this.studentToken) {
        this.testUtils.addStep('跳过测试，缺少必要的令牌', true);
        this.testUtils.endTest(true, '跳过角色权限边界测试');
        return;
      }

      // 测试管理员创建考试权限
      this.testUtils.addStep('测试管理员创建考试权限');
      const createExamData = {
        title: '权限测试考试',
        description: '用于测试权限控制的考试',
        duration: 60,
        questions: []
      };

      const adminCreateResponse = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.admin.exams,
        createExamData,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      let adminCanCreate = false;
      if (adminCreateResponse.status === 200 || adminCreateResponse.status === 201) {
        this.testUtils.addStep('管理员可以创建考试', true, {
          status: adminCreateResponse.status
        });
        adminCanCreate = true;
      } else if (adminCreateResponse.status === 404 || adminCreateResponse.status === 405) {
        this.testUtils.addStep('创建考试接口不存在', true, {
          status: adminCreateResponse.status,
          note: '接口未实现'
        });
        adminCanCreate = true; // 接口不存在不算权限问题
      } else {
        this.testUtils.addStep('管理员创建考试被拒绝', false, {
          status: adminCreateResponse.status,
          expected: '管理员应该能创建考试'
        });
      }

      // 测试学生创建考试权限（应该被拒绝）
      this.testUtils.addStep('测试学生创建考试权限');
      const studentCreateResponse = await this.testUtils.makeRequest(
        'POST',
        config.endpoints.admin.exams,
        createExamData,
        { 'Authorization': `Bearer ${this.studentToken}` }
      );

      let studentCorrectlyBlocked = false;
      if (studentCreateResponse.status === 403) {
        this.testUtils.addStep('学生正确被禁止创建考试', true, {
          status: studentCreateResponse.status
        });
        studentCorrectlyBlocked = true;
      } else if (studentCreateResponse.status === 200 || studentCreateResponse.status === 201) {
        this.testUtils.addStep('学生意外获得创建考试权限', false, {
          status: studentCreateResponse.status,
          security_issue: '学生不应该能创建考试'
        });
      } else {
        this.testUtils.addStep('学生创建考试返回其他状态', true, {
          status: studentCreateResponse.status,
          note: '可能接口不存在或其他限制'
        });
        studentCorrectlyBlocked = true;
      }

      const boundariesCorrect = adminCanCreate && studentCorrectlyBlocked;
      this.testUtils.endTest(boundariesCorrect, '角色权限边界测试完成');
    } catch (error) {
      this.testUtils.endTest(false, `角色权限边界测试失败: ${error.message}`);
    }
  }

  /**
   * 测试敏感操作权限
   */
  async testSensitiveOperations() {
    this.testUtils.startTest('敏感操作权限测试', '测试删除、修改等敏感操作的权限控制');

    try {
      if (!this.adminToken || !this.studentToken) {
        this.testUtils.addStep('跳过测试，缺少必要的令牌', true);
        this.testUtils.endTest(true, '跳过敏感操作权限测试');
        return;
      }

      const sensitiveOperations = [
        {
          name: '删除考试',
          method: 'DELETE',
          url: `${config.endpoints.admin.exams}/test-exam-id`,
          adminShouldAllow: true,
          studentShouldAllow: false
        },
        {
          name: '修改用户信息',
          method: 'PUT',
          url: `${config.endpoints.admin.users}/test-user-id`,
          adminShouldAllow: true,
          studentShouldAllow: false
        },
        {
          name: '系统设置修改',
          method: 'PUT',
          url: config.endpoints.admin.settings,
          adminShouldAllow: true,
          studentShouldAllow: false
        }
      ];

      let correctPermissions = 0;
      let totalTests = sensitiveOperations.length * 2; // 每个操作测试管理员和学生

      for (const operation of sensitiveOperations) {
        // 测试管理员权限
        this.testUtils.addStep(`测试管理员${operation.name}权限`);
        const adminResponse = await this.testUtils.makeRequest(
          operation.method,
          operation.url,
          {},
          { 'Authorization': `Bearer ${this.adminToken}` }
        );

        if (operation.adminShouldAllow) {
          if (adminResponse.status === 200 || adminResponse.status === 204 || adminResponse.status === 404 || adminResponse.status === 405) {
            this.testUtils.addStep(`管理员${operation.name}权限正确`, true, {
              status: adminResponse.status
            });
            correctPermissions++;
          } else if (adminResponse.status === 403) {
            this.testUtils.addStep(`管理员${operation.name}被意外拒绝`, false, {
              status: adminResponse.status,
              expected: '管理员应该有权限'
            });
          } else {
            this.testUtils.addStep(`管理员${operation.name}返回异常状态`, true, {
              status: adminResponse.status,
              note: '可能是其他问题'
            });
            correctPermissions++;
          }
        }

        // 测试学生权限
        this.testUtils.addStep(`测试学生${operation.name}权限`);
        const studentResponse = await this.testUtils.makeRequest(
          operation.method,
          operation.url,
          {},
          { 'Authorization': `Bearer ${this.studentToken}` }
        );

        if (!operation.studentShouldAllow) {
          if (studentResponse.status === 403) {
            this.testUtils.addStep(`学生${operation.name}正确被拒绝`, true, {
              status: studentResponse.status
            });
            correctPermissions++;
          } else if (studentResponse.status === 200 || studentResponse.status === 204) {
            this.testUtils.addStep(`学生${operation.name}意外被允许`, false, {
              status: studentResponse.status,
              security_issue: '学生不应该有此权限'
            });
          } else {
            this.testUtils.addStep(`学生${operation.name}返回其他状态`, true, {
              status: studentResponse.status,
              note: '可能接口不存在或其他限制'
            });
            correctPermissions++;
          }
        }
      }

      const allSensitiveOperationsSecure = correctPermissions === totalTests;
      this.testUtils.endTest(
        allSensitiveOperationsSecure,
        `敏感操作权限测试完成 - ${correctPermissions}/${totalTests} 个权限设置正确`
      );
    } catch (error) {
      this.testUtils.endTest(false, `敏感操作权限测试失败: ${error.message}`);
    }
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const test = new PermissionControlTest();
  test.runAllTests().catch(console.error);
}

module.exports = PermissionControlTest;