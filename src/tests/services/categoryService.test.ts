/**
 * 分类服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 分类创建和管理
 * 2. 分类层级结构
 * 3. 分类查询和搜索
 * 4. 分类更新和删除
 * 5. 分类排序和移动
 * 6. 分类商品关联
 * 7. 分类统计和分析
 * 8. 分类缓存机制
 * 9. 错误处理和验证
 * 10. 性能优化
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/userService');
jest.mock('@/services/cloudStorageService');
jest.mock('@supabase/supabase-js');
jest.mock('node:crypto');
jest.mock('node:fs/promises');
jest.mock('node:path');
jest.mock('redis');
jest.mock('uuid');
jest.mock('slugify');

const mockEnvConfig = {
  CATEGORY_MAX_DEPTH: 5,
  CATEGORY_CACHE_TTL: 3600,
  CATEGORY_SLUG_LENGTH: 50,
  CATEGORY_IMAGE_MAX_SIZE: 5242880, // 5MB
  CATEGORY_BATCH_SIZE: 100
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordError: jest.fn(),
  recordLatency: jest.fn()
};

const mockErrorHandler = {
  createError: jest.fn(),
  logError: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  checkUserPermission: jest.fn()
};

const mockCloudStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
  generateThumbnail: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn()
  })),
  rpc: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn()
    }))
  }
};

const mockCrypto = {
  randomUUID: jest.fn(),
  randomBytes: jest.fn(),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn()
  }))
};

const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn()
};

const mockPath = {
  join: jest.fn(),
  extname: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn()
};

const mockRedis = {
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    multi: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn()
    }))
  }))
};

const mockUuid = {
  v4: jest.fn()
};

const mockSlugify = jest.fn();

// 导入被测试的模块
import {
  CategoryService,
  CategoryStatus,
  CategoryType,
  Category,
  CategoryTree,
  CategoryStats,
  CategoryPath,
  getCategory,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory
} from '@/services/categoryService';

describe('分类服务模块', () => {
  let categoryService: CategoryService;
  let mockRedisClient: any;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    require('@/utils/envConfig').envConfig = mockEnvConfig;
    require('@/utils/errorHandler').errorHandler = mockErrorHandler;
    require('@/services/monitoringService').monitoringService = mockMonitoringService;
    require('@/services/userService').userService = mockUserService;
    require('@/services/cloudStorageService').cloudStorageService = mockCloudStorageService;
    require('@supabase/supabase-js').createClient = jest.fn(() => mockSupabase);
    require('node:crypto').default = mockCrypto;
    require('node:fs/promises').default = mockFs;
    require('node:path').default = mockPath;
    require('uuid').v4 = mockUuid.v4;
    require('slugify').default = mockSlugify;
    
    // 设置Redis模拟
    mockRedisClient = mockRedis.createClient();
    require('redis').createClient = mockRedis.createClient;
    
    // 创建分类服务实例
    categoryService = new CategoryService({
      maxDepth: 5,
      cacheTtl: 3600,
      slugLength: 50,
      imageMaxSize: 5242880,
      batchSize: 100
    });
    
    // 设置默认模拟返回值
    mockCrypto.randomUUID.mockReturnValue('category-uuid-123');
    mockUuid.v4.mockReturnValue('category-uuid-456');
    mockSlugify.mockReturnValue('test-category');
    
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.extname.mockReturnValue('.jpg');
    mockPath.basename.mockReturnValue('image.jpg');
    
    mockUserService.getUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    });
    
    mockUserService.checkUserPermission.mockResolvedValue(true);
    
    mockCloudStorageService.uploadFile.mockResolvedValue({
      success: true,
      url: 'https://storage.example.com/categories/image.jpg',
      key: 'categories/image.jpg'
    });
    
    mockCloudStorageService.getFileUrl.mockResolvedValue({
      success: true,
      url: 'https://storage.example.com/categories/image.jpg'
    });
    
    mockSupabase.from().select().mockResolvedValue({
      data: [],
      error: null
    });
    
    mockSupabase.from().insert().mockResolvedValue({
      data: [{ id: 'category-123' }],
      error: null
    });
    
    mockSupabase.from().update().mockResolvedValue({
      data: [{ id: 'category-123' }],
      error: null
    });
    
    mockSupabase.from().delete().mockResolvedValue({
      data: [],
      error: null
    });
    
    // 设置Redis模拟
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.hget.mockResolvedValue(null);
    mockRedisClient.hset.mockResolvedValue(1);
  });

  afterEach(() => {
    if (categoryService) {
      categoryService.destroy();
    }
  });

  describe('服务初始化', () => {
    it('应该正确初始化分类服务', () => {
      expect(categoryService).toBeDefined();
      expect(categoryService.config.maxDepth).toBe(5);
      expect(categoryService.config.cacheTtl).toBe(3600);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new CategoryService({
          maxDepth: -1,
          cacheTtl: -1
        });
      }).toThrow('Invalid category configuration');
    });

    it('应该初始化数据库和缓存连接', () => {
      expect(require('@supabase/supabase-js').createClient).toHaveBeenCalled();
      expect(mockRedis.createClient).toHaveBeenCalled();
    });
  });

  describe('分类创建', () => {
    it('应该创建根分类', async () => {
      const categoryData = {
        name: 'Electronics',
        description: 'Electronic products',
        type: CategoryType.PRODUCT,
        status: CategoryStatus.ACTIVE
      };
      
      const result = await categoryService.createCategory(categoryData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.category.name).toBe('Electronics');
      expect(result.category.slug).toBe('test-category');
      expect(result.category.level).toBe(0);
      expect(result.category.parentId).toBeNull();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Electronics',
          slug: 'test-category',
          level: 0,
          parentId: null
        })
      );
    });

    it('应该创建子分类', async () => {
      const parentCategory = {
        id: 'parent-123',
        name: 'Electronics',
        level: 0,
        path: 'electronics'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: parentCategory,
        error: null
      });
      
      const categoryData = {
        name: 'Smartphones',
        description: 'Mobile phones',
        parentId: 'parent-123',
        type: CategoryType.PRODUCT,
        status: CategoryStatus.ACTIVE
      };
      
      const result = await categoryService.createCategory(categoryData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.category.name).toBe('Smartphones');
      expect(result.category.level).toBe(1);
      expect(result.category.parentId).toBe('parent-123');
      expect(result.category.path).toBe('electronics/test-category');
    });

    it('应该验证分类层级深度', async () => {
      const parentCategory = {
        id: 'parent-123',
        name: 'Deep Category',
        level: 4, // 已经是第4级
        path: 'level1/level2/level3/level4'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: parentCategory,
        error: null
      });
      
      const categoryData = {
        name: 'Too Deep',
        parentId: 'parent-123',
        type: CategoryType.PRODUCT
      };
      
      const result = await categoryService.createCategory(categoryData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum category depth exceeded');
    });

    it('应该验证分类名称唯一性', async () => {
      mockSupabase.from().select().mockResolvedValue({
        data: [{ id: 'existing-123', name: 'Electronics' }],
        error: null
      });
      
      const categoryData = {
        name: 'Electronics',
        type: CategoryType.PRODUCT
      };
      
      const result = await categoryService.createCategory(categoryData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Category name already exists');
    });

    it('应该处理分类图片上传', async () => {
      const categoryData = {
        name: 'Electronics',
        description: 'Electronic products',
        type: CategoryType.PRODUCT,
        image: {
          buffer: Buffer.from('fake-image-data'),
          originalname: 'category.jpg',
          mimetype: 'image/jpeg'
        }
      };
      
      const result = await categoryService.createCategory(categoryData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.category.imageUrl).toBe('https://storage.example.com/categories/image.jpg');
      
      expect(mockCloudStorageService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: categoryData.image.buffer,
          originalname: categoryData.image.originalname
        }),
        expect.objectContaining({
          folder: 'categories'
        })
      );
    });
  });

  describe('分类查询', () => {
    it('应该获取分类详情', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic products',
        level: 0,
        parentId: null,
        path: 'electronics',
        status: CategoryStatus.ACTIVE,
        type: CategoryType.PRODUCT,
        imageUrl: 'https://storage.example.com/categories/electronics.jpg',
        productCount: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      // 模拟缓存未命中
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await categoryService.getCategory('category-123');
      
      expect(result.success).toBe(true);
      expect(result.category.id).toBe('category-123');
      expect(result.category.name).toBe('Electronics');
      expect(result.category.productCount).toBe(150);
      
      // 应该缓存结果
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'category:category-123',
        JSON.stringify(mockCategory),
        'EX',
        3600
      );
    });

    it('应该从缓存获取分类', async () => {
      const cachedCategory = {
        id: 'category-123',
        name: 'Electronics',
        slug: 'electronics'
      };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedCategory));
      
      const result = await categoryService.getCategory('category-123');
      
      expect(result.success).toBe(true);
      expect(result.category.id).toBe('category-123');
      
      // 不应该查询数据库
      expect(mockSupabase.from().select).not.toHaveBeenCalled();
    });

    it('应该通过slug获取分类', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics',
        slug: 'electronics'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      const result = await categoryService.getCategoryBySlug('electronics');
      
      expect(result.success).toBe(true);
      expect(result.category.slug).toBe('electronics');
      
      expect(mockSupabase.from().select).toHaveBeenCalled();
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('slug', 'electronics');
    });

    it('应该获取分类列表', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          name: 'Electronics',
          level: 0,
          productCount: 150
        },
        {
          id: 'category-2',
          name: 'Clothing',
          level: 0,
          productCount: 200
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockCategories,
        error: null
      });
      
      const result = await categoryService.getCategories({
        status: CategoryStatus.ACTIVE,
        type: CategoryType.PRODUCT,
        limit: 20,
        offset: 0
      });
      
      expect(result.success).toBe(true);
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe('Electronics');
      expect(result.categories[1].name).toBe('Clothing');
    });

    it('应该搜索分类', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          name: 'Electronics',
          description: 'Electronic products'
        },
        {
          id: 'category-2',
          name: 'Electronic Accessories',
          description: 'Accessories for electronic devices'
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockCategories,
        error: null
      });
      
      const result = await categoryService.searchCategories('electronic', {
        limit: 10,
        includeInactive: false
      });
      
      expect(result.success).toBe(true);
      expect(result.categories).toHaveLength(2);
      
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('name', '%electronic%');
    });
  });

  describe('分类层级结构', () => {
    it('应该获取分类树', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Electronics',
          level: 0,
          parentId: null,
          sortOrder: 1
        },
        {
          id: 'cat-2',
          name: 'Smartphones',
          level: 1,
          parentId: 'cat-1',
          sortOrder: 1
        },
        {
          id: 'cat-3',
          name: 'Laptops',
          level: 1,
          parentId: 'cat-1',
          sortOrder: 2
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockCategories,
        error: null
      });
      
      const result = await categoryService.getCategoryTree({
        maxDepth: 3,
        includeProductCount: true
      });
      
      expect(result.success).toBe(true);
      expect(result.tree).toHaveLength(1); // 一个根分类
      expect(result.tree[0].name).toBe('Electronics');
      expect(result.tree[0].children).toHaveLength(2); // 两个子分类
      expect(result.tree[0].children[0].name).toBe('Smartphones');
      expect(result.tree[0].children[1].name).toBe('Laptops');
    });

    it('应该获取子分类', async () => {
      const mockChildren = [
        {
          id: 'child-1',
          name: 'Smartphones',
          parentId: 'parent-123',
          sortOrder: 1
        },
        {
          id: 'child-2',
          name: 'Tablets',
          parentId: 'parent-123',
          sortOrder: 2
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockChildren,
        error: null
      });
      
      const result = await categoryService.getChildren('parent-123', {
        includeInactive: false,
        sortBy: 'sortOrder'
      });
      
      expect(result.success).toBe(true);
      expect(result.children).toHaveLength(2);
      expect(result.children[0].name).toBe('Smartphones');
      expect(result.children[1].name).toBe('Tablets');
    });

    it('应该获取分类路径', async () => {
      const mockPath = [
        {
          id: 'cat-1',
          name: 'Electronics',
          slug: 'electronics',
          level: 0
        },
        {
          id: 'cat-2',
          name: 'Mobile Devices',
          slug: 'mobile-devices',
          level: 1
        },
        {
          id: 'cat-3',
          name: 'Smartphones',
          slug: 'smartphones',
          level: 2
        }
      ];
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockPath,
        error: null
      });
      
      const result = await categoryService.getCategoryPath('cat-3');
      
      expect(result.success).toBe(true);
      expect(result.path).toHaveLength(3);
      expect(result.path[0].name).toBe('Electronics');
      expect(result.path[2].name).toBe('Smartphones');
    });

    it('应该获取分类祖先', async () => {
      const mockAncestors = [
        {
          id: 'cat-1',
          name: 'Electronics',
          level: 0
        },
        {
          id: 'cat-2',
          name: 'Mobile Devices',
          level: 1
        }
      ];
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockAncestors,
        error: null
      });
      
      const result = await categoryService.getAncestors('cat-3');
      
      expect(result.success).toBe(true);
      expect(result.ancestors).toHaveLength(2);
      expect(result.ancestors[0].name).toBe('Electronics');
      expect(result.ancestors[1].name).toBe('Mobile Devices');
    });

    it('应该获取分类后代', async () => {
      const mockDescendants = [
        {
          id: 'cat-2',
          name: 'Smartphones',
          level: 1
        },
        {
          id: 'cat-3',
          name: 'iPhone',
          level: 2
        },
        {
          id: 'cat-4',
          name: 'Android',
          level: 2
        }
      ];
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockDescendants,
        error: null
      });
      
      const result = await categoryService.getDescendants('cat-1', {
        maxDepth: 2,
        includeInactive: false
      });
      
      expect(result.success).toBe(true);
      expect(result.descendants).toHaveLength(3);
    });
  });

  describe('分类更新', () => {
    it('应该更新分类信息', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics',
        slug: 'electronics',
        level: 0,
        parentId: null
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      const updateData = {
        name: 'Consumer Electronics',
        description: 'Updated description',
        status: CategoryStatus.ACTIVE
      };
      
      const result = await categoryService.updateCategory('category-123', updateData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.category.name).toBe('Consumer Electronics');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Consumer Electronics',
          description: 'Updated description',
          status: CategoryStatus.ACTIVE,
          updatedAt: expect.any(Date)
        })
      );
      
      // 应该清除缓存
      expect(mockRedisClient.del).toHaveBeenCalledWith('category:category-123');
    });

    it('应该更新分类图片', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics',
        imageUrl: 'https://storage.example.com/old-image.jpg'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      const updateData = {
        image: {
          buffer: Buffer.from('new-image-data'),
          originalname: 'new-image.jpg',
          mimetype: 'image/jpeg'
        }
      };
      
      const result = await categoryService.updateCategory('category-123', updateData, 'user-123');
      
      expect(result.success).toBe(true);
      
      // 应该删除旧图片
      expect(mockCloudStorageService.deleteFile).toHaveBeenCalled();
      
      // 应该上传新图片
      expect(mockCloudStorageService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: updateData.image.buffer
        }),
        expect.any(Object)
      );
    });

    it('应该移动分类到新父分类', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Smartphones',
        level: 1,
        parentId: 'old-parent',
        path: 'electronics/smartphones'
      };
      
      const mockNewParent = {
        id: 'new-parent',
        name: 'Mobile Devices',
        level: 1,
        path: 'electronics/mobile-devices'
      };
      
      mockSupabase.from().select().single
        .mockResolvedValueOnce({ data: mockCategory, error: null })
        .mockResolvedValueOnce({ data: mockNewParent, error: null });
      
      const result = await categoryService.moveCategory('category-123', 'new-parent', 'user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'new-parent',
          level: 2, // new parent level + 1
          path: 'electronics/mobile-devices/smartphones'
        })
      );
    });

    it('应该验证移动操作的有效性', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics',
        level: 0
      };
      
      const mockTargetParent = {
        id: 'target-parent',
        name: 'Smartphones',
        level: 4 // 移动后会超过最大深度
      };
      
      mockSupabase.from().select().single
        .mockResolvedValueOnce({ data: mockCategory, error: null })
        .mockResolvedValueOnce({ data: mockTargetParent, error: null });
      
      const result = await categoryService.moveCategory('category-123', 'target-parent', 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum depth exceeded');
    });

    it('应该更新分类排序', async () => {
      const sortUpdates = [
        { id: 'cat-1', sortOrder: 2 },
        { id: 'cat-2', sortOrder: 1 },
        { id: 'cat-3', sortOrder: 3 }
      ];
      
      const result = await categoryService.updateSortOrder(sortUpdates, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      
      expect(mockSupabase.from().update).toHaveBeenCalledTimes(3);
    });
  });

  describe('分类删除', () => {
    it('应该删除叶子分类', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Smartphones',
        level: 2,
        imageUrl: 'https://storage.example.com/smartphones.jpg'
      };
      
      // 模拟没有子分类
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      mockSupabase.from().select().mockResolvedValue({
        data: [], // 没有子分类
        error: null
      });
      
      const result = await categoryService.deleteCategory('category-123', 'user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      
      // 应该删除图片
      expect(mockCloudStorageService.deleteFile).toHaveBeenCalled();
      
      // 应该清除缓存
      expect(mockRedisClient.del).toHaveBeenCalledWith('category:category-123');
    });

    it('应该拒绝删除有子分类的分类', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics',
        level: 0
      };
      
      const mockChildren = [
        { id: 'child-1', name: 'Smartphones' }
      ];
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockChildren, // 有子分类
        error: null
      });
      
      const result = await categoryService.deleteCategory('category-123', 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete category with children');
    });

    it('应该软删除分类', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Smartphones',
        status: CategoryStatus.ACTIVE
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      mockSupabase.from().select().mockResolvedValue({
        data: [], // 没有子分类
        error: null
      });
      
      const result = await categoryService.deleteCategory('category-123', 'user-123', {
        soft: true
      });
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CategoryStatus.DELETED,
          deletedAt: expect.any(Date),
          deletedBy: 'user-123'
        })
      );
    });

    it('应该批量删除分类', async () => {
      const categoryIds = ['cat-1', 'cat-2', 'cat-3'];
      
      // 模拟所有分类都是叶子节点
      mockSupabase.from().select().mockResolvedValue({
        data: [], // 没有子分类
        error: null
      });
      
      const result = await categoryService.batchDeleteCategories(categoryIds, 'user-123', {
        soft: true
      });
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('分类统计', () => {
    it('应该获取分类统计', async () => {
      const mockStats = {
        totalCategories: 150,
        activeCategories: 140,
        inactiveCategories: 8,
        deletedCategories: 2,
        maxDepth: 4,
        averageDepth: 2.3,
        categoriesWithProducts: 120,
        categoriesWithoutProducts: 20,
        totalProducts: 5000
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null
      });
      
      const result = await categoryService.getCategoryStats();
      
      expect(result.success).toBe(true);
      expect(result.stats.totalCategories).toBe(150);
      expect(result.stats.activeCategories).toBe(140);
      expect(result.stats.maxDepth).toBe(4);
    });

    it('应该获取分类商品统计', async () => {
      const mockProductStats = [
        {
          categoryId: 'cat-1',
          categoryName: 'Electronics',
          productCount: 500,
          activeProductCount: 480,
          totalValue: 250000.00
        },
        {
          categoryId: 'cat-2',
          categoryName: 'Clothing',
          productCount: 300,
          activeProductCount: 290,
          totalValue: 150000.00
        }
      ];
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockProductStats,
        error: null
      });
      
      const result = await categoryService.getCategoryProductStats({
        includeChildren: true,
        sortBy: 'productCount',
        sortOrder: 'desc'
      });
      
      expect(result.success).toBe(true);
      expect(result.stats).toHaveLength(2);
      expect(result.stats[0].productCount).toBe(500);
    });

    it('应该分析分类使用情况', async () => {
      const mockUsageData = {
        mostPopularCategories: [
          { categoryId: 'cat-1', name: 'Electronics', productCount: 500 },
          { categoryId: 'cat-2', name: 'Clothing', productCount: 300 }
        ],
        leastUsedCategories: [
          { categoryId: 'cat-10', name: 'Rare Items', productCount: 1 }
        ],
        emptyCategories: [
          { categoryId: 'cat-15', name: 'New Category', productCount: 0 }
        ],
        deepestCategories: [
          { categoryId: 'cat-20', name: 'Deep Item', level: 4 }
        ]
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockUsageData,
        error: null
      });
      
      const result = await categoryService.analyzeCategoryUsage();
      
      expect(result.success).toBe(true);
      expect(result.analysis.mostPopularCategories).toHaveLength(2);
      expect(result.analysis.emptyCategories).toHaveLength(1);
    });
  });

  describe('便捷函数', () => {
    beforeEach(() => {
      // 设置全局服务实例
      global.categoryService = categoryService;
    });

    it('getCategory 函数应该正常工作', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      const result = await getCategory('category-123');
      
      expect(result.success).toBe(true);
      expect(result.category.name).toBe('Electronics');
    });

    it('getCategoryTree 函数应该正常工作', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Electronics',
          level: 0,
          parentId: null
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockCategories,
        error: null
      });
      
      const result = await getCategoryTree();
      
      expect(result.success).toBe(true);
      expect(result.tree).toHaveLength(1);
    });

    it('createCategory 函数应该正常工作', async () => {
      const categoryData = {
        name: 'Electronics',
        type: CategoryType.PRODUCT
      };
      
      const result = await createCategory(categoryData, 'user-123');
      
      expect(result.success).toBe(true);
    });

    it('updateCategory 函数应该正常工作', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      const result = await updateCategory('category-123', {
        name: 'Consumer Electronics'
      }, 'user-123');
      
      expect(result.success).toBe(true);
    });

    it('deleteCategory 函数应该正常工作', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      mockSupabase.from().select().mockResolvedValue({
        data: [], // 没有子分类
        error: null
      });
      
      const result = await deleteCategory('category-123', 'user-123');
      
      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().select().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      const result = await categoryService.getCategory('category-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      
      expect(mockMonitoringService.recordError)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'database_error'
        }));
    });

    it('应该处理缓存错误', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockCategory,
        error: null
      });
      
      // 即使缓存失败，也应该能从数据库获取数据
      const result = await categoryService.getCategory('category-123');
      
      expect(result.success).toBe(true);
      expect(result.category.name).toBe('Electronics');
    });

    it('应该处理图片上传错误', async () => {
      mockCloudStorageService.uploadFile.mockResolvedValue({
        success: false,
        error: 'Upload failed'
      });
      
      const categoryData = {
        name: 'Electronics',
        type: CategoryType.PRODUCT,
        image: {
          buffer: Buffer.from('fake-image-data'),
          originalname: 'category.jpg',
          mimetype: 'image/jpeg'
        }
      };
      
      const result = await categoryService.createCategory(categoryData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload category image');
    });

    it('应该处理循环引用', async () => {
      const mockCategory = {
        id: 'category-123',
        name: 'Electronics'
      };
      
      const mockParent = {
        id: 'parent-123',
        name: 'Parent Category',
        parentId: 'category-123' // 循环引用
      };
      
      mockSupabase.from().select().single
        .mockResolvedValueOnce({ data: mockCategory, error: null })
        .mockResolvedValueOnce({ data: mockParent, error: null });
      
      const result = await categoryService.moveCategory('category-123', 'parent-123', 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Circular reference detected');
    });
  });

  describe('性能测试', () => {
    it('应该高效构建分类树', async () => {
      const mockCategories = Array.from({ length: 1000 }, (_, i) => ({
        id: `cat-${i}`,
        name: `Category ${i}`,
        level: Math.floor(i / 100),
        parentId: i > 0 ? `cat-${Math.floor(i / 10)}` : null,
        sortOrder: i % 10
      }));
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockCategories,
        error: null
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return categoryService.getCategoryTree();
      });
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该优化缓存性能', async () => {
      // 预热缓存
      const categoryIds = Array.from({ length: 100 }, (_, i) => `cat-${i}`);
      
      for (const id of categoryIds) {
        mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
          id,
          name: `Category ${id}`,
          slug: `category-${id}`
        }));
      }
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        const promises = categoryIds.map(id => categoryService.getCategory(id));
        return Promise.all(promises);
      });
      
      expect(duration).toBeLessThan(500); // 应该在0.5秒内完成
    });

    it('应该优化批量操作性能', async () => {
      const categoryData = Array.from({ length: 100 }, (_, i) => ({
        name: `Category ${i}`,
        type: CategoryType.PRODUCT,
        status: CategoryStatus.ACTIVE
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return categoryService.batchCreateCategories(categoryData, 'user-123');
      });
      
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });
  });
});