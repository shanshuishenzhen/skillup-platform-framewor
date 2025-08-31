/**
 * 测试环境配置和全局设置
 * 
 * 此文件包含：
 * 1. Jest测试环境配置
 * 2. 全局模拟设置
 * 3. 测试数据库配置
 * 4. 通用测试工具函数
 * 5. 测试前后的清理工作
 */

import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// 全局变量设置
// @ts-expect-error - 忽略 TextEncoder 类型不兼容问题
global.TextEncoder = TextEncoder;
// @ts-expect-error - 忽略 TextDecoder 类型不兼容问题
global.TextDecoder = TextDecoder;

// 模拟环境变量
// process.env.NODE_ENV = 'test'; // NODE_ENV 是只读属性，不能直接赋值
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.BAIDU_API_KEY = 'test-baidu-key';
process.env.BAIDU_SECRET_KEY = 'test-baidu-secret';
process.env.CLOUD_STORAGE_BUCKET = 'test-bucket';
process.env.JWT_SECRET = 'test-jwt-secret';

// 模拟全局对象
Object.defineProperty(global, 'fetch', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(public url: string, public init?: RequestInit) {}
    
    async json() {
      return JSON.parse(this.init?.body as string || '{}');
    }
    
    async text() {
      return this.init?.body as string || '';
    }
    
    get headers() {
      return new Map(Object.entries(this.init?.headers || {}));
    }
    
    get method() {
      return this.init?.method || 'GET';
    }
  },
  writable: true
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(
      public body: unknown,
      public init: ResponseInit = {}
    ) {}
    
    get status() {
      return this.init.status || 200;
    }
    
    get ok() {
      return this.status >= 200 && this.status < 300;
    }
    
    get headers() {
      return new Map(Object.entries(this.init.headers || {}));
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
    
    static json(data: unknown, init?: ResponseInit) {
      return new MockResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers
        }
      });
    }
    
    static error() {
      return new MockResponse('', { status: 500 });
    }
  },
  writable: true
});

// 模拟 Headers 类
Object.defineProperty(global, 'Headers', {
  value: class MockHeaders extends Map {
    constructor(init?: HeadersInit) {
      super();
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    
    append(name: string, value: string) {
      const existing = this.get(name);
      this.set(name, existing ? `${existing}, ${value}` : value);
    }
    
    delete(name: string) {
      return super.delete(name.toLowerCase());
    }
    
    get(name: string) {
      return super.get(name.toLowerCase()) || null;
    }
    
    has(name: string) {
      return super.has(name.toLowerCase());
    }
    
    set(name: string, value: string) {
      return super.set(name.toLowerCase(), value);
    }
  },
  writable: true
});

// 模拟 FormData 类
Object.defineProperty(global, 'FormData', {
  value: class MockFormData {
    private data = new Map<string, { value: unknown; filename?: string }>();
    
    append(name: string, value: unknown, filename?: string) {
      this.data.set(name, { value, filename });
    }
    
    delete(name: string) {
      this.data.delete(name);
    }
    
    get(name: string) {
      return this.data.get(name)?.value || null;
    }
    
    getAll(name: string) {
      const item = this.data.get(name);
      return item ? [item.value] : [];
    }
    
    has(name: string) {
      return this.data.has(name);
    }
    
    set(name: string, value: unknown, filename?: string) {
      this.data.set(name, { value, filename });
    }
    
    entries() {
      return Array.from(this.data.entries()).map(([key, { value }]) => [key, value]);
    }
    
    keys() {
      return this.data.keys();
    }
    
    values() {
      return Array.from(this.data.values()).map(({ value }) => value);
    }
  },
  writable: true
});

// 模拟 File 类
Object.defineProperty(global, 'File', {
  value: class MockFile {
    constructor(
      public bits: BlobPart[],
      public name: string,
      public options: FilePropertyBag = {}
    ) {}
    
    get size() {
      return this.bits.reduce((size, bit) => {
        if (typeof bit === 'string') return size + bit.length;
        if (bit instanceof ArrayBuffer) return size + bit.byteLength;
        return size;
      }, 0);
    }
    
    get type() {
      return this.options.type || '';
    }
    
    get lastModified() {
      return this.options.lastModified || Date.now();
    }
    
    async text() {
      return this.bits.join('');
    }
    
    async arrayBuffer() {
      const text = await this.text();
      return new TextEncoder().encode(text).buffer;
    }
  },
  writable: true
});

// 模拟 Blob 类
Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(
      public bits: BlobPart[] = [],
      public options: BlobPropertyBag = {}
    ) {}
    
    get size() {
      return this.bits.reduce((size, bit) => {
        if (typeof bit === 'string') return size + bit.length;
        if (bit instanceof ArrayBuffer) return size + bit.byteLength;
        return size;
      }, 0);
    }
    
    get type() {
      return this.options.type || '';
    }
    
    async text() {
      return this.bits.join('');
    }
    
    async arrayBuffer() {
      const text = await this.text();
      return new TextEncoder().encode(text).buffer;
    }
    
    slice(start?: number, end?: number, contentType?: string) {
      const text = this.bits.join('');
      const sliced = text.slice(start, end);
      return new MockBlob([sliced], { type: contentType });
    }
  },
  writable: true
});

// 模拟 URL 类的静态方法
Object.defineProperty(global.URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
  writable: true
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true
});

// 模拟 crypto 对象
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: jest.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    subtle: {
      digest: jest.fn(async () => new ArrayBuffer(32)),
      encrypt: jest.fn(async () => new ArrayBuffer(16)),
      decrypt: jest.fn(async () => new ArrayBuffer(16)),
      sign: jest.fn(async () => new ArrayBuffer(64)),
      verify: jest.fn(async () => true)
    }
  },
  writable: true
});

// 模拟 localStorage 和 sessionStorage
const createMockStorage = () => {
  const storage = new Map<string, string>();
  
  return {
    getItem: jest.fn((key: string) => storage.get(key) || null),
    setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: jest.fn((key: string) => storage.delete(key)),
    clear: jest.fn(() => storage.clear()),
    get length() {
      return storage.size;
    },
    key: jest.fn((index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    })
  };
};

Object.defineProperty(global, 'localStorage', {
  value: createMockStorage(),
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: createMockStorage(),
  writable: true
});

// 模拟 console 方法（可选择性静音）
const originalConsole = { ...console };

if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}

// 通用测试工具函数
export const testUtils = {
  /**
   * 创建模拟请求对象
   */
  createMockRequest: (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent',
      'X-Forwarded-For': '127.0.0.1',
      ...headers
    };
    
    return new Request(url, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined
    });
  },
  
  /**
   * 创建模拟响应对象
   */
  createMockResponse: (data: unknown, status = 200, headers: Record<string, string> = {}) => {
    return Response.json(data, {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  },
  
  /**
   * 解析响应数据
   */
  parseResponse: async (response: Response) => {
    try {
      return await response.json();
    } catch {
      return await response.text();
    }
  },
  
  /**
   * 等待指定时间
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * 生成随机字符串
   */
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  },
  
  /**
   * 生成随机邮箱
   */
  randomEmail: () => {
    const username = testUtils.randomString(8);
    const domain = testUtils.randomString(6);
    return `${username}@${domain}.com`;
  },
  
  /**
   * 生成随机用户数据
   */
  randomUser: (overrides: Record<string, unknown> = {}) => ({
    id: `user-${testUtils.randomString(8)}`,
    email: testUtils.randomEmail(),
    firstName: '测试',
    lastName: '用户',
    role: 'student',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * 生成随机课程数据
   */
  randomCourse: (overrides: Record<string, unknown> = {}) => ({
    id: `course-${testUtils.randomString(8)}`,
    title: `测试课程 ${testUtils.randomString(4)}`,
    description: '这是一个测试课程描述',
    difficulty: 'beginner',
    duration: 60,
    price: 99.99,
    status: 'published',
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * 模拟文件对象
   */
  createMockFile: (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
    const content = 'x'.repeat(size);
    return new File([content], name, { type });
  },
  
  /**
   * 模拟Base64图片数据
   */
  createMockImageData: (format = 'jpeg') => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
    }
    return canvas.toDataURL(`image/${format}`);
  },
  
  /**
   * 验证错误响应格式
   */
  expectErrorResponse: (response: Record<string, unknown>, expectedStatus?: number, expectedMessage?: string) => {
    expect(response).toHaveProperty('success', false);
    expect(response).toHaveProperty('error');
    
    if (expectedStatus) {
      expect(response).toHaveProperty('status', expectedStatus);
    }
    
    if (expectedMessage) {
      expect(response.error).toContain(expectedMessage);
    }
  },
  
  /**
   * 验证成功响应格式
   */
  expectSuccessResponse: (response: Record<string, unknown>, expectedData?: Record<string, unknown>) => {
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    
    if (expectedData) {
      expect(response.data).toMatchObject(expectedData);
    }
  },
  
  /**
   * 模拟异步错误
   */
  createAsyncError: (message: string, delay = 0) => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), delay);
    });
  },
  
  /**
   * 模拟网络延迟
   */
  simulateNetworkDelay: (min = 100, max = 500) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return testUtils.wait(delay);
  },
  
  /**
   * 清理测试数据
   */
  cleanup: () => {
    // 清理localStorage
    localStorage.clear();
    
    // 清理sessionStorage
    sessionStorage.clear();
    
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 重置fetch模拟
    (global.fetch as jest.Mock).mockReset();
  }
};

// 测试数据库配置
export const testDbConfig = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  },
  redis: {
    url: process.env.REDIS_URL!
  }
};

// 测试环境检查
export const testEnvironment = {
  isTest: process.env.NODE_ENV === 'test',
  isSilent: process.env.SILENT_TESTS === 'true',
  isCI: process.env.CI === 'true'
};

// 性能测试工具
export const performanceUtils = {
  /**
   * 测量函数执行时间
   */
  measureTime: async <T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, duration: end - start };
  },
  
  /**
   * 测量内存使用
   */
  measureMemory: <T>(fn: () => T): { result: T; memoryUsed: number } => {
    const initialMemory = process.memoryUsage().heapUsed;
    const result = fn();
    const finalMemory = process.memoryUsage().heapUsed;
    return { result, memoryUsed: finalMemory - initialMemory };
  },
  
  /**
   * 并发测试
   */
  concurrentTest: async <T>(
    fn: () => Promise<T>,
    concurrency: number,
    iterations: number
  ): Promise<{ results: T[]; totalTime: number; averageTime: number }> => {
    const start = performance.now();
    const promises: Promise<T>[] = [];
    
    for (let i = 0; i < iterations; i++) {
      if (promises.length >= concurrency) {
        await Promise.race(promises);
        promises.splice(promises.findIndex(p => p), 1);
      }
      promises.push(fn());
    }
    
    const results = await Promise.all(promises);
    const end = performance.now();
    const totalTime = end - start;
    
    return {
      results,
      totalTime,
      averageTime: totalTime / iterations
    };
  }
};

// 全局测试钩子
beforeEach(() => {
  // 每个测试前重置模拟
  jest.clearAllMocks();
  
  // 重置fetch模拟
  (global.fetch as jest.Mock).mockReset();
  
  // 清理存储
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  // 测试后清理
  testUtils.cleanup();
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  if (!testEnvironment.isSilent) {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

process.on('uncaughtException', (error) => {
  if (!testEnvironment.isSilent) {
    console.error('Uncaught Exception:', error);
  }
});

// 导出原始console（用于调试）
export { originalConsole };

// 测试超时配置
jest.setTimeout(30000); // 30秒超时

// 模拟浏览器环境
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: ''
    },
    navigator: {
      userAgent: 'test-user-agent',
      language: 'zh-CN',
      languages: ['zh-CN', 'en-US']
    },
    document: {
      createElement: jest.fn(() => ({
        getContext: jest.fn(() => ({
          fillStyle: '',
          fillRect: jest.fn(),
          toDataURL: jest.fn(() => 'data:image/jpeg;base64,test')
        })),
        width: 0,
        height: 0,
        toDataURL: jest.fn(() => 'data:image/jpeg;base64,test')
      }))
    }
  },
  writable: true
});

// 导出document对象
Object.defineProperty(global, 'document', {
  value: global.window.document,
  writable: true
});

console.log('🧪 Test environment setup completed');