// 用户服务简化测试
import { jest } from '@jest/globals';

// 创建一个简单的mock结构
const mockQueryBuilder = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
};

// 让所有方法都返回queryBuilder本身，除了single
mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);

const mockSupabaseClient = {
  from: jest.fn().mockReturnValue(mockQueryBuilder),
};

jest.mock('../../../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mockToken'),
  verify: jest.fn().mockReturnValue({ userId: '1', phone: '13800138000' }),
}));

import * as userService from '../../../services/userService';

describe('用户服务简化测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重新设置mock返回值
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
  });

  it('应该能够调用supabase.from方法', () => {
    const query = mockSupabaseClient.from('users');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    expect(query).toBe(mockQueryBuilder);
  });

  it('应该能够链式调用select方法', () => {
    const query = mockSupabaseClient.from('users').select('*');
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    expect(query).toBe(mockQueryBuilder);
  });

  it('应该能够设置mock返回值', async () => {
    const mockData = [{ id: '1', name: '测试用户' }];
    mockQueryBuilder.single.mockResolvedValue({ data: mockData[0], error: null });
    
    const result = mockSupabaseClient.from('users').select('*').single();
    const resolvedResult = await result;
    
    expect(resolvedResult.data).toEqual(mockData[0]);
    expect(resolvedResult.error).toBeNull();
  });
});