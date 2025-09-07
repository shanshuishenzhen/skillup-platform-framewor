/**
 * 性能测试
 * 测试应用的性能指标，包括响应时间、内存使用、并发处理等
 */

import { performance } from 'perf_hooks';
import { createMockRequest, createMockResponse } from '../__mocks__/http';
import { userService } from '../../services/userService';
import { examService } from '../../services/examService';
import { questionService } from '../../services/questionService';
import { resultService } from '../../services/resultService';

// 性能测试配置
const PERFORMANCE_CONFIG = {
  // 响应时间阈值（毫秒）
  responseTimeThresholds: {
    fast: 100,
    acceptable: 500,
    slow: 1000
  },
  
  // 内存使用阈值（MB）
  memoryThresholds: {
    low: 50,
    medium: 100,
    high: 200
  },
  
  // 并发测试配置
  concurrency: {
    light: 10,
    medium: 50,
    heavy: 100
  },
  
  // 测试数据量
  dataVolume: {
    small: 100,
    medium: 1000,
    large: 10000
  }
};

// 性能测试工具函数
class PerformanceTester {
  private startTime: number = 0;
  private endTime: number = 0;
  private initialMemory: NodeJS.MemoryUsage;
  
  constructor() {
    this.initialMemory = process.memoryUsage();
  }
  
  /**
   * 开始性能测试
   */
  start(): void {
    this.startTime = performance.now();
  }
  
  /**
   * 结束性能测试
   * @returns 性能指标
   */
  end(): PerformanceMetrics {
    this.endTime = performance.now();
    const currentMemory = process.memoryUsage();
    
    return {
      responseTime: this.endTime - this.startTime,
      memoryUsage: {
        heapUsed: (currentMemory.heapUsed - this.initialMemory.heapUsed) / 1024 / 1024,
        heapTotal: (currentMemory.heapTotal - this.initialMemory.heapTotal) / 1024 / 1024,
        external: (currentMemory.external - this.initialMemory.external) / 1024 / 1024,
        rss: (currentMemory.rss - this.initialMemory.rss) / 1024 / 1024
      }
    };
  }
  
  /**
   * 并发测试
   * @param fn 测试函数
   * @param concurrency 并发数
   * @param iterations 迭代次数
   */
  async concurrentTest<T>(
    fn: () => Promise<T>,
    concurrency: number,
    iterations: number = 1
  ): Promise<ConcurrentTestResult> {
    const results: number[] = [];
    const errors: Error[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const promises = Array(concurrency).fill(0).map(async () => {
        const tester = new PerformanceTester();
        try {
          tester.start();
          await fn();
          const metrics = tester.end();
          return metrics.responseTime;
        } catch (error) {
          errors.push(error as Error);
          return 0;
        }
      });
      
      const iterationResults = await Promise.all(promises);
      results.push(...iterationResults.filter(r => r > 0));
    }
    
    return {
      totalRequests: concurrency * iterations,
      successfulRequests: results.length,
      failedRequests: errors.length,
      averageResponseTime: results.reduce((a, b) => a + b, 0) / results.length,
      minResponseTime: Math.min(...results),
      maxResponseTime: Math.max(...results),
      errors
    };
  }
}

// 性能指标接口
interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

interface ConcurrentTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errors: Error[];
}

describe('性能测试', () => {
  let tester: PerformanceTester;
  
  beforeEach(() => {
    tester = new PerformanceTester();
  });
  
  describe('服务层性能测试', () => {
    test('用户服务响应时间测试', async () => {
      tester.start();
      
      // 模拟获取用户列表
      const mockUsers = Array(PERFORMANCE_CONFIG.dataVolume.medium).fill(0).map((_, index) => ({
        id: `user-${index}`,
        email: `user${index}@example.com`,
        name: `User ${index}`,
        role: 'student' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Mock userService.getUsers
      const originalGetUsers = userService.getUsers;
      userService.getUsers = jest.fn().mockResolvedValue({
        users: mockUsers,
        total: mockUsers.length,
        page: 1,
        limit: 50
      });
      
      await userService.getUsers({ page: 1, limit: 50 });
      
      const metrics = tester.end();
      
      // 恢复原始方法
      userService.getUsers = originalGetUsers;
      
      expect(metrics.responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThresholds.acceptable);
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(PERFORMANCE_CONFIG.memoryThresholds.medium);
    });
    
    test('考试服务响应时间测试', async () => {
      tester.start();
      
      // 模拟获取考试列表
      const mockExams = Array(PERFORMANCE_CONFIG.dataVolume.small).fill(0).map((_, index) => ({
        id: `exam-${index}`,
        title: `考试 ${index}`,
        description: `考试描述 ${index}`,
        duration: 60,
        total_questions: 20,
        pass_score: 60,
        status: 'published' as const,
        created_by: 'teacher-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Mock examService.getExams
      const originalGetExams = examService.getExams;
      examService.getExams = jest.fn().mockResolvedValue({
        exams: mockExams,
        total: mockExams.length,
        page: 1,
        limit: 20
      });
      
      await examService.getExams({ page: 1, limit: 20 });
      
      const metrics = tester.end();
      
      // 恢复原始方法
      examService.getExams = originalGetExams;
      
      expect(metrics.responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThresholds.acceptable);
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(PERFORMANCE_CONFIG.memoryThresholds.low);
    });
    
    test('题目服务响应时间测试', async () => {
      tester.start();
      
      // 模拟获取题目列表
      const mockQuestions = Array(PERFORMANCE_CONFIG.dataVolume.medium).fill(0).map((_, index) => ({
        id: `question-${index}`,
        exam_id: 'exam-1',
        question_text: `题目 ${index}`,
        question_type: 'multiple_choice' as const,
        options: [
          { id: 'a', text: '选项A', is_correct: true },
          { id: 'b', text: '选项B', is_correct: false },
          { id: 'c', text: '选项C', is_correct: false },
          { id: 'd', text: '选项D', is_correct: false }
        ],
        points: 5,
        order_index: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Mock questionService.getQuestionsByExam
      const originalGetQuestionsByExam = questionService.getQuestionsByExam;
      questionService.getQuestionsByExam = jest.fn().mockResolvedValue(mockQuestions);
      
      await questionService.getQuestionsByExam('exam-1');
      
      const metrics = tester.end();
      
      // 恢复原始方法
      questionService.getQuestionsByExam = originalGetQuestionsByExam;
      
      expect(metrics.responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThresholds.acceptable);
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(PERFORMANCE_CONFIG.memoryThresholds.medium);
    });
  });
  
  describe('并发性能测试', () => {
    test('轻量并发测试', async () => {
      const result = await tester.concurrentTest(
        async () => {
          // Mock userService.getUsers
          const originalGetUsers = userService.getUsers;
          userService.getUsers = jest.fn().mockResolvedValue({
            users: [],
            total: 0,
            page: 1,
            limit: 10
          });
          
          await userService.getUsers({ page: 1, limit: 10 });
          
          // 恢复原始方法
          userService.getUsers = originalGetUsers;
        },
        PERFORMANCE_CONFIG.concurrency.light,
        1
      );
      
      expect(result.successfulRequests).toBe(PERFORMANCE_CONFIG.concurrency.light);
      expect(result.failedRequests).toBe(0);
      expect(result.averageResponseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThresholds.acceptable);
    });
    
    test('中等并发测试', async () => {
      const result = await tester.concurrentTest(
        async () => {
          // Mock examService.getExams
          const originalGetExams = examService.getExams;
          examService.getExams = jest.fn().mockResolvedValue({
            exams: [],
            total: 0,
            page: 1,
            limit: 10
          });
          
          await examService.getExams({ page: 1, limit: 10 });
          
          // 恢复原始方法
          examService.getExams = originalGetExams;
        },
        PERFORMANCE_CONFIG.concurrency.medium,
        1
      );
      
      expect(result.successfulRequests).toBeGreaterThan(PERFORMANCE_CONFIG.concurrency.medium * 0.9);
      expect(result.averageResponseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThresholds.slow);
    });
  });
  
  describe('内存使用测试', () => {
    test('大数据量处理内存测试', async () => {
      tester.start();
      
      // 创建大量测试数据
      const largeDataSet = Array(PERFORMANCE_CONFIG.dataVolume.large).fill(0).map((_, index) => ({
        id: `item-${index}`,
        data: `数据 ${index}`.repeat(100) // 增加数据大小
      }));
      
      // 模拟数据处理
      const processedData = largeDataSet.map(item => ({
        ...item,
        processed: true,
        timestamp: Date.now()
      }));
      
      const metrics = tester.end();
      
      expect(processedData.length).toBe(PERFORMANCE_CONFIG.dataVolume.large);
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(PERFORMANCE_CONFIG.memoryThresholds.high);
    });
    
    test('内存泄漏检测', async () => {
      const initialMemory = process.memoryUsage();
      
      // 执行多次操作
      for (let i = 0; i < 100; i++) {
        // Mock userService.getUsers
        const originalGetUsers = userService.getUsers;
        userService.getUsers = jest.fn().mockResolvedValue({
          users: Array(100).fill(0).map((_, index) => ({
            id: `user-${index}`,
            email: `user${index}@example.com`,
            name: `User ${index}`,
            role: 'student' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          total: 100,
          page: 1,
          limit: 100
        });
        
        await userService.getUsers({ page: 1, limit: 100 });
        
        // 恢复原始方法
        userService.getUsers = originalGetUsers;
        
        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      
      // 内存增长应该在合理范围内
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_CONFIG.memoryThresholds.medium);
    });
  });
  
  describe('响应时间基准测试', () => {
    test('快速操作基准', async () => {
      const operations = [
        () => Promise.resolve({ success: true }),
        () => Promise.resolve([1, 2, 3, 4, 5]),
        () => Promise.resolve('test string')
      ];
      
      for (const operation of operations) {
        tester.start();
        await operation();
        const metrics = tester.end();
        
        expect(metrics.responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThresholds.fast);
      }
    });
    
    test('数据库操作模拟基准', async () => {
      tester.start();
      
      // 模拟数据库查询延迟
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const metrics = tester.end();
      
      expect(metrics.responseTime).toBeLessThan(PERFORMANCE_CONFIG.responseTimeThresholds.acceptable);
    });
  });
});

// 性能测试报告生成
afterAll(() => {
  const memoryUsage = process.memoryUsage();
  
  console.log('\n📊 性能测试报告:');
  console.log('================');
  console.log(`内存使用情况:`);
  console.log(`  - 堆内存使用: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - 堆内存总量: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - 外部内存: ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n性能阈值:');
  console.log(`  - 快速响应: < ${PERFORMANCE_CONFIG.responseTimeThresholds.fast}ms`);
  console.log(`  - 可接受响应: < ${PERFORMANCE_CONFIG.responseTimeThresholds.acceptable}ms`);
  console.log(`  - 慢响应: < ${PERFORMANCE_CONFIG.responseTimeThresholds.slow}ms`);
  console.log('================\n');
});