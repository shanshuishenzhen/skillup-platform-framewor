/**
 * Supabase数据库工具单元测试
 * 
 * 测试Supabase数据库工具的各项功能，包括：
 * - 数据库连接和初始化
 * - 查询操作（增删改查）
 * - 事务处理
 * - 连接池管理
 * - 错误处理和重试机制
 * - 性能监控
 * - 安全性验证
 * - 缓存集成
 */

import {
  supabase,
  initializeSupabase,
  getSupabaseClient,
  executeQuery,
  executeTransaction,
  createRecord,
  updateRecord,
  deleteRecord,
  findRecord,
  findRecords,
  countRecords,
  checkConnection,
  getConnectionStatus,
  resetConnection,
  enableRLS,
  createPolicy,
  executeRPC,
  uploadFile,
  downloadFile,
  deleteFile
} from '../../config/supabase';
import { logger } from '../../utils/logger';
import { getEnvConfig } from '../../utils/envConfig';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { createClient } from '@supabase/supabase-js';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../utils/envConfig');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('@supabase/supabase-js');

// 类型定义
interface MockSupabaseClient {
  from: jest.MockedFunction<any>;
  auth: {
    getUser: jest.MockedFunction<any>;
    signIn: jest.MockedFunction<any>;
    signOut: jest.MockedFunction<any>;
  };
  storage: {
    from: jest.MockedFunction<any>;
  };
  rpc: jest.MockedFunction<any>;
  channel: jest.MockedFunction<any>;
}

interface MockQueryBuilder {
  select: jest.MockedFunction<any>;
  insert: jest.MockedFunction<any>;
  update: jest.MockedFunction<any>;
  delete: jest.MockedFunction<any>;
  eq: jest.MockedFunction<any>;
  neq: jest.MockedFunction<any>;
  gt: jest.MockedFunction<any>;
  gte: jest.MockedFunction<any>;
  lt: jest.MockedFunction<any>;
  lte: jest.MockedFunction<any>;
  like: jest.MockedFunction<any>;
  ilike: jest.MockedFunction<any>;
  in: jest.MockedFunction<any>;
  is: jest.MockedFunction<any>;
  order: jest.MockedFunction<any>;
  limit: jest.MockedFunction<any>;
  range: jest.MockedFunction<any>;
  single: jest.MockedFunction<any>;
  maybeSingle: jest.MockedFunction<any>;
}

interface MockStorageBucket {
  upload: jest.MockedFunction<any>;
  download: jest.MockedFunction<any>;
  remove: jest.MockedFunction<any>;
  list: jest.MockedFunction<any>;
  getPublicUrl: jest.MockedFunction<any>;
  createSignedUrl: jest.MockedFunction<any>;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockEnvConfig = {
  supabase: {
    url: 'https://test.supabase.co',
    anonKey: 'test_anon_key',
    serviceRoleKey: 'test_service_role_key',
    schema: 'public',
    maxConnections: 10,
    connectionTimeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  app: {
    environment: 'test'
  }
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logDataAccess: jest.fn(),
  logSecurityEvent: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  timing: jest.fn(),
  gauge: jest.fn()
};

const mockQueryBuilder: MockQueryBuilder = {
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
  is: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn()
};

const mockStorageBucket: MockStorageBucket = {
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
  list: jest.fn(),
  getPublicUrl: jest.fn(),
  createSignedUrl: jest.fn()
};

const mockSupabaseClient: MockSupabaseClient = {
  from: jest.fn().mockReturnValue(mockQueryBuilder),
  auth: {
    getUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn()
  },
  storage: {
    from: jest.fn().mockReturnValue(mockStorageBucket)
  },
  rpc: jest.fn(),
  channel: jest.fn()
};

// 设置 Mock
(logger as any) = mockLogger;
(envConfig as any) = mockEnvConfig;
(cacheService as any) = mockCacheService;
(auditService as any) = mockAuditService;
(analyticsService as any) = mockAnalyticsService;
(createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(mockSupabaseClient as any);

describe('Supabase Database Utilities', () => {
  // 测试数据
  const testUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const testCourse = {
    id: 'course_123',
    title: 'Test Course',
    description: 'A test course',
    instructor_id: 'user_123',
    price: 99.99,
    status: 'published',
    created_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认成功响应
    mockQueryBuilder.single.mockResolvedValue({ data: testUser, error: null });
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: testUser, error: null });
  });

  /**
   * 数据库连接和初始化测试
   */
  describe('Database Connection and Initialization', () => {
    it('应该成功初始化Supabase客户端', async () => {
      await initializeSupabase();
      
      expect(createClient).toHaveBeenCalledWith(
        mockEnvConfig.supabase.url,
        mockEnvConfig.supabase.anonKey,
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            autoRefreshToken: true
          }),
          db: expect.objectContaining({
            schema: mockEnvConfig.supabase.schema
          })
        })
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith('Supabase client initialized successfully');
    });

    it('应该获取Supabase客户端实例', () => {
      const client = getSupabaseClient();
      
      expect(client).toBe(mockSupabaseClient);
    });

    it('应该检查数据库连接状态', async () => {
      mockSupabaseClient.from.mockReturnValue({
        ...mockQueryBuilder,
        select: jest.fn().mockResolvedValue({ data: [{ now: '2024-01-01T00:00:00Z' }], error: null })
      });
      
      const isConnected = await checkConnection();
      
      expect(isConnected).toBe(true);
      expect(mockAnalyticsService.track).toHaveBeenCalledWith('database.connection.check', {
        status: 'success'
      });
    });

    it('应该处理连接失败', async () => {
      mockSupabaseClient.from.mockReturnValue({
        ...mockQueryBuilder,
        select: jest.fn().mockResolvedValue({ data: null, error: { message: 'Connection failed' } })
      });
      
      const isConnected = await checkConnection();
      
      expect(isConnected).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Database connection check failed:', expect.any(Object));
    });

    it('应该获取连接状态信息', async () => {
      const status = await getConnectionStatus();
      
      expect(status).toEqual(expect.objectContaining({
        connected: expect.any(Boolean),
        url: mockEnvConfig.supabase.url,
        schema: mockEnvConfig.supabase.schema,
        timestamp: expect.any(String)
      }));
    });
  });

  /**
   * 基础CRUD操作测试
   */
  describe('Basic CRUD Operations', () => {
    it('应该成功创建记录', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: testUser, error: null });
      
      const result = await createRecord('users', {
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      });
      
      expect(result).toEqual(testUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith({
        action: 'create',
        table: 'users',
        recordId: testUser.id
      });
    });

    it('应该成功查找单个记录', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: testUser, error: null });
      
      const result = await findRecord('users', testUser.id);
      
      expect(result).toEqual(testUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', testUser.id);
    });

    it('应该成功查找多个记录', async () => {
      const users = [testUser, { ...testUser, id: 'user_456', email: 'test2@example.com' }];
      mockQueryBuilder.select.mockResolvedValue({ data: users, error: null });
      
      const result = await findRecords('users', {
        filters: { role: 'student' },
        orderBy: 'created_at',
        limit: 10
      });
      
      expect(result).toEqual(users);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('role', 'student');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('应该成功更新记录', async () => {
      const updatedUser = { ...testUser, name: 'Updated Name' };
      mockQueryBuilder.single.mockResolvedValue({ data: updatedUser, error: null });
      
      const result = await updateRecord('users', testUser.id, {
        name: 'Updated Name'
      });
      
      expect(result).toEqual(updatedUser);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', testUser.id);
    });

    it('应该成功删除记录', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: testUser, error: null });
      
      const result = await deleteRecord('users', testUser.id);
      
      expect(result).toEqual(testUser);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', testUser.id);
      expect(mockAuditService.logDataAccess).toHaveBeenCalledWith({
        action: 'delete',
        table: 'users',
        recordId: testUser.id
      });
    });

    it('应该统计记录数量', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: { count: 42 }, error: null });
      
      const count = await countRecords('users', { role: 'student' });
      
      expect(count).toBe(42);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('role', 'student');
    });
  });

  /**
   * 高级查询操作测试
   */
  describe('Advanced Query Operations', () => {
    it('应该支持复杂查询条件', async () => {
      const courses = [testCourse];
      mockQueryBuilder.select.mockResolvedValue({ data: courses, error: null });
      
      await findRecords('courses', {
        filters: {
          status: 'published',
          price: { gte: 50, lte: 200 },
          title: { ilike: '%javascript%' },
          instructor_id: { in: ['user_123', 'user_456'] }
        },
        orderBy: [{ column: 'created_at', ascending: false }, { column: 'title', ascending: true }],
        limit: 20,
        offset: 10
      });
      
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'published');
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('price', 50);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('price', 200);
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith('title', '%javascript%');
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('instructor_id', ['user_123', 'user_456']);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('title', { ascending: true });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(10, 29);
    });

    it('应该支持关联查询', async () => {
      const coursesWithInstructor = [{
        ...testCourse,
        instructor: testUser
      }];
      
      mockQueryBuilder.select.mockResolvedValue({ data: coursesWithInstructor, error: null });
      
      await findRecords('courses', {
        select: 'id, title, instructor:users(id, name, email)',
        filters: { status: 'published' }
      });
      
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('id, title, instructor:users(id, name, email)');
    });

    it('应该支持全文搜索', async () => {
      await findRecords('courses', {
        search: {
          query: 'javascript programming',
          columns: ['title', 'description'],
          type: 'websearch'
        }
      });
      
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });
  });

  /**
   * 事务处理测试
   */
  describe('Transaction Handling', () => {
    it('应该成功执行事务', async () => {
      const operations = [
        { type: 'insert', table: 'users', data: { email: 'new@example.com' } },
        { type: 'update', table: 'courses', id: 'course_123', data: { status: 'published' } },
        { type: 'delete', table: 'enrollments', id: 'enrollment_123' }
      ];
      
      mockQueryBuilder.single.mockResolvedValue({ data: { success: true }, error: null });
      
      const result = await executeTransaction(operations);
      
      expect(result.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        action: 'transaction.execute',
        details: { operationCount: 3 }
      });
    });

    it('应该处理事务回滚', async () => {
      const operations = [
        { type: 'insert', table: 'users', data: { email: 'invalid-email' } }
      ];
      
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: 'Transaction failed', code: 'TRANSACTION_ERROR' }
      });
      
      await expect(executeTransaction(operations)).rejects.toThrow('Transaction failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Transaction failed:', expect.any(Object));
    });
  });

  /**
   * RPC函数调用测试
   */
  describe('RPC Function Calls', () => {
    it('应该成功调用RPC函数', async () => {
      const rpcResult = { user_count: 100, course_count: 50 };
      mockSupabaseClient.rpc.mockResolvedValue({ data: rpcResult, error: null });
      
      const result = await executeRPC('get_platform_stats', {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });
      
      expect(result).toEqual(rpcResult);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_platform_stats', {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      });
    });

    it('应该处理RPC函数错误', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Function not found', code: 'FUNCTION_NOT_FOUND' }
      });
      
      await expect(executeRPC('nonexistent_function')).rejects.toThrow('Function not found');
    });
  });

  /**
   * 文件存储测试
   */
  describe('File Storage Operations', () => {
    it('应该成功上传文件', async () => {
      const fileData = new Uint8Array([1, 2, 3, 4]);
      const uploadResult = {
        data: {
          path: 'uploads/test-file.jpg',
          id: 'file_123',
          fullPath: 'uploads/test-file.jpg'
        },
        error: null
      };
      
      mockStorageBucket.upload.mockResolvedValue(uploadResult);
      
      const result = await uploadFile('uploads', 'test-file.jpg', fileData, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });
      
      expect(result).toEqual(uploadResult.data);
      expect(mockStorageBucket.upload).toHaveBeenCalledWith(
        'test-file.jpg',
        fileData,
        expect.objectContaining({
          contentType: 'image/jpeg',
          cacheControl: '3600'
        })
      );
    });

    it('应该成功下载文件', async () => {
      const fileData = new Uint8Array([1, 2, 3, 4]);
      const downloadResult = {
        data: fileData,
        error: null
      };
      
      mockStorageBucket.download.mockResolvedValue(downloadResult);
      
      const result = await downloadFile('uploads', 'test-file.jpg');
      
      expect(result).toEqual(fileData);
      expect(mockStorageBucket.download).toHaveBeenCalledWith('test-file.jpg');
    });

    it('应该成功删除文件', async () => {
      const deleteResult = {
        data: { message: 'File deleted successfully' },
        error: null
      };
      
      mockStorageBucket.remove.mockResolvedValue(deleteResult);
      
      const result = await deleteFile('uploads', ['test-file.jpg']);
      
      expect(result).toEqual(deleteResult.data);
      expect(mockStorageBucket.remove).toHaveBeenCalledWith(['test-file.jpg']);
    });
  });

  /**
   * 安全性和权限测试
   */
  describe('Security and Permissions', () => {
    it('应该启用行级安全(RLS)', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      await enableRLS('users');
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('enable_rls', {
        table_name: 'users'
      });
      
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith({
        action: 'rls.enable',
        table: 'users'
      });
    });

    it('应该创建安全策略', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      await createPolicy('users', 'user_select_own', {
        command: 'SELECT',
        using: 'auth.uid() = id',
        check: null
      });
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_policy', {
        table_name: 'users',
        policy_name: 'user_select_own',
        command: 'SELECT',
        using_expression: 'auth.uid() = id',
        check_expression: null
      });
    });

    it('应该验证用户权限', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user_123', role: 'admin' } },
        error: null
      });
      
      const hasPermission = await checkUserPermission('admin', 'users.delete');
      
      expect(hasPermission).toBe(true);
    });
  });

  /**
   * 缓存集成测试
   */
  describe('Cache Integration', () => {
    it('应该使用缓存查询结果', async () => {
      const cacheKey = 'users:user_123';
      mockCacheService.get.mockResolvedValue(testUser);
      
      const result = await findRecord('users', testUser.id, { useCache: true });
      
      expect(result).toEqual(testUser);
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('应该在缓存未命中时查询数据库并缓存结果', async () => {
      const cacheKey = 'users:user_123';
      mockCacheService.get.mockResolvedValue(null);
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: testUser, error: null });
      
      const result = await findRecord('users', testUser.id, { useCache: true, cacheTTL: 3600 });
      
      expect(result).toEqual(testUser);
      expect(mockCacheService.set).toHaveBeenCalledWith(cacheKey, testUser, 3600);
    });

    it('应该在更新时清除相关缓存', async () => {
      const updatedUser = { ...testUser, name: 'Updated Name' };
      mockQueryBuilder.single.mockResolvedValue({ data: updatedUser, error: null });
      
      await updateRecord('users', testUser.id, { name: 'Updated Name' }, { clearCache: true });
      
      expect(mockCacheService.del).toHaveBeenCalledWith(`users:${testUser.id}`);
    });
  });

  /**
   * 错误处理和重试机制测试
   */
  describe('Error Handling and Retry Mechanism', () => {
    it('应该处理网络连接错误', async () => {
      mockQueryBuilder.single.mockRejectedValue(new Error('Network error'));
      
      await expect(findRecord('users', testUser.id)).rejects.toThrow('Network error');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database query failed:',
        expect.any(Error)
      );
    });

    it('应该重试失败的操作', async () => {
      mockQueryBuilder.single
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue({ data: testUser, error: null });
      
      const result = await findRecord('users', testUser.id, { retryAttempts: 3 });
      
      expect(result).toEqual(testUser);
      expect(mockQueryBuilder.single).toHaveBeenCalledTimes(3);
    });

    it('应该处理Supabase特定错误', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: {
          message: 'Row not found',
          code: 'PGRST116',
          details: 'The result contains 0 rows'
        }
      });
      
      const result = await findRecord('users', 'nonexistent_id');
      
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Record not found:',
        expect.objectContaining({ table: 'users', id: 'nonexistent_id' })
      );
    });

    it('应该处理权限错误', async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: {
          message: 'Permission denied',
          code: '42501',
          details: 'Insufficient privileges'
        }
      });
      
      await expect(findRecord('admin_users', 'user_123')).rejects.toThrow('Permission denied');
      
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith({
        action: 'access.denied',
        table: 'admin_users',
        error: 'Permission denied'
      });
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效执行批量查询', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        ...testUser,
        id: `user_${i}`,
        email: `user${i}@example.com`
      }));
      
      mockQueryBuilder.select.mockResolvedValue({ data: users, error: null });
      
      const startTime = Date.now();
      const result = await findRecords('users', { limit: 100 });
      const queryTime = Date.now() - startTime;
      
      expect(result).toHaveLength(100);
      expect(queryTime).toBeLessThan(1000); // 应该在1秒内完成
      
      expect(mockAnalyticsService.timing).toHaveBeenCalledWith(
        'database.query.duration',
        queryTime,
        { table: 'users', operation: 'select' }
      );
    });

    it('应该有效利用连接池', async () => {
      const promises = Array.from({ length: 50 }, () => 
        findRecord('users', testUser.id)
      );
      
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: testUser, error: null });
      
      const startTime = Date.now();
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(5000); // 50个并发查询应该在5秒内完成
    });

    it('应该优化大数据量查询', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `record_${i}`,
        data: `data_${i}`
      }));
      
      mockQueryBuilder.select.mockResolvedValue({ data: largeDataset, error: null });
      
      const startTime = Date.now();
      const result = await findRecords('large_table', {
        limit: 10000,
        select: 'id, data' // 只选择需要的字段
      });
      const queryTime = Date.now() - startTime;
      
      expect(result).toHaveLength(10000);
      expect(queryTime).toBeLessThan(3000); // 大数据量查询应该在3秒内完成
    });
  });
});

// 辅助函数
async function checkUserPermission(userRole: string, permission: string): Promise<boolean> {
  // 模拟权限检查逻辑
  const rolePermissions = {
    admin: ['users.create', 'users.read', 'users.update', 'users.delete'],
    instructor: ['courses.create', 'courses.read', 'courses.update'],
    student: ['courses.read', 'enrollments.create']
  };
  
  return rolePermissions[userRole]?.includes(permission) || false;
}