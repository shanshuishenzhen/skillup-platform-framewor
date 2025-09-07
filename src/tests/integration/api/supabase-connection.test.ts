/**
 * Supabase连接测试
 * 验证Supabase客户端的基本连接和功能
 * 
 * @description 这个测试文件专门用于验证：
 * 1. Supabase客户端初始化
 * 2. 环境变量加载
 * 3. 基本数据库连接
 * 4. 表访问权限
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

// 导入测试工具
import { describe, it, expect, beforeAll } from '@jest/globals';

// 导入Supabase客户端
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../lib/supabase';

// 全局变量
let supabase: any;
let directSupabase: any;

/**
 * 初始化测试环境
 */
beforeAll(async () => {
  console.log('🔧 开始初始化Supabase连接测试...');
  
  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('📍 环境变量检查:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ 已设置' : '❌ 未设置');
  console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 已设置' : '❌ 未设置');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ 缺少必要的Supabase环境变量');
  }
  
  console.log('🔗 创建Supabase客户端...');
  console.log('  - URL:', supabaseUrl);
  
  try {
    // 使用项目配置的客户端
    supabase = getSupabaseClient();
    
    // 创建直接客户端实例进行对比
    directSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('✅ Supabase客户端创建成功');
    console.log('  - 项目客户端类型:', typeof supabase);
    console.log('  - 项目客户端from方法:', typeof supabase.from);
    console.log('  - 项目客户端auth方法:', typeof supabase.auth);
    console.log('  - 直接客户端类型:', typeof directSupabase);
    console.log('  - 直接客户端from方法:', typeof directSupabase.from);
    
  } catch (error) {
    console.error('❌ Supabase客户端创建失败:', error);
    throw error;
  }
}, 30000);

describe('Supabase连接测试', () => {
  /**
   * 基础连接测试
   */
  describe('🔌 基础连接', () => {
    /**
     * 测试客户端初始化
     */
    it('应该成功初始化Supabase客户端', () => {
      expect(supabase).toBeDefined();
      expect(supabase).not.toBeNull();
      expect(typeof supabase).toBe('object');
    });

    /**
     * 测试客户端方法
     */
    it('应该包含必要的客户端方法', () => {
      expect(typeof supabase.from).toBe('function');
      expect(typeof supabase.auth).toBe('object');
      expect(typeof supabase.storage).toBe('object');
      expect(typeof supabase.rpc).toBe('function');
    });

    /**
     * 测试项目客户端查询构建器
     */
    it('应该能够使用项目客户端创建查询构建器', () => {
      console.log('🔍 测试项目客户端查询构建器...');
      const query = supabase.from('users');
      console.log('  - 项目客户端查询结果:', typeof query, query);
      
      expect(query).toBeDefined();
      expect(query).not.toBeNull();
      expect(typeof query).toBe('object');
      expect(typeof query.select).toBe('function');
    });

    /**
     * 测试直接客户端查询构建器
     */
    it('应该能够使用直接客户端创建查询构建器', () => {
      console.log('🔍 测试直接客户端查询构建器...');
      const query = directSupabase.from('users');
      console.log('  - 直接客户端查询结果:', typeof query, query);
      
      expect(query).toBeDefined();
      expect(query).not.toBeNull();
      expect(typeof query).toBe('object');
      expect(typeof query.select).toBe('function');
    });
  });

  /**
   * 数据库连接测试
   */
  describe('🗄️ 数据库连接', () => {
    /**
     * 测试基本查询
     */
    it('应该能够执行基本查询', async () => {
      console.log('🔍 执行基本查询测试...');
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        console.log('📊 查询结果:');
        console.log('  - 错误:', error);
        console.log('  - 数据类型:', typeof data);
        console.log('  - 数据长度:', Array.isArray(data) ? data.length : 'N/A');
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
        
        console.log('✅ 基本查询测试通过');
        
      } catch (testError) {
        console.error('❌ 基本查询测试失败:', testError);
        throw testError;
      }
    }, 10000);

    /**
     * 测试表访问权限
     */
    it('应该能够访问核心数据表', async () => {
      const tables = ['users', 'exams', 'questions'];
      
      for (const table of tables) {
        console.log(`🔍 测试表访问: ${table}`);
        
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          console.log(`📊 表 ${table} 查询结果:`);
          console.log('  - 错误:', error);
          console.log('  - 数据:', data ? '有数据' : '无数据');
          
          expect(error).toBeNull();
          expect(Array.isArray(data)).toBe(true);
          
          console.log(`✅ 表 ${table} 访问测试通过`);
          
        } catch (testError) {
          console.error(`❌ 表 ${table} 访问测试失败:`, testError);
          throw testError;
        }
      }
    }, 15000);
  });

  /**
   * 错误处理测试
   */
  describe('🚨 错误处理', () => {
    /**
     * 测试无效表名处理
     */
    it('应该正确处理无效表名', async () => {
      console.log('🔍 测试无效表名处理...');
      
      try {
        const { data, error } = await supabase
          .from('invalid_table_name_12345')
          .select('*')
          .limit(1);
        
        console.log('📊 无效表名查询结果:');
        console.log('  - 错误:', error);
        console.log('  - 数据:', data);
        
        expect(error).not.toBeNull();
        expect(data).toBeNull();
        
        console.log('✅ 无效表名处理测试通过');
        
      } catch (testError) {
        console.error('❌ 无效表名处理测试失败:', testError);
        throw testError;
      }
    }, 10000);
  });
});