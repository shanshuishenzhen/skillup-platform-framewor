/**
 * 审计服务单元测试
 * 
 * 测试审计服务，包括：
 * - 操作日志记录
 * - 安全事件跟踪
 * - 用户行为审计
 * - 数据变更记录
 * - 合规性检查
 * - 审计报告生成
 * - 日志存储和检索
 * - 异常检测和告警
 */

import { 
  AuditService,
  createAuditService,
  getAuditService,
  AuditLog,
  AuditEvent,
  AuditLevel,
  AuditCategory,
  AuditFilter,
  AuditReport,
  SecurityEvent,
  ComplianceCheck,
  DataChangeLog,
  UserActivity
} from '../../services/auditService';
import { logger } from '../../utils/logger';
import { supabaseClient } from '../../utils/supabase';
import { cacheService } from '../../services/cacheService';
import { analyticsService } from '../../services/analyticsService';
import { notificationService } from '../../services/notificationService';
import { envConfig } from '../../config/envConfig';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../utils/supabase');
jest.mock('../../services/cacheService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/notificationService');
jest.mock('../../config/envConfig');

// 类型定义
interface AuditConfig {
  enableAudit: boolean;
  logLevel: AuditLevel;
  retentionDays: number;
  batchSize: number;
  flushInterval: number;
  enableEncryption: boolean;
  enableCompression: boolean;
  enableRealTimeAlerts: boolean;
  complianceStandards: string[];
  sensitiveFields: string[];
  excludePatterns: string[];
}

interface AuditMetrics {
  totalLogs: number;
  logsByLevel: Record<AuditLevel, number>;
  logsByCategory: Record<AuditCategory, number>;
  securityEvents: number;
  complianceViolations: number;
  dataChanges: number;
  userActivities: number;
  averageProcessingTime: number;
  storageUsage: number;
  alertsSent: number;
}

interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  resource?: string;
  level?: AuditLevel;
  category?: AuditCategory;
  ipAddress?: string;
  userAgent?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  standard: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'regex';
    value: any;
  }[];
  actions: string[];
  enabled: boolean;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

const mockQueryBuilder = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
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
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockNotificationService = {
  sendAlert: jest.fn(),
  sendEmail: jest.fn(),
  sendSMS: jest.fn(),
  createNotification: jest.fn()
};

const mockEnvConfig = {
  audit: {
    enableAudit: true,
    logLevel: 'info' as AuditLevel,
    retentionDays: 90,
    batchSize: 100,
    flushInterval: 5000,
    enableEncryption: true,
    enableCompression: true,
    enableRealTimeAlerts: true,
    complianceStandards: ['SOX', 'GDPR', 'HIPAA'],
    sensitiveFields: ['password', 'ssn', 'credit_card'],
    excludePatterns: ['/health', '/metrics']
  },
  security: {
    encryptionKey: 'test_encryption_key',
    hashSalt: 'test_salt'
  }
};

// 设置 Mock
(logger as any) = mockLogger;
(supabaseClient as any) = mockSupabaseClient;
(cacheService as any) = mockCacheService;
(analyticsService as any) = mockAnalyticsService;
(notificationService as any) = mockNotificationService;
(envConfig as any) = mockEnvConfig;

// 测试数据
const testAuditLog: AuditLog = {
  id: 'audit-123',
  timestamp: new Date(),
  level: 'info',
  category: 'user_action',
  action: 'login',
  resource: 'auth',
  userId: 'user-123',
  userEmail: 'test@example.com',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  sessionId: 'session-123',
  requestId: 'req-123',
  details: {
    method: 'POST',
    endpoint: '/api/auth/login',
    statusCode: 200,
    responseTime: 150
  },
  metadata: {
    source: 'web',
    version: '1.0.0'
  },
  changes: {
    before: null,
    after: { lastLoginAt: '2024-01-01T12:00:00Z' }
  },
  tags: ['authentication', 'security'],
  severity: 'low',
  compliance: {
    standards: ['SOX'],
    violations: []
  }
};

const testSecurityEvent: SecurityEvent = {
  id: 'security-123',
  type: 'failed_login',
  severity: 'medium',
  timestamp: new Date(),
  userId: 'user-123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0',
  details: {
    attempts: 3,
    reason: 'invalid_password',
    blocked: false
  },
  riskScore: 65,
  mitigationActions: ['rate_limit', 'captcha'],
  resolved: false,
  resolvedAt: null,
  resolvedBy: null
};

const testDataChangeLog: DataChangeLog = {
  id: 'change-123',
  timestamp: new Date(),
  table: 'users',
  recordId: 'user-123',
  operation: 'update',
  userId: 'admin-123',
  changes: {
    email: {
      before: 'old@example.com',
      after: 'new@example.com'
    },
    updatedAt: {
      before: '2024-01-01T10:00:00Z',
      after: '2024-01-01T12:00:00Z'
    }
  },
  reason: 'User requested email change',
  approved: true,
  approvedBy: 'admin-123',
  approvedAt: new Date()
};

const testComplianceRule: ComplianceRule = {
  id: 'rule-123',
  name: 'PII Access Control',
  description: 'Monitor access to personally identifiable information',
  standard: 'GDPR',
  severity: 'high',
  conditions: [
    {
      field: 'resource',
      operator: 'contains',
      value: 'pii'
    },
    {
      field: 'action',
      operator: 'eq',
      value: 'read'
    }
  ],
  actions: ['log', 'alert', 'notify_dpo'],
  enabled: true
};

describe('Audit Service', () => {
  let auditService: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert.mockResolvedValue({ data: [testAuditLog], error: null });
    mockQueryBuilder.select.mockResolvedValue({ data: [testAuditLog], error: null });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
    mockNotificationService.sendAlert.mockResolvedValue(true);
    
    auditService = createAuditService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 服务初始化测试
   */
  describe('Service Initialization', () => {
    it('应该创建审计服务实例', () => {
      expect(auditService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Audit service initialized successfully'
      );
    });

    it('应该获取现有的服务实例', () => {
      const service1 = getAuditService();
      const service2 = getAuditService();
      
      expect(service1).toBe(service2);
    });

    it('应该加载合规性规则', async () => {
      mockQueryBuilder.select.mockResolvedValue({
        data: [testComplianceRule],
        error: null
      });
      
      await auditService.loadComplianceRules();
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('compliance_rules');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Loaded compliance rules',
        { count: 1 }
      );
    });
  });

  /**
   * 基本审计日志测试
   */
  describe('Basic Audit Logging', () => {
    it('应该记录审计日志', async () => {
      const logData = {
        action: 'create_user',
        resource: 'users',
        userId: 'admin-123',
        details: { newUserId: 'user-456' }
      };
      
      const result = await auditService.log(logData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create_user',
          resource: 'users',
          user_id: 'admin-123',
          details: { newUserId: 'user-456' }
        })
      );
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith('audit.logs.created');
    });

    it('应该记录不同级别的日志', async () => {
      const levels: AuditLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
      
      for (const level of levels) {
        await auditService.log({
          action: 'test_action',
          resource: 'test',
          level
        });
      }
      
      expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(5);
    });

    it('应该记录不同类别的日志', async () => {
      const categories: AuditCategory[] = [
        'user_action',
        'system_event',
        'security_event',
        'data_change',
        'api_access',
        'admin_action'
      ];
      
      for (const category of categories) {
        await auditService.log({
          action: 'test_action',
          resource: 'test',
          category
        });
      }
      
      expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(6);
    });

    it('应该自动添加上下文信息', async () => {
      const mockRequest = {
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-request-id': 'req-123'
        },
        user: {
          id: 'user-123',
          email: 'test@example.com'
        }
      };
      
      await auditService.logWithContext({
        action: 'view_profile',
        resource: 'users'
      }, mockRequest);
      
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
          request_id: 'req-123',
          user_id: 'user-123',
          user_email: 'test@example.com'
        })
      );
    });
  });

  /**
   * 安全事件跟踪测试
   */
  describe('Security Event Tracking', () => {
    it('应该记录安全事件', async () => {
      const securityEvent = {
        type: 'suspicious_login',
        severity: 'high' as const,
        userId: 'user-123',
        ipAddress: '192.168.1.100',
        details: {
          reason: 'unusual_location',
          location: 'Unknown'
        }
      };
      
      const result = await auditService.logSecurityEvent(securityEvent);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('security_events');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'suspicious_login',
          severity: 'high',
          user_id: 'user-123',
          ip_address: '192.168.1.100'
        })
      );
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith('security.events.created');
    });

    it('应该计算风险评分', async () => {
      const event = {
        type: 'failed_login',
        userId: 'user-123',
        ipAddress: '192.168.1.100',
        details: { attempts: 5 }
      };
      
      await auditService.logSecurityEvent(event);
      
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_score: expect.any(Number)
        })
      );
    });

    it('应该触发高风险事件告警', async () => {
      const highRiskEvent = {
        type: 'privilege_escalation',
        severity: 'critical' as const,
        userId: 'user-123',
        details: {
          fromRole: 'user',
          toRole: 'admin'
        }
      };
      
      await auditService.logSecurityEvent(highRiskEvent);
      
      expect(mockNotificationService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'security_alert',
          severity: 'critical',
          message: expect.stringContaining('privilege_escalation')
        })
      );
    });

    it('应该检测异常模式', async () => {
      // 模拟多次失败登录
      for (let i = 0; i < 10; i++) {
        await auditService.logSecurityEvent({
          type: 'failed_login',
          userId: 'user-123',
          ipAddress: '192.168.1.100'
        });
      }
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'security.pattern.detected',
        expect.objectContaining({
          pattern: 'repeated_failures',
          userId: 'user-123'
        })
      );
    });
  });

  /**
   * 数据变更记录测试
   */
  describe('Data Change Logging', () => {
    it('应该记录数据变更', async () => {
      const changeData = {
        table: 'users',
        recordId: 'user-123',
        operation: 'update' as const,
        changes: {
          email: {
            before: 'old@example.com',
            after: 'new@example.com'
          }
        },
        userId: 'admin-123'
      };
      
      const result = await auditService.logDataChange(changeData);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('data_change_logs');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          table_name: 'users',
          record_id: 'user-123',
          operation: 'update',
          changes: expect.any(Object),
          user_id: 'admin-123'
        })
      );
    });

    it('应该过滤敏感字段', async () => {
      const changeData = {
        table: 'users',
        recordId: 'user-123',
        operation: 'update' as const,
        changes: {
          email: {
            before: 'old@example.com',
            after: 'new@example.com'
          },
          password: {
            before: 'old_password',
            after: 'new_password'
          }
        },
        userId: 'admin-123'
      };
      
      await auditService.logDataChange(changeData);
      
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.changes.password.before).toBe('[REDACTED]');
      expect(insertCall.changes.password.after).toBe('[REDACTED]');
      expect(insertCall.changes.email.before).toBe('old@example.com');
    });

    it('应该检测批量变更', async () => {
      const batchChanges = Array.from({ length: 100 }, (_, i) => ({
        table: 'users',
        recordId: `user-${i}`,
        operation: 'update' as const,
        changes: { status: { before: 'active', after: 'inactive' } },
        userId: 'admin-123'
      }));
      
      await auditService.logBatchDataChanges(batchChanges);
      
      expect(mockAnalyticsService.track).toHaveBeenCalledWith(
        'data.batch_change',
        expect.objectContaining({
          count: 100,
          table: 'users',
          operation: 'update'
        })
      );
    });
  });

  /**
   * 用户活动跟踪测试
   */
  describe('User Activity Tracking', () => {
    it('应该记录用户活动', async () => {
      const activity = {
        userId: 'user-123',
        action: 'course_enrollment',
        resource: 'courses',
        resourceId: 'course-456',
        details: {
          courseTitle: 'JavaScript Basics',
          enrollmentType: 'paid'
        }
      };
      
      const result = await auditService.logUserActivity(activity);
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_activities');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          action: 'course_enrollment',
          resource: 'courses',
          resource_id: 'course-456'
        })
      );
    });

    it('应该跟踪用户会话', async () => {
      const sessionData = {
        userId: 'user-123',
        sessionId: 'session-456',
        startTime: new Date(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      };
      
      await auditService.startUserSession(sessionData);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          session_id: 'session-456',
          start_time: sessionData.startTime
        })
      );
    });

    it('应该结束用户会话', async () => {
      const sessionId = 'session-456';
      const endTime = new Date();
      
      mockQueryBuilder.update.mockResolvedValue({ data: [{}], error: null });
      
      await auditService.endUserSession(sessionId, endTime);
      
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        end_time: endTime,
        duration: expect.any(Number)
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('session_id', sessionId);
    });
  });

  /**
   * 合规性检查测试
   */
  describe('Compliance Checking', () => {
    it('应该检查合规性规则', async () => {
      const logData = {
        action: 'read',
        resource: 'pii_data',
        userId: 'user-123'
      };
      
      const violations = await auditService.checkCompliance(logData);
      
      expect(violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleId: expect.any(String),
            severity: expect.any(String),
            message: expect.any(String)
          })
        ])
      );
    });

    it('应该生成合规性报告', async () => {
      const reportParams = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        standards: ['GDPR', 'SOX']
      };
      
      mockQueryBuilder.select.mockResolvedValue({
        data: [
          { standard: 'GDPR', violations: 5, total_checks: 100 },
          { standard: 'SOX', violations: 2, total_checks: 50 }
        ],
        error: null
      });
      
      const report = await auditService.generateComplianceReport(reportParams);
      
      expect(report).toEqual(
        expect.objectContaining({
          period: expect.any(Object),
          standards: expect.any(Array),
          summary: expect.any(Object),
          violations: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );
    });

    it('应该处理合规性违规', async () => {
      const violation = {
        ruleId: 'rule-123',
        severity: 'high' as const,
        logId: 'audit-123',
        message: 'Unauthorized access to PII data',
        details: {
          userId: 'user-123',
          resource: 'pii_data'
        }
      };
      
      await auditService.handleComplianceViolation(violation);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('compliance_violations');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          rule_id: 'rule-123',
          severity: 'high',
          log_id: 'audit-123'
        })
      );
      expect(mockNotificationService.sendAlert).toHaveBeenCalled();
    });
  });

  /**
   * 日志查询和检索测试
   */
  describe('Log Query and Retrieval', () => {
    it('应该查询审计日志', async () => {
      const query: AuditQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        userId: 'user-123',
        action: 'login',
        level: 'info',
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };
      
      const result = await auditService.queryLogs(query);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('timestamp', query.startDate);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('timestamp', query.endDate);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('action', 'login');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('timestamp', { ascending: false });
    });

    it('应该搜索日志内容', async () => {
      const searchTerm = 'failed login';
      const filters = {
        category: 'security_event' as AuditCategory,
        severity: 'high'
      };
      
      await auditService.searchLogs(searchTerm, filters);
      
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith(
        'details',
        `%${searchTerm}%`
      );
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category', 'security_event');
    });

    it('应该导出审计日志', async () => {
      const exportParams = {
        format: 'csv' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        filters: {
          level: 'error' as AuditLevel
        }
      };
      
      const result = await auditService.exportLogs(exportParams);
      
      expect(result).toEqual(
        expect.objectContaining({
          format: 'csv',
          filename: expect.stringContaining('.csv'),
          data: expect.any(String),
          size: expect.any(Number)
        })
      );
    });
  });

  /**
   * 性能监控测试
   */
  describe('Performance Monitoring', () => {
    it('应该收集审计统计信息', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          total_logs: 10000,
          logs_by_level: {
            info: 7000,
            warn: 2000,
            error: 1000
          },
          security_events: 50,
          compliance_violations: 5
        },
        error: null
      });
      
      const stats = await auditService.getStatistics();
      
      expect(stats).toEqual(
        expect.objectContaining({
          totalLogs: 10000,
          logsByLevel: expect.any(Object),
          securityEvents: 50,
          complianceViolations: 5
        })
      );
    });

    it('应该监控处理性能', async () => {
      const startTime = Date.now();
      
      await auditService.log({
        action: 'test_action',
        resource: 'test'
      });
      
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'audit.processing_time',
        expect.any(Number)
      );
    });

    it('应该监控存储使用', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { storage_size: 1073741824 }, // 1GB
        error: null
      });
      
      const storageInfo = await auditService.getStorageInfo();
      
      expect(storageInfo).toEqual(
        expect.objectContaining({
          totalSize: 1073741824,
          sizeByTable: expect.any(Object),
          retentionStatus: expect.any(Object)
        })
      );
    });
  });

  /**
   * 批量处理测试
   */
  describe('Batch Processing', () => {
    it('应该批量处理日志', async () => {
      const logs = Array.from({ length: 100 }, (_, i) => ({
        action: `action_${i}`,
        resource: 'test',
        userId: `user-${i}`
      }));
      
      const result = await auditService.batchLog(logs);
      
      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: 'action_0' }),
          expect.objectContaining({ action: 'action_99' })
        ])
      );
    });

    it('应该处理批量处理错误', async () => {
      const logs = Array.from({ length: 10 }, (_, i) => ({
        action: `action_${i}`,
        resource: 'test'
      }));
      
      mockQueryBuilder.insert.mockRejectedValue(new Error('Database error'));
      
      const result = await auditService.batchLog(logs);
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Batch audit log failed',
        expect.any(Object)
      );
    });

    it('应该实现批量重试机制', async () => {
      const logs = [{ action: 'test', resource: 'test' }];
      
      mockQueryBuilder.insert
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ data: [{}], error: null });
      
      const result = await auditService.batchLogWithRetry(logs, {
        maxRetries: 3,
        retryDelay: 100
      });
      
      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理数据库连接错误', async () => {
      mockQueryBuilder.insert.mockRejectedValue(new Error('Connection failed'));
      
      const result = await auditService.log({
        action: 'test_action',
        resource: 'test'
      });
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit event',
        expect.objectContaining({
          error: 'Connection failed'
        })
      );
    });

    it('应该处理无效数据', async () => {
      const invalidLog = {
        action: '', // 空字符串
        resource: null, // null值
        userId: undefined // undefined值
      };
      
      const result = await auditService.log(invalidLog as any);
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid audit log data',
        expect.any(Object)
      );
    });

    it('应该实现降级处理', async () => {
      // 模拟数据库不可用
      mockQueryBuilder.insert.mockRejectedValue(new Error('Database unavailable'));
      
      const result = await auditService.logWithFallback({
        action: 'critical_action',
        resource: 'important'
      });
      
      // 应该回退到文件日志
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Audit log fallback to file',
        expect.any(Object)
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理大量日志', async () => {
      const logs = Array.from({ length: 1000 }, (_, i) => ({
        action: `action_${i}`,
        resource: 'test',
        userId: `user-${i % 100}`
      }));
      
      const startTime = Date.now();
      await auditService.batchLog(logs);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 1秒内完成1000条日志
    });

    it('应该有效管理内存使用', async () => {
      // 模拟大量并发日志记录
      const promises = Array.from({ length: 100 }, () => 
        auditService.log({
          action: 'concurrent_action',
          resource: 'test',
          details: { data: 'x'.repeat(1024) } // 1KB per log
        })
      );
      
      await Promise.all(promises);
      
      // 验证内存使用在合理范围内
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // 小于100MB
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理超长日志内容', async () => {
      const longContent = 'x'.repeat(10000); // 10KB内容
      
      const result = await auditService.log({
        action: 'long_action',
        resource: 'test',
        details: { content: longContent }
      });
      
      expect(result).toBe(true);
      // 验证内容被截断或压缩
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(JSON.stringify(insertCall.details).length).toBeLessThan(5000);
    });

    it('应该处理循环引用对象', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      const result = await auditService.log({
        action: 'circular_action',
        resource: 'test',
        details: circularObj
      });
      
      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Circular reference detected in audit log',
        expect.any(Object)
      );
    });

    it('应该处理特殊字符', async () => {
      const specialChars = '🚀 测试 !@#$%^&*()_+ 特殊字符';
      
      const result = await auditService.log({
        action: 'special_chars',
        resource: 'test',
        details: { message: specialChars }
      });
      
      expect(result).toBe(true);
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.details.message).toBe(specialChars);
    });
  });
});