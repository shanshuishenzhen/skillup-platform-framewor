/**
 * 缓存服务单元测试
 * 
 * 测试缓存服务，包括：
 * - Redis连接和配置
 * - 基本缓存操作（GET/SET/DEL）
 * - 缓存过期和TTL管理
 * - 缓存模式和策略
 * - 分布式缓存
 * - 缓存预热和失效
 * - 性能监控和统计
 * - 错误处理和重试
 */

import { 
  CacheService,
  createCacheService,
  getCacheService,
  CacheOptions,
  CachePattern,
  CacheStats,
  CacheKey,
  CacheValue,
  CacheTTL
} from '../../services/cacheService';
import { logger } from '../../utils/logger';
import { analyticsService } from '../../services/analyticsService';
import { auditService } from '../../services/auditService';
import { envConfig } from '../../config/envConfig';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/analyticsService');
jest.mock('../../services/auditService');
jest.mock('../../config/envConfig');
jest.mock('ioredis');

// 类型定义
interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  connectTimeout: number;
  commandTimeout: number;
  maxMemoryPolicy: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  connectionCount: number;
}

interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl?: number;
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
  size: number;
}

interface CachePattern {
  pattern: string;
  ttl?: number;
  compress?: boolean;
  serialize?: boolean;
  tags?: string[];
}

interface CacheInvalidationRule {
  pattern: string;
  triggers: string[];
  strategy: 'immediate' | 'lazy' | 'scheduled';
  dependencies?: string[];
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logCacheOperation: jest.fn(),
  logPerformanceMetric: jest.fn()
};

const mockEnvConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'test_password',
    db: 0,
    keyPrefix: 'skillup:',
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,
    maxMemoryPolicy: 'allkeys-lru'
  },
  cache: {
    defaultTTL: 3600,
    maxKeyLength: 250,
    maxValueSize: 1048576, // 1MB
    compressionThreshold: 1024,
    enableCompression: true,
    enableSerialization: true,
    enableMetrics: true,
    metricsInterval: 60000
  }
};

// Mock Redis Client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  scan: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  incrby: jest.fn(),
  decrby: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zrangebyscore: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn(),
  flushdb: jest.fn(),
  flushall: jest.fn(),
  info: jest.fn(),
  memory: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  status: 'ready',
  pipeline: jest.fn(),
  multi: jest.fn(),
  exec: jest.fn()
};

// 设置 Mock
const mockLoggerTyped = logger as jest.Mocked<typeof logger>;
const mockAnalyticsServiceTyped = analyticsService as jest.Mocked<typeof analyticsService>;
const mockAuditServiceTyped = auditService as jest.Mocked<typeof auditService>;
const mockEnvConfigTyped = envConfig as jest.Mocked<typeof envConfig>;
const mockRedisTyped = Redis as jest.MockedClass<typeof Redis>;
mockRedisTyped.mockImplementation(() => mockRedisClient as typeof Redis.prototype);

// 测试数据
const testCacheEntry = {
  key: 'user:123',
  value: {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student'
  },
  ttl: 3600,
  createdAt: new Date(),
  accessedAt: new Date(),
  accessCount: 1,
  size: 256
};

const testCacheStats: CacheStats = {
  hits: 100,
  misses: 20,
  sets: 50,
  deletes: 10,
  errors: 2,
  totalRequests: 120,
  hitRate: 0.833,
  avgResponseTime: 15.5,
  memoryUsage: 1048576,
  connectionCount: 5
};

describe('Cache Service', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.exists.mockResolvedValue(0);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.ttl.mockResolvedValue(-1);
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockRedisClient.info.mockResolvedValue('redis_version:6.2.0\r\nused_memory:1048576');
    
    cacheService = createCacheService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 服务初始化测试
   */
  describe('Service Initialization', () => {
    it('应该创建缓存服务实例', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: mockEnvConfig.redis.host,
        port: mockEnvConfig.redis.port,
        password: mockEnvConfig.redis.password,
        db: mockEnvConfig.redis.db,
        keyPrefix: mockEnvConfig.redis.keyPrefix,
        maxRetriesPerRequest: mockEnvConfig.redis.maxRetriesPerRequest,
        retryDelayOnFailover: mockEnvConfig.redis.retryDelayOnFailover,
        enableOfflineQueue: mockEnvConfig.redis.enableOfflineQueue,
        lazyConnect: mockEnvConfig.redis.lazyConnect,
        keepAlive: mockEnvConfig.redis.keepAlive,
        family: mockEnvConfig.redis.family,
        connectTimeout: mockEnvConfig.redis.connectTimeout,
        commandTimeout: mockEnvConfig.redis.commandTimeout
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cache service initialized successfully'
      );
    });

    it('应该获取现有的服务实例', () => {
      const service1 = getCacheService();
      const service2 = getCacheService();
      
      expect(service1).toBe(service2);
    });

    it('应该设置事件监听器', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });

    it('应该处理连接错误', () => {
      const errorHandler = mockRedisClient.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      const error = new Error('Connection failed');
      errorHandler(error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis connection error',
        { error: error.message }
      );
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith(
        'cache.connection.errors'
      );
    });
  });

  /**
   * 基本缓存操作测试
   */
  describe('Basic Cache Operations', () => {
    it('应该设置缓存值', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };
      const ttl = 3600;
      
      const result = await cacheService.set(key, value, ttl);
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
        'EX',
        ttl
      );
      expect(result).toBe(true);
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith('cache.sets');
      expect(mockAuditService.logCacheOperation).toHaveBeenCalledWith({
        operation: 'set',
        key,
        ttl,
        success: true
      });
    });

    it('应该获取缓存值', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));
      
      const result = await cacheService.get(key);
      
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith('cache.hits');
    });

    it('应该处理缓存未命中', async () => {
      const key = 'nonexistent:key';
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await cacheService.get(key);
      
      expect(result).toBeNull();
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith('cache.misses');
    });

    it('应该删除缓存值', async () => {
      const key = 'test:key';
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await cacheService.del(key);
      
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith('cache.deletes');
    });

    it('应该检查键是否存在', async () => {
      const key = 'test:key';
      mockRedisClient.exists.mockResolvedValue(1);
      
      const result = await cacheService.exists(key);
      
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('应该设置键的过期时间', async () => {
      const key = 'test:key';
      const ttl = 1800;
      mockRedisClient.expire.mockResolvedValue(1);
      
      const result = await cacheService.expire(key, ttl);
      
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
      expect(result).toBe(true);
    });

    it('应该获取键的TTL', async () => {
      const key = 'test:key';
      const ttl = 1800;
      mockRedisClient.ttl.mockResolvedValue(ttl);
      
      const result = await cacheService.ttl(key);
      
      expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
      expect(result).toBe(ttl);
    });
  });

  /**
   * 批量操作测试
   */
  describe('Batch Operations', () => {
    it('应该批量获取缓存值', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', null];
      mockRedisClient.mget.mockResolvedValue(values);
      
      const result = await cacheService.mget(keys);
      
      expect(mockRedisClient.mget).toHaveBeenCalledWith(keys);
      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: null
      });
    });

    it('应该批量设置缓存值', async () => {
      const data = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      };
      mockRedisClient.mset.mockResolvedValue('OK');
      
      const result = await cacheService.mset(data);
      
      expect(mockRedisClient.mset).toHaveBeenCalledWith(
        'key1', 'value1',
        'key2', 'value2',
        'key3', 'value3'
      );
      expect(result).toBe(true);
    });

    it('应该批量删除缓存值', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(3);
      
      const result = await cacheService.mdel(keys);
      
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
      expect(result).toBe(3);
    });
  });

  /**
   * 模式匹配操作测试
   */
  describe('Pattern Matching Operations', () => {
    it('应该根据模式获取键', async () => {
      const pattern = 'user:*';
      const keys = ['user:123', 'user:456', 'user:789'];
      mockRedisClient.keys.mockResolvedValue(keys);
      
      const result = await cacheService.keys(pattern);
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(result).toEqual(keys);
    });

    it('应该使用SCAN遍历键', async () => {
      const pattern = 'session:*';
      const scanResults = [
        ['10', ['session:abc', 'session:def']],
        ['0', ['session:ghi']]
      ];
      
      mockRedisClient.scan
        .mockResolvedValueOnce(scanResults[0])
        .mockResolvedValueOnce(scanResults[1]);
      
      const result = await cacheService.scan(pattern);
      
      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', pattern, 'COUNT', 100);
      expect(result).toEqual(['session:abc', 'session:def', 'session:ghi']);
    });

    it('应该根据模式删除键', async () => {
      const pattern = 'temp:*';
      const keys = ['temp:123', 'temp:456'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(2);
      
      const result = await cacheService.deleteByPattern(pattern);
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
      expect(result).toBe(2);
    });
  });

  /**
   * 数据结构操作测试
   */
  describe('Data Structure Operations', () => {
    describe('Hash Operations', () => {
      it('应该设置哈希字段', async () => {
        const key = 'user:123';
        const field = 'name';
        const value = 'John Doe';
        mockRedisClient.hset.mockResolvedValue(1);
        
        const result = await cacheService.hset(key, field, value);
        
        expect(mockRedisClient.hset).toHaveBeenCalledWith(key, field, value);
        expect(result).toBe(true);
      });

      it('应该获取哈希字段', async () => {
        const key = 'user:123';
        const field = 'name';
        const value = 'John Doe';
        mockRedisClient.hget.mockResolvedValue(value);
        
        const result = await cacheService.hget(key, field);
        
        expect(mockRedisClient.hget).toHaveBeenCalledWith(key, field);
        expect(result).toBe(value);
      });

      it('应该获取所有哈希字段', async () => {
        const key = 'user:123';
        const hash = { name: 'John Doe', email: 'john@example.com' };
        mockRedisClient.hgetall.mockResolvedValue(hash);
        
        const result = await cacheService.hgetall(key);
        
        expect(mockRedisClient.hgetall).toHaveBeenCalledWith(key);
        expect(result).toEqual(hash);
      });
    });

    describe('Set Operations', () => {
      it('应该添加集合成员', async () => {
        const key = 'tags';
        const members = ['javascript', 'react', 'nodejs'];
        mockRedisClient.sadd.mockResolvedValue(3);
        
        const result = await cacheService.sadd(key, ...members);
        
        expect(mockRedisClient.sadd).toHaveBeenCalledWith(key, ...members);
        expect(result).toBe(3);
      });

      it('应该获取集合成员', async () => {
        const key = 'tags';
        const members = ['javascript', 'react', 'nodejs'];
        mockRedisClient.smembers.mockResolvedValue(members);
        
        const result = await cacheService.smembers(key);
        
        expect(mockRedisClient.smembers).toHaveBeenCalledWith(key);
        expect(result).toEqual(members);
      });
    });

    describe('Sorted Set Operations', () => {
      it('应该添加有序集合成员', async () => {
        const key = 'leaderboard';
        const members = [{ score: 100, member: 'user1' }, { score: 95, member: 'user2' }];
        mockRedisClient.zadd.mockResolvedValue(2);
        
        const result = await cacheService.zadd(key, ...members.flatMap(m => [m.score, m.member]));
        
        expect(mockRedisClient.zadd).toHaveBeenCalledWith(key, 100, 'user1', 95, 'user2');
        expect(result).toBe(2);
      });

      it('应该获取有序集合范围', async () => {
        const key = 'leaderboard';
        const members = ['user1', 'user2', 'user3'];
        mockRedisClient.zrange.mockResolvedValue(members);
        
        const result = await cacheService.zrange(key, 0, 2);
        
        expect(mockRedisClient.zrange).toHaveBeenCalledWith(key, 0, 2);
        expect(result).toEqual(members);
      });
    });

    describe('List Operations', () => {
      it('应该推入列表元素', async () => {
        const key = 'queue';
        const values = ['task1', 'task2', 'task3'];
        mockRedisClient.lpush.mockResolvedValue(3);
        
        const result = await cacheService.lpush(key, ...values);
        
        expect(mockRedisClient.lpush).toHaveBeenCalledWith(key, ...values);
        expect(result).toBe(3);
      });

      it('应该弹出列表元素', async () => {
        const key = 'queue';
        const value = 'task1';
        mockRedisClient.lpop.mockResolvedValue(value);
        
        const result = await cacheService.lpop(key);
        
        expect(mockRedisClient.lpop).toHaveBeenCalledWith(key);
        expect(result).toBe(value);
      });

      it('应该获取列表范围', async () => {
        const key = 'queue';
        const values = ['task1', 'task2', 'task3'];
        mockRedisClient.lrange.mockResolvedValue(values);
        
        const result = await cacheService.lrange(key, 0, -1);
        
        expect(mockRedisClient.lrange).toHaveBeenCalledWith(key, 0, -1);
        expect(result).toEqual(values);
      });
    });
  });

  /**
   * 缓存策略测试
   */
  describe('Cache Strategies', () => {
    it('应该实现LRU缓存策略', async () => {
      const key = 'lru:test';
      const value = 'test value';
      
      // 模拟内存不足，触发LRU淘汰
      mockRedisClient.set.mockRejectedValueOnce(new Error('OOM'));
      mockRedisClient.set.mockResolvedValueOnce('OK');
      
      const result = await cacheService.setWithStrategy(key, value, {
        strategy: 'lru',
        maxMemory: '100mb'
      });
      
      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache memory limit reached, LRU eviction triggered'
      );
    });

    it('应该实现TTL缓存策略', async () => {
      const key = 'ttl:test';
      const value = 'test value';
      const ttl = 3600;
      
      await cacheService.setWithStrategy(key, value, {
        strategy: 'ttl',
        ttl
      });
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
        'EX',
        ttl
      );
    });

    it('应该实现写回缓存策略', async () => {
      const key = 'writeback:test';
      const value = 'test value';
      
      await cacheService.setWithStrategy(key, value, {
        strategy: 'writeback',
        writebackDelay: 5000
      });
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value)
      );
      
      // 验证延迟写回
      setTimeout(() => {
        expect(mockAuditService.logCacheOperation).toHaveBeenCalledWith({
          operation: 'writeback',
          key,
          success: true
        });
      }, 5100);
    });
  });

  /**
   * 缓存预热和失效测试
   */
  describe('Cache Warming and Invalidation', () => {
    it('应该预热缓存', async () => {
      const warmupData = {
        'user:123': { id: '123', name: 'User 1' },
        'user:456': { id: '456', name: 'User 2' },
        'user:789': { id: '789', name: 'User 3' }
      };
      
      mockRedisClient.mset.mockResolvedValue('OK');
      
      const result = await cacheService.warmup(warmupData, { ttl: 3600 });
      
      expect(result).toBe(true);
      expect(mockRedisClient.mset).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cache warmup completed',
        { keysWarmed: 3 }
      );
    });

    it('应该失效相关缓存', async () => {
      const tags = ['user', 'profile'];
      const keys = ['user:123', 'user:456', 'profile:123'];
      
      mockRedisClient.keys
        .mockResolvedValueOnce(['user:123', 'user:456'])
        .mockResolvedValueOnce(['profile:123']);
      mockRedisClient.del.mockResolvedValue(3);
      
      const result = await cacheService.invalidateByTags(tags);
      
      expect(result).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('*user*');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('*profile*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('应该实现缓存依赖失效', async () => {
      const dependencies = ['user:123', 'course:456'];
      const dependentKeys = ['enrollment:123:456', 'progress:123:456'];
      
      mockRedisClient.keys.mockResolvedValue(dependentKeys);
      mockRedisClient.del.mockResolvedValue(2);
      
      const result = await cacheService.invalidateDependencies(dependencies);
      
      expect(result).toBe(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cache dependencies invalidated',
        { dependencies, invalidatedKeys: 2 }
      );
    });
  });

  /**
   * 性能监控测试
   */
  describe('Performance Monitoring', () => {
    it('应该收集缓存统计信息', async () => {
      mockRedisClient.info.mockResolvedValue(
        'keyspace_hits:100\r\nkeyspace_misses:20\r\nused_memory:1048576'
      );
      
      const stats = await cacheService.getStats();
      
      expect(stats).toEqual(expect.objectContaining({
        hits: expect.any(Number),
        misses: expect.any(Number),
        hitRate: expect.any(Number),
        memoryUsage: expect.any(Number)
      }));
    });

    it('应该监控响应时间', async () => {
      const key = 'perf:test';
      const startTime = Date.now();
      
      await cacheService.get(key);
      
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'cache.response_time',
        expect.any(Number)
      );
    });

    it('应该监控内存使用', async () => {
      mockRedisClient.memory.mockResolvedValue({
        'used-memory': 1048576,
        'used-memory-peak': 2097152,
        'used-memory-overhead': 524288
      });
      
      const memoryInfo = await cacheService.getMemoryInfo();
      
      expect(memoryInfo).toEqual(expect.objectContaining({
        used: 1048576,
        peak: 2097152,
        overhead: 524288
      }));
    });

    it('应该生成性能报告', async () => {
      const report = await cacheService.generatePerformanceReport();
      
      expect(report).toEqual(expect.objectContaining({
        period: expect.any(String),
        stats: expect.any(Object),
        trends: expect.any(Object),
        recommendations: expect.any(Array)
      }));
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理连接错误', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Connection lost'));
      
      const result = await cacheService.get('test:key');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cache operation failed',
        expect.objectContaining({
          operation: 'get',
          key: 'test:key',
          error: 'Connection lost'
        })
      );
      expect(mockAnalyticsService.increment).toHaveBeenCalledWith('cache.errors');
    });

    it('应该实现重试机制', async () => {
      mockRedisClient.set
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('OK');
      
      const result = await cacheService.setWithRetry('test:key', 'value', {
        maxRetries: 3,
        retryDelay: 100
      });
      
      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledTimes(3);
    });

    it('应该处理序列化错误', async () => {
      const circularObj = {};
      circularObj.self = circularObj;
      
      const result = await cacheService.set('test:key', circularObj);
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to serialize cache value',
        expect.any(Object)
      );
    });

    it('应该处理反序列化错误', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');
      
      const result = await cacheService.get('test:key');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to deserialize cache value',
        expect.any(Object)
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理大量并发请求', async () => {
      const requests = Array.from({ length: 1000 }, (_, i) => 
        cacheService.get(`key:${i}`)
      );
      
      const startTime = Date.now();
      await Promise.all(requests);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 1秒内完成1000个请求
    });

    it('应该有效管理内存使用', async () => {
      // 设置大量缓存数据
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        key: `large:${i}`,
        value: 'x'.repeat(1024) // 1KB per entry
      }));
      
      for (const { key, value } of largeData) {
        await cacheService.set(key, value);
      }
      
      const memoryInfo = await cacheService.getMemoryInfo();
      expect(memoryInfo.used).toBeLessThan(100 * 1024 * 1024); // 小于100MB
    });

    it('应该优化批量操作性能', async () => {
      const batchSize = 100;
      const data = Array.from({ length: batchSize }, (_, i) => ({
        [`batch:${i}`]: `value:${i}`
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
      
      const startTime = Date.now();
      await cacheService.mset(data);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(100); // 100ms内完成批量设置
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理空值', async () => {
      await cacheService.set('empty:key', null);
      const result = await cacheService.get('empty:key');
      
      expect(result).toBeNull();
    });

    it('应该处理超长键名', async () => {
      const longKey = 'x'.repeat(300); // 超过最大键长度
      
      const result = await cacheService.set(longKey, 'value');
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache key too long',
        { keyLength: 300, maxLength: 250 }
      );
    });

    it('应该处理超大值', async () => {
      const largeValue = 'x'.repeat(2 * 1024 * 1024); // 2MB
      
      const result = await cacheService.set('large:key', largeValue);
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache value too large',
        expect.any(Object)
      );
    });

    it('应该处理特殊字符', async () => {
      const specialKey = 'key:with:特殊字符:🚀';
      const specialValue = { emoji: '🎉', chinese: '测试', symbols: '!@#$%' };
      
      await cacheService.set(specialKey, specialValue);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(specialValue));
      
      const result = await cacheService.get(specialKey);
      
      expect(result).toEqual(specialValue);
    });
  });
});