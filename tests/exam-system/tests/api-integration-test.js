const TestUtils = require('../utils/test-utils');
const config = require('../config/test-config');

/**
 * API接口完整性测试类
 * 验证所有API端点的可用性、响应格式和错误处理
 */
class ApiIntegrationTest {
    constructor() {
        this.utils = new TestUtils();
        this.adminToken = null;
        this.studentToken = null;
        this.testExamId = null;
    }

    /**
     * 执行所有API接口测试
     * @returns {Promise<Object>} 测试结果
     */
    async runAllTests() {
        const testName = 'API接口完整性测试';
        this.utils.startTest(testName);

        try {
            // 准备测试数据
            await this.setupTestData();

            // 执行各类API测试
            await this.testAuthenticationApis();
            await this.testExamManagementApis();
            await this.testStudentApis();
            await this.testGradeApis();
            await this.testSystemApis();
            await this.testErrorHandling();
            await this.testApiSecurity();

            return this.utils.endTest(testName, true, '所有API接口测试通过');
        } catch (error) {
            return this.utils.endTest(testName, false, `API测试失败: ${error.message}`);
        }
    }

    /**
     * 准备测试数据
     * 获取必要的认证令牌和测试数据
     */
    async setupTestData() {
        // 管理员登录获取令牌
        const adminLoginResponse = await this.utils.makeRequest('POST', '/api/admin/login', {
            phone: config.testUsers.admin.phone,
            password: config.testUsers.admin.password
        });
        
        this.utils.assert(adminLoginResponse.success, '管理员登录失败');
        this.adminToken = adminLoginResponse.data.token;

        // 学生登录获取令牌
        const studentLoginResponse = await this.utils.makeRequest('POST', '/api/student/login', {
            phone: config.testUsers.student.phone,
            password: config.testUsers.student.password
        });
        
        this.utils.assert(studentLoginResponse.success, '学生登录失败');
        this.studentToken = studentLoginResponse.data.token;

        // 创建测试考试
        const examResponse = await this.utils.makeRequest('POST', '/api/admin/exams', 
            config.testExam,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        
        if (examResponse.success) {
            this.testExamId = examResponse.data.id;
        }
    }

    /**
     * 测试认证相关API
     * 验证登录、注册、令牌验证等接口
     */
    async testAuthenticationApis() {
        console.log('测试认证API...');

        // 测试管理员登录API
        const adminLoginTest = await this.utils.makeRequest('POST', '/api/admin/login', {
            phone: config.testUsers.admin.phone,
            password: config.testUsers.admin.password
        });
        this.utils.assert(adminLoginTest.success, '管理员登录API失败');
        this.utils.assert(adminLoginTest.data.token, '管理员登录未返回令牌');

        // 测试学生登录API
        const studentLoginTest = await this.utils.makeRequest('POST', '/api/student/login', {
            phone: config.testUsers.student.phone,
            password: config.testUsers.student.password
        });
        this.utils.assert(studentLoginTest.success, '学生登录API失败');
        this.utils.assert(studentLoginTest.data.token, '学生登录未返回令牌');

        // 测试令牌验证API
        const tokenVerifyTest = await this.utils.makeRequest('GET', '/api/auth/verify',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(tokenVerifyTest.success, '令牌验证API失败');

        // 测试登出API
        const logoutTest = await this.utils.makeRequest('POST', '/api/auth/logout',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(logoutTest.success, '登出API失败');
    }

    /**
     * 测试考试管理相关API
     * 验证考试的增删改查接口
     */
    async testExamManagementApis() {
        console.log('测试考试管理API...');

        // 测试创建考试API
        const createExamTest = await this.utils.makeRequest('POST', '/api/admin/exams',
            {
                title: 'API测试考试',
                description: '用于API测试的考试',
                duration: 60,
                startTime: new Date(Date.now() + 3600000).toISOString(),
                endTime: new Date(Date.now() + 7200000).toISOString()
            },
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(createExamTest.success, '创建考试API失败');
        const apiTestExamId = createExamTest.data.id;

        // 测试获取考试列表API
        const getExamsTest = await this.utils.makeRequest('GET', '/api/admin/exams',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(getExamsTest.success, '获取考试列表API失败');
        this.utils.assert(Array.isArray(getExamsTest.data), '考试列表格式错误');

        // 测试获取考试详情API
        const getExamDetailTest = await this.utils.makeRequest('GET', `/api/admin/exams/${apiTestExamId}`,
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(getExamDetailTest.success, '获取考试详情API失败');
        this.utils.assert(getExamDetailTest.data.id === apiTestExamId, '考试详情ID不匹配');

        // 测试更新考试API
        const updateExamTest = await this.utils.makeRequest('PUT', `/api/admin/exams/${apiTestExamId}`,
            {
                title: 'API测试考试(已更新)',
                description: '更新后的考试描述'
            },
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(updateExamTest.success, '更新考试API失败');

        // 测试删除考试API
        const deleteExamTest = await this.utils.makeRequest('DELETE', `/api/admin/exams/${apiTestExamId}`,
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(deleteExamTest.success, '删除考试API失败');
    }

    /**
     * 测试学生相关API
     * 验证学生查看考试、参加考试等接口
     */
    async testStudentApis() {
        console.log('测试学生API...');

        if (!this.testExamId) {
            console.log('跳过学生API测试：无可用考试');
            return;
        }

        // 测试学生获取可用考试列表API
        const getAvailableExamsTest = await this.utils.makeRequest('GET', '/api/student/exams/available',
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
        );
        this.utils.assert(getAvailableExamsTest.success, '获取可用考试列表API失败');

        // 测试学生获取考试详情API
        const getStudentExamDetailTest = await this.utils.makeRequest('GET', `/api/student/exams/${this.testExamId}`,
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
        );
        this.utils.assert(getStudentExamDetailTest.success, '学生获取考试详情API失败');

        // 测试开始考试API
        const startExamTest = await this.utils.makeRequest('POST', `/api/student/exams/${this.testExamId}/start`,
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
        );
        this.utils.assert(startExamTest.success, '开始考试API失败');

        // 测试提交答案API
        const submitAnswerTest = await this.utils.makeRequest('POST', `/api/student/exams/${this.testExamId}/answers`,
            {
                questionId: 1,
                answer: 'A'
            },
            { 'Authorization': `Bearer ${this.studentToken}` }
        );
        this.utils.assert(submitAnswerTest.success, '提交答案API失败');

        // 测试提交考试API
        const submitExamTest = await this.utils.makeRequest('POST', `/api/student/exams/${this.testExamId}/submit`,
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
        );
        this.utils.assert(submitExamTest.success, '提交考试API失败');
    }

    /**
     * 测试成绩相关API
     * 验证成绩查看、统计等接口
     */
    async testGradeApis() {
        console.log('测试成绩API...');

        // 测试管理员获取所有成绩API
        const getAllGradesTest = await this.utils.makeRequest('GET', '/api/admin/grades',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(getAllGradesTest.success, '获取所有成绩API失败');

        // 测试成绩统计API
        const getGradeStatisticsTest = await this.utils.makeRequest('GET', '/api/admin/grades/statistics',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(getGradeStatisticsTest.success, '成绩统计API失败');

        // 测试学生获取个人成绩API
        const getStudentGradesTest = await this.utils.makeRequest('GET', '/api/student/grades',
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
        );
        this.utils.assert(getStudentGradesTest.success, '学生获取个人成绩API失败');

        if (this.testExamId) {
            // 测试获取特定考试成绩API
            const getExamGradesTest = await this.utils.makeRequest('GET', `/api/admin/exams/${this.testExamId}/grades`,
                null,
                { 'Authorization': `Bearer ${this.adminToken}` }
            );
            this.utils.assert(getExamGradesTest.success, '获取考试成绩API失败');
        }
    }

    /**
     * 测试系统相关API
     * 验证系统状态、配置等接口
     */
    async testSystemApis() {
        console.log('测试系统API...');

        // 测试系统健康检查API
        const healthCheckTest = await this.utils.makeRequest('GET', '/api/health');
        this.utils.assert(healthCheckTest.success, '系统健康检查API失败');

        // 测试系统信息API
        const systemInfoTest = await this.utils.makeRequest('GET', '/api/system/info',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(systemInfoTest.success, '系统信息API失败');

        // 测试系统配置API
        const systemConfigTest = await this.utils.makeRequest('GET', '/api/system/config',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(systemConfigTest.success, '系统配置API失败');
    }

    /**
     * 测试错误处理
     * 验证API的错误响应和状态码
     */
    async testErrorHandling() {
        console.log('测试错误处理...');

        // 测试404错误
        const notFoundTest = await this.utils.makeRequest('GET', '/api/nonexistent');
        this.utils.assert(!notFoundTest.success, '404错误处理失败');

        // 测试无效令牌
        const invalidTokenTest = await this.utils.makeRequest('GET', '/api/admin/exams',
            null,
            { 'Authorization': 'Bearer invalid_token' }
        );
        this.utils.assert(!invalidTokenTest.success, '无效令牌错误处理失败');

        // 测试缺少必需参数
        const missingParamsTest = await this.utils.makeRequest('POST', '/api/admin/login', {});
        this.utils.assert(!missingParamsTest.success, '缺少参数错误处理失败');

        // 测试无效数据格式
        const invalidDataTest = await this.utils.makeRequest('POST', '/api/admin/exams',
            { title: '' }, // 空标题
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        this.utils.assert(!invalidDataTest.success, '无效数据错误处理失败');
    }

    /**
     * 测试API安全性
     * 验证权限控制和安全措施
     */
    async testApiSecurity() {
        console.log('测试API安全性...');

        // 测试未授权访问管理员接口
        const unauthorizedAdminTest = await this.utils.makeRequest('GET', '/api/admin/exams');
        this.utils.assert(!unauthorizedAdminTest.success, '未授权访问管理员接口应该失败');

        // 测试学生访问管理员接口
        const studentAccessAdminTest = await this.utils.makeRequest('GET', '/api/admin/exams',
            null,
            { 'Authorization': `Bearer ${this.studentToken}` }
        );
        this.utils.assert(!studentAccessAdminTest.success, '学生访问管理员接口应该失败');

        // 测试管理员访问学生接口（应该被拒绝或返回空数据）
        const adminAccessStudentTest = await this.utils.makeRequest('GET', '/api/student/grades',
            null,
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        // 这个测试可能成功也可能失败，取决于系统设计

        // 测试SQL注入防护
        const sqlInjectionTest = await this.utils.makeRequest('POST', '/api/admin/login', {
            phone: "'; DROP TABLE users; --",
            password: 'password'
        });
        this.utils.assert(!sqlInjectionTest.success, 'SQL注入防护失败');

        // 测试XSS防护
        const xssTest = await this.utils.makeRequest('POST', '/api/admin/exams',
            {
                title: '<script>alert("XSS")</script>',
                description: '测试XSS防护'
            },
            { 'Authorization': `Bearer ${this.adminToken}` }
        );
        // 检查响应中是否包含未转义的脚本标签
        if (xssTest.success && xssTest.data.title) {
            this.utils.assert(
                !xssTest.data.title.includes('<script>'),
                'XSS防护失败：脚本标签未被转义'
            );
        }
    }
}

module.exports = ApiIntegrationTest;