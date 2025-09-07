/**
 * 测试环境全局设置文件
 * 用于配置Jest测试环境、全局模拟和测试工具
 */

import { jest } from '@jest/globals';

// 全局测试超时设置
jest.setTimeout(30000);

// 模拟Supabase客户端
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn()
  },
  storage: {
    from: jest.fn()
  },
  rpc: jest.fn()
};

// 注意：不要在这里模拟@supabase/supabase-js，因为集成测试需要真实的客户端
// 单元测试可以在各自的测试文件中单独模拟

// 模拟环境变量
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

// 全局测试工具函数
global.testUtils = {
  /**
   * 创建模拟的Supabase查询对象
   * @param data 返回的数据
   * @param error 返回的错误
   * @returns 模拟的查询对象
   */
  createMockQuery: (data: any = null, error: any = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    then: jest.fn().mockResolvedValue({ data, error })
  }),

  /**
   * 创建模拟用户数据
   * @param overrides 覆盖的属性
   * @returns 模拟用户对象
   */
  createMockUser: (overrides: any = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    name: '测试用户',
    role: 'student',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  /**
   * 创建模拟考试数据
   * @param overrides 覆盖的属性
   * @returns 模拟考试对象
   */
  createMockExam: (overrides: any = {}) => ({
    id: 'exam-123',
    title: '测试考试',
    description: '这是一个测试考试',
    status: 'draft',
    duration: 60,
    total_score: 100,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  /**
   * 创建模拟题目数据
   * @param overrides 覆盖的属性
   * @returns 模拟题目对象
   */
  createMockQuestion: (overrides: any = {}) => ({
    id: 'question-123',
    exam_id: 'exam-123',
    type: 'multiple_choice',
    title: '测试题目',
    content: '这是一个测试题目',
    options: ['选项A', '选项B', '选项C', '选项D'],
    correct_answer: 'A',
    score: 10,
    order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  /**
   * 等待指定时间
   * @param ms 等待的毫秒数
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 重置所有模拟函数
   */
  resetAllMocks: () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  }
};

// 在每个测试前重置模拟
beforeEach(() => {
  global.testUtils.resetAllMocks();
});

// 导出模拟的Supabase客户端供测试使用
export { mockSupabaseClient };

// 类型声明
declare global {
  var testUtils: {
    createMockQuery: (data?: any, error?: any) => any;
    createMockUser: (overrides?: any) => any;
    createMockExam: (overrides?: any) => any;
    createMockQuestion: (overrides?: any) => any;
    wait: (ms: number) => Promise<void>;
    resetAllMocks: () => void;
  };
}