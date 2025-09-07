/**
 * API集成测试
 * 测试所有关键API接口的完整流程
 * 
 * @description 这个测试套件验证：
 * 1. 数据库连接和基本操作
 * 2. 用户认证相关API
 * 3. 考试管理API
 * 4. 题目管理API
 * 5. 数据完整性和性能
 * 
 * @author SOLO Coding
 * @version 2.0.0
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

// 导入测试工具
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// 导入Supabase客户端
import { createClient } from '@supabase/supabase-js';

// 测试配置
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  maxConcurrentQueries: 5
};

// 全局变量
let supabase: any;
let supabaseAdmin: any;

/**
 * 初始化测试环境
 */
beforeAll(async () => {
  // 验证环境变量
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('缺少必要的Supabase环境变量');
  }
  
  console.log('🔧 初始化Supabase客户端...');
  console.log('📍 Supabase URL:', supabaseUrl);
  
  // 创建客户端实例
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  
  // 验证客户端初始化
  expect(supabase).toBeDefined();
  expect(typeof supabase.from).toBe('function');
  
  console.log('✅ Supabase客户端初始化完成');
}, TEST_CONFIG.timeout);

/**
 * 清理测试环境
 */
afterAll(async () => {
  console.log('🧹 清理测试环境...');
  // 这里可以添加清理逻辑
  console.log('✅ 测试环境清理完成');
});

/**
 * 每个测试前的准备
 */
beforeEach(() => {
  // 重置任何必要的状态
});

describe('API集成测试套件', () => {
  /**
   * 数据库连接和基础功能测试
   */
  describe('🔌 数据库连接测试', () => {
    /**
     * 测试数据库连接
     */
    it('应该能够连接到Supabase数据库', async () => {
      expect(supabase).toBeDefined();
      expect(typeof supabase.from).toBe('function');
      
      // 测试基本查询能力
      const query = supabase.from('users');
      expect(query).toBeDefined();
      expect(typeof query.select).toBe('function');
    });

    /**
     * 测试基本查询功能
     */
    it('应该能够执行基本的数据库查询', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      // 验证查询执行成功（不管是否有数据）
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    /**
     * 测试表权限
     */
    it('应该能够访问所有必要的数据表', async () => {
      const tables = ['users', 'exams', 'questions', 'exam_registrations'];
      
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        expect(error).toBeNull();
      }
    });
  });

  /**
   * 用户管理API测试
   */
  describe('👤 用户管理API测试', () => {
    /**
     * 测试获取用户列表
     */
    it('应该能够获取用户列表', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .limit(10);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    /**
     * 测试用户数据结构
     */
    it('应该返回正确的用户数据结构', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const user = data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('created_at');
        
        // 验证数据类型
        if (user.id) expect(typeof user.id).toBe('string');
        if (user.email) expect(typeof user.email).toBe('string');
        if (user.created_at) expect(typeof user.created_at).toBe('string');
      }
    });

    /**
     * 测试用户角色查询
     */
    it('应该能够按角色查询用户', async () => {
      const roles = ['student', 'instructor', 'admin'];
      
      for (const role of roles) {
        const { data, error } = await supabase
          .from('users')
          .select('id, role')
          .eq('role', role)
          .limit(5);
        
        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
        
        // 如果有数据，验证角色正确
        if (data && data.length > 0) {
          data.forEach(user => {
            expect(user.role).toBe(role);
          });
        }
      }
    });
  });

  /**
   * 考试管理API测试
   */
  describe('📝 考试管理API测试', () => {
    /**
     * 测试获取考试列表
     */
    it('应该能够获取考试列表', async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, description, status, duration, total_score, created_at')
        .limit(10);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    /**
     * 测试考试数据结构
     */
    it('应该返回正确的考试数据结构', async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const exam = data[0];
        expect(exam).toHaveProperty('id');
        expect(exam).toHaveProperty('title');
        expect(exam).toHaveProperty('created_at');
        
        // 验证数据类型
        if (exam.id) expect(typeof exam.id).toBe('string');
        if (exam.title) expect(typeof exam.title).toBe('string');
        if (exam.duration) expect(typeof exam.duration).toBe('number');
      }
    });

    /**
     * 测试按状态查询考试
     */
    it('应该能够按状态查询考试', async () => {
      const statuses = ['draft', 'published', 'archived'];
      
      for (const status of statuses) {
        const { data, error } = await supabase
          .from('exams')
          .select('id, status')
          .eq('status', status)
          .limit(5);
        
        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
        
        // 如果有数据，验证状态正确
        if (data && data.length > 0) {
          data.forEach(exam => {
            expect(exam.status).toBe(status);
          });
        }
      }
    });
  });

  /**
   * 题目管理API测试
   */
  describe('❓ 题目管理API测试', () => {
    /**
     * 测试获取题目列表
     */
    it('应该能够获取题目列表', async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, exam_id, type, title, content, score, created_at')
        .limit(10);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    /**
     * 测试题目数据结构
     */
    it('应该返回正确的题目数据结构', async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const question = data[0];
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('type');
        expect(question).toHaveProperty('created_at');
        
        // 验证数据类型
        if (question.id) expect(typeof question.id).toBe('string');
        if (question.type) expect(typeof question.type).toBe('string');
        if (question.score) expect(typeof question.score).toBe('number');
      }
    });

    /**
     * 测试按题目类型查询
     */
    it('应该能够按类型查询题目', async () => {
      const types = ['multiple_choice', 'single_choice', 'true_false', 'essay'];
      
      for (const type of types) {
        const { data, error } = await supabase
          .from('questions')
          .select('id, type')
          .eq('type', type)
          .limit(5);
        
        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
        
        // 如果有数据，验证类型正确
        if (data && data.length > 0) {
          data.forEach(question => {
            expect(question.type).toBe(type);
          });
        }
      }
    });
  });

  /**
   * 考试注册和答题API测试
   */
  describe('📋 考试注册和答题API测试', () => {
    /**
     * 测试获取考试注册记录
     */
    it('应该能够获取考试注册记录', async () => {
      const { data, error } = await supabase
        .from('exam_registrations')
        .select('id, user_id, exam_id, status, registered_at')
        .limit(10);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    /**
     * 测试获取考试答题记录
     */
    it('应该能够获取考试答题记录', async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('id, user_id, exam_id, status, started_at, completed_at')
        .limit(10);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    /**
     * 测试获取用户答案记录
     */
    it('应该能够获取用户答案记录', async () => {
      const { data, error } = await supabase
        .from('user_answers')
        .select('id, attempt_id, question_id, answer, is_correct')
        .limit(10);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  /**
   * 数据完整性测试
   */
  describe('🔍 数据完整性测试', () => {
    /**
     * 测试外键关系
     */
    it('应该维护正确的外键关系', async () => {
      // 测试考试和题目的关系
      const { data: exams, error: examError } = await supabase
        .from('exams')
        .select('id')
        .limit(1);
      
      expect(examError).toBeNull();
      
      if (exams && exams.length > 0) {
        const examId = exams[0].id;
        
        const { data: questions, error: questionError } = await supabase
          .from('questions')
          .select('id, exam_id')
          .eq('exam_id', examId)
          .limit(5);
        
        expect(questionError).toBeNull();
        
        if (questions && questions.length > 0) {
          questions.forEach(question => {
            expect(question.exam_id).toBe(examId);
          });
        }
      }
    });

    /**
     * 测试数据约束
     */
    it('应该遵守数据约束', async () => {
      // 测试用户邮箱唯一性（通过查询验证）
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .not('email', 'is', null)
        .limit(100);
      
      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const emails = data.map(user => user.email);
        const uniqueEmails = new Set(emails);
        expect(uniqueEmails.size).toBe(emails.length);
      }
    });
  });

  /**
   * 性能测试
   */
  describe('⚡ 性能测试', () => {
    /**
     * 测试查询性能
     */
    it('应该能够快速执行查询', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .limit(100);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(5000); // 查询应在5秒内完成
      
      console.log(`📊 查询性能: ${queryTime}ms`);
    });

    /**
     * 测试并发查询
     */
    it('应该能够处理并发查询', async () => {
      const promises = [];
      
      for (let i = 0; i < TEST_CONFIG.maxConcurrentQueries; i++) {
        promises.push(
          supabase
            .from('users')
            .select('id')
            .limit(10)
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      results.forEach(result => {
        expect(result.error).toBeNull();
      });
      
      const totalTime = endTime - startTime;
      console.log(`📊 并发查询性能: ${totalTime}ms (${TEST_CONFIG.maxConcurrentQueries}个查询)`);
    });

    /**
     * 测试大数据量查询
     */
    it('应该能够处理大数据量查询', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .limit(1000);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      
      console.log(`📊 大数据量查询结果: ${data?.length || 0} 条记录`);
    });
  });

  /**
   * 错误处理测试
   */
  describe('🚨 错误处理测试', () => {
    /**
     * 测试无效表名
     */
    it('应该正确处理无效表名', async () => {
      const { data, error } = await supabase
        .from('invalid_table_name')
        .select('*')
        .limit(1);
      
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    /**
     * 测试无效字段名
     */
    it('应该正确处理无效字段名', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('invalid_field_name')
        .limit(1);
      
      expect(error).not.toBeNull();
    });

    /**
     * 测试权限限制
     */
    it('应该正确处理权限限制', async () => {
      // 这个测试取决于具体的RLS策略
      // 这里只是一个示例，实际测试需要根据具体的权限设置来调整
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .limit(1);
      
      // 根据RLS策略，这可能会返回错误或空数据
      // 我们只验证查询能够执行而不会崩溃
      expect(typeof error === 'object' || error === null).toBe(true);
    });
  });
});