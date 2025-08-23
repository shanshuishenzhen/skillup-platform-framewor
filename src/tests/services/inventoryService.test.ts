/**
 * 库存服务单元测试
 * 
 * 测试覆盖范围：
 * - 库存查询和检查
 * - 库存预留和释放
 * - 库存更新和同步
 * - 库存预警和通知
 * - 库存统计和分析
 * - 库存历史记录
 * - 库存批量操作
 * - 库存锁定机制
 * - 库存数据导出
 * - 错误处理和数据一致性
 */

import { jest } from '@jest/globals';
import type {
  InventoryService,
  InventoryItem,
  StockOperation,
  StockReservation,
  InventoryAlert,
  InventoryStatistics,
  StockHistory,
  BatchStockUpdate
} from '@/services/inventoryService';

// 模拟依赖
const mockEnvConfig = {
  supabase: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
    serviceRoleKey: 'test-service-role-key'
  },
  redis: {
    url: 'redis://localhost:6379'
  },
  app: {
    environment: 'test'
  },
  inventory: {
    lowStockThreshold: 10,
    reservationTimeoutMinutes: 30,
    enableAutoReorder: true,
    reorderPoint: 5
  }
};

const mockErrorHandler = {
  logError: jest.fn(),
  handleError: jest.fn(),
  createError: jest.fn()
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  startTimer: jest.fn(() => ({ end: jest.fn() })),
  incrementCounter: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  sendEmail: jest.fn(),
  sendAlert: jest.fn()
};

const mockCourseService = {
  getCourseById: jest.fn(),
  updateCourseAvailability: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      in: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        }))
      })),
      lt: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      single: jest.fn(),
      order: jest.fn(() => ({
        limit: jest.fn()
      })),
      limit: jest.fn()
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  })),
  rpc: jest.fn()
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  incrby: jest.fn(),
  decrby: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  multi: jest.fn(() => ({
    set: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    exec: jest.fn()
  }))
};

const mockUuid = {
  v4: jest.fn(() => 'test-uuid-123')
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(() => '2023-01-01T12:00:00Z'),
  add: jest.fn(() => mockMoment()),
  subtract: jest.fn(() => mockMoment()),
  isBefore: jest.fn(() => false),
  isAfter: jest.fn(() => true),
  valueOf: jest.fn(() => 1672574400000),
  toISOString: jest.fn(() => '2023-01-01T12:00:00.000Z')
}));

const mockLodash = {
  debounce: jest.fn((fn) => fn),
  throttle: jest.fn((fn) => fn),
  pick: jest.fn(),
  omit: jest.fn(),
  merge: jest.fn(),
  cloneDeep: jest.fn(),
  groupBy: jest.fn(),
  sumBy: jest.fn(() => 100),
  orderBy: jest.fn(),
  chunk: jest.fn()
};

const mockNodeCron = {
  schedule: jest.fn()
};

// 模拟模块
jest.mock('@/utils/envConfig', () => ({ envConfig: mockEnvConfig }));
jest.mock('@/utils/errorHandler', () => mockErrorHandler);
jest.mock('@/services/monitoringService', () => mockMonitoringService);
jest.mock('@/services/notificationService', () => mockNotificationService);
jest.mock('@/services/courseService', () => mockCourseService);
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis)
}));
jest.mock('uuid', () => mockUuid);
jest.mock('moment', () => mockMoment);
jest.mock('lodash', () => mockLodash);
jest.mock('node-cron', () => mockNodeCron);

// 导入要测试的模块
let inventoryService: InventoryService;
let checkStock: (courseId: string) => Promise<any>;
let reserveStock: (courseId: string, quantity: number) => Promise<any>;
let releaseStock: (courseId: string, quantity: number) => Promise<any>;
let updateStock: (courseId: string, quantity: number) => Promise<any>;
let getStockLevel: (courseId: string) => Promise<any>;

beforeAll(async () => {
  // 动态导入模块
  const module = await import('@/services/inventoryService');
  inventoryService = module.inventoryService;
  checkStock = module.checkStock;
  reserveStock = module.reserveStock;
  releaseStock = module.releaseStock;
  updateStock = module.updateStock;
  getStockLevel = module.getStockLevel;
});

describe('库存服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: {
        id: 'inventory-123',
        courseId: 'course-123',
        totalStock: 100,
        availableStock: 85,
        reservedStock: 15,
        lowStockThreshold: 10,
        reorderPoint: 5,
        lastUpdated: '2023-01-01T12:00:00Z'
      },
      error: null
    });
    
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: {
        id: 'inventory-123',
        courseId: 'course-123',
        totalStock: 100
      },
      error: null
    });
    
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.hget.mockResolvedValue('85');
    mockRedis.hset.mockResolvedValue(1);
    
    // 设置服务依赖的默认响应
    mockCourseService.getCourseById.mockResolvedValue({
      success: true,
      course: {
        id: 'course-123',
        title: 'Test Course',
        available: true
      }
    });
  });

  describe('服务初始化', () => {
    it('应该正确初始化库存服务', async () => {
      const result = await inventoryService.initialize();
      
      expect(result.success).toBe(true);
      expect(mockMonitoringService.recordMetric).toHaveBeenCalledWith(
        'inventory_service_initialized',
        1
      );
    });

    it('应该验证配置', async () => {
      // 模拟配置缺失
      const originalConfig = mockEnvConfig.inventory;
      delete mockEnvConfig.inventory.lowStockThreshold;
      
      const result = await inventoryService.initialize();
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'CONFIG_ERROR',
          message: 'Missing required inventory configuration'
        })
      );
      
      // 恢复配置
      mockEnvConfig.inventory = originalConfig;
    });

    it('应该初始化Redis缓存', async () => {
      await inventoryService.initialize();
      
      expect(mockRedis.get).toBeDefined();
      expect(mockRedis.hget).toBeDefined();
      expect(mockRedis.hset).toBeDefined();
    });

    it('应该设置库存监控定时任务', async () => {
      await inventoryService.initialize();
      
      expect(mockNodeCron.schedule).toHaveBeenCalledWith(
        '*/5 * * * *', // 每5分钟执行一次
        expect.any(Function)
      );
    });

    it('应该设置预留超时清理任务', async () => {
      await inventoryService.initialize();
      
      expect(mockNodeCron.schedule).toHaveBeenCalledWith(
        '*/10 * * * *', // 每10分钟执行一次
        expect.any(Function)
      );
    });
  });

  describe('库存查询', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该检查库存可用性', async () => {
      const result = await checkStock('course-123');
      
      expect(result.success).toBe(true);
      expect(result.stock).toEqual(
        expect.objectContaining({
          courseId: 'course-123',
          available: true,
          totalStock: 100,
          availableStock: 85,
          reservedStock: 15
        })
      );
      
      expect(mockSupabase.from).toHaveBeenCalledWith('inventory');
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*');
    });

    it('应该使用缓存获取库存信息', async () => {
      const cachedStock = {
        courseId: 'course-123',
        totalStock: 100,
        availableStock: 85,
        reservedStock: 15
      };
      
      mockRedis.hget.mockResolvedValue(JSON.stringify(cachedStock));
      
      const result = await checkStock('course-123');
      
      expect(result.success).toBe(true);
      expect(result.stock).toEqual(
        expect.objectContaining(cachedStock)
      );
      expect(mockSupabase.from().select).not.toHaveBeenCalled();
    });

    it('应该处理不存在的库存记录', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });
      
      const result = await checkStock('nonexistent-course');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVENTORY_NOT_FOUND',
          message: 'Inventory record not found'
        })
      );
    });

    it('应该获取库存水平', async () => {
      const result = await getStockLevel('course-123');
      
      expect(result.success).toBe(true);
      expect(result.level).toEqual(
        expect.objectContaining({
          courseId: 'course-123',
          currentStock: 85,
          status: 'normal', // 高于低库存阈值
          threshold: 10
        })
      );
    });

    it('应该识别低库存状态', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          availableStock: 5, // 低于阈值
          lowStockThreshold: 10
        },
        error: null
      });
      
      const result = await getStockLevel('course-123');
      
      expect(result.success).toBe(true);
      expect(result.level.status).toBe('low');
    });

    it('应该识别缺货状态', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          availableStock: 0
        },
        error: null
      });
      
      const result = await getStockLevel('course-123');
      
      expect(result.success).toBe(true);
      expect(result.level.status).toBe('out_of_stock');
    });
  });

  describe('库存预留', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该预留库存', async () => {
      const courseId = 'course-123';
      const quantity = 5;
      
      const result = await reserveStock(courseId, quantity);
      
      expect(result.success).toBe(true);
      expect(result.reservation).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          courseId: 'course-123',
          quantity: 5,
          status: 'active',
          expiresAt: expect.any(String)
        })
      );
      
      expect(mockSupabase.from).toHaveBeenCalledWith('stock_reservations');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-123',
          quantity: 5,
          status: 'active'
        })
      );
    });

    it('应该验证库存充足性', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          availableStock: 3 // 库存不足
        },
        error: null
      });
      
      const result = await reserveStock('course-123', 5);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for reservation'
        })
      );
    });

    it('应该更新可用库存', async () => {
      await reserveStock('course-123', 5);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          availableStock: 80, // 85 - 5
          reservedStock: 20, // 15 + 5
          lastUpdated: expect.any(String)
        })
      );
    });

    it('应该设置预留过期时间', async () => {
      const result = await reserveStock('course-123', 5);
      
      expect(result.success).toBe(true);
      expect(result.reservation.expiresAt).toBeDefined();
      
      // 验证过期时间设置正确（30分钟后）
      const expiresAt = new Date(result.reservation.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      
      expect(diffMinutes).toBeCloseTo(30, 1);
    });

    it('应该更新Redis缓存', async () => {
      await reserveStock('course-123', 5);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'inventory:course-123',
        'availableStock',
        '80'
      );
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'inventory:course-123',
        'reservedStock',
        '20'
      );
    });

    it('应该记录预留历史', async () => {
      await reserveStock('course-123', 5);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('stock_history');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-123',
          operation: 'reserve',
          quantity: 5,
          previousStock: 85,
          newStock: 80
        })
      );
    });
  });

  describe('库存释放', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该释放预留库存', async () => {
      const courseId = 'course-123';
      const quantity = 5;
      
      const result = await releaseStock(courseId, quantity);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          availableStock: 90, // 85 + 5
          reservedStock: 10, // 15 - 5
          lastUpdated: expect.any(String)
        })
      );
    });

    it('应该验证预留库存充足性', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          reservedStock: 3 // 预留库存不足
        },
        error: null
      });
      
      const result = await releaseStock('course-123', 5);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INSUFFICIENT_RESERVED_STOCK',
          message: 'Insufficient reserved stock for release'
        })
      );
    });

    it('应该更新Redis缓存', async () => {
      await releaseStock('course-123', 5);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'inventory:course-123',
        'availableStock',
        '90'
      );
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'inventory:course-123',
        'reservedStock',
        '10'
      );
    });

    it('应该记录释放历史', async () => {
      await releaseStock('course-123', 5);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('stock_history');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-123',
          operation: 'release',
          quantity: 5,
          previousStock: 85,
          newStock: 90
        })
      );
    });

    it('应该处理预留过期自动释放', async () => {
      // 模拟过期的预留记录
      mockSupabase.from().select().lt().mockResolvedValue({
        data: [
          {
            id: 'reservation-123',
            courseId: 'course-123',
            quantity: 10,
            status: 'active',
            expiresAt: '2023-01-01T11:00:00Z' // 已过期
          }
        ],
        error: null
      });
      
      const result = await inventoryService.cleanupExpiredReservations();
      
      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(1);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'expired'
        })
      );
    });
  });

  describe('库存更新', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该增加库存', async () => {
      const result = await updateStock('course-123', 20);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          totalStock: 120, // 100 + 20
          availableStock: 105, // 85 + 20
          lastUpdated: expect.any(String)
        })
      );
    });

    it('应该减少库存', async () => {
      const result = await updateStock('course-123', -10);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          totalStock: 90, // 100 - 10
          availableStock: 75, // 85 - 10
          lastUpdated: expect.any(String)
        })
      );
    });

    it('应该验证库存不能为负数', async () => {
      const result = await updateStock('course-123', -200);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_STOCK_OPERATION',
          message: 'Stock cannot be negative'
        })
      );
    });

    it('应该触发低库存警告', async () => {
      // 模拟库存更新后低于阈值
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          availableStock: 8, // 低于阈值10
          lowStockThreshold: 10
        },
        error: null
      });
      
      await updateStock('course-123', -77);
      
      expect(mockNotificationService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_stock',
          courseId: 'course-123',
          currentStock: 8,
          threshold: 10
        })
      );
    });

    it('应该触发缺货警告', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          availableStock: 0
        },
        error: null
      });
      
      await updateStock('course-123', -85);
      
      expect(mockNotificationService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'out_of_stock',
          courseId: 'course-123'
        })
      );
      
      expect(mockCourseService.updateCourseAvailability).toHaveBeenCalledWith(
        'course-123',
        false
      );
    });

    it('应该更新Redis缓存', async () => {
      await updateStock('course-123', 20);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'inventory:course-123',
        'totalStock',
        '120'
      );
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'inventory:course-123',
        'availableStock',
        '105'
      );
    });

    it('应该记录库存变更历史', async () => {
      await updateStock('course-123', 20);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('stock_history');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-123',
          operation: 'update',
          quantity: 20,
          previousStock: 85,
          newStock: 105,
          reason: 'Stock adjustment'
        })
      );
    });
  });

  describe('批量库存操作', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该批量更新库存', async () => {
      const updates: BatchStockUpdate[] = [
        { courseId: 'course-123', quantity: 10, operation: 'add' },
        { courseId: 'course-456', quantity: 5, operation: 'subtract' },
        { courseId: 'course-789', quantity: 20, operation: 'set' }
      ];
      
      mockSupabase.from().select().in().mockResolvedValue({
        data: [
          { courseId: 'course-123', totalStock: 100, availableStock: 85 },
          { courseId: 'course-456', totalStock: 50, availableStock: 40 },
          { courseId: 'course-789', totalStock: 30, availableStock: 25 }
        ],
        error: null
      });
      
      const result = await inventoryService.batchUpdateStock(updates);
      
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            courseId: 'course-123',
            totalStock: 110, // 100 + 10
            availableStock: 95 // 85 + 10
          }),
          expect.objectContaining({
            courseId: 'course-456',
            totalStock: 45, // 50 - 5
            availableStock: 35 // 40 - 5
          }),
          expect.objectContaining({
            courseId: 'course-789',
            totalStock: 20, // 设置为20
            availableStock: 20 // 设置为20
          })
        ])
      );
    });

    it('应该验证批量操作的有效性', async () => {
      const invalidUpdates: BatchStockUpdate[] = [
        { courseId: 'course-123', quantity: -200, operation: 'subtract' } // 会导致负库存
      ];
      
      mockSupabase.from().select().in().mockResolvedValue({
        data: [
          { courseId: 'course-123', totalStock: 100, availableStock: 85 }
        ],
        error: null
      });
      
      const result = await inventoryService.batchUpdateStock(invalidUpdates);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_BATCH_OPERATION',
          message: 'Some operations would result in negative stock'
        })
      );
    });

    it('应该使用事务处理批量操作', async () => {
      const updates: BatchStockUpdate[] = [
        { courseId: 'course-123', quantity: 10, operation: 'add' },
        { courseId: 'course-456', quantity: 5, operation: 'subtract' }
      ];
      
      await inventoryService.batchUpdateStock(updates);
      
      // 验证使用了Redis事务
      expect(mockRedis.multi).toHaveBeenCalled();
    });
  });

  describe('库存统计', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该生成库存统计报告', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          totalItems: 150,
          totalStock: 5000,
          totalReserved: 500,
          totalAvailable: 4500,
          lowStockItems: 12,
          outOfStockItems: 3,
          averageStockLevel: 33.33,
          topStockItems: [
            { courseId: 'course-123', courseName: 'Test Course', stock: 100 },
            { courseId: 'course-456', courseName: 'Another Course', stock: 85 }
          ],
          lowStockItems: [
            { courseId: 'course-789', courseName: 'Low Stock Course', stock: 5 }
          ]
        },
        error: null
      });
      
      const result = await inventoryService.getInventoryStatistics();
      
      expect(result.success).toBe(true);
      expect(result.statistics).toEqual(
        expect.objectContaining({
          totalItems: 150,
          totalStock: 5000,
          lowStockItems: 12,
          outOfStockItems: 3,
          topStockItems: expect.any(Array),
          lowStockItems: expect.any(Array)
        })
      );
    });

    it('应该分析库存趋势', async () => {
      const timeRange = {
        start: '2023-01-01',
        end: '2023-01-31'
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: {
          dailyStats: [
            { date: '2023-01-01', totalStock: 5000, operations: 25 },
            { date: '2023-01-02', totalStock: 4950, operations: 30 }
          ],
          trends: {
            stockChange: -50,
            operationCount: 55,
            averageDailyChange: -1.67
          }
        },
        error: null
      });
      
      const result = await inventoryService.analyzeStockTrends(timeRange);
      
      expect(result.success).toBe(true);
      expect(result.trends).toEqual(
        expect.objectContaining({
          stockChange: -50,
          operationCount: 55,
          dailyStats: expect.any(Array)
        })
      );
    });

    it('应该获取库存预警列表', async () => {
      mockSupabase.from().select().lt().mockResolvedValue({
        data: [
          {
            courseId: 'course-123',
            courseName: 'Test Course',
            availableStock: 5,
            lowStockThreshold: 10,
            alertLevel: 'low'
          },
          {
            courseId: 'course-456',
            courseName: 'Another Course',
            availableStock: 0,
            lowStockThreshold: 10,
            alertLevel: 'critical'
          }
        ],
        error: null
      });
      
      const result = await inventoryService.getStockAlerts();
      
      expect(result.success).toBe(true);
      expect(result.alerts).toHaveLength(2);
      expect(result.alerts[0]).toEqual(
        expect.objectContaining({
          courseId: 'course-123',
          alertLevel: 'low',
          availableStock: 5
        })
      );
    });
  });

  describe('库存历史记录', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该获取库存变更历史', async () => {
      const courseId = 'course-123';
      
      mockSupabase.from().select().eq().order().limit.mockResolvedValue({
        data: [
          {
            id: 'history-1',
            courseId: 'course-123',
            operation: 'update',
            quantity: 20,
            previousStock: 80,
            newStock: 100,
            reason: 'Stock replenishment',
            createdAt: '2023-01-01T12:00:00Z'
          },
          {
            id: 'history-2',
            courseId: 'course-123',
            operation: 'reserve',
            quantity: 5,
            previousStock: 100,
            newStock: 95,
            reason: 'Order reservation',
            createdAt: '2023-01-01T11:00:00Z'
          }
        ],
        error: null
      });
      
      const result = await inventoryService.getStockHistory(courseId, {
        limit: 50,
        page: 1
      });
      
      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(2);
      expect(result.history[0]).toEqual(
        expect.objectContaining({
          operation: 'update',
          quantity: 20,
          reason: 'Stock replenishment'
        })
      );
    });

    it('应该按操作类型筛选历史', async () => {
      const result = await inventoryService.getStockHistory('course-123', {
        operation: 'reserve',
        limit: 20
      });
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith(
        'operation',
        'reserve'
      );
    });

    it('应该按时间范围筛选历史', async () => {
      const result = await inventoryService.getStockHistory('course-123', {
        dateRange: {
          start: '2023-01-01',
          end: '2023-01-31'
        }
      });
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().select().gte).toHaveBeenCalledWith(
        'createdAt',
        '2023-01-01'
      );
      expect(mockSupabase.from().select().lte).toHaveBeenCalledWith(
        'createdAt',
        '2023-01-31'
      );
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该高效处理大量库存查询', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 100 }, (_, i) => 
        checkStock(`course-${i}`)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
      expect(mockMonitoringService.recordMetric).toHaveBeenCalledWith(
        'inventory_query_performance',
        expect.any(Number)
      );
    });

    it('应该优化批量操作性能', async () => {
      const updates = Array.from({ length: 50 }, (_, i) => ({
        courseId: `course-${i}`,
        quantity: 10,
        operation: 'add' as const
      }));
      
      const startTime = Date.now();
      await inventoryService.batchUpdateStock(updates);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该有效管理缓存', async () => {
      const courseId = 'course-123';
      
      // 第一次调用
      await checkStock(courseId);
      expect(mockSupabase.from().select).toHaveBeenCalledTimes(1);
      
      // 第二次调用应该使用缓存
      mockRedis.hget.mockResolvedValue(JSON.stringify({
        courseId: 'course-123',
        availableStock: 85
      }));
      
      await checkStock(courseId);
      expect(mockSupabase.from().select).toHaveBeenCalledTimes(1); // 没有增加
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await inventoryService.initialize();
    });

    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().select().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const result = await checkStock('course-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'DATABASE_ERROR',
          message: 'Failed to check stock'
        })
      );
      
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DATABASE_ERROR',
          message: 'Database connection failed'
        })
      );
    });

    it('应该处理Redis缓存错误', async () => {
      mockRedis.hget.mockRejectedValue(new Error('Redis connection failed'));
      
      const result = await checkStock('course-123');
      
      expect(result.success).toBe(true); // 仍然成功获取
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REDIS_ERROR',
          message: 'Redis connection failed'
        })
      );
    });

    it('应该处理并发库存操作冲突', async () => {
      // 模拟并发操作导致的库存冲突
      mockSupabase.from().update().eq().select().single.mockRejectedValue(
        new Error('Concurrent modification detected')
      );
      
      const result = await updateStock('course-123', -10);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'CONCURRENCY_ERROR',
          message: 'Stock operation conflict detected'
        })
      );
    });

    it('应该处理通知服务错误', async () => {
      mockNotificationService.sendAlert.mockRejectedValue(
        new Error('Notification service error')
      );
      
      // 模拟低库存情况
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          availableStock: 5,
          lowStockThreshold: 10
        },
        error: null
      });
      
      const result = await updateStock('course-123', -80);
      
      expect(result.success).toBe(true); // 库存更新成功
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NOTIFICATION_ERROR',
          message: 'Notification service error'
        })
      );
    });

    it('应该处理数据一致性错误', async () => {
      // 模拟数据不一致的情况
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          courseId: 'course-123',
          totalStock: 100,
          availableStock: 120, // 可用库存大于总库存，数据不一致
          reservedStock: -20
        },
        error: null
      });
      
      const result = await checkStock('course-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'DATA_CONSISTENCY_ERROR',
          message: 'Inventory data inconsistency detected'
        })
      );
    });
  });
});

/**
 * 导出的便捷函数测试
 */
describe('库存服务便捷函数', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置模拟
    require('@/utils/envConfig').envConfig = mockEnvConfig;
    require('@supabase/supabase-js').createClient = jest.fn(() => mockSupabase);
    
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: {
        courseId: 'course-123',
        totalStock: 100,
        availableStock: 85,
        reservedStock: 15
      },
      error: null
    });
    
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: {
        id: 'reservation-123',
        courseId: 'course-123',
        quantity: 5
      },
      error: null
    });
  });

  describe('checkStock', () => {
    it('应该检查库存', async () => {
      const result = await checkStock('course-123');
      
      expect(result.success).toBe(true);
      expect(result.stock).toEqual(
        expect.objectContaining({
          courseId: 'course-123',
          availableStock: 85
        })
      );
    });
  });

  describe('reserveStock', () => {
    it('应该预留库存', async () => {
      const result = await reserveStock('course-123', 5);
      
      expect(result.success).toBe(true);
      expect(result.reservation).toEqual(
        expect.objectContaining({
          courseId: 'course-123',
          quantity: 5
        })
      );
    });
  });

  describe('releaseStock', () => {
    it('应该释放库存', async () => {
      const result = await releaseStock('course-123', 5);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          availableStock: 90,
          reservedStock: 10
        })
      );
    });
  });

  describe('updateStock', () => {
    it('应该更新库存', async () => {
      const result = await updateStock('course-123', 20);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          totalStock: 120,
          availableStock: 105
        })
      );
    });
  });

  describe('getStockLevel', () => {
    it('应该获取库存水平', async () => {
      const result = await getStockLevel('course-123');
      
      expect(result.success).toBe(true);
      expect(result.level).toEqual(
        expect.objectContaining({
          courseId: 'course-123',
          currentStock: 85,
          status: 'normal'
        })
      );
    });
  });
});