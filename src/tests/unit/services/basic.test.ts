/**
 * 基础服务测试
 * 验证核心服务函数的基本功能
 */

import { jest } from '@jest/globals';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    getUser: jest.fn()
  },
  rpc: jest.fn()
};

// Mock modules
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

// Import services after mocking
import { userService } from '@/services/userService';
import { questionService } from '@/services/questionService';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Test utilities
const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  phone: '13800138000',
  name: '测试用户',
  userType: 'basic',
  isVerified: true,
  faceVerified: false,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  ...overrides
});

const createMockQuery = (data: any, error: any) => ({
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
});

describe('基础服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('用户服务', () => {
    it('应该能够获取用户列表', async () => {
      const mockUsers = [createMockUser()];
      const mockQuery = createMockQuery({ users: mockUsers, total: 1 }, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUsers({});

      expect(result).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('应该能够登录用户', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '13800138000',
        password_hash: 'hashed-password',
        name: '测试用户',
        user_type: 'basic',
        is_verified: true,
        face_verified: false,
        avatar_url: null,
        created_at: new Date().toISOString()
      };

      const mockQuery = createMockQuery(mockUser, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await userService.loginUser('13800138000', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });
  });

  describe('题目服务', () => {
    it('应该能够获取题目列表', async () => {
      const mockQuestions = [
        {
          id: 'q1',
          title: '测试题目',
          type: 'single_choice',
          content: '这是一个测试题目',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          score: 10
        }
      ];

      const mockQuery = createMockQuery(mockQuestions, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.getQuestions();

      expect(result).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('questions');
    });
  });
});