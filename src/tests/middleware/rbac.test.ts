/**
 * RBAC权限控制中间件单元测试
 * 
 * 测试基于角色的访问控制中间件，包括：
 * - 角色权限验证
 * - 资源访问控制
 * - 动态权限检查
 * - 权限继承机制
 * - 权限缓存优化
 * - 权限审计日志
 * - 多租户权限隔离
 * - 权限策略管理
 */

import { rbacMiddleware } from '../../middleware/rbac';
import { cacheService } from '../../services/cacheService';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import { supabaseClient } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { envConfig } from '../../config/envConfig';
import { Request, Response, NextFunction } from 'express';

// Mock 依赖
jest.mock('../../services/cacheService');
jest.mock('../../services/auditService');
jest.mock('../../services/analyticsService');
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/envConfig');

// 类型定义
interface User {
  id: string;
  email: string;
  username: string;
  roles: Role[];
  permissions: Permission[];
  organizationId?: string;
  tenantId?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: Permission[];
  parentRoleId?: string;
  organizationId?: string;
  tenantId?: string;
  isSystem: boolean;
  priority: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  effect: 'allow' | 'deny';
  priority: number;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
  logicalOperator?: 'and' | 'or';
}

interface ResourcePolicy {
  id: string;
  resource: string;
  actions: string[];
  conditions: {
    ownership?: boolean;
    organizationScope?: boolean;
    tenantScope?: boolean;
    customConditions?: PermissionCondition[];
  };
  defaultPermissions: {
    roleId: string;
    actions: string[];
  }[];
  inheritanceRules?: {
    parentResource: string;
    inheritedActions: string[];
  }[];
}

interface AccessContext {
  user: User;
  resource: string;
  action: string;
  resourceId?: string;
  resourceData?: any;
  organizationId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

interface PermissionCache {
  userId: string;
  permissions: Permission[];
  roles: Role[];
  cachedAt: string;
  expiresAt: string;
  version: number;
}

// Mock 实例
const mockSupabaseClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  }),
  rpc: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logAccessAttempt: jest.fn(),
  logPermissionCheck: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockEnvConfig = {
  rbac: {
    enabled: true,
    cacheEnabled: true,
    cacheTTL: 3600, // 1小时
    permissionCacheTTL: 1800, // 30分钟
    auditEnabled: true,
    strictMode: true,
    defaultDenyAll: false,
    superAdminRole: 'super_admin',
    systemRoles: ['admin', 'moderator', 'user'],
    multiTenant: true,
    inheritanceEnabled: true,
    conditionsEnabled: true
  },
  security: {
    sessionTimeout: 3600000, // 1小时
    maxLoginAttempts: 5,
    lockoutDuration: 900000 // 15分钟
  }
};

// 设置 Mock
(supabaseClient as any) = mockSupabaseClient;
(cacheService as any) = mockCacheService;
(auditService as any) = mockAuditService;
(analyticsService as any) = mockAnalyticsService;
(logger as any) = mockLogger;
(envConfig as any) = mockEnvConfig;

// 测试数据
const adminRole: Role = {
  id: 'role-admin',
  name: 'admin',
  displayName: '管理员',
  description: '系统管理员角色',
  permissions: [],
  isSystem: true,
  priority: 100,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const teacherRole: Role = {
  id: 'role-teacher',
  name: 'teacher',
  displayName: '教师',
  description: '教师角色',
  permissions: [],
  isSystem: true,
  priority: 50,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const studentRole: Role = {
  id: 'role-student',
  name: 'student',
  displayName: '学生',
  description: '学生角色',
  permissions: [],
  isSystem: true,
  priority: 10,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const courseReadPermission: Permission = {
  id: 'perm-course-read',
  name: 'course:read',
  resource: 'course',
  action: 'read',
  effect: 'allow',
  priority: 10,
  isSystem: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const courseWritePermission: Permission = {
  id: 'perm-course-write',
  name: 'course:write',
  resource: 'course',
  action: 'write',
  effect: 'allow',
  priority: 20,
  isSystem: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const courseDeletePermission: Permission = {
  id: 'perm-course-delete',
  name: 'course:delete',
  resource: 'course',
  action: 'delete',
  effect: 'allow',
  priority: 30,
  isSystem: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const adminUser: User = {
  id: 'user-admin',
  email: 'admin@example.com',
  username: 'admin',
  roles: [{ ...adminRole, permissions: [courseReadPermission, courseWritePermission, courseDeletePermission] }],
  permissions: [],
  organizationId: 'org-1',
  tenantId: 'tenant-1',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const teacherUser: User = {
  id: 'user-teacher',
  email: 'teacher@example.com',
  username: 'teacher',
  roles: [{ ...teacherRole, permissions: [courseReadPermission, courseWritePermission] }],
  permissions: [],
  organizationId: 'org-1',
  tenantId: 'tenant-1',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const studentUser: User = {
  id: 'user-student',
  email: 'student@example.com',
  username: 'student',
  roles: [{ ...studentRole, permissions: [courseReadPermission] }],
  permissions: [],
  organizationId: 'org-1',
  tenantId: 'tenant-1',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

// Mock Express 对象
const createMockRequest = (user?: User, resource?: string, action?: string): Partial<Request> => ({
  user,
  params: { resource, action },
  query: {},
  body: {},
  headers: {
    'user-agent': 'Test Agent',
    'x-forwarded-for': '192.168.1.1'
  },
  ip: '192.168.1.1',
  sessionID: 'session-123'
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    locals: {}
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('RBAC Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockCacheService.exists.mockResolvedValue(false);
    
    // Mock 数据库操作
    mockSupabaseClient.from().then.mockResolvedValue({
      data: [],
      error: null
    });
    
    mockSupabaseClient.rpc.mockResolvedValue({
      data: true,
      error: null
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 基础权限验证测试
   */
  describe('Basic Permission Validation', () => {
    it('应该允许管理员访问所有资源', async () => {
      const req = createMockRequest(adminUser, 'course', 'delete') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'delete');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      
      // 验证审计日志
      expect(mockAuditService.logAccessAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminUser.id,
          resource: 'course',
          action: 'delete',
          result: 'allowed',
          reason: 'admin_role'
        })
      );
    });

    it('应该允许教师访问有权限的资源', async () => {
      const req = createMockRequest(teacherUser, 'course', 'write') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'write');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('应该拒绝教师删除课程', async () => {
      const req = createMockRequest(teacherUser, 'course', 'delete') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'delete');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '权限不足',
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      );
      
      // 验证审计日志
      expect(mockAuditService.logAccessAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: teacherUser.id,
          resource: 'course',
          action: 'delete',
          result: 'denied',
          reason: 'insufficient_permissions'
        })
      );
    });

    it('应该允许学生读取课程', async () => {
      const req = createMockRequest(studentUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('应该拒绝学生写入课程', async () => {
      const req = createMockRequest(studentUser, 'course', 'write') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'write');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('应该拒绝未认证用户访问', async () => {
      const req = createMockRequest(undefined, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '未认证',
          code: 'UNAUTHENTICATED'
        })
      );
    });

    it('应该拒绝被禁用用户访问', async () => {
      const suspendedUser = { ...studentUser, status: 'suspended' as const };
      const req = createMockRequest(suspendedUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '账户已被禁用',
          code: 'ACCOUNT_SUSPENDED'
        })
      );
    });
  });

  /**
   * 动态权限检查测试
   */
  describe('Dynamic Permission Checking', () => {
    it('应该支持动态资源和动作', async () => {
      const req = {
        ...createMockRequest(teacherUser),
        params: { resource: 'course', action: 'read', id: 'course-123' }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('应该支持通配符权限', async () => {
      const userWithWildcard = {
        ...teacherUser,
        roles: [{
          ...teacherRole,
          permissions: [{
            ...courseReadPermission,
            name: 'course:*',
            action: '*'
          }]
        }]
      };
      
      const req = createMockRequest(userWithWildcard, 'course', 'delete') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'delete');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('应该支持资源层级权限', async () => {
      const req = {
        ...createMockRequest(teacherUser),
        params: { resource: 'course.lesson', action: 'read' }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 层级权限检查
      mockSupabaseClient.rpc.mockResolvedValue({
        data: true,
        error: null
      });
      
      const middleware = rbacMiddleware('course.lesson', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      // 验证层级权限查询
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'check_hierarchical_permission',
        expect.objectContaining({
          user_id: teacherUser.id,
          resource: 'course.lesson',
          action: 'read'
        })
      );
    });
  });

  /**
   * 条件权限测试
   */
  describe('Conditional Permissions', () => {
    it('应该支持所有权条件', async () => {
      const ownershipPermission: Permission = {
        ...courseWritePermission,
        conditions: [{
          field: 'createdBy',
          operator: 'eq',
          value: '{{user.id}}'
        }]
      };
      
      const userWithOwnership = {
        ...studentUser,
        roles: [{
          ...studentRole,
          permissions: [ownershipPermission]
        }]
      };
      
      const req = {
        ...createMockRequest(userWithOwnership, 'course', 'write'),
        params: { id: 'course-123' },
        body: { createdBy: userWithOwnership.id }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 资源数据查询
      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'course-123', createdBy: userWithOwnership.id },
        error: null
      });
      
      const middleware = rbacMiddleware('course', 'write');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('应该拒绝不满足条件的访问', async () => {
      const ownershipPermission: Permission = {
        ...courseWritePermission,
        conditions: [{
          field: 'createdBy',
          operator: 'eq',
          value: '{{user.id}}'
        }]
      };
      
      const userWithOwnership = {
        ...studentUser,
        roles: [{
          ...studentRole,
          permissions: [ownershipPermission]
        }]
      };
      
      const req = {
        ...createMockRequest(userWithOwnership, 'course', 'write'),
        params: { id: 'course-123' }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 资源数据查询 - 不是所有者
      mockSupabaseClient.from().single.mockResolvedValue({
        data: { id: 'course-123', createdBy: 'other-user' },
        error: null
      });
      
      const middleware = rbacMiddleware('course', 'write');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('应该支持组织范围条件', async () => {
      const orgScopePermission: Permission = {
        ...courseReadPermission,
        conditions: [{
          field: 'organizationId',
          operator: 'eq',
          value: '{{user.organizationId}}'
        }]
      };
      
      const userWithOrgScope = {
        ...teacherUser,
        roles: [{
          ...teacherRole,
          permissions: [orgScopePermission]
        }]
      };
      
      const req = createMockRequest(userWithOrgScope, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 组织范围检查
      mockSupabaseClient.rpc.mockResolvedValue({
        data: true,
        error: null
      });
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('应该支持复合条件', async () => {
      const complexPermission: Permission = {
        ...courseWritePermission,
        conditions: [
          {
            field: 'status',
            operator: 'eq',
            value: 'draft',
            logicalOperator: 'and'
          },
          {
            field: 'createdBy',
            operator: 'eq',
            value: '{{user.id}}'
          }
        ]
      };
      
      const userWithComplex = {
        ...teacherUser,
        roles: [{
          ...teacherRole,
          permissions: [complexPermission]
        }]
      };
      
      const req = {
        ...createMockRequest(userWithComplex, 'course', 'write'),
        params: { id: 'course-123' }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 资源数据查询
      mockSupabaseClient.from().single.mockResolvedValue({
        data: {
          id: 'course-123',
          status: 'draft',
          createdBy: userWithComplex.id
        },
        error: null
      });
      
      const middleware = rbacMiddleware('course', 'write');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });

  /**
   * 权限缓存测试
   */
  describe('Permission Caching', () => {
    it('应该缓存用户权限', async () => {
      const req = createMockRequest(teacherUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // 第一次调用 - 缓存未命中
      mockCacheService.get.mockResolvedValueOnce(null);
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      // 验证缓存设置
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `rbac:permissions:${teacherUser.id}`,
        expect.any(Object),
        mockEnvConfig.rbac.permissionCacheTTL
      );
    });

    it('应该使用缓存的权限', async () => {
      const cachedPermissions = {
        userId: teacherUser.id,
        permissions: [courseReadPermission, courseWritePermission],
        roles: [teacherRole],
        cachedAt: new Date().toISOString(),
        version: 1
      };
      
      const req = createMockRequest(teacherUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 缓存命中
      mockCacheService.get.mockResolvedValue(cachedPermissions);
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      // 验证没有查询数据库
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('应该在权限变更时清除缓存', async () => {
      const userId = teacherUser.id;
      
      await rbacMiddleware.clearUserPermissionCache(userId);
      
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `rbac:permissions:${userId}`
      );
    });

    it('应该支持批量清除缓存', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      
      await rbacMiddleware.clearMultipleUserPermissionCache(userIds);
      
      userIds.forEach(userId => {
        expect(mockCacheService.del).toHaveBeenCalledWith(
          `rbac:permissions:${userId}`
        );
      });
    });
  });

  /**
   * 多租户权限测试
   */
  describe('Multi-Tenant Permissions', () => {
    it('应该隔离不同租户的权限', async () => {
      const tenant1User = { ...teacherUser, tenantId: 'tenant-1' };
      const tenant2User = { ...teacherUser, tenantId: 'tenant-2' };
      
      const req1 = createMockRequest(tenant1User, 'course', 'read') as Request;
      const req2 = createMockRequest(tenant2User, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      
      // 租户1用户访问
      await middleware(req1, res, next);
      expect(next).toHaveBeenCalledWith();
      
      // 重置mock
      jest.clearAllMocks();
      
      // 租户2用户访问
      await middleware(req2, res, next);
      expect(next).toHaveBeenCalledWith();
      
      // 验证租户隔离
      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        expect.stringContaining('permissions')
      );
    });

    it('应该支持跨租户权限', async () => {
      const crossTenantRole = {
        ...adminRole,
        name: 'cross_tenant_admin',
        tenantId: null // 跨租户角色
      };
      
      const crossTenantUser = {
        ...adminUser,
        roles: [crossTenantRole]
      };
      
      const req = createMockRequest(crossTenantUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });

  /**
   * 权限继承测试
   */
  describe('Permission Inheritance', () => {
    it('应该支持角色继承', async () => {
      const parentRole = {
        ...teacherRole,
        permissions: [courseReadPermission, courseWritePermission]
      };
      
      const childRole = {
        ...studentRole,
        parentRoleId: parentRole.id,
        permissions: []
      };
      
      const userWithInheritance = {
        ...studentUser,
        roles: [childRole]
      };
      
      const req = createMockRequest(userWithInheritance, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 继承权限查询
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [courseReadPermission, courseWritePermission],
        error: null
      });
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      // 验证继承权限查询
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_inherited_permissions',
        expect.objectContaining({
          user_id: userWithInheritance.id
        })
      );
    });

    it('应该支持资源继承', async () => {
      const req = {
        ...createMockRequest(teacherUser),
        params: { resource: 'course.lesson.quiz', action: 'read' }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 资源继承检查
      mockSupabaseClient.rpc.mockResolvedValue({
        data: true,
        error: null
      });
      
      const middleware = rbacMiddleware('course.lesson.quiz', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });

  /**
   * 权限策略测试
   */
  describe('Permission Policies', () => {
    it('应该应用拒绝策略', async () => {
      const denyPermission: Permission = {
        ...courseReadPermission,
        effect: 'deny',
        priority: 100 // 高优先级
      };
      
      const userWithDeny = {
        ...studentUser,
        permissions: [denyPermission]
      };
      
      const req = createMockRequest(userWithDeny, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('应该按优先级处理权限冲突', async () => {
      const lowPriorityAllow: Permission = {
        ...courseReadPermission,
        effect: 'allow',
        priority: 10
      };
      
      const highPriorityDeny: Permission = {
        ...courseReadPermission,
        effect: 'deny',
        priority: 20
      };
      
      const userWithConflict = {
        ...studentUser,
        permissions: [lowPriorityAllow, highPriorityDeny]
      };
      
      const req = createMockRequest(userWithConflict, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      // 高优先级的拒绝应该生效
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理权限检查', async () => {
      const req = createMockRequest(teacherUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const startTime = Date.now();
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(100); // 100ms内完成
      expect(next).toHaveBeenCalledWith();
    });

    it('应该有效利用权限缓存', async () => {
      const cachedPermissions = {
        userId: teacherUser.id,
        permissions: [courseReadPermission],
        roles: [teacherRole],
        cachedAt: new Date().toISOString()
      };
      
      mockCacheService.get.mockResolvedValue(cachedPermissions);
      
      const req = createMockRequest(teacherUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      
      // 验证缓存使用
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `rbac:permissions:${teacherUser.id}`
      );
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('应该优化批量权限检查', async () => {
      const users = [adminUser, teacherUser, studentUser];
      const requests = users.map(user => {
        const req = createMockRequest(user, 'course', 'read') as Request;
        const res = createMockResponse() as Response;
        const next = createMockNext();
        const middleware = rbacMiddleware('course', 'read');
        return middleware(req, res, next);
      });
      
      const startTime = Date.now();
      await Promise.all(requests);
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(500); // 500ms内完成批量检查
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabaseClient.from().then.mockRejectedValue(new Error('Database connection failed'));
      
      const req = createMockRequest(teacherUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '权限检查失败',
          code: 'PERMISSION_CHECK_ERROR'
        })
      );
      
      // 验证错误日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Permission check failed'),
        expect.any(Object)
      );
    });

    it('应该处理缓存服务错误', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache service unavailable'));
      
      const req = createMockRequest(teacherUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 数据库查询成功
      mockSupabaseClient.from().then.mockResolvedValue({
        data: [courseReadPermission],
        error: null
      });
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      // 应该降级到数据库查询
      expect(next).toHaveBeenCalledWith();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cache service error'),
        expect.any(Object)
      );
    });

    it('应该处理权限配置错误', async () => {
      const req = createMockRequest(teacherUser, 'invalid-resource', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('invalid-resource', 'read');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '无效的资源或操作',
          code: 'INVALID_RESOURCE_ACTION'
        })
      );
    });

    it('应该处理权限解析错误', async () => {
      const corruptedUser = {
        ...teacherUser,
        roles: null // 损坏的角色数据
      };
      
      const req = createMockRequest(corruptedUser, 'course', 'read') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Permission parsing error'),
        expect.any(Object)
      );
    });
  });

  /**
   * 安全性测试
   */
  describe('Security Tests', () => {
    it('应该防止权限提升攻击', async () => {
      const maliciousUser = {
        ...studentUser,
        roles: [{
          ...adminRole, // 尝试伪造管理员角色
          id: 'fake-admin-role'
        }]
      };
      
      const req = createMockRequest(maliciousUser, 'course', 'delete') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 角色验证失败
      mockSupabaseClient.from().then.mockResolvedValue({
        data: [], // 没有找到有效角色
        error: null
      });
      
      const middleware = rbacMiddleware('course', 'delete');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      
      // 验证安全审计
      expect(mockAuditService.logAccessAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: maliciousUser.id,
          result: 'denied',
          reason: 'invalid_role',
          securityAlert: true
        })
      );
    });

    it('应该防止会话劫持', async () => {
      const req = {
        ...createMockRequest(teacherUser, 'course', 'read'),
        sessionID: 'hijacked-session',
        headers: {
          'user-agent': 'Different Agent',
          'x-forwarded-for': '192.168.1.100' // 不同IP
        }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      // Mock 会话验证失败
      mockCacheService.get.mockResolvedValue({
        userId: teacherUser.id,
        userAgent: 'Original Agent',
        ipAddress: '192.168.1.1'
      });
      
      const middleware = rbacMiddleware('course', 'read');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '会话异常',
          code: 'SESSION_ANOMALY'
        })
      );
    });

    it('应该记录可疑活动', async () => {
      const suspiciousUser = {
        ...studentUser,
        lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24小时前
      };
      
      const req = {
        ...createMockRequest(suspiciousUser, 'course', 'delete'),
        headers: {
          'user-agent': 'Suspicious Bot',
          'x-forwarded-for': '192.168.1.200'
        }
      } as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      
      const middleware = rbacMiddleware('course', 'delete');
      await middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      
      // 验证可疑活动记录
      expect(mockAuditService.logAccessAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: suspiciousUser.id,
          result: 'denied',
          suspicious: true,
          reason: 'insufficient_permissions'
        })
      );
    });
  });
});