/**
 * 评价服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 评价创建和管理
 * 2. 评价查询和筛选
 * 3. 评价更新和删除
 * 4. 评价统计和分析
 * 5. 评价审核和管理
 * 6. 评价回复功能
 * 7. 评价图片和媒体
 * 8. 评价举报处理
 * 9. 评价缓存机制
 * 10. 错误处理和验证
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/userService');
jest.mock('@/services/productService');
jest.mock('@/services/orderService');
jest.mock('@/services/cloudStorageService');
jest.mock('@/services/notificationService');
jest.mock('@/services/aiService');
jest.mock('@supabase/supabase-js');
jest.mock('node:crypto');
jest.mock('node:fs/promises');
jest.mock('node:path');
jest.mock('redis');
jest.mock('uuid');
jest.mock('moment');
jest.mock('sentiment');

const mockEnvConfig = {
  REVIEW_MAX_LENGTH: 5000,
  REVIEW_MIN_LENGTH: 10,
  REVIEW_IMAGE_MAX_SIZE: 10485760, // 10MB
  REVIEW_IMAGE_MAX_COUNT: 5,
  REVIEW_CACHE_TTL: 1800,
  REVIEW_MODERATION_ENABLED: true,
  REVIEW_AUTO_APPROVE_THRESHOLD: 0.8
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
  checkUserPermission: jest.fn(),
  getUserProfile: jest.fn()
};

const mockProductService = {
  getProduct: jest.fn(),
  updateProductRating: jest.fn()
};

const mockOrderService = {
  getOrder: jest.fn(),
  checkOrderOwnership: jest.fn(),
  hasUserPurchasedProduct: jest.fn()
};

const mockCloudStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
  generateThumbnail: jest.fn(),
  compressImage: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  createNotification: jest.fn()
};

const mockAiService = {
  moderateContent: jest.fn(),
  analyzeSentiment: jest.fn(),
  extractKeywords: jest.fn(),
  detectLanguage: jest.fn()
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
    zadd: jest.fn(),
    zrange: jest.fn(),
    zrem: jest.fn(),
    multi: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      exec: jest.fn()
    }))
  }))
};

const mockUuid = {
  v4: jest.fn()
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(),
  toDate: jest.fn(),
  diff: jest.fn(),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis(),
  isAfter: jest.fn(),
  isBefore: jest.fn()
}));

const mockSentiment = {
  analyze: jest.fn()
};

// 导入被测试的模块
import {
  ReviewService,
  ReviewStatus,
  ReviewType,
  Review,
  ReviewStats,
  ReviewFilter,
  ReviewReply,
  createReview,
  getReview,
  updateReview,
  deleteReview,
  getProductReviews
} from '@/services/reviewService';

describe('评价服务模块', () => {
  let reviewService: ReviewService;
  let mockRedisClient: any;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    require('@/utils/envConfig').envConfig = mockEnvConfig;
    require('@/utils/errorHandler').errorHandler = mockErrorHandler;
    require('@/services/monitoringService').monitoringService = mockMonitoringService;
    require('@/services/userService').userService = mockUserService;
    require('@/services/productService').productService = mockProductService;
    require('@/services/orderService').orderService = mockOrderService;
    require('@/services/cloudStorageService').cloudStorageService = mockCloudStorageService;
    require('@/services/notificationService').notificationService = mockNotificationService;
    require('@/services/aiService').aiService = mockAiService;
    require('@supabase/supabase-js').createClient = jest.fn(() => mockSupabase);
    require('node:crypto').default = mockCrypto;
    require('node:fs/promises').default = mockFs;
    require('node:path').default = mockPath;
    require('uuid').v4 = mockUuid.v4;
    require('moment').default = mockMoment;
    require('sentiment').default = mockSentiment;
    
    // 设置Redis模拟
    mockRedisClient = mockRedis.createClient();
    require('redis').createClient = mockRedis.createClient;
    
    // 创建评价服务实例
    reviewService = new ReviewService({
      maxLength: 5000,
      minLength: 10,
      imageMaxSize: 10485760,
      imageMaxCount: 5,
      cacheTtl: 1800,
      moderationEnabled: true,
      autoApproveThreshold: 0.8
    });
    
    // 设置默认模拟返回值
    mockCrypto.randomUUID.mockReturnValue('review-uuid-123');
    mockUuid.v4.mockReturnValue('review-uuid-456');
    
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.extname.mockReturnValue('.jpg');
    mockPath.basename.mockReturnValue('review-image.jpg');
    
    mockMoment.mockReturnValue({
      format: jest.fn().mockReturnValue('2024-01-15 10:30:00'),
      toDate: jest.fn().mockReturnValue(new Date()),
      diff: jest.fn().mockReturnValue(7),
      add: jest.fn().mockReturnThis(),
      subtract: jest.fn().mockReturnThis(),
      isAfter: jest.fn().mockReturnValue(false),
      isBefore: jest.fn().mockReturnValue(true)
    });
    
    mockUserService.getUserById.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    });
    
    mockUserService.checkUserPermission.mockResolvedValue(true);
    
    mockProductService.getProduct.mockResolvedValue({
      success: true,
      product: {
        id: 'product-123',
        name: 'Test Product',
        status: 'active'
      }
    });
    
    mockOrderService.hasUserPurchasedProduct.mockResolvedValue(true);
    
    mockCloudStorageService.uploadFile.mockResolvedValue({
      success: true,
      url: 'https://storage.example.com/reviews/image.jpg',
      key: 'reviews/image.jpg'
    });
    
    mockAiService.moderateContent.mockResolvedValue({
      success: true,
      approved: true,
      confidence: 0.9,
      reasons: []
    });
    
    mockAiService.analyzeSentiment.mockResolvedValue({
      success: true,
      sentiment: 'positive',
      score: 0.8,
      confidence: 0.9
    });
    
    mockSentiment.analyze.mockReturnValue({
      score: 2,
      comparative: 0.4,
      calculation: [],
      tokens: ['great', 'product'],
      words: ['great'],
      positive: ['great'],
      negative: []
    });
    
    mockSupabase.from().select().mockResolvedValue({
      data: [],
      error: null
    });
    
    mockSupabase.from().insert().mockResolvedValue({
      data: [{ id: 'review-123' }],
      error: null
    });
    
    mockSupabase.from().update().mockResolvedValue({
      data: [{ id: 'review-123' }],
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
    mockRedisClient.zadd.mockResolvedValue(1);
    mockRedisClient.zrange.mockResolvedValue([]);
  });

  afterEach(() => {
    if (reviewService) {
      reviewService.destroy();
    }
  });

  describe('服务初始化', () => {
    it('应该正确初始化评价服务', () => {
      expect(reviewService).toBeDefined();
      expect(reviewService.config.maxLength).toBe(5000);
      expect(reviewService.config.minLength).toBe(10);
      expect(reviewService.config.moderationEnabled).toBe(true);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new ReviewService({
          maxLength: -1,
          minLength: -1
        });
      }).toThrow('Invalid review configuration');
    });

    it('应该初始化数据库和缓存连接', () => {
      expect(require('@supabase/supabase-js').createClient).toHaveBeenCalled();
      expect(mockRedis.createClient).toHaveBeenCalled();
    });
  });

  describe('评价创建', () => {
    it('应该创建商品评价', async () => {
      const reviewData = {
        productId: 'product-123',
        orderId: 'order-123',
        rating: 5,
        title: 'Great product!',
        content: 'This product exceeded my expectations. Highly recommended!',
        type: ReviewType.PRODUCT
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.review.rating).toBe(5);
      expect(result.review.title).toBe('Great product!');
      expect(result.review.status).toBe(ReviewStatus.APPROVED); // 自动审核通过
      
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-123',
          userId: 'user-123',
          rating: 5,
          title: 'Great product!',
          content: expect.any(String)
        })
      );
      
      // 应该更新商品评分
      expect(mockProductService.updateProductRating).toHaveBeenCalledWith('product-123');
    });

    it('应该验证用户购买记录', async () => {
      mockOrderService.hasUserPurchasedProduct.mockResolvedValue(false);
      
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Great product!',
        type: ReviewType.PRODUCT
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User has not purchased this product');
    });

    it('应该验证评价内容长度', async () => {
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Too short', // 少于最小长度
        type: ReviewType.PRODUCT
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Review content too short');
    });

    it('应该处理评价图片上传', async () => {
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Great product with amazing quality!',
        type: ReviewType.PRODUCT,
        images: [
          {
            buffer: Buffer.from('fake-image-data-1'),
            originalname: 'review1.jpg',
            mimetype: 'image/jpeg'
          },
          {
            buffer: Buffer.from('fake-image-data-2'),
            originalname: 'review2.jpg',
            mimetype: 'image/jpeg'
          }
        ]
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.review.images).toHaveLength(2);
      
      expect(mockCloudStorageService.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('应该限制图片数量', async () => {
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Great product!',
        type: ReviewType.PRODUCT,
        images: Array.from({ length: 6 }, (_, i) => ({
          buffer: Buffer.from(`fake-image-data-${i}`),
          originalname: `review${i}.jpg`,
          mimetype: 'image/jpeg'
        }))
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many images');
    });

    it('应该进行内容审核', async () => {
      mockAiService.moderateContent.mockResolvedValue({
        success: true,
        approved: false,
        confidence: 0.9,
        reasons: ['inappropriate_language']
      });
      
      const reviewData = {
        productId: 'product-123',
        rating: 1,
        content: 'This product is terrible and contains inappropriate content!',
        type: ReviewType.PRODUCT
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.review.status).toBe(ReviewStatus.PENDING); // 待审核
      
      expect(mockAiService.moderateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          text: reviewData.content,
          type: 'review'
        })
      );
    });

    it('应该分析评价情感', async () => {
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'This is an absolutely fantastic product! I love it so much!',
        type: ReviewType.PRODUCT
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.review.sentiment).toBe('positive');
      expect(result.review.sentimentScore).toBe(0.8);
      
      expect(mockAiService.analyzeSentiment).toHaveBeenCalledWith(
        reviewData.content
      );
    });

    it('应该防止重复评价', async () => {
      mockSupabase.from().select().mockResolvedValue({
        data: [{
          id: 'existing-review',
          userId: 'user-123',
          productId: 'product-123'
        }],
        error: null
      });
      
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Great product!',
        type: ReviewType.PRODUCT
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User has already reviewed this product');
    });
  });

  describe('评价查询', () => {
    it('应该获取评价详情', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        productId: 'product-123',
        rating: 5,
        title: 'Great product!',
        content: 'This product is amazing!',
        status: ReviewStatus.APPROVED,
        sentiment: 'positive',
        sentimentScore: 0.8,
        images: ['https://storage.example.com/review1.jpg'],
        helpfulCount: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      // 模拟缓存未命中
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await reviewService.getReview('review-123');
      
      expect(result.success).toBe(true);
      expect(result.review.id).toBe('review-123');
      expect(result.review.rating).toBe(5);
      expect(result.review.helpfulCount).toBe(15);
      
      // 应该缓存结果
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'review:review-123',
        JSON.stringify(mockReview),
        'EX',
        1800
      );
    });

    it('应该从缓存获取评价', async () => {
      const cachedReview = {
        id: 'review-123',
        rating: 5,
        title: 'Great product!'
      };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedReview));
      
      const result = await reviewService.getReview('review-123');
      
      expect(result.success).toBe(true);
      expect(result.review.id).toBe('review-123');
      
      // 不应该查询数据库
      expect(mockSupabase.from().select).not.toHaveBeenCalled();
    });

    it('应该获取商品评价列表', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          title: 'Excellent!',
          user: { name: 'John Doe', avatar: 'avatar1.jpg' },
          helpfulCount: 10,
          createdAt: new Date()
        },
        {
          id: 'review-2',
          rating: 4,
          title: 'Good product',
          user: { name: 'Jane Smith', avatar: 'avatar2.jpg' },
          helpfulCount: 5,
          createdAt: new Date()
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReviews,
        error: null
      });
      
      const result = await reviewService.getProductReviews('product-123', {
        status: ReviewStatus.APPROVED,
        sortBy: 'helpfulCount',
        sortOrder: 'desc',
        limit: 20,
        offset: 0
      });
      
      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(2);
      expect(result.reviews[0].rating).toBe(5);
      expect(result.reviews[1].rating).toBe(4);
    });

    it('应该筛选评价', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          sentiment: 'positive'
        },
        {
          id: 'review-2',
          rating: 5,
          sentiment: 'positive'
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReviews,
        error: null
      });
      
      const result = await reviewService.getProductReviews('product-123', {
        rating: 5,
        sentiment: 'positive',
        hasImages: true,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(2);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('rating', 5);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('sentiment', 'positive');
    });

    it('应该搜索评价', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          title: 'Great quality product',
          content: 'Amazing build quality'
        },
        {
          id: 'review-2',
          title: 'Quality is excellent',
          content: 'Top quality materials'
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReviews,
        error: null
      });
      
      const result = await reviewService.searchReviews('quality', {
        productId: 'product-123',
        limit: 10
      });
      
      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(2);
      
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('title', '%quality%');
    });

    it('应该获取用户评价', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          productId: 'product-1',
          rating: 5,
          product: { name: 'Product 1', image: 'product1.jpg' }
        },
        {
          id: 'review-2',
          productId: 'product-2',
          rating: 4,
          product: { name: 'Product 2', image: 'product2.jpg' }
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReviews,
        error: null
      });
      
      const result = await reviewService.getUserReviews('user-123', {
        status: ReviewStatus.APPROVED,
        limit: 20
      });
      
      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(2);
    });
  });

  describe('评价统计', () => {
    it('应该获取商品评价统计', async () => {
      const mockStats = {
        totalReviews: 150,
        averageRating: 4.3,
        ratingDistribution: {
          5: 60,
          4: 45,
          3: 30,
          2: 10,
          1: 5
        },
        sentimentDistribution: {
          positive: 105,
          neutral: 30,
          negative: 15
        },
        reviewsWithImages: 45,
        helpfulReviews: 80
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null
      });
      
      const result = await reviewService.getProductReviewStats('product-123');
      
      expect(result.success).toBe(true);
      expect(result.stats.totalReviews).toBe(150);
      expect(result.stats.averageRating).toBe(4.3);
      expect(result.stats.ratingDistribution[5]).toBe(60);
      expect(result.stats.sentimentDistribution.positive).toBe(105);
    });

    it('应该获取评价趋势分析', async () => {
      const mockTrends = {
        monthlyReviews: [
          { month: '2024-01', count: 25, averageRating: 4.2 },
          { month: '2024-02', count: 30, averageRating: 4.4 },
          { month: '2024-03', count: 35, averageRating: 4.3 }
        ],
        ratingTrend: 'stable',
        sentimentTrend: 'improving',
        popularKeywords: [
          { keyword: 'quality', count: 45 },
          { keyword: 'fast shipping', count: 30 },
          { keyword: 'great value', count: 25 }
        ]
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockTrends,
        error: null
      });
      
      const result = await reviewService.getReviewTrends('product-123', {
        period: '3months',
        includeKeywords: true
      });
      
      expect(result.success).toBe(true);
      expect(result.trends.monthlyReviews).toHaveLength(3);
      expect(result.trends.ratingTrend).toBe('stable');
      expect(result.trends.popularKeywords).toHaveLength(3);
    });

    it('应该分析评价质量', async () => {
      const mockQualityAnalysis = {
        averageLength: 150,
        detailedReviews: 80, // 超过100字的评价
        reviewsWithImages: 45,
        verifiedPurchases: 120,
        helpfulnessRatio: 0.65,
        responseRate: 0.25, // 商家回复率
        qualityScore: 0.78
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockQualityAnalysis,
        error: null
      });
      
      const result = await reviewService.analyzeReviewQuality('product-123');
      
      expect(result.success).toBe(true);
      expect(result.analysis.averageLength).toBe(150);
      expect(result.analysis.qualityScore).toBe(0.78);
    });
  });

  describe('评价更新', () => {
    it('应该更新评价内容', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 4,
        title: 'Good product',
        content: 'Original content',
        status: ReviewStatus.APPROVED
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const updateData = {
        rating: 5,
        title: 'Excellent product!',
        content: 'Updated content - this product is amazing!'
      };
      
      const result = await reviewService.updateReview('review-123', updateData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.review.rating).toBe(5);
      expect(result.review.title).toBe('Excellent product!');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 5,
          title: 'Excellent product!',
          content: expect.any(String),
          updatedAt: expect.any(Date)
        })
      );
      
      // 应该清除缓存
      expect(mockRedisClient.del).toHaveBeenCalledWith('review:review-123');
    });

    it('应该验证更新权限', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'other-user',
        rating: 4,
        title: 'Good product'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const updateData = {
        rating: 5,
        title: 'Updated title'
      };
      
      const result = await reviewService.updateReview('review-123', updateData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('应该更新评价图片', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        images: ['https://storage.example.com/old-image.jpg']
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const updateData = {
        images: [
          {
            buffer: Buffer.from('new-image-data'),
            originalname: 'new-image.jpg',
            mimetype: 'image/jpeg'
          }
        ]
      };
      
      const result = await reviewService.updateReview('review-123', updateData, 'user-123');
      
      expect(result.success).toBe(true);
      
      // 应该删除旧图片
      expect(mockCloudStorageService.deleteFile).toHaveBeenCalled();
      
      // 应该上传新图片
      expect(mockCloudStorageService.uploadFile).toHaveBeenCalled();
    });

    it('应该标记评价为有用', async () => {
      const result = await reviewService.markReviewHelpful('review-123', 'user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewId: 'review-123',
          userId: 'user-123',
          helpful: true
        })
      );
      
      // 应该更新有用计数
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });

    it('应该防止重复标记', async () => {
      mockSupabase.from().select().mockResolvedValue({
        data: [{
          id: 'existing-helpful',
          reviewId: 'review-123',
          userId: 'user-123'
        }],
        error: null
      });
      
      const result = await reviewService.markReviewHelpful('review-123', 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Already marked as helpful');
    });
  });

  describe('评价回复', () => {
    it('应该创建评价回复', async () => {
      const replyData = {
        reviewId: 'review-123',
        content: 'Thank you for your feedback! We appreciate your review.',
        type: 'merchant'
      };
      
      const result = await reviewService.createReviewReply(replyData, 'merchant-123');
      
      expect(result.success).toBe(true);
      expect(result.reply.content).toBe(replyData.content);
      expect(result.reply.type).toBe('merchant');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('review_replies');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewId: 'review-123',
          userId: 'merchant-123',
          content: replyData.content,
          type: 'merchant'
        })
      );
    });

    it('应该获取评价回复', async () => {
      const mockReplies = [
        {
          id: 'reply-1',
          content: 'Thank you for your review!',
          type: 'merchant',
          user: { name: 'Store Owner', avatar: 'merchant.jpg' },
          createdAt: new Date()
        },
        {
          id: 'reply-2',
          content: 'You\'re welcome!',
          type: 'customer',
          user: { name: 'Customer', avatar: 'customer.jpg' },
          createdAt: new Date()
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReplies,
        error: null
      });
      
      const result = await reviewService.getReviewReplies('review-123');
      
      expect(result.success).toBe(true);
      expect(result.replies).toHaveLength(2);
      expect(result.replies[0].type).toBe('merchant');
      expect(result.replies[1].type).toBe('customer');
    });

    it('应该更新回复', async () => {
      const mockReply = {
        id: 'reply-123',
        userId: 'merchant-123',
        content: 'Original reply'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReply,
        error: null
      });
      
      const updateData = {
        content: 'Updated reply content'
      };
      
      const result = await reviewService.updateReviewReply('reply-123', updateData, 'merchant-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Updated reply content',
          updatedAt: expect.any(Date)
        })
      );
    });

    it('应该删除回复', async () => {
      const mockReply = {
        id: 'reply-123',
        userId: 'merchant-123'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReply,
        error: null
      });
      
      const result = await reviewService.deleteReviewReply('reply-123', 'merchant-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });
  });

  describe('评价审核', () => {
    it('应该审核通过评价', async () => {
      const mockReview = {
        id: 'review-123',
        status: ReviewStatus.PENDING,
        content: 'Great product!'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const result = await reviewService.moderateReview('review-123', {
        action: 'approve',
        reason: 'Content is appropriate'
      }, 'admin-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.APPROVED,
          moderatedBy: 'admin-123',
          moderatedAt: expect.any(Date),
          moderationReason: 'Content is appropriate'
        })
      );
    });

    it('应该拒绝评价', async () => {
      const mockReview = {
        id: 'review-123',
        status: ReviewStatus.PENDING,
        content: 'Inappropriate content'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const result = await reviewService.moderateReview('review-123', {
        action: 'reject',
        reason: 'Contains inappropriate language'
      }, 'admin-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.REJECTED,
          moderatedBy: 'admin-123',
          moderationReason: 'Contains inappropriate language'
        })
      );
    });

    it('应该获取待审核评价', async () => {
      const mockPendingReviews = [
        {
          id: 'review-1',
          status: ReviewStatus.PENDING,
          content: 'Review content 1',
          createdAt: new Date()
        },
        {
          id: 'review-2',
          status: ReviewStatus.PENDING,
          content: 'Review content 2',
          createdAt: new Date()
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockPendingReviews,
        error: null
      });
      
      const result = await reviewService.getPendingReviews({
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'asc'
      });
      
      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(2);
      
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', ReviewStatus.PENDING);
    });

    it('应该批量审核评价', async () => {
      const reviewIds = ['review-1', 'review-2', 'review-3'];
      
      const result = await reviewService.batchModerateReviews(reviewIds, {
        action: 'approve',
        reason: 'Batch approval'
      }, 'admin-123');
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
      
      expect(mockSupabase.from().update).toHaveBeenCalledTimes(3);
    });
  });

  describe('评价举报', () => {
    it('应该举报评价', async () => {
      const reportData = {
        reviewId: 'review-123',
        reason: 'spam',
        description: 'This review appears to be spam',
        category: 'inappropriate_content'
      };
      
      const result = await reviewService.reportReview(reportData, 'user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('review_reports');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewId: 'review-123',
          reporterId: 'user-123',
          reason: 'spam',
          description: 'This review appears to be spam'
        })
      );
    });

    it('应该获取举报列表', async () => {
      const mockReports = [
        {
          id: 'report-1',
          reviewId: 'review-123',
          reason: 'spam',
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'report-2',
          reviewId: 'review-456',
          reason: 'inappropriate',
          status: 'pending',
          createdAt: new Date()
        }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReports,
        error: null
      });
      
      const result = await reviewService.getReviewReports({
        status: 'pending',
        limit: 20
      });
      
      expect(result.success).toBe(true);
      expect(result.reports).toHaveLength(2);
    });

    it('应该处理举报', async () => {
      const mockReport = {
        id: 'report-123',
        reviewId: 'review-123',
        status: 'pending'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReport,
        error: null
      });
      
      const result = await reviewService.handleReviewReport('report-123', {
        action: 'resolve',
        resolution: 'Review removed for violating guidelines'
      }, 'admin-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          handledBy: 'admin-123',
          resolution: 'Review removed for violating guidelines'
        })
      );
    });
  });

  describe('便捷函数', () => {
    beforeEach(() => {
      // 设置全局服务实例
      global.reviewService = reviewService;
    });

    it('createReview 函数应该正常工作', async () => {
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Great product!',
        type: ReviewType.PRODUCT
      };
      
      const result = await createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(true);
    });

    it('getReview 函数应该正常工作', async () => {
      const mockReview = {
        id: 'review-123',
        rating: 5,
        title: 'Great product!'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const result = await getReview('review-123');
      
      expect(result.success).toBe(true);
      expect(result.review.rating).toBe(5);
    });

    it('updateReview 函数应该正常工作', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 4
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const result = await updateReview('review-123', {
        rating: 5
      }, 'user-123');
      
      expect(result.success).toBe(true);
    });

    it('deleteReview 函数应该正常工作', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      const result = await deleteReview('review-123', 'user-123');
      
      expect(result.success).toBe(true);
    });

    it('getProductReviews 函数应该正常工作', async () => {
      const mockReviews = [
        { id: 'review-1', rating: 5 },
        { id: 'review-2', rating: 4 }
      ];
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReviews,
        error: null
      });
      
      const result = await getProductReviews('product-123');
      
      expect(result.success).toBe(true);
      expect(result.reviews).toHaveLength(2);
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().select().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      const result = await reviewService.getReview('review-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      
      expect(mockMonitoringService.recordError)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'database_error'
        }));
    });

    it('应该处理缓存错误', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const mockReview = {
        id: 'review-123',
        rating: 5,
        title: 'Great product!'
      };
      
      mockSupabase.from().select().single.mockResolvedValue({
        data: mockReview,
        error: null
      });
      
      // 即使缓存失败，也应该能从数据库获取数据
      const result = await reviewService.getReview('review-123');
      
      expect(result.success).toBe(true);
      expect(result.review.rating).toBe(5);
    });

    it('应该处理图片上传错误', async () => {
      mockCloudStorageService.uploadFile.mockResolvedValue({
        success: false,
        error: 'Upload failed'
      });
      
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Great product!',
        type: ReviewType.PRODUCT,
        images: [{
          buffer: Buffer.from('fake-image-data'),
          originalname: 'review.jpg',
          mimetype: 'image/jpeg'
        }]
      };
      
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload review images');
    });

    it('应该处理AI服务错误', async () => {
      mockAiService.moderateContent.mockResolvedValue({
        success: false,
        error: 'AI service unavailable'
      });
      
      const reviewData = {
        productId: 'product-123',
        rating: 5,
        content: 'Great product!',
        type: ReviewType.PRODUCT
      };
      
      // 即使AI服务失败，也应该能创建评价（但状态为待审核）
      const result = await reviewService.createReview(reviewData, 'user-123');
      
      expect(result.success).toBe(true);
      expect(result.review.status).toBe(ReviewStatus.PENDING);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量评价查询', async () => {
      const mockReviews = Array.from({ length: 1000 }, (_, i) => ({
        id: `review-${i}`,
        rating: Math.floor(Math.random() * 5) + 1,
        title: `Review ${i}`,
        content: `Content for review ${i}`,
        createdAt: new Date()
      }));
      
      mockSupabase.from().select().mockResolvedValue({
        data: mockReviews,
        error: null
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return reviewService.getProductReviews('product-123', {
          limit: 1000
        });
      });
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该优化缓存性能', async () => {
      // 预热缓存
      const reviewIds = Array.from({ length: 100 }, (_, i) => `review-${i}`);
      
      for (const id of reviewIds) {
        mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
          id,
          rating: 5,
          title: `Review ${id}`
        }));
      }
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        const promises = reviewIds.map(id => reviewService.getReview(id));
        return Promise.all(promises);
      });
      
      expect(duration).toBeLessThan(500); // 应该在0.5秒内完成
    });

    it('应该优化批量操作性能', async () => {
      const reviewData = Array.from({ length: 50 }, (_, i) => ({
        productId: 'product-123',
        rating: Math.floor(Math.random() * 5) + 1,
        content: `Review content ${i}`,
        type: ReviewType.PRODUCT
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        const promises = reviewData.map(data => 
          reviewService.createReview(data, `user-${Math.floor(Math.random() * 10)}`)
        );
        return Promise.all(promises);
      });
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});