/**
 * 物流服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. 物流订单创建和管理
 * 2. 物流跟踪和状态更新
 * 3. 多物流商集成
 * 4. 运费计算和优化
 * 5. 配送地址管理
 * 6. 物流异常处理
 * 7. 物流数据分析
 * 8. 批量物流操作
 * 9. 物流通知推送
 * 10. 错误处理和重试机制
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/userService');
jest.mock('@/services/orderService');
jest.mock('@/services/notificationService');
jest.mock('@/services/smsService');
jest.mock('@/services/emailService');
jest.mock('@supabase/supabase-js');
jest.mock('node:crypto');
jest.mock('node:https');
jest.mock('node:querystring');
jest.mock('axios');
jest.mock('xml2js');
jest.mock('moment');
jest.mock('decimal.js');
jest.mock('uuid');
jest.mock('redis');

const mockEnvConfig = {
  LOGISTICS_PROVIDERS: {
    SF_EXPRESS: {
      appId: 'sf_app_id',
      appSecret: 'sf_app_secret',
      apiUrl: 'https://api.sf-express.com',
      enabled: true
    },
    YTO_EXPRESS: {
      appId: 'yto_app_id',
      appSecret: 'yto_app_secret',
      apiUrl: 'https://api.yto.net.cn',
      enabled: true
    },
    ZTO_EXPRESS: {
      appId: 'zto_app_id',
      appSecret: 'zto_app_secret',
      apiUrl: 'https://api.zto.com',
      enabled: true
    },
    EMS: {
      appId: 'ems_app_id',
      appSecret: 'ems_app_secret',
      apiUrl: 'https://api.ems.com.cn',
      enabled: true
    }
  },
  LOGISTICS_CACHE_TTL: 1800,
  LOGISTICS_RETRY_ATTEMPTS: 3,
  LOGISTICS_TIMEOUT: 30000,
  LOGISTICS_WEBHOOK_SECRET: 'webhook_secret_key'
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
  getUserAddresses: jest.fn(),
  addUserAddress: jest.fn(),
  updateUserAddress: jest.fn()
};

const mockOrderService = {
  getOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
  updateOrderLogistics: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  createNotification: jest.fn()
};

const mockSmsService = {
  sendSms: jest.fn()
};

const mockEmailService = {
  sendEmail: jest.fn()
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
  })),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn()
  }))
};

const mockHttps = {
  request: jest.fn()
};

const mockQuerystring = {
  stringify: jest.fn(),
  parse: jest.fn()
};

const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => mockAxios)
};

const mockXml2js = {
  parseString: jest.fn(),
  Builder: jest.fn(() => ({
    buildObject: jest.fn()
  }))
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

const mockDecimal = {
  Decimal: jest.fn((value) => ({
    toNumber: jest.fn(() => parseFloat(value)),
    toString: jest.fn(() => value.toString()),
    plus: jest.fn(() => mockDecimal.Decimal(value + 1)),
    minus: jest.fn(() => mockDecimal.Decimal(value - 1)),
    mul: jest.fn(() => mockDecimal.Decimal(value * 2)),
    div: jest.fn(() => mockDecimal.Decimal(value / 2))
  }))
};

const mockUuid = {
  v4: jest.fn()
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

// 导入被测试的模块
import {
  LogisticsService,
  LogisticsProvider,
  LogisticsStatus,
  ShippingMethod,
  LogisticsOrder,
  TrackingInfo,
  ShippingRate,
  DeliveryAddress,
  createLogisticsOrder,
  trackLogistics,
  calculateShippingRate,
  updateLogisticsStatus
} from '@/services/logisticsService';

describe('物流服务模块', () => {
  let logisticsService: LogisticsService;
  let mockRedisClient: any;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    require('@/utils/envConfig').envConfig = mockEnvConfig;
    require('@/utils/errorHandler').errorHandler = mockErrorHandler;
    require('@/services/monitoringService').monitoringService = mockMonitoringService;
    require('@/services/userService').userService = mockUserService;
    require('@/services/orderService').orderService = mockOrderService;
    require('@/services/notificationService').notificationService = mockNotificationService;
    require('@/services/smsService').smsService = mockSmsService;
    require('@/services/emailService').emailService = mockEmailService;
    require('@supabase/supabase-js').createClient = jest.fn(() => mockSupabase);
    require('node:crypto').default = mockCrypto;
    require('node:https').default = mockHttps;
    require('node:querystring').default = mockQuerystring;
    require('axios').default = mockAxios;
    require('xml2js').default = mockXml2js;
    require('moment').default = mockMoment;
    require('decimal.js').Decimal = mockDecimal.Decimal;
    require('uuid').v4 = mockUuid.v4;
    
    // 设置Redis模拟
    mockRedisClient = mockRedis.createClient();
    require('redis').createClient = mockRedis.createClient;
    
    // 创建物流服务实例
    logisticsService = new LogisticsService({
      providers: mockEnvConfig.LOGISTICS_PROVIDERS,
      cacheTtl: 1800,
      retryAttempts: 3,
      timeout: 30000,
      webhookSecret: 'webhook_secret_key'
    });
    
    // 设置默认模拟返回值
    mockCrypto.randomUUID.mockReturnValue('logistics-uuid-123');
    mockUuid.v4.mockReturnValue('logistics-uuid-456');
    
    mockCrypto.createHash().digest.mockReturnValue('mock-hash');
    mockCrypto.createHmac().digest.mockReturnValue('mock-signature');
    
    mockQuerystring.stringify.mockImplementation((obj) => 
      Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('&')
    );
    
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
      phone: '13800138000'
    });
    
    mockOrderService.getOrder.mockResolvedValue({
      success: true,
      order: {
        id: 'order-123',
        userId: 'user-123',
        status: 'paid',
        totalAmount: 299.99,
        items: [
          {
            productId: 'product-123',
            name: 'Test Product',
            quantity: 2,
            weight: 0.5
          }
        ],
        shippingAddress: {
          name: 'Test User',
          phone: '13800138000',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南区',
          postalCode: '518000'
        }
      }
    });
    
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: {
          trackingNumber: 'SF1234567890',
          status: 'created'
        }
      }
    });
    
    mockAxios.get.mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: {
          status: 'in_transit',
          tracks: [
            {
              time: '2024-01-15 10:30:00',
              status: 'picked_up',
              location: '深圳市南山区',
              description: '快件已被收取'
            }
          ]
        }
      }
    });
    
    mockSupabase.from().select().mockResolvedValue({
      data: [],
      error: null
    });
    
    mockSupabase.from().insert().mockResolvedValue({
      data: [{ id: 'logistics-123' }],
      error: null
    });
    
    mockSupabase.from().update().mockResolvedValue({
      data: [{ id: 'logistics-123' }],
      error: null
    });
    
    // 设置Redis模拟
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
  });

  afterEach(() => {
    if (logisticsService) {
      logisticsService.destroy();
    }
  });

  describe('服务初始化', () => {
    it('应该正确初始化物流服务', () => {
      expect(logisticsService).toBeDefined();
      expect(logisticsService.config.cacheTtl).toBe(1800);
      expect(logisticsService.config.retryAttempts).toBe(3);
      expect(logisticsService.config.timeout).toBe(30000);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new LogisticsService({
          providers: {},
          cacheTtl: -1,
          retryAttempts: -1
        });
      }).toThrow('Invalid logistics configuration');
    });

    it('应该初始化物流服务商', () => {
      expect(logisticsService.providers.size).toBeGreaterThan(0);
      expect(logisticsService.providers.has(LogisticsProvider.SF_EXPRESS)).toBe(true);
      expect(logisticsService.providers.has(LogisticsProvider.YTO_EXPRESS)).toBe(true);
    });

    it('应该初始化数据库和缓存连接', () => {
      expect(require('@supabase/supabase-js').createClient).toHaveBeenCalled();
      expect(mockRedis.createClient).toHaveBeenCalled();
    });
  });

  describe('物流订单创建', () => {
    it('应该创建物流订单', async () => {
      const logisticsData = {
        orderId: 'order-123',
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD,
        senderAddress: {
          name: '发货人',
          phone: '13800138001',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园北区',
          postalCode: '518000'
        },
        receiverAddress: {
          name: 'Test User',
          phone: '13800138000',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          address: '科技园南区',
          postalCode: '518000'
        },
        items: [
          {
            name: 'Test Product',
            quantity: 2,
            weight: 0.5,
            value: 299.99
          }
        ]
      };
      
      const result = await logisticsService.createLogisticsOrder(logisticsData);
      
      expect(result.success).toBe(true);
      expect(result.logisticsOrder.trackingNumber).toBe('SF1234567890');
      expect(result.logisticsOrder.provider).toBe(LogisticsProvider.SF_EXPRESS);
      expect(result.logisticsOrder.status).toBe(LogisticsStatus.CREATED);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('logistics_orders');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          provider: LogisticsProvider.SF_EXPRESS,
          trackingNumber: 'SF1234567890',
          status: LogisticsStatus.CREATED
        })
      );
      
      // 应该更新订单物流信息
      expect(mockOrderService.updateOrderLogistics).toHaveBeenCalledWith(
        'order-123',
        expect.objectContaining({
          trackingNumber: 'SF1234567890',
          provider: LogisticsProvider.SF_EXPRESS
        })
      );
    });

    it('应该验证订单存在性', async () => {
      mockOrderService.getOrder.mockResolvedValue({
        success: false,
        error: 'Order not found'
      });
      
      const logisticsData = {
        orderId: 'non-existent-order',
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await logisticsService.createLogisticsOrder(logisticsData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Order not found');
    });

    it('应该验证地址信息', async () => {
      const logisticsData = {
        orderId: 'order-123',
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD,
        senderAddress: {
          name: '', // 缺少发货人姓名
          phone: '13800138001'
        },
        receiverAddress: {
          name: 'Test User',
          phone: '13800138000'
        }
      };
      
      const result = await logisticsService.createLogisticsOrder(logisticsData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid sender address');
    });

    it('应该处理不同物流服务商', async () => {
      const providers = [
        LogisticsProvider.SF_EXPRESS,
        LogisticsProvider.YTO_EXPRESS,
        LogisticsProvider.ZTO_EXPRESS,
        LogisticsProvider.EMS
      ];
      
      for (const provider of providers) {
        mockAxios.post.mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              trackingNumber: `${provider}1234567890`,
              status: 'created'
            }
          }
        });
        
        const logisticsData = {
          orderId: `order-${provider}`,
          provider,
          shippingMethod: ShippingMethod.STANDARD,
          senderAddress: {
            name: '发货人',
            phone: '13800138001',
            province: '广东省',
            city: '深圳市',
            district: '南山区',
            address: '科技园北区'
          },
          receiverAddress: {
            name: 'Test User',
            phone: '13800138000',
            province: '广东省',
            city: '深圳市',
            district: '南山区',
            address: '科技园南区'
          }
        };
        
        const result = await logisticsService.createLogisticsOrder(logisticsData);
        
        expect(result.success).toBe(true);
        expect(result.logisticsOrder.provider).toBe(provider);
        expect(result.logisticsOrder.trackingNumber).toBe(`${provider}1234567890`);
      }
    });

    it('应该处理批量创建物流订单', async () => {
      const logisticsDataList = [
        {
          orderId: 'order-1',
          provider: LogisticsProvider.SF_EXPRESS,
          shippingMethod: ShippingMethod.STANDARD
        },
        {
          orderId: 'order-2',
          provider: LogisticsProvider.YTO_EXPRESS,
          shippingMethod: ShippingMethod.EXPRESS
        },
        {
          orderId: 'order-3',
          provider: LogisticsProvider.ZTO_EXPRESS,
          shippingMethod: ShippingMethod.STANDARD
        }
      ];
      
      // 为每个请求设置不同的响应
      logisticsDataList.forEach((_, index) => {
        mockAxios.post.mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              trackingNumber: `TRACK${index + 1}234567890`,
              status: 'created'
            }
          }
        });
      });
      
      const result = await logisticsService.batchCreateLogisticsOrders(logisticsDataList);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });
  });

  describe('物流跟踪', () => {
    it('应该跟踪物流状态', async () => {
      const mockTrackingData = {
        trackingNumber: 'SF1234567890',
        status: LogisticsStatus.IN_TRANSIT,
        currentLocation: '深圳市南山区',
        estimatedDelivery: new Date('2024-01-20'),
        tracks: [
          {
            time: '2024-01-15 10:30:00',
            status: 'picked_up',
            location: '深圳市南山区',
            description: '快件已被收取'
          },
          {
            time: '2024-01-15 14:20:00',
            status: 'in_transit',
            location: '深圳转运中心',
            description: '快件正在运输途中'
          }
        ]
      };
      
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          data: mockTrackingData
        }
      });
      
      const result = await logisticsService.trackLogistics('SF1234567890', LogisticsProvider.SF_EXPRESS);
      
      expect(result.success).toBe(true);
      expect(result.trackingInfo.trackingNumber).toBe('SF1234567890');
      expect(result.trackingInfo.status).toBe(LogisticsStatus.IN_TRANSIT);
      expect(result.trackingInfo.tracks).toHaveLength(2);
      
      // 应该缓存跟踪信息
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'logistics:track:SF1234567890',
        JSON.stringify(mockTrackingData),
        'EX',
        1800
      );
    });

    it('应该从缓存获取跟踪信息', async () => {
      const cachedTrackingData = {
        trackingNumber: 'SF1234567890',
        status: LogisticsStatus.IN_TRANSIT,
        tracks: []
      };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedTrackingData));
      
      const result = await logisticsService.trackLogistics('SF1234567890', LogisticsProvider.SF_EXPRESS);
      
      expect(result.success).toBe(true);
      expect(result.trackingInfo.trackingNumber).toBe('SF1234567890');
      
      // 不应该调用API
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('应该批量跟踪物流', async () => {
      const trackingNumbers = ['SF1234567890', 'YTO9876543210', 'ZTO1122334455'];
      
      trackingNumbers.forEach((trackingNumber, index) => {
        mockAxios.get.mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              trackingNumber,
              status: LogisticsStatus.IN_TRANSIT,
              tracks: []
            }
          }
        });
      });
      
      const result = await logisticsService.batchTrackLogistics([
        { trackingNumber: 'SF1234567890', provider: LogisticsProvider.SF_EXPRESS },
        { trackingNumber: 'YTO9876543210', provider: LogisticsProvider.YTO_EXPRESS },
        { trackingNumber: 'ZTO1122334455', provider: LogisticsProvider.ZTO_EXPRESS }
      ]);
      
      expect(result.success).toBe(true);
      expect(result.trackingInfos).toHaveLength(3);
    });

    it('应该处理物流状态更新', async () => {
      const statusUpdate = {
        trackingNumber: 'SF1234567890',
        status: LogisticsStatus.DELIVERED,
        location: '深圳市南山区科技园',
        description: '快件已签收',
        timestamp: new Date(),
        recipient: 'Test User'
      };
      
      const result = await logisticsService.updateLogisticsStatus(statusUpdate);
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: LogisticsStatus.DELIVERED,
          currentLocation: '深圳市南山区科技园',
          deliveredAt: expect.any(Date)
        })
      );
      
      // 应该发送通知
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
      
      // 应该清除缓存
      expect(mockRedisClient.del).toHaveBeenCalledWith('logistics:track:SF1234567890');
    });

    it('应该处理异常状态', async () => {
      const exceptionUpdate = {
        trackingNumber: 'SF1234567890',
        status: LogisticsStatus.EXCEPTION,
        location: '深圳转运中心',
        description: '收件人地址不详，无法派送',
        timestamp: new Date(),
        exceptionType: 'address_error'
      };
      
      const result = await logisticsService.updateLogisticsStatus(exceptionUpdate);
      
      expect(result.success).toBe(true);
      
      // 应该发送异常通知
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logistics_exception',
          title: '物流异常提醒'
        })
      );
      
      // 应该发送短信通知
      expect(mockSmsService.sendSms).toHaveBeenCalled();
    });
  });

  describe('运费计算', () => {
    it('应该计算标准运费', async () => {
      const shippingData = {
        senderAddress: {
          province: '广东省',
          city: '深圳市',
          district: '南山区'
        },
        receiverAddress: {
          province: '北京市',
          city: '北京市',
          district: '朝阳区'
        },
        items: [
          {
            weight: 1.0,
            volume: 0.001, // 1升
            value: 299.99
          }
        ],
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await logisticsService.calculateShippingRate(shippingData);
      
      expect(result.success).toBe(true);
      expect(result.rates).toBeDefined();
      expect(result.rates.length).toBeGreaterThan(0);
      
      const sfRate = result.rates.find(rate => rate.provider === LogisticsProvider.SF_EXPRESS);
      expect(sfRate).toBeDefined();
      expect(sfRate.cost).toBeGreaterThan(0);
      expect(sfRate.estimatedDays).toBeGreaterThan(0);
    });

    it('应该计算加急运费', async () => {
      const shippingData = {
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '上海市',
          city: '上海市'
        },
        items: [
          {
            weight: 0.5,
            volume: 0.0005,
            value: 199.99
          }
        ],
        shippingMethod: ShippingMethod.EXPRESS
      };
      
      const result = await logisticsService.calculateShippingRate(shippingData);
      
      expect(result.success).toBe(true);
      
      const expressRates = result.rates.filter(rate => rate.method === ShippingMethod.EXPRESS);
      const standardRates = result.rates.filter(rate => rate.method === ShippingMethod.STANDARD);
      
      if (expressRates.length > 0 && standardRates.length > 0) {
        expect(expressRates[0].cost).toBeGreaterThan(standardRates[0].cost);
        expect(expressRates[0].estimatedDays).toBeLessThan(standardRates[0].estimatedDays);
      }
    });

    it('应该处理重量和体积计费', async () => {
      const heavyItem = {
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '北京市',
          city: '北京市'
        },
        items: [
          {
            weight: 10.0, // 重货
            volume: 0.001,
            value: 999.99
          }
        ],
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const bulkyItem = {
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '北京市',
          city: '北京市'
        },
        items: [
          {
            weight: 1.0,
            volume: 0.1, // 泡货
            value: 299.99
          }
        ],
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const heavyResult = await logisticsService.calculateShippingRate(heavyItem);
      const bulkyResult = await logisticsService.calculateShippingRate(bulkyItem);
      
      expect(heavyResult.success).toBe(true);
      expect(bulkyResult.success).toBe(true);
      
      // 重货和泡货的运费应该不同
      expect(heavyResult.rates[0].cost).not.toBe(bulkyResult.rates[0].cost);
    });

    it('应该处理偏远地区附加费', async () => {
      const remoteAreaData = {
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '西藏自治区',
          city: '拉萨市',
          district: '城关区'
        },
        items: [
          {
            weight: 1.0,
            volume: 0.001,
            value: 299.99
          }
        ],
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await logisticsService.calculateShippingRate(remoteAreaData);
      
      expect(result.success).toBe(true);
      
      const rateWithSurcharge = result.rates.find(rate => rate.surcharges && rate.surcharges.length > 0);
      if (rateWithSurcharge) {
        expect(rateWithSurcharge.surcharges).toContainEqual(
          expect.objectContaining({
            type: 'remote_area',
            amount: expect.any(Number)
          })
        );
      }
    });

    it('应该缓存运费计算结果', async () => {
      const shippingData = {
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '北京市',
          city: '北京市'
        },
        items: [
          {
            weight: 1.0,
            volume: 0.001,
            value: 299.99
          }
        ],
        shippingMethod: ShippingMethod.STANDARD
      };
      
      // 第一次调用
      const result1 = await logisticsService.calculateShippingRate(shippingData);
      expect(result1.success).toBe(true);
      
      // 设置缓存返回值
      mockRedisClient.get.mockResolvedValue(JSON.stringify(result1.rates));
      
      // 第二次调用应该从缓存获取
      const result2 = await logisticsService.calculateShippingRate(shippingData);
      expect(result2.success).toBe(true);
      expect(result2.rates).toEqual(result1.rates);
    });
  });

  describe('地址管理', () => {
    it('应该验证地址格式', async () => {
      const validAddress = {
        name: 'Test User',
        phone: '13800138000',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南区',
        postalCode: '518000'
      };
      
      const result = await logisticsService.validateAddress(validAddress);
      
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('应该检测无效地址', async () => {
      const invalidAddress = {
        name: '',
        phone: '138001380', // 无效手机号
        province: '广东省',
        city: '深圳市',
        district: '',
        address: '',
        postalCode: '51800' // 无效邮编
      };
      
      const result = await logisticsService.validateAddress(invalidAddress);
      
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid name');
      expect(result.errors).toContain('Invalid phone number');
      expect(result.errors).toContain('Invalid postal code');
    });

    it('应该标准化地址格式', async () => {
      const address = {
        name: '  Test User  ',
        phone: ' 138-0013-8000 ',
        province: '广东',
        city: '深圳',
        district: '南山',
        address: '  科技园南区  ',
        postalCode: ' 518000 '
      };
      
      const result = await logisticsService.normalizeAddress(address);
      
      expect(result.success).toBe(true);
      expect(result.normalizedAddress.name).toBe('Test User');
      expect(result.normalizedAddress.phone).toBe('13800138000');
      expect(result.normalizedAddress.province).toBe('广东省');
      expect(result.normalizedAddress.city).toBe('深圳市');
      expect(result.normalizedAddress.district).toBe('南山区');
      expect(result.normalizedAddress.address).toBe('科技园南区');
      expect(result.normalizedAddress.postalCode).toBe('518000');
    });

    it('应该获取地址坐标', async () => {
      const address = {
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        address: '科技园南区'
      };
      
      // 模拟地理编码API响应
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: {
          status: '1',
          geocodes: [
            {
              location: '113.947434,22.547447',
              formatted_address: '广东省深圳市南山区科技园南区'
            }
          ]
        }
      });
      
      const result = await logisticsService.getAddressCoordinates(address);
      
      expect(result.success).toBe(true);
      expect(result.coordinates.longitude).toBe(113.947434);
      expect(result.coordinates.latitude).toBe(22.547447);
    });

    it('应该计算地址间距离', async () => {
      const address1 = {
        province: '广东省',
        city: '深圳市',
        district: '南山区'
      };
      
      const address2 = {
        province: '北京市',
        city: '北京市',
        district: '朝阳区'
      };
      
      const result = await logisticsService.calculateDistance(address1, address2);
      
      expect(result.success).toBe(true);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.unit).toBe('km');
    });
  });

  describe('物流数据分析', () => {
    it('应该获取物流统计数据', async () => {
      const mockStats = {
        totalOrders: 1500,
        deliveredOrders: 1350,
        inTransitOrders: 120,
        exceptionOrders: 30,
        averageDeliveryTime: 2.5,
        onTimeDeliveryRate: 0.92,
        providerStats: {
          [LogisticsProvider.SF_EXPRESS]: {
            orders: 600,
            deliveryRate: 0.95,
            averageTime: 2.2
          },
          [LogisticsProvider.YTO_EXPRESS]: {
            orders: 450,
            deliveryRate: 0.90,
            averageTime: 2.8
          }
        }
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null
      });
      
      const result = await logisticsService.getLogisticsStats({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });
      
      expect(result.success).toBe(true);
      expect(result.stats.totalOrders).toBe(1500);
      expect(result.stats.onTimeDeliveryRate).toBe(0.92);
      expect(result.stats.providerStats[LogisticsProvider.SF_EXPRESS].deliveryRate).toBe(0.95);
    });

    it('应该分析物流性能', async () => {
      const mockPerformance = {
        providerPerformance: [
          {
            provider: LogisticsProvider.SF_EXPRESS,
            score: 95,
            deliveryRate: 0.98,
            averageTime: 2.1,
            customerSatisfaction: 4.8
          },
          {
            provider: LogisticsProvider.YTO_EXPRESS,
            score: 88,
            deliveryRate: 0.92,
            averageTime: 2.6,
            customerSatisfaction: 4.5
          }
        ],
        regionPerformance: [
          {
            region: '华南地区',
            deliveryRate: 0.96,
            averageTime: 2.0
          },
          {
            region: '华北地区',
            deliveryRate: 0.94,
            averageTime: 2.3
          }
        ]
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockPerformance,
        error: null
      });
      
      const result = await logisticsService.analyzeLogisticsPerformance({
        period: '30days',
        includeRegions: true
      });
      
      expect(result.success).toBe(true);
      expect(result.performance.providerPerformance).toHaveLength(2);
      expect(result.performance.regionPerformance).toHaveLength(2);
    });

    it('应该预测配送时间', async () => {
      const predictionData = {
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '北京市',
          city: '北京市'
        },
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD,
        weight: 1.0
      };
      
      const result = await logisticsService.predictDeliveryTime(predictionData);
      
      expect(result.success).toBe(true);
      expect(result.prediction.estimatedDays).toBeGreaterThan(0);
      expect(result.prediction.confidence).toBeGreaterThan(0);
      expect(result.prediction.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Webhook处理', () => {
    it('应该处理物流状态更新Webhook', async () => {
      const webhookData = {
        trackingNumber: 'SF1234567890',
        status: 'delivered',
        location: '深圳市南山区',
        timestamp: '2024-01-15T10:30:00Z',
        recipient: 'Test User',
        signature: 'mock-signature'
      };
      
      const result = await logisticsService.handleWebhook(webhookData, 'sf_express');
      
      expect(result.success).toBe(true);
      
      // 应该更新数据库
      expect(mockSupabase.from().update).toHaveBeenCalled();
      
      // 应该发送通知
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });

    it('应该验证Webhook签名', async () => {
      const webhookData = {
        trackingNumber: 'SF1234567890',
        status: 'delivered',
        signature: 'invalid-signature'
      };
      
      const result = await logisticsService.handleWebhook(webhookData, 'sf_express');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');
    });

    it('应该处理批量Webhook更新', async () => {
      const batchWebhookData = {
        updates: [
          {
            trackingNumber: 'SF1234567890',
            status: 'in_transit',
            location: '深圳转运中心'
          },
          {
            trackingNumber: 'SF1234567891',
            status: 'delivered',
            location: '北京市朝阳区'
          }
        ],
        signature: 'mock-signature'
      };
      
      const result = await logisticsService.handleBatchWebhook(batchWebhookData, 'sf_express');
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
    });
  });

  describe('便捷函数', () => {
    beforeEach(() => {
      // 设置全局服务实例
      global.logisticsService = logisticsService;
    });

    it('createLogisticsOrder 函数应该正常工作', async () => {
      const logisticsData = {
        orderId: 'order-123',
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await createLogisticsOrder(logisticsData);
      
      expect(result.success).toBe(true);
    });

    it('trackLogistics 函数应该正常工作', async () => {
      const result = await trackLogistics('SF1234567890', LogisticsProvider.SF_EXPRESS);
      
      expect(result.success).toBe(true);
    });

    it('calculateShippingRate 函数应该正常工作', async () => {
      const shippingData = {
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '北京市',
          city: '北京市'
        },
        items: [{
          weight: 1.0,
          volume: 0.001,
          value: 299.99
        }],
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await calculateShippingRate(shippingData);
      
      expect(result.success).toBe(true);
    });

    it('updateLogisticsStatus 函数应该正常工作', async () => {
      const statusUpdate = {
        trackingNumber: 'SF1234567890',
        status: LogisticsStatus.DELIVERED,
        location: '深圳市南山区',
        description: '快件已签收'
      };
      
      const result = await updateLogisticsStatus(statusUpdate);
      
      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理API请求错误', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));
      
      const logisticsData = {
        orderId: 'order-123',
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await logisticsService.createLogisticsOrder(logisticsData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      
      expect(mockMonitoringService.recordError)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'logistics_api_error'
        }));
    });

    it('应该处理数据库错误', async () => {
      mockSupabase.from().insert().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      const logisticsData = {
        orderId: 'order-123',
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await logisticsService.createLogisticsOrder(logisticsData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('应该处理缓存错误', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      
      // 即使缓存失败，也应该能正常工作
      const result = await logisticsService.trackLogistics('SF1234567890', LogisticsProvider.SF_EXPRESS);
      
      expect(result.success).toBe(true);
    });

    it('应该实现重试机制', async () => {
      // 前两次请求失败，第三次成功
      mockAxios.post
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              trackingNumber: 'SF1234567890',
              status: 'created'
            }
          }
        });
      
      const logisticsData = {
        orderId: 'order-123',
        provider: LogisticsProvider.SF_EXPRESS,
        shippingMethod: ShippingMethod.STANDARD
      };
      
      const result = await logisticsService.createLogisticsOrder(logisticsData);
      
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量物流查询', async () => {
      const trackingNumbers = Array.from({ length: 100 }, (_, i) => `SF${i.toString().padStart(10, '0')}`);
      
      trackingNumbers.forEach(trackingNumber => {
        mockAxios.get.mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              trackingNumber,
              status: LogisticsStatus.IN_TRANSIT,
              tracks: []
            }
          }
        });
      });
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        const promises = trackingNumbers.map(trackingNumber => 
          logisticsService.trackLogistics(trackingNumber, LogisticsProvider.SF_EXPRESS)
        );
        return Promise.all(promises);
      });
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该优化缓存性能', async () => {
      // 预热缓存
      const trackingNumbers = Array.from({ length: 50 }, (_, i) => `SF${i.toString().padStart(10, '0')}`);
      
      for (const trackingNumber of trackingNumbers) {
        mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
          trackingNumber,
          status: LogisticsStatus.IN_TRANSIT,
          tracks: []
        }));
      }
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        const promises = trackingNumbers.map(trackingNumber => 
          logisticsService.trackLogistics(trackingNumber, LogisticsProvider.SF_EXPRESS)
        );
        return Promise.all(promises);
      });
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该优化运费计算性能', async () => {
      const shippingDataList = Array.from({ length: 20 }, (_, i) => ({
        senderAddress: {
          province: '广东省',
          city: '深圳市'
        },
        receiverAddress: {
          province: '北京市',
          city: '北京市'
        },
        items: [{
          weight: 1.0 + i * 0.1,
          volume: 0.001,
          value: 299.99
        }],
        shippingMethod: ShippingMethod.STANDARD
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        const promises = shippingDataList.map(data => 
          logisticsService.calculateShippingRate(data)
        );
        return Promise.all(promises);
      });
      
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });
  });
});