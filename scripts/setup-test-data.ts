#!/usr/bin/env node
/**
 * 测试数据设置脚本
 * 
 * 用于在运行端到端测试前设置必要的测试数据
 * 包括创建测试用户、考试、题目等
 * 
 * @author SOLO Coding
 */

import { setupTestData, cleanupTestData, verifyTestData } from '../src/tests/e2e/test-data/seed.js';

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始设置端到端测试数据...');
  
  try {
    // 设置测试数据
    console.log('📝 设置测试数据...');
    const testData = await setupTestData();
    
    console.log('✅ 测试数据设置完成:');
    console.log(`   - 管理员ID: ${testData.users.adminId}`);
    console.log(`   - 教师ID: ${testData.users.teacherId}`);
    console.log(`   - 学生ID: ${testData.users.studentId}`);
    console.log(`   - 学生2ID: ${testData.users.student2Id}`);
    console.log(`   - 考试ID: ${testData.examId}`);
    
    // 验证测试数据
    console.log('🔍 验证测试数据...');
    const isValid = await verifyTestData();
    
    if (isValid) {
      console.log('✅ 测试数据验证通过');
      console.log('🎉 端到端测试数据设置完成，可以开始运行测试');
      process.exit(0);
    } else {
      console.error('❌ 测试数据验证失败');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 设置测试数据失败:', error);
    
    // 尝试清理可能的部分数据
    try {
      console.log('🧹 清理部分数据...');
      await cleanupTestData();
    } catch (cleanupError) {
      console.error('清理数据时出错:', cleanupError);
    }
    
    process.exit(1);
  }
}

/**
 * 清理测试数据的函数
 */
async function cleanup() {
  console.log('🧹 开始清理端到端测试数据...');
  
  try {
    await cleanupTestData();
    console.log('✅ 测试数据清理完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error);
    process.exit(1);
  }
}

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--cleanup') || args.includes('-c')) {
  cleanup();
} else {
  main();
}