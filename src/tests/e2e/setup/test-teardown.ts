/**
 * 全局测试清理
 * 在所有测试完成后运行
 */
import { cleanupTestData } from '../test-data/seed';

export default async function globalTeardown() {
  console.log('🧹 开始全局测试清理...');
  
  try {
    // 清理测试数据
    await cleanupTestData();
    console.log('✅ 测试数据清理完成');
    
    // 清理环境变量
    delete process.env.TEST_ADMIN_ID;
    delete process.env.TEST_TEACHER_ID;
    delete process.env.TEST_STUDENT_ID;
    delete process.env.TEST_STUDENT2_ID;
    delete process.env.TEST_EXAM_ID;
    
    console.log('🎉 全局测试清理完成');
  } catch (error) {
    console.error('❌ 全局测试清理失败:', error);
    // 不抛出错误，避免影响测试结果报告
  }
}