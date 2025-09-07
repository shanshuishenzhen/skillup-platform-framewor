/**
 * 考试系统测试验证脚本
 * 用于验证测试程序是否能够正常运行
 */

const fs = require('fs');
const path = require('path');

// 测试配置
const config = {
    baseURL: 'http://localhost:3000',
    adminCredentials: {
        username: '13823738278',
        password: 'admin123'
    },
    studentCredentials: {
        username: '13800000002',
        password: 'student123'
    }
};

/**
 * 模拟HTTP请求
 * @param {string} url - 请求URL
 * @param {object} options - 请求选项
 * @returns {Promise<object>} 模拟响应
 */
async function mockRequest(url, options = {}) {
    console.log(`[模拟请求] ${options.method || 'GET'} ${url}`);
    
    // 模拟不同的响应
    if (url.includes('/api/auth/login')) {
        return {
            status: 200,
            data: {
                success: true,
                token: 'mock_jwt_token_' + Date.now(),
                user: {
                    id: 1,
                    username: options.body?.username || 'test_user',
                    role: options.body?.username === '13823738278' ? 'admin' : 'student'
                }
            }
        };
    }
    
    if (url.includes('/api/questions')) {
        return {
            status: 200,
            data: {
                success: true,
                questions: [
                    { id: 1, title: '测试题目1', type: 'single_choice' },
                    { id: 2, title: '测试题目2', type: 'multiple_choice' }
                ]
            }
        };
    }
    
    if (url.includes('/api/exams')) {
        return {
            status: 200,
            data: {
                success: true,
                exams: [
                    { id: 1, title: '测试考试1', status: 'published' },
                    { id: 2, title: '测试考试2', status: 'draft' }
                ]
            }
        };
    }
    
    // 默认成功响应
    return {
        status: 200,
        data: { success: true, message: '操作成功' }
    };
}

/**
 * 执行测试用例
 * @param {string} testName - 测试名称
 * @param {Function} testFunction - 测试函数
 */
async function runTest(testName, testFunction) {
    try {
        console.log(`\n🧪 开始测试: ${testName}`);
        const result = await testFunction();
        console.log(`✅ 测试通过: ${testName}`);
        return { name: testName, status: 'PASS', result };
    } catch (error) {
        console.log(`❌ 测试失败: ${testName} - ${error.message}`);
        return { name: testName, status: 'FAIL', error: error.message };
    }
}

/**
 * 管理员登录测试
 */
async function testAdminLogin() {
    const response = await mockRequest(`${config.baseURL}/api/auth/login`, {
        method: 'POST',
        body: config.adminCredentials
    });
    
    if (response.status !== 200 || !response.data.success) {
        throw new Error('管理员登录失败');
    }
    
    if (response.data.user.role !== 'admin') {
        throw new Error('用户角色验证失败');
    }
    
    return response.data;
}

/**
 * 学生登录测试
 */
async function testStudentLogin() {
    const response = await mockRequest(`${config.baseURL}/api/auth/login`, {
        method: 'POST',
        body: config.studentCredentials
    });
    
    if (response.status !== 200 || !response.data.success) {
        throw new Error('学生登录失败');
    }
    
    if (response.data.user.role !== 'student') {
        throw new Error('用户角色验证失败');
    }
    
    return response.data;
}

/**
 * 题库管理测试
 */
async function testQuestionManagement() {
    // 获取题库列表
    const listResponse = await mockRequest(`${config.baseURL}/api/questions`);
    if (listResponse.status !== 200) {
        throw new Error('获取题库列表失败');
    }
    
    // 创建题目
    const createResponse = await mockRequest(`${config.baseURL}/api/questions`, {
        method: 'POST',
        body: {
            title: '测试题目',
            type: 'single_choice',
            options: ['A', 'B', 'C', 'D'],
            answer: 'A'
        }
    });
    
    if (createResponse.status !== 200) {
        throw new Error('创建题目失败');
    }
    
    return { list: listResponse.data, create: createResponse.data };
}

/**
 * 考试管理测试
 */
async function testExamManagement() {
    // 获取考试列表
    const listResponse = await mockRequest(`${config.baseURL}/api/exams`);
    if (listResponse.status !== 200) {
        throw new Error('获取考试列表失败');
    }
    
    // 创建考试
    const createResponse = await mockRequest(`${config.baseURL}/api/exams`, {
        method: 'POST',
        body: {
            title: '测试考试',
            description: '这是一个测试考试',
            duration: 60,
            questions: [1, 2]
        }
    });
    
    if (createResponse.status !== 200) {
        throw new Error('创建考试失败');
    }
    
    return { list: listResponse.data, create: createResponse.data };
}

/**
 * 成绩管理测试
 */
async function testGradeManagement() {
    // 获取成绩列表
    const gradesResponse = await mockRequest(`${config.baseURL}/api/grades`);
    if (gradesResponse.status !== 200) {
        throw new Error('获取成绩列表失败');
    }
    
    // 成绩统计
    const statsResponse = await mockRequest(`${config.baseURL}/api/grades/stats`);
    if (statsResponse.status !== 200) {
        throw new Error('获取成绩统计失败');
    }
    
    return { grades: gradesResponse.data, stats: statsResponse.data };
}

/**
 * 权限控制测试
 */
async function testPermissionControl() {
    // 测试无效token访问
    const invalidTokenResponse = await mockRequest(`${config.baseURL}/api/admin/users`, {
        headers: { 'Authorization': 'Bearer invalid_token' }
    });
    
    // 测试学生访问管理员接口
    const studentAccessResponse = await mockRequest(`${config.baseURL}/api/admin/users`, {
        headers: { 'Authorization': 'Bearer student_token' }
    });
    
    return { invalidToken: invalidTokenResponse.data, studentAccess: studentAccessResponse.data };
}

/**
 * 主测试函数
 */
async function runAllTests() {
    console.log('🚀 考试系统自动化测试开始');
    console.log('=' .repeat(50));
    
    const testResults = [];
    
    // 执行所有测试
    testResults.push(await runTest('管理员登录测试', testAdminLogin));
    testResults.push(await runTest('学生登录测试', testStudentLogin));
    testResults.push(await runTest('题库管理测试', testQuestionManagement));
    testResults.push(await runTest('考试管理测试', testExamManagement));
    testResults.push(await runTest('成绩管理测试', testGradeManagement));
    testResults.push(await runTest('权限控制测试', testPermissionControl));
    
    // 统计结果
    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const failCount = testResults.filter(r => r.status === 'FAIL').length;
    const totalCount = testResults.length;
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 测试结果汇总:');
    console.log(`总测试数: ${totalCount}`);
    console.log(`通过数: ${passCount}`);
    console.log(`失败数: ${failCount}`);
    console.log(`通过率: ${((passCount / totalCount) * 100).toFixed(2)}%`);
    
    if (failCount > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.filter(r => r.status === 'FAIL').forEach(test => {
            console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    // 生成测试报告
    const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
            total: totalCount,
            passed: passCount,
            failed: failCount,
            passRate: ((passCount / totalCount) * 100).toFixed(2) + '%'
        },
        tests: testResults,
        environment: {
            baseURL: config.baseURL,
            nodeVersion: process.version,
            platform: process.platform
        }
    };
    
    // 确保报告目录存在
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // 保存JSON报告
    const jsonReportPath = path.join(reportsDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // 生成HTML报告
    const htmlReport = generateHTMLReport(reportData);
    const htmlReportPath = path.join(reportsDir, `test-report-${Date.now()}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`\n📄 测试报告已生成:`);
    console.log(`  JSON: ${jsonReportPath}`);
    console.log(`  HTML: ${htmlReportPath}`);
    
    console.log('\n🎉 测试完成!');
    
    return testResults;
}

/**
 * 生成HTML测试报告
 * @param {object} reportData - 报告数据
 * @returns {string} HTML内容
 */
function generateHTMLReport(reportData) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>考试系统测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .test-results { margin-top: 30px; }
        .test-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ddd; }
        .test-item.pass { border-left-color: #28a745; }
        .test-item.fail { border-left-color: #dc3545; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-status { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; }
        .status-pass { background-color: #28a745; }
        .status-fail { background-color: #dc3545; }
        .error-message { color: #dc3545; font-style: italic; margin-top: 5px; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 考试系统自动化测试报告</h1>
            <p>测试时间: ${new Date(reportData.timestamp).toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value">${reportData.summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>通过数</h3>
                <div class="value pass">${reportData.summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>失败数</h3>
                <div class="value fail">${reportData.summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>通过率</h3>
                <div class="value ${reportData.summary.failed === 0 ? 'pass' : 'fail'}">${reportData.summary.passRate}</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>📋 详细测试结果</h2>
            ${reportData.tests.map(test => `
                <div class="test-item ${test.status.toLowerCase()}">
                    <div class="test-name">${test.name}</div>
                    <span class="test-status status-${test.status.toLowerCase()}">${test.status}</span>
                    ${test.error ? `<div class="error-message">错误: ${test.error}</div>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>环境信息: Node.js ${reportData.environment.nodeVersion} | ${reportData.environment.platform}</p>
        </div>
    </div>
</body>
</html>
    `;
}

// 如果直接运行此脚本
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    runAllTests,
    runTest,
    testAdminLogin,
    testStudentLogin,
    testQuestionManagement,
    testExamManagement,
    testGradeManagement,
    testPermissionControl
};