/**
 * 商品服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 商品创建和管理
 * 2. 商品信息更新
 * 3. 商品分类管理
 * 4. 商品库存管理
 * 5. 商品价格管理
 * 6. 商品搜索和筛选
 * 7. 商品评价管理
 * 8. 商品推荐算法
 * 9. 商品统计和分析
 * 10. 错误处理和缓存机制
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';
import { envConfig } from '@/utils/envConfig';
import { errorHandler } from '@/utils/errorHandler';
import { monitoringService } from '@/services/monitoringService';
import { userService } from '@/services/userService';
import { cloudStorageService } from '@/services/cloudStorageService';
import { aiService } from '@/services/aiService';
import { inventoryService } from '@/services/inventoryService';
import { categoryService } from '@/services/categoryService';
import { reviewService } from '@/services/reviewService';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { Decimal } from 'decimal.js';
import moment from 'moment';
import { Client as ElasticsearchClient } from 'elasticsearch';
import { createClient as createRedisClient } from 'redis';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/userService');
jest.mock('@/services/cloudStorageService');
jest.mock('@/services/aiService');
jest.mock('@/services/inventoryService');
jest.mock('@/services/categoryService');
jest.mock('@/services/reviewService');
jest.mock('@supabase/supabase-js');
jest.mock('node:crypto');
jest.mock('node:fs/promises');
jest.mock('node:path');
jest.mock('sharp');
jest.mock('elasticsearch');
jest.mock('redis');
jest.mock('decimal.js');
jest.mock('moment');

const mockEnvConfig = {
  PRODUCT_IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  PRODUCT_IMAGE_MAX_COUNT: 10,
  PRODUCT_CACHE_TTL: 3600,
  PRODUCT_SEARCH_LIMIT: 100,
  PRODUCT_BATCH_SIZE: 50,
  ELASTICSEARCH_INDEX: 'products',
  REDIS_CACHE_PREFIX: 'product:'
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
  generateThumbnail: jest.fn(),
  getFileUrl: jest.fn()
};

const mockAiService = {
  generateProductDescription: jest.fn(),
  extractProductFeatures: jest.fn(),
  generateProductTags: jest.fn(),
  analyzeProductImage: jest.fn(),
  recommendProducts: jest.fn()
};

const mockInventoryService = {
  getStock: jest.fn(),
  updateStock: jest.fn(),
  checkAvailability: jest.fn(),
  reserveStock: jest.fn()
};

const mockCategoryService = {
  getCategoryById: jest.fn(),
  getCategoryTree: jest.fn(),
  validateCategory: jest.fn()
};

const mockReviewService = {
  getProductReviews: jest.fn(),
  getAverageRating: jest.fn(),
  getReviewStats: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
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
  mkdir: jest.fn(),
  stat: jest.fn()
};

const mockPath = {
  join: jest.fn(),
  extname: jest.fn(),
  basename: jest.fn(),
  dirname: jest.fn()
};

const mockSharp = jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
  toFile: jest.fn(),
  metadata: jest.fn()
}));

const mockElasticsearch = {
  Client: jest.fn(() => ({
    index: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    bulk: jest.fn(),
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      putMapping: jest.fn()
    }
  }))
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
    flushdb: jest.fn()
  }))
};

const mockDecimal = jest.fn((value) => ({
  plus: jest.fn().mockReturnThis(),
  minus: jest.fn().mockReturnThis(),
  mul: jest.fn().mockReturnThis(),
  div: jest.fn().mockReturnThis(),
  toNumber: jest.fn().mockReturnValue(parseFloat(value)),
  toString: jest.fn().mockReturnValue(value.toString()),
  toFixed: jest.fn().mockReturnValue(parseFloat(value).toFixed(2))
}));

const mockMoment = jest.fn(() => ({
  format: jest.fn(),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis(),
  isBefore: jest.fn(),
  isAfter: jest.fn(),
  unix: jest.fn(),
  toDate: jest.fn()
}));

// 导入被测试的模块
import {
  ProductService,
  ProductStatus,
  ProductType,
  PriceType,
  Product,
  ProductVariant,
  ProductCategory,
  ProductImage,
  ProductReview,
  ProductStats,
  ProductFilter,
  SearchOptions,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts
} from '@/services/productService';

describe('商品服务模块', () => {
  let productService: ProductService;
  let mockElasticsearchClient: {
    search: jest.MockedFunction<any>;
    index: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  let mockRedisClient: {
    get: jest.MockedFunction<any>;
    set: jest.MockedFunction<any>;
    del: jest.MockedFunction<any>;
    exists: jest.MockedFunction<any>;
    expire: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    jest.mocked(envConfig).mockReturnValue(mockEnvConfig);
    jest.mocked(errorHandler).mockReturnValue(mockErrorHandler);
    jest.mocked(monitoringService).mockReturnValue(mockMonitoringService);
    jest.mocked(userService).mockReturnValue(mockUserService);
    jest.mocked(cloudStorageService).mockReturnValue(mockCloudStorageService);
    jest.mocked(aiService).mockReturnValue(mockAiService);
    jest.mocked(inventoryService).mockReturnValue(mockInventoryService);
    jest.mocked(categoryService).mockReturnValue(mockCategoryService);
    jest.mocked(reviewService).mockReturnValue(mockReviewService);
    jest.mocked(createClient).mockReturnValue(mockSupabase);
    jest.mocked(crypto).mockReturnValue(mockCrypto);
    jest.mocked(fs).mockReturnValue(mockFs);
    jest.mocked(path).mockReturnValue(mockPath);
    jest.mocked(sharp).mockReturnValue(mockSharp);
    jest.mocked(Decimal).mockReturnValue(mockDecimal);
    jest.mocked(moment).mockReturnValue(mockMoment);
    
    // 设置Elasticsearch和Redis模拟
    mockElasticsearchClient = new mockElasticsearch.Client();
    mockRedisClient = mockRedis.createClient();
    jest.mocked(ElasticsearchClient).mockImplementation(mockElasticsearch.Client);
    jest.mocked(createRedisClient).mockImplementation(mockRedis.createClient);
    
    // 创建商品服务实例
    productService = new ProductService({
      imageMaxSize: 5 * 1024 * 1024,
      imageMaxCount: 10,
      cacheTtl: 3600,
      searchLimit: 100,
      batchSize: 50,
      elasticsearchIndex: 'products',
      redisCachePrefix: 'product:'
    });
    
    // 设置默认模拟返回值
    mockCrypto.randomUUID.mockReturnValue('product-uuid-123');
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('random-bytes'));
    mockCrypto.createHash().digest.mockReturnValue('hash-digest');
    
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.extname.mockReturnValue('.jpg');
    mockPath.basename.mockReturnValue('image.jpg');
    
    mockMoment.mockReturnValue({
      format: jest.fn().mockReturnValue('2024-01-01 12:00:00'),
      add: jest.fn().mockReturnThis(),
      subtract: jest.fn().mockReturnThis(),
      isBefore: jest.fn().mockReturnValue(false),
      isAfter: jest.fn().mockReturnValue(false),
      unix: jest.fn().mockReturnValue(1704110400),
      toDate: jest.fn().mockReturnValue(new Date('2024-01-01T12:00:00Z'))
    });
    
    mockUserService.getUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    });
    
    mockUserService.checkUserPermission.mockResolvedValue(true);
    
    mockCategoryService.getCategoryById.mockResolvedValue({
      id: 'category-123',
      name: 'Electronics',
      path: 'electronics',
      level: 1
    });
    
    mockInventoryService.getStock.mockResolvedValue({
      quantity: 100,
      available: 95,
      reserved: 5
    });
    
    mockCloudStorageService.uploadFile.mockResolvedValue({
      success: true,
      url: 'https://cdn.example.com/image.jpg',
      key: 'products/image.jpg'
    });
    
    mockCloudStorageService.generateThumbnail.mockResolvedValue({
      success: true,
      url: 'https://cdn.example.com/thumb_image.jpg'
    });
    
    mockAiService.generateProductDescription.mockResolvedValue({
      success: true,
      description: 'AI generated product description'
    });
    
    mockAiService.generateProductTags.mockResolvedValue({
      success: true,
      tags: ['electronics', 'smartphone', 'mobile']
    });
    
    mockReviewService.getAverageRating.mockResolvedValue({
      rating: 4.5,
      count: 100
    });
    
    mockSupabase.from().select().mockResolvedValue({
      data: [],
      error: null
    });
    
    mockSupabase.from().insert().mockResolvedValue({
      data: [{ id: 'product-123' }],
      error: null
    });
    
    mockSupabase.from().update().mockResolvedValue({
      data: [{ id: 'product-123' }],
      error: null
    });
    
    mockSupabase.from().delete().mockResolvedValue({
      data: [],
      error: null
    });
    
    // 设置Elasticsearch模拟
    mockElasticsearchClient.search.mockResolvedValue({
      body: {
        hits: {
          total: { value: 0 },
          hits: []
        }
      }
    });
    
    mockElasticsearchClient.index.mockResolvedValue({
      body: { _id: 'product-123' }
    });
    
    // 设置Redis模拟
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
  });

  afterEach(() => {
    if (productService) {
      productService.destroy();
    }
  });

  describe('服务初始化', () => {
    it('应该正确初始化商品服务', () => {
      expect(productService).toBeDefined();
      expect(productService.config.imageMaxSize).toBe(5 * 1024 * 1024);
      expect(productService.config.imageMaxCount).toBe(10);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new ProductService({
          imageMaxSize: -1,
          imageMaxCount: 0
        });
      }).toThrow('Invalid product configuration');
    });

    it('应该初始化数据库和搜索引擎连接', () => {
      expect(jest.mocked(createClient)).toHaveBeenCalled();
      expect(mockElasticsearch.Client).toHaveBeenCalled();
      expect(mockRedis.createClient).toHaveBeenCalled();
    });
  });

  describe('商品创建', () => {
    it('应该创建新商品', async () => {
      const productData = {
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone with advanced features',
        categoryId: 'category-123',
        price: 999.99,
        sku: 'IPHONE15PRO001',
        brand: 'Apple',
        tags: ['smartphone', 'apple', 'ios'],
        specifications: {
          color: 'Space Black',
          storage: '256GB',
          display: '6.1 inch'
        },
        images: [
          {
            url: 'https://example.com/image1.jpg',
            alt: 'iPhone 15 Pro front view'
          }
        ],
        variants: [
          {
            name: '256GB Space Black',
            sku: 'IPHONE15PRO001-256-BLACK',
            price: 999.99,
            stock: 50
          }
        ]
      };
      
      const result = await productService.createProduct(productData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.product.id).toBeDefined();
      expect(result.product.name).toBe('iPhone 15 Pro');
      expect(result.product.status).toBe(ProductStatus.DRAFT);
      expect(result.product.sku).toBe('IPHONE15PRO001');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(mockSupabase.from().insert).toHaveBeenCalled();
      
      expect(mockElasticsearchClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'products',
          id: expect.any(String),
          body: expect.objectContaining({
            name: 'iPhone 15 Pro',
            description: 'Latest iPhone with advanced features'
          })
        })
      );
      
      expect(mockMonitoringService.recordMetric)
        .toHaveBeenCalledWith('product_created', 1, {
          categoryId: 'category-123',
          price: 999.99
        });
    });

    it('应该验证商品数据', async () => {
      const invalidProductData = {
        name: '', // 空名称
        price: -100, // 负价格
        categoryId: 'invalid-category'
      };
      
      const result = await productService.createProduct(invalidProductData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid product data');
    });

    it('应该检查SKU唯一性', async () => {
      mockSupabase.from().select().single.mockResolvedValue({
        data: { id: 'existing-product', sku: 'DUPLICATE-SKU' },
        error: null
      });
      
      const productData = {
        name: 'Test Product',
        sku: 'DUPLICATE-SKU',
        price: 99.99,
        categoryId: 'category-123'
      };
      
      const result = await productService.createProduct(productData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('SKU already exists');
    });

    it('应该处理商品图片上传', async () => {
      const productData = {
        name: 'Test Product',
        price: 99.99,
        categoryId: 'category-123',
        images: [
          {
            file: Buffer.from('image-data'),
            filename: 'product.jpg',
            mimetype: 'image/jpeg'
          }
        ]
      };
      
      const result = await productService.createProduct(productData, 'user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockCloudStorageService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: Buffer.from('image-data'),
          filename: 'product.jpg',
          mimetype: 'image/jpeg'
        }),
        expect.objectContaining({
          folder: 'products'
        })
      );
      
      expect(mockCloudStorageService.generateThumbnail).toHaveBeenCalled();
    });

    it('应该使用AI生成商品描述', async () => {
      const productData = {
        name: 'iPhone 15 Pro',
        categoryId: 'category-123',
        price: 999.99,
        useAiDescription: true,
        specifications: {
          color: 'Space Black',
          storage: '256GB'
        }
      };
      
      const result = await productService.createProduct(productData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.product.description).toBe('AI generated product description');
      
      expect(mockAiService.generateProductDescription).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'iPhone 15 Pro',
          specifications: productData.specifications
        })
      );
      
      expect(mockAiService.generateProductTags).toHaveBeenCalled();
    });
  });

  describe('商品信息管理', () => {
    it('应该获取商品详情', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        status: ProductStatus.ACTIVE,
        categoryId: 'category-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockProduct,
        error: null
      });
      
      // 模拟缓存未命中
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await productService.getProduct('product-123');
      
      expect(result.success).toBe(true);
      expect(result.product.id).toBe('product-123');
      expect(result.product.name).toBe('iPhone 15 Pro');
      
      // 应该缓存结果
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'product:product-123',
        JSON.stringify(mockProduct),
        'EX',
        3600
      );
    });

    it('应该从缓存获取商品', async () => {
      const cachedProduct = {
        id: 'product-123',
        name: 'iPhone 15 Pro',
        price: 999.99
      };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedProduct));
      
      const result = await productService.getProduct('product-123');
      
      expect(result.success).toBe(true);
      expect(result.product.id).toBe('product-123');
      
      // 不应该查询数据库
      expect(mockSupabase.from().select).not.toHaveBeenCalled();
    });

    it('应该更新商品信息', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'iPhone 15 Pro',
        status: ProductStatus.ACTIVE,
        createdBy: 'user-123'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockProduct,
        error: null
      });
      
      const updateData = {
        name: 'iPhone 15 Pro Max',
        price: 1099.99,
        description: 'Updated description'
      };
      
      const result = await productService.updateProduct('product-123', updateData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.product.name).toBe('iPhone 15 Pro Max');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'iPhone 15 Pro Max',
          price: 1099.99,
          description: 'Updated description',
          updatedAt: expect.any(Date)
        })
      );
      
      // 应该更新搜索索引
      expect(mockElasticsearchClient.update).toHaveBeenCalled();
      
      // 应该清除缓存
      expect(mockRedisClient.del).toHaveBeenCalledWith('product:product-123');
    });

    it('应该验证更新权限', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'iPhone 15 Pro',
        createdBy: 'user-456' // 不同用户
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockProduct,
        error: null
      });
      
      mockUserService.checkUserPermission.mockResolvedValue(false);
      
      const updateData = {
        name: 'Updated Name'
      };
      
      const result = await productService.updateProduct('product-123', updateData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('应该删除商品', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'iPhone 15 Pro',
        createdBy: 'user-123',
        images: [
          { url: 'https://cdn.example.com/image1.jpg', key: 'products/image1.jpg' }
        ]
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockProduct,
        error: null
      });
      
      const result = await productService.deleteProduct('product-123', 'user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      
      // 应该删除搜索索引
      expect(mockElasticsearchClient.delete).toHaveBeenCalledWith({
        index: 'products',
        id: 'product-123'
      });
      
      // 应该删除图片文件
      expect(mockCloudStorageService.deleteFile).toHaveBeenCalledWith('products/image1.jpg');
      
      // 应该清除缓存
      expect(mockRedisClient.del).toHaveBeenCalledWith('product:product-123');
    });
  });

  describe('商品搜索和筛选', () => {
    it('应该搜索商品', async () => {
      const mockSearchResults = {
        body: {
          hits: {
            total: { value: 2 },
            hits: [
              {
                _id: 'product-1',
                _source: {
                  name: 'iPhone 15 Pro',
                  price: 999.99,
                  categoryId: 'category-123'
                }
              },
              {
                _id: 'product-2',
                _source: {
                  name: 'iPhone 15',
                  price: 799.99,
                  categoryId: 'category-123'
                }
              }
            ]
          }
        }
      };
      
      mockElasticsearchClient.search.mockResolvedValue(mockSearchResults);
      
      const filter: ProductFilter = {
        keyword: 'iPhone',
        categoryId: 'category-123',
        priceRange: {
          min: 500,
          max: 1500
        },
        status: ProductStatus.ACTIVE
      };
      
      const options: SearchOptions = {
        limit: 20,
        offset: 0,
        sortBy: 'price',
        sortOrder: 'asc'
      };
      
      const result = await productService.searchProducts(filter, options);
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'products',
          body: expect.objectContaining({
            query: expect.any(Object),
            sort: expect.any(Array),
            from: 0,
            size: 20
          })
        })
      );
    });

    it('应该支持全文搜索', async () => {
      const mockSearchResults = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'product-1',
                _source: {
                  name: 'iPhone 15 Pro',
                  description: 'Advanced smartphone with Pro features'
                },
                highlight: {
                  name: ['<em>iPhone</em> 15 Pro'],
                  description: ['Advanced <em>smartphone</em> with Pro features']
                }
              }
            ]
          }
        }
      };
      
      mockElasticsearchClient.search.mockResolvedValue(mockSearchResults);
      
      const result = await productService.searchProducts({
        keyword: 'iPhone smartphone',
        searchType: 'fulltext'
      });
      
      expect(result.success).toBe(true);
      expect(result.products[0].highlights).toBeDefined();
    });

    it('应该支持分面搜索', async () => {
      const mockSearchResults = {
        body: {
          hits: {
            total: { value: 10 },
            hits: []
          },
          aggregations: {
            categories: {
              buckets: [
                { key: 'category-123', doc_count: 5 },
                { key: 'category-456', doc_count: 3 }
              ]
            },
            brands: {
              buckets: [
                { key: 'Apple', doc_count: 4 },
                { key: 'Samsung', doc_count: 3 }
              ]
            },
            price_ranges: {
              buckets: [
                { key: '0-500', doc_count: 2 },
                { key: '500-1000', doc_count: 6 },
                { key: '1000+', doc_count: 2 }
              ]
            }
          }
        }
      };
      
      mockElasticsearchClient.search.mockResolvedValue(mockSearchResults);
      
      const result = await productService.searchProducts({
        keyword: 'smartphone'
      }, {
        includeFacets: true
      });
      
      expect(result.success).toBe(true);
      expect(result.facets).toBeDefined();
      expect(result.facets.categories).toHaveLength(2);
      expect(result.facets.brands).toHaveLength(2);
    });

    it('应该支持智能推荐', async () => {
      mockAiService.recommendProducts.mockResolvedValue({
        success: true,
        products: [
          {
            id: 'product-1',
            score: 0.95,
            reason: 'Similar to viewed products'
          },
          {
            id: 'product-2',
            score: 0.87,
            reason: 'Popular in category'
          }
        ]
      });
      
      const result = await productService.getRecommendations('user-123', {
        type: 'personalized',
        limit: 10,
        context: {
          viewedProducts: ['product-456'],
          categoryId: 'category-123'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].score).toBe(0.95);
      
      expect(mockAiService.recommendProducts).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          type: 'personalized',
          limit: 10
        })
      );
    });
  });

  describe('商品分类管理', () => {
    it('应该获取分类商品', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'iPhone 15',
          categoryId: 'category-123'
        },
        {
          id: 'product-2',
          name: 'iPhone 15 Pro',
          categoryId: 'category-123'
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockProducts,
        error: null
      });
      
      const result = await productService.getProductsByCategory('category-123', {
        limit: 20,
        sortBy: 'name'
      });
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(2);
      
      expect(mockSupabase.from().select().eq)
        .toHaveBeenCalledWith('categoryId', 'category-123');
    });

    it('应该获取分类树形商品', async () => {
      mockCategoryService.getCategoryTree.mockResolvedValue({
        success: true,
        tree: {
          id: 'category-123',
          name: 'Electronics',
          children: [
            {
              id: 'category-456',
              name: 'Smartphones',
              children: []
            }
          ]
        }
      });
      
      const result = await productService.getCategoryProductTree('category-123');
      
      expect(result.success).toBe(true);
      expect(result.tree.children).toBeDefined();
    });
  });

  describe('商品价格管理', () => {
    it('应该更新商品价格', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'iPhone 15 Pro',
        price: 999.99,
        createdBy: 'user-123'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockProduct,
        error: null
      });
      
      const priceData = {
        price: 899.99,
        comparePrice: 999.99,
        priceType: PriceType.SALE,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后
      };
      
      const result = await productService.updatePrice('product-123', priceData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.product.price).toBe(899.99);
      expect(result.product.comparePrice).toBe(999.99);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 899.99,
          comparePrice: 999.99,
          priceType: PriceType.SALE
        })
      );
      
      // 应该记录价格历史
      expect(mockSupabase.from).toHaveBeenCalledWith('product_price_history');
    });

    it('应该批量更新价格', async () => {
      const priceUpdates = [
        {
          productId: 'product-1',
          price: 899.99,
          priceType: PriceType.SALE
        },
        {
          productId: 'product-2',
          price: 699.99,
          priceType: PriceType.SALE
        }
      ];
      
      const result = await productService.batchUpdatePrices(priceUpdates, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      
      expect(mockSupabase.from().update).toHaveBeenCalledTimes(2);
    });

    it('应该获取价格历史', async () => {
      const mockPriceHistory = [
        {
          id: 'history-1',
          productId: 'product-123',
          oldPrice: 999.99,
          newPrice: 899.99,
          priceType: PriceType.SALE,
          changedAt: new Date(),
          changedBy: 'user-123'
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockPriceHistory,
        error: null
      });
      
      const result = await productService.getPriceHistory('product-123');
      
      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].oldPrice).toBe(999.99);
      expect(result.history[0].newPrice).toBe(899.99);
    });
  });

  describe('商品评价管理', () => {
    it('应该获取商品评价', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          productId: 'product-123',
          userId: 'user-456',
          rating: 5,
          comment: 'Excellent product!',
          createdAt: new Date()
        }
      ];
      
      mockReviewService.getProductReviews.mockResolvedValue({
        success: true,
        reviews: mockReviews,
        total: 1
      });
      
      const result = await productService.getProductReviews('product-123', {
        limit: 10,
        sortBy: 'createdAt'
      });
      
      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].rating).toBe(5);
    });

    it('应该获取评价统计', async () => {
      const mockStats = {
        averageRating: 4.5,
        totalReviews: 100,
        ratingDistribution: {
          5: 60,
          4: 25,
          3: 10,
          2: 3,
          1: 2
        }
      };
      
      mockReviewService.getReviewStats.mockResolvedValue({
        success: true,
        stats: mockStats
      });
      
      const result = await productService.getReviewStats('product-123');
      
      expect(result.success).toBe(true);
      expect(result.stats.averageRating).toBe(4.5);
      expect(result.stats.totalReviews).toBe(100);
    });
  });

  describe('商品统计和分析', () => {
    it('应该获取商品统计', async () => {
      const mockStats = {
        totalProducts: 1000,
        activeProducts: 850,
        draftProducts: 100,
        inactiveProducts: 50,
        averagePrice: 299.99,
        totalValue: 254991.50,
        topCategories: [
          { categoryId: 'category-123', count: 200 },
          { categoryId: 'category-456', count: 150 }
        ],
        topBrands: [
          { brand: 'Apple', count: 100 },
          { brand: 'Samsung', count: 80 }
        ]
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null
      });
      
      const result = await productService.getProductStats({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });
      
      expect(result.success).toBe(true);
      expect(result.stats.totalProducts).toBe(1000);
      expect(result.stats.averagePrice).toBe(299.99);
    });

    it('应该分析商品趋势', async () => {
      const mockTrendData = [
        {
          date: '2024-01-01',
          created: 10,
          updated: 5,
          views: 1000
        },
        {
          date: '2024-01-02',
          created: 15,
          updated: 8,
          views: 1200
        }
      ];
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockTrendData,
        error: null
      });
      
      const result = await productService.analyzeProductTrends({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        interval: 'day'
      });
      
      expect(result.success).toBe(true);
      expect(result.trends).toHaveLength(2);
      expect(result.growth).toBeDefined();
    });

    it('应该生成商品报告', async () => {
      const result = await productService.generateProductReport({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        format: 'json',
        includeDetails: true,
        categories: ['category-123']
      });
      
      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.summary).toBeDefined();
      expect(result.report.details).toBeDefined();
    });
  });

  describe('便捷函数', () => {
    beforeEach(() => {
      // 设置全局服务实例
      global.productService = productService;
    });

    it('createProduct 函数应该正常工作', async () => {
      const productData = {
        name: 'Test Product',
        price: 99.99,
        categoryId: 'category-123'
      };
      
      const result = await createProduct(productData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('getProduct 函数应该正常工作', async () => {
      const mockProduct = {
        id: 'product-123',
        name: 'Test Product'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockProduct,
        error: null
      });
      
      const result = await getProduct('product-123');
      
      expect(result.success).toBe(true);
      expect(result.product.id).toBe('product-123');
    });

    it('searchProducts 函数应该正常工作', async () => {
      const mockSearchResults = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'product-1',
                _source: { name: 'Test Product' }
              }
            ]
          }
        }
      };
      
      mockElasticsearchClient.search.mockResolvedValue(mockSearchResults);
      
      const result = await searchProducts({ keyword: 'test' });
      
      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
    });
  });

  describe('错误处理和缓存机制', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      const productData = {
        name: 'Test Product',
        price: 99.99,
        categoryId: 'category-123'
      };
      
      const result = await productService.createProduct(productData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      
      expect(mockMonitoringService.recordError)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'database_error'
        }));
    });

    it('应该处理搜索引擎错误', async () => {
      mockElasticsearchClient.search.mockRejectedValue(
        new Error('Elasticsearch connection failed')
      );
      
      const result = await productService.searchProducts({ keyword: 'test' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Search service unavailable');
    });

    it('应该处理缓存错误', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const mockProduct = {
        id: 'product-123',
        name: 'Test Product'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockProduct,
        error: null
      });
      
      // 即使缓存失败，也应该能从数据库获取数据
      const result = await productService.getProduct('product-123');
      
      expect(result.success).toBe(true);
      expect(result.product.id).toBe('product-123');
    });

    it('应该处理图片上传错误', async () => {
      mockCloudStorageService.uploadFile.mockResolvedValue({
        success: false,
        error: 'Upload failed'
      });
      
      const productData = {
        name: 'Test Product',
        price: 99.99,
        categoryId: 'category-123',
        images: [
          {
            file: Buffer.from('image-data'),
            filename: 'product.jpg'
          }
        ]
      };
      
      const result = await productService.createProduct(productData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Image upload failed');
    });

    it('应该自动清理过期缓存', async () => {
      const result = await productService.cleanExpiredCache();
      
      expect(result.success).toBe(true);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('product:*');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量商品搜索', async () => {
      const mockSearchResults = {
        body: {
          hits: {
            total: { value: 10000 },
            hits: Array.from({ length: 100 }, (_, i) => ({
              _id: `product-${i}`,
              _source: {
                name: `Product ${i}`,
                price: 99.99
              }
            }))
          }
        }
      };
      
      mockElasticsearchClient.search.mockResolvedValue(mockSearchResults);
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return productService.searchProducts({ keyword: 'product' }, { limit: 100 });
      });
      
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该优化批量商品操作性能', async () => {
      const products = Array.from({ length: 100 }, (_, i) => ({
        name: `Product ${i}`,
        price: 99.99,
        categoryId: 'category-123'
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return productService.batchCreateProducts(products, 'user-123');
      });
      
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该优化缓存性能', async () => {
      // 预热缓存
      const productIds = Array.from({ length: 50 }, (_, i) => `product-${i}`);
      
      for (const id of productIds) {
        mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
          id,
          name: `Product ${id}`,
          price: 99.99
        }));
      }
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        const promises = productIds.map(id => productService.getProduct(id));
        return Promise.all(promises);
      });
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});