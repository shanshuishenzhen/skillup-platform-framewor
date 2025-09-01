import { useState, useEffect, useCallback, useMemo } from 'react';
import { ExamService } from '@/services/examService';

/**
 * 考试系统性能优化Hook
 * 提供缓存管理、懒加载、防抖等性能优化功能
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface OptimizationConfig {
  cacheExpiry?: number; // 缓存过期时间（毫秒）
  debounceDelay?: number; // 防抖延迟（毫秒）
  enableVirtualization?: boolean; // 是否启用虚拟滚动
  prefetchCount?: number; // 预加载数量
}

class ExamCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultExpiry = 5 * 60 * 1000; // 5分钟

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, expiry?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: expiry || this.defaultExpiry
    });
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// 全局缓存实例
const examCache = new ExamCache();

/**
 * 防抖Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 虚拟滚动Hook
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
}

/**
 * 考试数据优化Hook
 */
export function useExamOptimization(config: OptimizationConfig = {}) {
  const {
    cacheExpiry = 5 * 60 * 1000,
    debounceDelay = 300,
    enableVirtualization = false,
    prefetchCount = 10
  } = config;

  /**
   * 带缓存的数据获取
   */
  const getCachedData = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    expiry?: number
  ): Promise<T> => {
    // 尝试从缓存获取
    const cached = examCache.get<T>(key);
    if (cached) {
      return cached;
    }

    // 缓存未命中，获取新数据
    const data = await fetcher();
    examCache.set(key, data, expiry || cacheExpiry);
    return data;
  }, [cacheExpiry]);

  /**
   * 预加载考试数据
   */
  const prefetchExamData = useCallback(async (examIds: string[]) => {
    const promises = examIds.slice(0, prefetchCount).map(async (examId) => {
      const cacheKey = `exam_${examId}`;
      if (!examCache.get(cacheKey)) {
        try {
          const exam = await ExamService.getExam(examId);
          examCache.set(cacheKey, exam);
        } catch (error) {
          console.warn(`预加载考试 ${examId} 失败:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }, [prefetchCount]);

  /**
   * 批量加载考试列表
   */
  const loadExamsBatch = useCallback(async (
    page: number,
    pageSize: number,
    filters?: any
  ) => {
    const cacheKey = `exams_${page}_${pageSize}_${JSON.stringify(filters)}`;
    
    return getCachedData(cacheKey, async () => {
      const result = await ExamService.getExams({
        page,
        pageSize,
        ...filters
      });
      
      // 预加载下一页
      if (result.data.length === pageSize) {
        setTimeout(() => {
          loadExamsBatch(page + 1, pageSize, filters);
        }, 1000);
      }
      
      return result;
    });
  }, [getCachedData]);

  /**
   * 优化的搜索功能
   */
  const searchExams = useCallback(async (query: string, filters?: any) => {
    if (!query.trim()) return { data: [], total: 0 };
    
    const cacheKey = `search_${query}_${JSON.stringify(filters)}`;
    
    return getCachedData(cacheKey, async () => {
      return ExamService.searchExams(query, filters);
    }, 2 * 60 * 1000); // 搜索结果缓存2分钟
  }, [getCachedData]);

  /**
   * 清理缓存
   */
  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      // 清理匹配模式的缓存
      for (const key of examCache['cache'].keys()) {
        if (key.includes(pattern)) {
          examCache.delete(key);
        }
      }
    } else {
      examCache.clear();
    }
  }, []);

  /**
   * 获取缓存统计
   */
  const getCacheStats = useCallback(() => {
    return {
      size: examCache.size(),
      items: Array.from(examCache['cache'].entries()).map(([key, item]) => ({
        key,
        size: JSON.stringify(item.data).length,
        age: Date.now() - item.timestamp,
        expiry: item.expiry
      }))
    };
  }, []);

  // 定期清理过期缓存
  useEffect(() => {
    const interval = setInterval(() => {
      examCache.cleanup();
    }, 60000); // 每分钟清理一次

    return () => clearInterval(interval);
  }, []);

  return {
    getCachedData,
    prefetchExamData,
    loadExamsBatch,
    searchExams,
    clearCache,
    getCacheStats,
    enableVirtualization,
    debounceDelay
  };
}

/**
 * 图片懒加载Hook
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setIsError(false);
    };
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(false);
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { imageSrc, isLoaded, isError };
}

/**
 * 无限滚动Hook
 */
export function useInfiniteScroll<T>({
  fetchMore,
  hasMore,
  threshold = 100
}: {
  fetchMore: () => Promise<void>;
  hasMore: boolean;
  threshold?: number;
}) {
  const [isFetching, setIsFetching] = useState(false);

  const handleScroll = useCallback(async () => {
    if (isFetching || !hasMore) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      setIsFetching(true);
      try {
        await fetchMore();
      } finally {
        setIsFetching(false);
      }
    }
  }, [fetchMore, hasMore, threshold, isFetching]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { isFetching };
}

export default useExamOptimization;