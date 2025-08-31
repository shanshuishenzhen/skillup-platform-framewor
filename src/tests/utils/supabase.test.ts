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
  createClient,
  createServerClient,
  createBrowserClient,
  getCurrentUser,
  validateSession,
  refreshSession,
  signOut,
  checkAdminPermission,
  getUserFromRequest,
  validateRequestAuth
} from '../../utils/supabase';
import { logger } from '../../utils/logger';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { envConfig } from '../../config/envConfig';
import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../config/envConfig');
jest.mock('@supabase/supabase-js');

// 类型定义
interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  instructor_id: string;
  created_at?: string;
  updated_at?: string;
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
// 注意：这些服务的mock设置根据实际导入的模块进行调整
(supabaseCreateClient as jest.Mock).mockReturnValue(mockSupabaseClient);

// 测试数据
const testUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'student',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const testCourse: Course = {
  id: 'course-123',
  title: 'Test Course',
  description: 'A test course description',
  instructor_id: 'instructor-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
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
      const client = createClient();
      
      expect(supabaseCreateClient).toHaveBeenCalledWith(
        mockEnvConfig.supabase.url,
        mockEnvConfig.supabase.anonKey
      );
      
      expect(client).toBe(mockSupabaseClient);
    });

    it('应该创建服务端客户端', () => {
      const serverClient = createServerClient();
      
      expect(supabaseCreateClient).toHaveBeenCalled();
      expect(serverClient).toBe(mockSupabaseClient);
    });

    it('应该创建浏览器客户端', () => {
      const browserClient = createBrowserClient();
      
      expect(supabaseCreateClient).toHaveBeenCalledWith(
        mockEnvConfig.supabase.url,
        mockEnvConfig.supabase.anonKey
      );
      
      expect(browserClient).toBe(mockSupabaseClient);
    });
  });

  /**
   * 查询操作测试
   */
  describe('Query Operations', () => {
    // executeQuery函数测试已移除，因为该函数不在supabase.ts中定义
    // 数据库查询应该直接使用Supabase客户端的方法
  });

  /**
   * 事务处理测试
   */
  describe('Transaction Operations', () => {
    // executeTransaction函数测试已移除，因为该函数不在supabase.ts中定义
    // 事务处理应该使用Supabase的RPC或其他事务机制
  });

  /**
   * 实时订阅测试
   */
  describe('Real-time Subscriptions', () => {
    // 数据订阅测试已移除，因为这些函数不在supabase.ts中定义
    // 实时订阅功能应该使用Supabase内置的realtime方法
  });

  /**
   * 文件存储测试
   */
  describe('File Storage Operations', () => {
    // 文件上传测试已移除，因为uploadFile函数不在supabase.ts中定义
    // 文件上传功能应该在专门的文件存储模块中测试

    // 文件操作测试已移除，因为这些函数不在supabase.ts中定义
    // 这些功能应该在专门的文件存储模块中测试
  });

  /**
   * 认证集成测试
   */
  describe('Authentication Integration', () => {
    it('应该获取当前用户', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'student'
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null
      });
      
      const result = await getCurrentUser();
      
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(testUser);
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
      expect(result.session).toEqual(newSession);
    });

    it('应该登出用户', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      });
      
      await signOut();
      
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('应该从请求中获取用户', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com'
      };
      
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      } as any;
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null
      });
      
      const result = await getUserFromRequest(mockRequest);
      
      expect(result).toEqual(testUser);
    });

    it('应该验证请求认证', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com'
      };
      
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      } as any;
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null
      });
      
      const result = await validateRequestAuth(mockRequest);
       
       expect(result).toEqual(testUser);
    });
  });

  /**
   * 会话验证测试
   */
  describe('Session Validation', () => {
    it('应该验证有效会话', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com'
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: testUser },
        error: null
      });
      
      const result = await validateSession('valid-token');
      
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith('valid-token');
      expect(result.valid).toBe(true);
      expect(result.user).toEqual(testUser);
    });

    it('应该处理无效会话', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });
      
      const result = await validateSession('invalid-token');
      
      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid token');
    });
  });

  /**
   * 管理员权限测试
   */
  describe('Admin Permission', () => {
    it('应该检查管理员权限', async () => {
      const adminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin'
      };
      
      const mockRequest = {
        headers: {
          authorization: 'Bearer admin-token'
        }
      } as any;
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null
      });
      
      const result = await checkAdminPermission(mockRequest);
      
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('应该拒绝非管理员用户', async () => {
      const regularUser = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'student'
      };
      
      const mockRequest = {
        headers: {
          authorization: 'Bearer user-token'
        }
      } as any;
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: regularUser },
        error: null
      });
      
      await expect(checkAdminPermission(mockRequest)).rejects.toThrow();
    });
  });




});