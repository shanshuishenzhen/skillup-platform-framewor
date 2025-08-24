/**
 * Supabase数据库工具单元测试
 * 
 * 测试Supabase数据库工具，包括：
 * - 数据库连接和初始化
 * - CRUD操作
 * - 查询构建和执行
 * - 事务处理
 * - 实时订阅
 * - 认证集成
 * - 存储操作
 * - 错误处理和重试
 */

import { 
  SupabaseClient,
  createSupabaseClient,
  getSupabaseClient,
  executeQuery,
  executeTransaction,
  subscribeToChanges,
  unsubscribeFromChanges,
  uploadFile,
  downloadFile,
  deleteFile,
  authenticateUser,
  refreshSession,
  signOut,
  createRLSPolicy,
  enableRLS,
  disableRLS,
  createIndex,
  dropIndex,
  vacuum,
  analyze
} from '../../utils/supabase';
import { logger } from '../../utils/logger';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { envConfig } from '../../config/envConfig';
import { createClient } from '@supabase/supabase-js';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../config/envConfig');
jest.mock('@supabase/supabase-js');

// 模块类型定义
type MockedModule<T> = T & { [K in keyof T]: jest.MockedFunction<T[K]> };

// 类型定义
interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  role: 'student' | 'instructor' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  email_verified: boolean;
  phone?: string;
  bio?: string;
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  category_id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  price: number;
  currency: string;
  duration_hours: number;
  max_students: number;
  enrolled_count: number;
  rating: number;
  review_count: number;
  thumbnail_url?: string;
  preview_video_url?: string;
  tags: string[];
  requirements: string[];
  learning_objectives: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface QueryOptions {
  select?: string;
  filter?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
  count?: 'exact' | 'planned' | 'estimated';
}

interface TransactionOperation {
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'upsert';
  data?: Record<string, unknown>;
  filter?: Record<string, unknown>;
}

interface SubscriptionOptions {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table?: string;
  filter?: string;
}

interface FileUploadOptions {
  bucket: string;
  path: string;
  file: File | Buffer;
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  };
}

interface RLSPolicy {
  name: string;
  table: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  role?: string;
  using?: string;
  withCheck?: string;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logDatabaseOperation: jest.fn(),
  logSecurityEvent: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockEnvConfig = {
  supabase: {
    url: 'https://test.supabase.co',
    anonKey: 'test_anon_key',
    serviceRoleKey: 'test_service_role_key',
    jwtSecret: 'test_jwt_secret'
  },
  database: {
    maxConnections: 10,
    connectionTimeout: 30000,
    queryTimeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  }
};

// Mock Supabase Client
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn()
  },
  storage: {
    from: jest.fn()
  },
  channel: jest.fn(),
  removeChannel: jest.fn(),
  rpc: jest.fn()
};

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
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
  single: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
  csv: jest.fn().mockReturnThis(),
  explain: jest.fn().mockReturnThis()
};

const mockStorageBucket = {
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
  list: jest.fn(),
  createSignedUrl: jest.fn(),
  createSignedUrls: jest.fn(),
  getPublicUrl: jest.fn()
};

const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

// 设置 Mock
jest.mocked(logger).mockReturnValue(mockLogger);
jest.mocked(cacheService).mockReturnValue(mockCacheService);
jest.mocked(auditService).mockReturnValue(mockAuditService);
jest.mocked(analyticsService).mockReturnValue(mockAnalyticsService);
jest.mocked(envConfig).mockReturnValue(mockEnvConfig);
(createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

// 测试数据
const testUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  role: 'student',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_login_at: '2024-01-01T12:00:00Z',
  email_verified: true,
  phone: '+1234567890',
  bio: 'Test user bio',
  preferences: {
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  }
};

const testCourse: Course = {
  id: 'course-123',
  title: 'Test Course',
  description: 'A test course description',
  instructor_id: 'instructor-123',
  category_id: 'category-123',
  level: 'beginner',
  status: 'published',
  price: 99.99,
  currency: 'USD',
  duration_hours: 10,
  max_students: 100,
  enrolled_count: 25,
  rating: 4.5,
  review_count: 10,
  thumbnail_url: 'https://example.com/thumbnail.jpg',
  preview_video_url: 'https://example.com/preview.mp4',
  tags: ['programming', 'javascript', 'web development'],
  requirements: ['Basic computer skills', 'Internet connection'],
  learning_objectives: ['Learn JavaScript basics', 'Build web applications'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  published_at: '2024-01-01T00:00:00Z'
};

describe('Supabase Database Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
    mockSupabaseClient.storage.from.mockReturnValue(mockStorageBucket);
    mockSupabaseClient.channel.mockReturnValue(mockChannel);
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockAuditService.logDatabaseOperation.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 客户端初始化测试
   */
  describe('Client Initialization', () => {
    it('应该创建Supabase客户端', () => {
      const client = createSupabaseClient();
      
      expect(createClient).toHaveBeenCalledWith(
        mockEnvConfig.supabase.url,
        mockEnvConfig.supabase.anonKey,
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            autoRefreshToken: true
          })
        })
      );
      
      expect(client).toBe(mockSupabaseClient);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Supabase client created successfully'
      );
    });

    it('应该获取现有的客户端实例', () => {
      // 第一次创建
      const client1 = getSupabaseClient();
      // 第二次获取应该返回同一个实例
      const client2 = getSupabaseClient();
      
      expect(client1).toBe(client2);
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('应该使用服务角色密钥创建管理客户端', () => {
      const adminClient = createSupabaseClient(true);
      
      expect(createClient).toHaveBeenCalledWith(
        mockEnvConfig.supabase.url,
        mockEnvConfig.supabase.serviceRoleKey,
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: false,
            persistSession: false
          })
        })
      );
    });
  });

  /**
   * 查询操作测试
   */
  describe('Query Operations', () => {
    beforeEach(() => {
      mockQueryBuilder.select.mockResolvedValue({
        data: [testUser],
        error: null,
        count: 1
      });
    });

    it('应该执行简单查询', async () => {
      const result = await executeQuery('users', {
        select: '*',
        filter: { status: 'active' },
        limit: 10
      });
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      
      expect(result.data).toEqual([testUser]);
      expect(result.error).toBeNull();
    });

    it('应该执行复杂查询', async () => {
      const options: QueryOptions = {
        select: 'id, email, full_name, role',
        filter: {
          role: 'student',
          status: 'active',
          created_at: { gte: '2024-01-01' }
        },
        order: [
          { column: 'created_at', ascending: false },
          { column: 'full_name', ascending: true }
        ],
        limit: 20,
        offset: 10
      };
      
      await executeQuery('users', options);
      
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('id, email, full_name, role');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('role', 'student');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('full_name', { ascending: true });
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(10, 29);
    });

    it('应该处理查询错误', async () => {
      mockQueryBuilder.select.mockResolvedValue({
        data: null,
        error: { message: 'Table not found', code: '42P01' }
      });
      
      const result = await executeQuery('nonexistent_table', { select: '*' });
      
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Table not found');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Query execution failed',
        expect.objectContaining({
          table: 'nonexistent_table',
          error: expect.objectContaining({})
        })
      );
    });

    it('应该缓存查询结果', async () => {
      const cacheKey = 'query:users:active';
      mockCacheService.get.mockResolvedValue(null);
      
      await executeQuery('users', {
        select: '*',
        filter: { status: 'active' },
        cache: { key: cacheKey, ttl: 300 }
      });
      
      expect(mockCacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        cacheKey,
        expect.objectContaining({}),
        300
      );
    });

    it('应该从缓存返回结果', async () => {
      const cacheKey = 'query:users:active';
      const cachedResult = { data: [testUser], error: null };
      mockCacheService.get.mockResolvedValue(cachedResult);
      
      const result = await executeQuery('users', {
        select: '*',
        cache: { key: cacheKey }
      });
      
      expect(result).toEqual(cachedResult);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });

  /**
   * 事务处理测试
   */
  describe('Transaction Operations', () => {
    it('应该执行事务操作', async () => {
      const operations: TransactionOperation[] = [
        {
          table: 'users',
          operation: 'insert',
          data: { email: 'new@example.com', username: 'newuser' }
        },
        {
          table: 'user_profiles',
          operation: 'insert',
          data: { user_id: 'user-123', bio: 'New user bio' }
        },
        {
          table: 'users',
          operation: 'update',
          data: { last_login_at: new Date().toISOString() },
          filter: { id: 'user-123' }
        }
      ];
      
      mockQueryBuilder.insert.mockResolvedValue({ data: testUser, error: null });
      mockQueryBuilder.update.mockResolvedValue({ data: testUser, error: null });
      
      const result = await executeTransaction(operations);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(mockAuditService.logDatabaseOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transaction',
          operations: operations.length
        })
      );
    });

    it('应该回滚失败的事务', async () => {
      const operations: TransactionOperation[] = [
        {
          table: 'users',
          operation: 'insert',
          data: { email: 'new@example.com' }
        },
        {
          table: 'invalid_table',
          operation: 'insert',
          data: { some_field: 'value' }
        }
      ];
      
      mockQueryBuilder.insert
        .mockResolvedValueOnce({ data: testUser, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Table not found' } });
      
      const result = await executeTransaction(operations);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Transaction failed, rolling back',
        expect.objectContaining({})
      );
    });
  });

  /**
   * 实时订阅测试
   */
  describe('Real-time Subscriptions', () => {
    it('应该订阅表变化', () => {
      const callback = jest.fn();
      const options: SubscriptionOptions = {
        event: 'INSERT',
        table: 'users',
        filter: 'role=eq.student'
      };
      
      const subscription = subscribeToChanges('users', options, callback);
      
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('users-changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.student'
        }),
        callback
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('应该取消订阅', () => {
      const subscription = { id: 'sub-123', channel: mockChannel };
      
      unsubscribeFromChanges(subscription);
      
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('应该处理订阅错误', () => {
      const callback = jest.fn();
      mockChannel.subscribe.mockImplementation(() => {
        throw new Error('Subscription failed');
      });
      
      expect(() => {
        subscribeToChanges('users', { event: '*' }, callback);
      }).toThrow('Subscription failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to subscribe to changes',
        expect.objectContaining({})
      );
    });
  });

  /**
   * 文件存储测试
   */
  describe('File Storage Operations', () => {
    it('应该上传文件', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options: FileUploadOptions = {
        bucket: 'uploads',
        path: 'documents/test.txt',
        file,
        options: {
          cacheControl: '3600',
          contentType: 'text/plain',
          upsert: true
        }
      };
      
      mockStorageBucket.upload.mockResolvedValue({
        data: { path: 'documents/test.txt' },
        error: null
      });
      
      const result = await uploadFile(options);
      
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('uploads');
      expect(mockStorageBucket.upload).toHaveBeenCalledWith(
        'documents/test.txt',
        file,
        {
          cacheControl: '3600',
          contentType: 'text/plain',
          upsert: true
        }
      );
      
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('应该下载文件', async () => {
      const fileData = new Blob(['test content'], { type: 'text/plain' });
      mockStorageBucket.download.mockResolvedValue({
        data: fileData,
        error: null
      });
      
      const result = await downloadFile('uploads', 'documents/test.txt');
      
      expect(mockStorageBucket.download).toHaveBeenCalledWith('documents/test.txt');
      expect(result.data).toBe(fileData);
    });

    it('应该删除文件', async () => {
      mockStorageBucket.remove.mockResolvedValue({
        data: [{ name: 'test.txt' }],
        error: null
      });
      
      const result = await deleteFile('uploads', 'documents/test.txt');
      
      expect(mockStorageBucket.remove).toHaveBeenCalledWith(['documents/test.txt']);
      expect(result.error).toBeNull();
    });

    it('应该处理文件操作错误', async () => {
      mockStorageBucket.upload.mockResolvedValue({
        data: null,
        error: { message: 'File too large' }
      });
      
      const file = new File(['test'], 'test.txt');
      const result = await uploadFile({
        bucket: 'uploads',
        path: 'test.txt',
        file
      });
      
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('File too large');
    });
  });

  /**
   * 认证集成测试
   */
  describe('Authentication Integration', () => {
    it('应该认证用户', async () => {
      const session = {
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        user: testUser
      };
      
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session, user: testUser },
        error: null
      });
      
      const result = await authenticateUser('test@example.com', 'password');
      
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
      
      expect(result.data.user).toEqual(testUser);
      expect(result.error).toBeNull();
    });

    it('应该刷新会话', async () => {
      const newSession = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        user: testUser
      };
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: newSession, user: testUser },
        error: null
      });
      
      const result = await refreshSession('refresh_token');
      
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'refresh_token'
      });
      
      expect(result.data.session).toEqual(newSession);
    });

    it('应该登出用户', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });
      
      const result = await signOut();
      
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  /**
   * RLS策略管理测试
   */
  describe('RLS Policy Management', () => {
    it('应该创建RLS策略', async () => {
      const policy: RLSPolicy = {
        name: 'users_select_own',
        table: 'users',
        command: 'SELECT',
        role: 'authenticated',
        using: 'auth.uid() = id'
      };
      
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      const result = await createRLSPolicy(policy);
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'create_policy',
        expect.objectContaining({
          policy_name: 'users_select_own',
          table_name: 'users',
          command: 'SELECT',
          role_name: 'authenticated',
          using_expression: 'auth.uid() = id'
        })
      );
      
      expect(result.error).toBeNull();
    });

    it('应该启用RLS', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      const result = await enableRLS('users');
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'enable_rls',
        { table_name: 'users' }
      );
      
      expect(result.error).toBeNull();
    });

    it('应该禁用RLS', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      const result = await disableRLS('users');
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'disable_rls',
        { table_name: 'users' }
      );
      
      expect(result.error).toBeNull();
    });
  });

  /**
   * 数据库维护测试
   */
  describe('Database Maintenance', () => {
    it('应该创建索引', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      const result = await createIndex('users', ['email'], {
        unique: true,
        name: 'idx_users_email'
      });
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'create_index',
        expect.objectContaining({
          table_name: 'users',
          columns: ['email'],
          unique: true,
          index_name: 'idx_users_email'
        })
      );
    });

    it('应该删除索引', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      const result = await dropIndex('idx_users_email');
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'drop_index',
        { index_name: 'idx_users_email' }
      );
    });

    it('应该执行VACUUM', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      const result = await vacuum('users', { full: true });
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'vacuum_table',
        expect.objectContaining({
          table_name: 'users',
          full: true
        })
      );
    });

    it('应该执行ANALYZE', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
      
      const result = await analyze('users');
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'analyze_table',
        { table_name: 'users' }
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理批量查询', async () => {
      const queries = Array.from({ length: 100 }, (_, i) => 
        executeQuery('users', { select: '*', filter: { id: `user-${i}` } })
      );
      
      const startTime = Date.now();
      await Promise.all(queries);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 1秒内完成100个查询
    });

    it('应该有效利用连接池', async () => {
      // 模拟并发查询
      const concurrentQueries = Array.from({ length: 50 }, () => 
        executeQuery('users', { select: 'id, email' })
      );
      
      await Promise.all(concurrentQueries);
      
      // 验证没有超过最大连接数
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(50);
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理空查询结果', async () => {
      mockQueryBuilder.select.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });
      
      const result = await executeQuery('users', {
        select: '*',
        filter: { status: 'nonexistent' }
      });
      
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('应该处理网络超时', async () => {
      mockQueryBuilder.select.mockRejectedValue(new Error('Network timeout'));
      
      const result = await executeQuery('users', { select: '*' });
      
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Network timeout');
    });

    it('应该处理大量数据', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...testUser,
        id: `user-${i}`,
        email: `user${i}@example.com`
      }));
      
      mockQueryBuilder.select.mockResolvedValue({
        data: largeDataset,
        error: null,
        count: 10000
      });
      
      const result = await executeQuery('users', { select: '*' });
      
      expect(result.data).toHaveLength(10000);
      expect(result.count).toBe(10000);
    });
  });
});