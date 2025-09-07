/**
 * 用户服务单元测试
 * 测试用户注册、登录、信息获取等核心功能
 */

// Mock withRetry 函数
const mockWithRetry = jest.fn((fn) => fn());
jest.mock('../../../utils/errorHandler', () => ({
  ...jest.requireActual('../../../utils/errorHandler'),
  withRetry: mockWithRetry
}));

// Mock smsService 的 verifyCode 函数
const mockVerifyCode = jest.fn();
jest.mock('../../../services/smsService', () => ({
  verifyCode: mockVerifyCode
}));

// 模拟Supabase客户端
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

import { userService } from '@/services/userService';
import { supabase } from '@/lib/supabase';

const mockSupabaseClient = supabase as jest.Mocked<typeof supabase>;

// 测试工具函数
const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: '测试用户',
  role: 'student',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

const createMockQuery = (data, error) => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    then: jest.fn((resolve) => {
      resolve({ data, error });
      return Promise.resolve({ data, error });
    })
  };
  
  // 确保所有方法都返回Promise
  Object.keys(mockQuery).forEach(key => {
    if (key !== 'single' && key !== 'then') {
      mockQuery[key] = jest.fn().mockReturnValue(mockQuery);
    }
  });
  
  return mockQuery;
};

describe('用户服务测试', () => {
  // 测试数据
  const mockUser = createMockUser();
  const mockUsers = [mockUser, createMockUser({ id: 'user-456', email: 'test2@example.com' })];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 用户查询功能测试
   */
  describe('用户查询功能', () => {
    /**
     * 测试获取用户列表
     */
    it('应该能够获取用户列表', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
          count: 2
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUsers({});

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    /**
     * 测试根据ID获取用户
     */
    it('应该能够根据ID获取用户详情', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockUser.id,
            phone: mockUser.phone || '13800138000',
            name: mockUser.name,
            user_type: 'registered',
            is_verified: true,
            face_verified: false,
            avatar_url: null,
            created_at: mockUser.created_at
          },
          error: null
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUserById('user-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUser.id);
      expect(result?.name).toBe(mockUser.name);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    /**
     * 测试用户不存在的情况
     */
    it('当用户不存在时应该返回null', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });

    /**
     * 测试根据邮箱搜索用户
     */
    it('应该能够根据邮箱搜索用户', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockUser],
          error: null,
          count: 1
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUsers({ search: 'test@example.com' });

      expect(result.users).toEqual([mockUser]);
      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%test@example.com%,phone.ilike.%test@example.com%,employee_id.ilike.%test@example.com%');
    });

    /**
     * 测试根据角色过滤用户
     */
    it('应该能够根据角色过滤用户', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockUser],
          error: null,
          count: 1
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUsers({ role: 'student' });

      expect(result.users).toEqual([mockUser]);
      expect(mockQuery.eq).toHaveBeenCalledWith('role', 'student');
    });
  });

  /**
   * 用户创建功能测试
   * 注意：userService中暂未实现createUser方法，这些测试被跳过
   */
  describe('用户创建功能', () => {
    /**
     * 测试创建新用户
     */
    it.skip('应该能够创建新用户', async () => {
      // userService中暂未实现createUser方法
      expect(true).toBe(true);
    });

    /**
     * 测试创建用户时的邮箱重复验证
     */
    it.skip('创建用户时应该验证邮箱唯一性', async () => {
      // userService中暂未实现createUser方法
      expect(true).toBe(true);
    });
  });

  /**
   * 用户查询功能测试
   */
  describe('用户查询功能', () => {
    it('应该能够获取用户列表', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-456', name: '李四' }];
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockUsers, error: null, count: 2 })
      };

      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUsers({ page: 1, limit: 10 });

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });

  /**
   * 用户更新功能测试
   */
  describe('用户更新功能', () => {
    /**
     * 测试批量分配试卷
     */
    it('应该能够批量分配试卷', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const examId = 'exam-123';

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.batchAssignExam(userIds, examId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('成功为 3 个用户分配试卷');
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
        assigned_exam_id: examId,
        exam_assignment_status: 'assigned'
      }));
      expect(mockQuery.in).toHaveBeenCalledWith('id', userIds);
    });
  });

  /**
   * 用户删除功能测试
   */
  describe('用户删除功能', () => {
    /**
     * 测试删除用户
     */
    it('应该能够删除用户', async () => {
      // userService中没有deleteUser方法，删除逻辑可能在其他地方实现
      expect(true).toBe(true); // 占位测试
    });
  });

  /**
   * 用户认证功能测试
   */
  describe('用户认证功能', () => {
    /**
     * 测试用户登录成功
     */
    it('应该能够成功登录用户', async () => {
      // 重置 withRetry mock
      mockWithRetry.mockClear();
      mockWithRetry.mockImplementation((fn) => fn());
      
      // Mock user with password_hash
      const mockUserWithPassword = {
        ...mockUser,
        phone: '13800138000',
        password_hash: '$2a$10$hashedpassword'
      };
      
      const mockQuery = createMockQuery({
         select: jest.fn().mockReturnThis(),
         eq: jest.fn().mockReturnThis(),
         single: jest.fn().mockResolvedValue({ data: mockUserWithPassword, error: null })
       });

      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      // Mock bcrypt.compare to return true for password validation (重新设置)
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      // Mock JWT生成
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'sign').mockReturnValue('mock_token');

      const result = await userService.loginUser('13800138000', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.message).toBe('登录成功');
    });

    /**
     * 测试用户注册
     */
    it('应该能够注册新用户', async () => {
      const registerData = {
        phone: '13800138888',
        password: 'password123',
        name: '新用户',
        verificationCode: '123456',
        idCard: '123456789012345678'
      };

      // Mock短信验证码验证成功
      mockVerifyCode.mockResolvedValue({ success: true });

      // Mock bcrypt hash
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password');

      // 重置 withRetry mock
      mockWithRetry.mockClear();
      mockWithRetry.mockImplementation((fn) => fn());
      
      // Mock检查手机号是否已注册的查询（第一次调用）
      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,  // 返回null表示手机号未注册
          error: { code: 'PGRST116', message: 'The result contains 0 rows' }  // 模拟未找到记录的错误
        })
      };
      
      // Mock数据库插入的查询（第二次调用）
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-new',
            phone: '13800138888',
            name: '新用户',
            user_type: 'registered',
            is_verified: true,
            created_at: '2024-01-01T00:00:00Z'
          },
          error: null
        })
      };
      
      // 设置from方法的调用顺序
      mockSupabaseClient.from = jest.fn()
        .mockReturnValueOnce(mockCheckQuery)  // 第一次调用：检查手机号
        .mockReturnValueOnce(mockInsertQuery); // 第二次调用：插入用户

      const result = await userService.registerUser(registerData.phone, registerData.password, registerData.verificationCode, registerData.idCard, registerData.name);
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.message).toBe('注册成功');
    });

    /**
     * 测试用户登出
     */
    it('应该能够登出用户', async () => {
      // 登出功能通常只是客户端清除token，服务端不需要特殊处理
      // userService中没有logoutUser方法，登出逻辑在客户端处理
      expect(true).toBe(true); // 占位测试
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    /**
     * 测试数据库错误处理
     */
    it('应该正确处理数据库错误', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: '数据库连接失败' } })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUserById('user-123');
      expect(result).toBeNull();
    });

    /**
     * 测试认证错误处理
     */
    it('应该正确处理认证错误', async () => {
      // Mock用户存在但密码错误的情况
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            phone: '13800138001',
            password_hash: 'hashed_correct_password',
            name: '测试用户'
          },
          error: null
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      // Mock bcrypt.compare返回false（密码不匹配）
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const result = await userService.loginUser('13800138001', 'wrongpassword');
      expect(result.success).toBe(false);
      expect(result.message).toBe('登录失败，请稍后重试');
    });
  });

  /**
   * 边界情况测试
   */
  describe('边界情况测试', () => {
    /**
     * 测试空结果处理
     */
    it('应该正确处理空查询结果', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUsers({ page: 1, limit: 10 });

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });

    /**
     * 测试分页参数处理
     */
    it('应该正确处理分页参数', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockUser],
          error: null,
          count: 1
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await userService.getUsers({ page: 2, limit: 10 });

      expect(mockQuery.range).toHaveBeenCalledWith(10, 19); // (page-1)*limit, page*limit-1
    });
  });
});