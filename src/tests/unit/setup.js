// Jest setup file for unit tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'user-123',
    phone: '13800138000',
    name: '测试用户',
    userType: 'basic',
    isVerified: true,
    faceVerified: false,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  createMockQuery: (data, error) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    insert: jest.fn().mockResolvedValue({ data, error }),
    update: jest.fn().mockResolvedValue({ data, error }),
    delete: jest.fn().mockResolvedValue({ data, error }),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis()
  }),
  
  resetAllMocks: () => {
    jest.clearAllMocks();
  }
};