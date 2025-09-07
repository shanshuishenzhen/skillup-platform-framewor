/**
 * API缓存管理工具
 * 提供内存缓存、本地存储缓存和智能缓存策略
 */

/**
 * 缓存项接口
 */
interface CacheItem<T = any> {
  /** 缓存的数据 */
  data: T;
  /** 缓存时间戳 */
  timestamp: number;
  /** 过期时间（毫秒） */
  expiry: number;
  /** 缓存键 */
  key: string;
  /** 数据版本号 */
  version?: string;
}

/**
 * 缓存配置接口
 */
interface CacheConfig {
  /** 默认过期时间（毫秒），默认5分钟 */
  defaultTTL?: number;
  /** 最大缓存项数量，默认100 */
  maxItems?: number;
  /** 是否启用本地存储，默认true */
  enableLocalStorage?: boolean;
  /** 本地存储键前缀 */
  storagePrefix?: string;
  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * API缓存管理器类
 */
class ApiCacheManager {
  private memoryCache = new Map<string, CacheItem>();
  private config: Required<CacheConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5分钟
      maxItems: config.maxItems || 100,
      enableLocalStorage: config.enableLocalStorage !== false,
      storagePrefix: config.storagePrefix || 'api_cache_',
      debug: config.debug || false,
    };

    // 启动定期清理
    this.startCleanup();
    
    // 从本地存储恢复缓存
    this.loadFromStorage();
  }

  /**
   * 生成缓存键
   * @param url API URL
   * @param params 请求参数
   * @returns 缓存键
   */
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${url}${paramStr}`;
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[ApiCache] ${message}`, data || '');
    }
  }

  /**
   * 检查缓存项是否过期
   * @param item 缓存项
   * @returns 是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.timestamp + item.expiry;
  }

  /**
   * 从本地存储加载缓存
   */
  private loadFromStorage(): void {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.config.storagePrefix)
      );

      for (const storageKey of keys) {
        const itemStr = localStorage.getItem(storageKey);
        if (itemStr) {
          const item: CacheItem = JSON.parse(itemStr);
          if (!this.isExpired(item)) {
            this.memoryCache.set(item.key, item);
            this.log('从本地存储恢复缓存', item.key);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.error('从本地存储加载缓存失败:', error);
    }
  }

  /**
   * 保存缓存到本地存储
   * @param item 缓存项
   */
  private saveToStorage(item: CacheItem): void {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const storageKey = `${this.config.storagePrefix}${item.key}`;
      localStorage.setItem(storageKey, JSON.stringify(item));
      this.log('保存缓存到本地存储', item.key);
    } catch (error) {
      console.error('保存缓存到本地存储失败:', error);
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    // 每分钟清理一次过期缓存
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // 清理内存缓存
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // 清理本地存储
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.config.storagePrefix)
        );

        for (const storageKey of keys) {
          const itemStr = localStorage.getItem(storageKey);
          if (itemStr) {
            const item: CacheItem = JSON.parse(itemStr);
            if (this.isExpired(item)) {
              localStorage.removeItem(storageKey);
              cleanedCount++;
            }
          }
        }
      } catch (error) {
        console.error('清理本地存储缓存失败:', error);
      }
    }

    if (cleanedCount > 0) {
      this.log(`清理了 ${cleanedCount} 个过期缓存项`);
    }
  }

  /**
   * 设置缓存
   * @param url API URL
   * @param data 数据
   * @param params 请求参数
   * @param ttl 过期时间（毫秒）
   * @param version 数据版本号
   */
  set<T>(url: string, data: T, params?: Record<string, any>, ttl?: number, version?: string): void {
    const key = this.generateKey(url, params);
    const expiry = ttl || this.config.defaultTTL;
    
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry,
      key,
      version,
    };

    // 检查缓存大小限制
    if (this.memoryCache.size >= this.config.maxItems) {
      // 删除最旧的缓存项
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, item);
    this.saveToStorage(item);
    
    this.log('设置缓存', { key, expiry, version });
  }

  /**
   * 获取缓存
   * @param url API URL
   * @param params 请求参数
   * @param version 期望的数据版本号
   * @returns 缓存的数据或null
   */
  get<T>(url: string, params?: Record<string, any>, version?: string): T | null {
    const key = this.generateKey(url, params);
    const item = this.memoryCache.get(key);

    if (!item) {
      this.log('缓存未命中', key);
      return null;
    }

    if (this.isExpired(item)) {
      this.memoryCache.delete(key);
      this.log('缓存已过期', key);
      return null;
    }

    // 检查版本号
    if (version && item.version && item.version !== version) {
      this.log('缓存版本不匹配', { key, cached: item.version, expected: version });
      return null;
    }

    this.log('缓存命中', key);
    return item.data as T;
  }

  /**
   * 删除缓存
   * @param url API URL
   * @param params 请求参数
   */
  delete(url: string, params?: Record<string, any>): void {
    const key = this.generateKey(url, params);
    this.memoryCache.delete(key);

    // 从本地存储删除
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      const storageKey = `${this.config.storagePrefix}${key}`;
      localStorage.removeItem(storageKey);
    }

    this.log('删除缓存', key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();

    // 清空本地存储中的缓存
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.config.storagePrefix)
        );
        
        for (const key of keys) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('清空本地存储缓存失败:', error);
      }
    }

    this.log('清空所有缓存');
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getStats(): {
    memoryItems: number;
    storageItems: number;
    totalSize: number;
  } {
    let storageItems = 0;
    let totalSize = 0;

    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.config.storagePrefix)
        );
        storageItems = keys.length;
        
        for (const key of keys) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        }
      } catch (error) {
        console.error('获取本地存储统计失败:', error);
      }
    }

    return {
      memoryItems: this.memoryCache.size,
      storageItems,
      totalSize,
    };
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.memoryCache.clear();
  }
}

// 创建默认的缓存管理器实例
export const apiCache = new ApiCacheManager({
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxItems: 100,
  enableLocalStorage: true,
  storagePrefix: 'skillup_api_',
  debug: process.env.NODE_ENV === 'development',
});

/**
 * 带缓存的fetch函数
 * @param url 请求URL
 * @param options fetch选项
 * @param cacheOptions 缓存选项
 * @returns Promise<Response>
 */
export async function cachedFetch(
  url: string,
  options: RequestInit = {},
  cacheOptions: {
    ttl?: number;
    version?: string;
    forceRefresh?: boolean;
    params?: Record<string, any>;
  } = {}
): Promise<Response> {
  const { ttl, version, forceRefresh = false, params } = cacheOptions;
  
  // 只缓存GET请求
  if (!options.method || options.method.toUpperCase() === 'GET') {
    if (!forceRefresh) {
      const cached = apiCache.get<Response>(url, params, version);
      if (cached) {
        return cached;
      }
    }
  }

  const response = await fetch(url, options);
  
  // 只缓存成功的GET请求
  if (response.ok && (!options.method || options.method.toUpperCase() === 'GET')) {
    apiCache.set(url, response.clone(), params, ttl, version);
  }

  return response;
}

export default apiCache;
export type { CacheConfig, CacheItem };