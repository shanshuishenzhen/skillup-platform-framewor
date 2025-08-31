/**
 * 短信验证码功能测试脚本
 * 用于测试短信验证码的发送、验证和注册流程
 */

import { sendVerificationCode, verifyCode } from '../services/smsService';
import { registerUser } from '../services/userService';

// 测试配置
const TEST_CONFIG = {
  testPhone: '13800138000',
  testPassword: 'Test123456',
  purpose: 'register' as const,
  timeout: 10000, // 10秒超时
};

// 测试结果接口
interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  duration: number;
}

// 测试报告接口
interface TestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  summary: string;
}

/**
 * 执行单个测试并记录结果
 * @param testName 测试名称
 * @param testFunction 测试函数
 * @returns 测试结果
 */
async function runTest(testName: string, testFunction: () => Promise<unknown>): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 开始测试: ${testName}`);
    const result = await Promise.race([
      testFunction(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('测试超时')), TEST_CONFIG.timeout)
      )
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ 测试通过: ${testName} (${duration}ms)`);
    
    return {
      testName,
      success: true,
      message: '测试通过',
      data: result,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ 测试失败: ${testName} - ${errorMessage} (${duration}ms)`);
    
    return {
      testName,
      success: false,
      message: '测试失败',
      error: errorMessage,
      duration
    };
  }
}

/**
 * 测试1: 发送短信验证码API
 * 测试 /api/sms/send 接口的功能
 */
async function testSendSmsApi(): Promise<{ success: boolean; message: string; code?: string; phone: string }> {
  const response = await fetch('http://localhost:3001/api/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: TEST_CONFIG.testPhone,
      purpose: TEST_CONFIG.purpose
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '解析响应失败' }));
    throw new Error(`API请求失败: ${response.status} - ${errorData.message || '未知错误'}`);
  }

  const data = await response.json();
  
  // 检查响应格式
  if (!data.success) {
    throw new Error(`API返回失败: ${data.message || '未知错误'}`);
  }

  // 在开发环境下，验证码应该在响应中返回
  if (process.env.NODE_ENV === 'development' && !data.code) {
    console.warn('⚠️  开发环境下未返回验证码，这可能影响后续测试');
  }

  return {
    success: data.success,
    message: data.message,
    code: data.code, // 开发环境下的验证码
    phone: TEST_CONFIG.testPhone
  };
}

/**
 * 测试2: 短信验证码服务发送功能
 * 直接测试 smsService 的 sendVerificationCode 函数
 */
async function testSmsService(): Promise<{ success: boolean; message: string; code?: string; phone: string }> {
  const result = await sendVerificationCode(TEST_CONFIG.testPhone, TEST_CONFIG.purpose);
  
  if (!result.success) {
    throw new Error(`短信服务发送失败: ${result.message}`);
  }

  return {
    success: result.success,
    message: result.message,
    code: result.code, // 开发环境下的验证码
    phone: TEST_CONFIG.testPhone
  };
}

/**
 * 测试3: 验证码验证功能
 * 测试 smsService 的 verifyCode 函数
 */
async function testVerifyCode(verificationCode: string): Promise<{ success: boolean; message: string; phone: string; code: string }> {
  if (!verificationCode) {
    throw new Error('验证码为空，无法进行验证测试');
  }

  const result = await verifyCode(TEST_CONFIG.testPhone, verificationCode, TEST_CONFIG.purpose);
  
  if (!result.success) {
    throw new Error(`验证码验证失败: ${result.message}`);
  }

  return {
    success: result.success,
    message: result.message,
    phone: TEST_CONFIG.testPhone,
    code: verificationCode
  };
}

/**
 * 测试4: 注册流程中的验证码验证
 * 测试完整的用户注册流程
 */
async function testRegisterFlow(verificationCode: string): Promise<{ success: boolean; message: string; user?: unknown; phone: string }> {
  if (!verificationCode) {
    throw new Error('验证码为空，无法进行注册测试');
  }

  // 首先发送新的验证码用于注册
  const sendResult = await sendVerificationCode(TEST_CONFIG.testPhone, TEST_CONFIG.purpose);
  if (!sendResult.success) {
    throw new Error(`注册前发送验证码失败: ${sendResult.message}`);
  }

  const codeToUse = sendResult.code || verificationCode;
  
  // 尝试注册用户
  const registerResult = await registerUser(
    TEST_CONFIG.testPhone,
    TEST_CONFIG.testPassword,
    codeToUse
  );

  if (!registerResult.success) {
    throw new Error(`用户注册失败: ${registerResult.message}`);
  }

  return {
    success: registerResult.success,
    message: registerResult.message || '注册失败',
    user: registerResult.user,
    phone: TEST_CONFIG.testPhone
  };
}

/**
 * 测试5: 注册API接口
 * 测试 /api/auth/register 接口
 */
async function testRegisterApi(verificationCode: string): Promise<{ success: boolean; message: string; user?: unknown; token?: string }> {
  if (!verificationCode) {
    throw new Error('验证码为空，无法进行注册API测试');
  }

  // 首先发送新的验证码
  const sendResult = await sendVerificationCode(TEST_CONFIG.testPhone, TEST_CONFIG.purpose);
  if (!sendResult.success) {
    throw new Error(`注册API测试前发送验证码失败: ${sendResult.message}`);
  }

  const codeToUse = sendResult.code || verificationCode;

  const response = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: TEST_CONFIG.testPhone,
      password: TEST_CONFIG.testPassword,
      smsCode: codeToUse
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`注册API请求失败: ${response.status} - ${data.message || '未知错误'}`);
  }

  if (!data.success) {
    throw new Error(`注册API返回失败: ${data.message || '未知错误'}`);
  }

  return {
    success: data.success,
    message: data.message,
    user: data.user,
    token: data.token
  };
}

/**
 * 生成测试报告
 * @param results 测试结果数组
 * @returns 测试报告
 */
function generateReport(results: TestResult[]): TestReport {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  const summary = `测试完成: ${passedTests}/${totalTests} 通过 (${((passedTests/totalTests)*100).toFixed(1)}%)`;
  
  return {
    totalTests,
    passedTests,
    failedTests,
    results,
    summary
  };
}

/**
 * 打印详细的测试报告
 * @param report 测试报告
 */
function printDetailedReport(report: TestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 短信验证码功能测试报告');
  console.log('='.repeat(60));
  console.log(`总测试数: ${report.totalTests}`);
  console.log(`通过测试: ${report.passedTests}`);
  console.log(`失败测试: ${report.failedTests}`);
  console.log(`成功率: ${((report.passedTests/report.totalTests)*100).toFixed(1)}%`);
  console.log('\n📋 详细结果:');
  
  report.results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`\n${index + 1}. ${status} ${result.testName}`);
    console.log(`   消息: ${result.message}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
    if (result.data && typeof result.data === 'object') {
      console.log(`   数据: ${JSON.stringify(result.data, null, 2)}`);
    }
    console.log(`   耗时: ${result.duration}ms`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 ${report.summary}`);
  console.log('='.repeat(60));
}

/**
 * 提供修复建议
 * @param report 测试报告
 */
function provideFixes(report: TestReport): void {
  const failedTests = report.results.filter(r => !r.success);
  
  if (failedTests.length === 0) {
    console.log('\n🎉 所有测试都通过了！短信验证码功能运行正常。');
    return;
  }
  
  console.log('\n🔧 修复建议:');
  console.log('-'.repeat(40));
  
  failedTests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.testName} 失败`);
    console.log(`   错误: ${test.error}`);
    
    // 根据测试类型提供具体建议
    if (test.testName.includes('发送短信验证码API')) {
      console.log('   建议:');
      console.log('   - 检查开发服务器是否正在运行 (npm run dev)');
      console.log('   - 确认 /api/sms/send 路由是否正确配置');
      console.log('   - 检查 Supabase 连接是否正常');
      console.log('   - 验证数据库中是否存在 sms_verification_codes 表');
    } else if (test.testName.includes('短信验证码服务')) {
      console.log('   建议:');
      console.log('   - 检查 smsService.ts 中的 sendVerificationCode 函数');
      console.log('   - 确认 Supabase 客户端配置是否正确');
      console.log('   - 检查环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    } else if (test.testName.includes('验证码验证')) {
      console.log('   建议:');
      console.log('   - 检查验证码是否已过期');
      console.log('   - 确认验证码格式是否正确 (6位数字)');
      console.log('   - 检查 verifyCode 函数的逻辑');
    } else if (test.testName.includes('注册')) {
      console.log('   建议:');
      console.log('   - 检查用户是否已存在');
      console.log('   - 确认密码格式是否符合要求');
      console.log('   - 检查 users 表的权限设置');
      console.log('   - 验证注册流程中的验证码验证逻辑');
    }
  });
  
  console.log('\n💡 通用检查项:');
  console.log('- 确保 Supabase 项目已正确连接');
  console.log('- 检查所有必要的数据库表是否已创建');
  console.log('- 验证 RLS (行级安全) 策略是否正确配置');
  console.log('- 确认环境变量是否正确设置');
  console.log('- 检查网络连接和防火墙设置');
}

/**
 * 主测试函数
 * 执行所有短信验证码相关的测试
 */
export async function runSmsVerificationTests(): Promise<TestReport> {
  console.log('🚀 开始短信验证码功能测试...');
  console.log(`测试手机号: ${TEST_CONFIG.testPhone}`);
  console.log(`测试用途: ${TEST_CONFIG.purpose}`);
  console.log(`超时时间: ${TEST_CONFIG.timeout}ms`);
  
  const results: TestResult[] = [];
  let verificationCode = '';
  
  // 测试1: 发送短信验证码API
  const apiTest = await runTest('发送短信验证码API', testSendSmsApi);
  results.push(apiTest);
  if (apiTest.success && (apiTest.data as any)?.code) {
    verificationCode = (apiTest.data as any).code;
    console.log(`📱 获取到验证码: ${verificationCode}`);
  }
  
  // 测试2: 短信验证码服务
  const serviceTest = await runTest('短信验证码服务发送功能', testSmsService);
  results.push(serviceTest);
  if (serviceTest.success && (serviceTest.data as any)?.code && !verificationCode) {
    verificationCode = (serviceTest.data as any).code;
    console.log(`📱 从服务获取到验证码: ${verificationCode}`);
  }
  
  // 如果有验证码，继续后续测试
  if (verificationCode) {
    // 测试3: 验证码验证功能
    const verifyTest = await runTest('验证码验证功能', () => testVerifyCode(verificationCode));
    results.push(verifyTest);
    
    // 测试4: 注册流程
    const registerFlowTest = await runTest('注册流程中的验证码验证', () => testRegisterFlow(verificationCode));
    results.push(registerFlowTest);
    
    // 测试5: 注册API接口
    const registerApiTest = await runTest('注册API接口', () => testRegisterApi(verificationCode));
    results.push(registerApiTest);
  } else {
    console.log('⚠️  未获取到验证码，跳过验证相关测试');
    results.push({
      testName: '验证码验证功能',
      success: false,
      message: '跳过测试',
      error: '未获取到验证码',
      duration: 0
    });
    results.push({
      testName: '注册流程中的验证码验证',
      success: false,
      message: '跳过测试',
      error: '未获取到验证码',
      duration: 0
    });
    results.push({
      testName: '注册API接口',
      success: false,
      message: '跳过测试',
      error: '未获取到验证码',
      duration: 0
    });
  }
  
  // 生成并打印报告
  const report = generateReport(results);
  printDetailedReport(report);
  provideFixes(report);
  
  return report;
}

// 如果直接运行此脚本
if (require.main === module) {
  runSmsVerificationTests()
    .then((report) => {
      process.exit(report.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ 测试执行失败:', error);
      process.exit(1);
    });
}