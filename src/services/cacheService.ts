/**
 * 缓存服务
 * 
 * 提供Redis缓存功能，包括：
 * - 基本缓存操作（GET/SET/DEL）
 * - 缓存过期和TTL管理
 * - 缓存模式和策略
 * - 分布式缓存
 * - 缓存预热和失效
 * - 性能监控和统计
 * - 错误处理和重试
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { envConfig } from '../utils/envConfig';
import { analyticsService } from './analyticsService';
import { auditService } from './auditService';

// 类型定义
export interface CacheConfig {
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

export interface CacheOptions {
  ttl?: number;
  strategy?: 'lru' | 'lfu' | 'ttl' | 'random';
  compress?: boolean;
  serialize?: boolean;
  tags?: string[];
}

export interface CachePattern {
  pattern: string;
  count?: number;
  type?: string;
}

export interface CacheMetrics {
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

export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  createdAt: number;
  accessCount: number;
  tags: string[];
}

/**
 * 缓存服务类
 */
export class CacheService {
  private redis: Redis;
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private isConnected: boolean = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      host: envConfig?.redis?.host || 'localhost',
      port: envConfig?.redis?.port || 6379,
      password: envConfig?.redis?.password,
      db: envConfig?.redis?.db || 0,
      keyPrefix: envConfig?.redis?.keyPrefix || 'skillup:',
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
      maxMemoryPolicy: 'allkeys-lru',
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      connectionCount: 0
    };

    // 测试环境中禁用Redis连接
    if (process.env.NODE_ENV !== 'test') {
      this.initializeRedis();
    }
  }

  /**
   * 初始化Redis连接
   */
  private initializeRedis(): void {
    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      enableOfflineQueue: this.config.enableOfflineQueue,
      lazyConnect: this.config.lazyConnect,
      keepAlive: this.config.keepAlive,
      family: this.config.family,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout
    });

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      logger.info('Redis ready');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis error:', error);
      this.metrics.errors++;
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting');
    });
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const startTime = Date.now();
      const serializedValue = JSON.stringify(value);
      const ttl = options.ttl || 3600;

      await this.redis.set(key, serializedValue, 'EX', ttl);
      
      this.metrics.sets++;
      this.metrics.totalRequests++;
      this.updateResponseTime(Date.now() - startTime);
      
      analyticsService.increment('cache.sets');
      auditService.logCacheOperation({
        operation: 'set',
        key,
        ttl,
        success: true
      });

      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * 获取缓存值
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const startTime = Date.now();
      const value = await this.redis.get(key);
      
      this.metrics.totalRequests++;
      this.updateResponseTime(Date.now() - startTime);

      if (value === null) {
        this.metrics.misses++;
        analyticsService.increment('cache.misses');
        return null;
      }

      this.metrics.hits++;
      analyticsService.increment('cache.hits');
      
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get error:', error);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * 删除缓存值
   */
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      this.metrics.deletes++;
      this.metrics.totalRequests++;
      
      analyticsService.increment('cache.deletes');
      auditService.logCacheOperation({
        operation: 'delete',
        key,
        success: true
      });

      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * 设置键的过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * 获取键的TTL
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  }

  /**
   * 批量设置
   */
  async mset(data: Record<string, any>): Promise<boolean> {
    try {
      const pairs: string[] = [];
      for (const [key, value] of Object.entries(data)) {
        pairs.push(key, JSON.stringify(value));
      }
      
      await this.redis.mset(...pairs);
      this.metrics.sets += Object.keys(data).length;
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * 批量获取
   */
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * 扫描键
   */
  async scan(pattern: CachePattern): Promise<string[]> {
    try {
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          pattern.pattern,
          'COUNT',
          pattern.count || 100
        );
        
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');
      
      return keys;
    } catch (error) {
      logger.error('Cache scan error:', error);
      return [];
    }
  }

  /**
   * 列表操作 - 左推
   */
  async lpush(key: string, value: any): Promise<number> {
    try {
      return await this.redis.lpush(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache lpush error:', error);
      return 0;
    }
  }

  /**
   * 列表操作 - 右推
   */
  async rpush(key: string, value: any): Promise<number> {
    try {
      return await this.redis.rpush(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache rpush error:', error);
      return 0;
    }
  }

  /**
   * 列表操作 - 左弹
   */
  async lpop(key: string): Promise<any | null> {
    try {
      const value = await this.redis.lpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache lpop error:', error);
      return null;
    }
  }

  /**
   * 列表操作 - 右弹
   */
  async rpop(key: string): Promise<any | null> {
    try {
      const value = await this.redis.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache rpop error:', error);
      return null;
    }
  }

  /**
   * 列表操作 - 获取范围
   */
  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    try {
      const values = await this.redis.lrange(key, start, stop);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      logger.error('Cache lrange error:', error);
      return [];
    }
  }

  /**
   * 使用策略设置缓存
   */
  async setWithStrategy(key: string, value: any, options: CacheOptions): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      
      switch (options.strategy) {
        case 'ttl':
          await this.redis.set(key, serializedValue, 'EX', options.ttl || 3600);
          break;
        case 'lru':
        case 'lfu':
        case 'random':
        default:
          await this.redis.set(key, serializedValue);
          if (options.ttl) {
            await this.redis.expire(key, options.ttl);
          }
          break;
      }
      
      return true;
    } catch (error) {
      logger.error('Cache setWithStrategy error:', error);
      return false;
    }
  }

  /**
   * 缓存预热
   */
  async warmup(data: Record<string, any>): Promise<void> {
    try {
      const keys = Object.keys(data);
      await this.mset(data);
      
      logger.info('Cache warmup completed', { keysWarmed: keys.length });
    } catch (error) {
      logger.error('Cache warmup error:', error);
    }
  }

  /**
   * 失效相关缓存
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.redis.keys(`*${tag}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      logger.error('Cache invalidateByTags error:', error);
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<CacheMetrics> {
    try {
      const info = await this.redis.info('stats');
      const memoryInfo = await this.redis.info('memory');
      
      // 解析Redis统计信息
      const statsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);
      const memoryMatch = memoryInfo.match(/used_memory:(\d+)/);
      
      const hits = statsMatch ? parseInt(statsMatch[1]) : this.metrics.hits;
      const misses = missesMatch ? parseInt(missesMatch[1]) : this.metrics.misses;
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      this.metrics.hits = hits;
      this.metrics.misses = misses;
      this.metrics.memoryUsage = memoryUsage;
      this.metrics.hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;
      
      return { ...this.metrics };
    } catch (error) {
      logger.error('Cache getStats error:', error);
      return { ...this.metrics };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Cache health check error:', error);
      return false;
    }
  }

  /**
   * 更新响应时间
   */
  private updateResponseTime(responseTime: number): void {
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Cache service closed');
    } catch (error) {
      logger.error('Cache close error:', error);
    }
  }
}

// 单例实例
let cacheServiceInstance: CacheService | null = null;

/**
 * 创建缓存服务实例
 */
export function createCacheService(config?: Partial<CacheConfig>): CacheService {
  return new CacheService(config);
}

/**
 * 获取缓存服务单例
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

// 默认导出
export const cacheService = getCacheService();
export default cacheService;