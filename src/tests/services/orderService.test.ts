/**
 * 订单服务单元测试
 * 
 * 测试覆盖范围：
 * - 订单创建和管理
 * - 购物车功能
 * - 订单状态跟踪
 * - 优惠券和折扣处理
 * - 订单支付集成
 * - 退款和取消处理
 * - 订单统计和报告
 * - 库存管理
 * - 订单通知和确认
 * - 错误处理和数据一致性
 */

import { jest } from '@jest/globals';
import type {
  OrderService,
  Order,
  OrderItem,
  Cart,
  CartItem,
  Coupon,
  OrderStatus,
  OrderStatistics,
  RefundRequest,
  OrderNotification
} from '@/services/orderService';

// 模拟依赖
const mockEnvConfig = {
  order: {
    maxItemsPerOrder: 10,
    orderTimeout: 30 * 60 * 1000, // 30分钟
    refundWindow: 7 * 24 * 60 * 60 * 1000, // 7天
    taxRate: 0.08, // 8%税率
    currency: 'CNY',
    minOrderAmount: 1
  },
  payment: {
    providers: ['alipay', 'wechat', 'stripe'],
    timeout: 15 * 60 * 1000 // 15分钟支付超时
  },
  redis: {
    url: 'redis://localhost:6379',
    ttl: {
      cartCache: 24 * 60 * 60, // 24小时
      orderCache: 60 * 60, // 1小时
      couponCache: 30 * 60 // 30分钟
    }
  }
};

const mockErrorHandler = {
  logError: jest.fn(),
  handleError: jest.fn(),
  createError: jest.fn()
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  startTimer: jest.fn(() => ({ end: jest.fn() })),
  incrementCounter: jest.fn(),
  recordOrderEvent: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  sendEmail: jest.fn(),
  sendOrderConfirmation: jest.fn(),
  sendOrderUpdate: jest.fn()
};

const mockPaymentService = {
  createPayment: jest.fn(),
  processPayment: jest.fn(),
  refundPayment: jest.fn(),
  verifyPayment: jest.fn(),
  getPaymentStatus: jest.fn()
};

const mockCourseService = {
  getCourseById: jest.fn(),
  updateEnrollmentCount: jest.fn(),
  checkCourseAvailability: jest.fn(),
  getCoursePrice: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  updateUserPoints: jest.fn(),
  checkUserPermission: jest.fn(),
  getUserPurchaseHistory: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn()
        })),
        limit: jest.fn()
      })),
      in: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn()
          }))
        }))
      })),
      single: jest.fn(),
      order: jest.fn(() => ({
        limit: jest.fn()
      })),
      limit: jest.fn()
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  })),
  rpc: jest.fn()
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  expire: jest.fn(),
  multi: jest.fn(() => ({
    set: jest.fn(),
    hset: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn()
  }))
};

const mockUuid = {
  v4: jest.fn(() => 'test-order-uuid-123')
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(() => '2023-01-01T12:00:00Z'),
  add: jest.fn(() => mockMoment()),
  subtract: jest.fn(() => mockMoment()),
  valueOf: jest.fn(() => 1672574400000),
  toISOString: jest.fn(() => '2023-01-01T12:00:00.000Z'),
  unix: jest.fn(() => 1672574400),
  diff: jest.fn(() => 3600000), // 1小时
  isBefore: jest.fn(() => false),
  isAfter: jest.fn(() => true)
}));

const mockLodash = {
  pick: jest.fn(),
  omit: jest.fn(),
  merge: jest.fn(),
  cloneDeep: jest.fn(),
  isEmpty: jest.fn(() => false),
  sum: jest.fn(() => 299.98),
  groupBy: jest.fn(),
  orderBy: jest.fn(),
  find: jest.fn(),
  filter: jest.fn()
};

const mockDecimal = {
  add: jest.fn(() => mockDecimal),
  sub: jest.fn(() => mockDecimal),
  mul: jest.fn(() => mockDecimal),
  div: jest.fn(() => mockDecimal),
  toNumber: jest.fn(() => 299.98),
  toString: jest.fn(() => '299.98')
};

// 模拟模块
jest.mock('@/utils/envConfig', () => ({ envConfig: mockEnvConfig }));
jest.mock('@/utils/errorHandler', () => mockErrorHandler);
jest.mock('@/services/monitoringService', () => mockMonitoringService);
jest.mock('@/services/notificationService', () => mockNotificationService);
jest.mock('@/services/paymentService', () => mockPaymentService);
jest.mock('@/services/courseService', () => mockCourseService);
jest.mock('@/services/userService', () => mockUserService);
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedis)
}));
jest.mock('uuid', () => mockUuid);
jest.mock('moment', () => mockMoment);
jest.mock('lodash', () => mockLodash);
jest.mock('decimal.js', () => jest.fn(() => mockDecimal));

// 导入要测试的模块
let orderService: OrderService;
let createOrder: (orderData: Partial<Order>) => Promise<{ success: boolean; order?: Order; error?: string }>;
let updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean; order?: Order; error?: string }>;
let cancelOrder: (orderId: string, reason?: string) => Promise<{ success: boolean; order?: Order; error?: string }>;
let getOrderById: (orderId: string) => Promise<{ success: boolean; order?: Order; error?: string }>;
let addToCart: (userId: string, courseId: string, quantity?: number) => Promise<{ success: boolean; cartItem?: CartItem; error?: string }>;

beforeAll(async () => {
  // 动态导入模块
  const module = await import('@/services/orderService');
  orderService = module.orderService;
  createOrder = module.createOrder;
  updateOrderStatus = module.updateOrderStatus;
  cancelOrder = module.cancelOrder;
  getOrderById = module.getOrderById;
  addToCart = module.addToCart;
});

describe('订单服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: {
        id: 'order-123',
        userId: 'user-123',
        status: 'pending',
        totalAmount: 299.98,
        currency: 'CNY',
        items: [
          {
            courseId: 'course-123',
            title: 'JavaScript基础课程',
            price: 99.99,
            quantity: 1
          },
          {
            courseId: 'course-456',
            title: 'React进阶课程',
            price: 199.99,
            quantity: 1
          }
        ],
        createdAt: '2023-01-01T12:00:00Z'
      },
      error: null
    });
    
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: {
        id: 'order-123',
        userId: 'user-123',
        status: 'pending',
        totalAmount: 299.98
      },
      error: null
    });
    
    mockSupabase.from().select().eq().order().limit.mockResolvedValue({
      data: [
        {
          id: 'order-123',
          userId: 'user-123',
          status: 'completed',
          totalAmount: 299.98,
          createdAt: '2023-01-01T12:00:00Z'
        }
      ],
      error: null
    });
    
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.hgetall.mockResolvedValue({
      'course-123': JSON.stringify({ courseId: 'course-123', quantity: 1, price: 99.99 }),
      'course-456': JSON.stringify({ courseId: 'course-456', quantity: 1, price: 199.99 })
    });
    
    mockCourseService.getCourseById.mockResolvedValue({
      success: true,
      course: {
        id: 'course-123',
        title: 'JavaScript基础课程',
        price: 99.99,
        status: 'published',
        stock: 100
      }
    });
    
    mockCourseService.getCoursePrice.mockResolvedValue({
      success: true,
      price: 99.99
    });
    
    mockUserService.getUserById.mockResolvedValue({
      success: true,
      user: {
        id: 'user-123',
        name: '张三',
        email: 'user@example.com',
        points: 1000
      }
    });
    
    mockPaymentService.createPayment.mockResolvedValue({
      success: true,
      payment: {
        id: 'payment-123',
        orderId: 'order-123',
        amount: 299.98,
        status: 'pending'
      }
    });
  });

  describe('服务初始化', () => {
    it('应该正确初始化订单服务', async () => {
      const result = await orderService.initialize();
      
      expect(result.success).toBe(true);
      expect(mockMonitoringService.recordMetric).toHaveBeenCalledWith(
        'order_service_initialized',
        1
      );
    });

    it('应该初始化Redis连接', async () => {
      await orderService.initialize();
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'order_service_status',
        'initialized',
        'EX',
        3600
      );
    });

    it('应该加载订单配置', async () => {
      await orderService.initialize();
      
      const config = await orderService.getOrderConfig();
      
      expect(config).toEqual(
        expect.objectContaining({
          maxItemsPerOrder: 10,
          orderTimeout: 30 * 60 * 1000,
          refundWindow: 7 * 24 * 60 * 60 * 1000
        })
      );
    });

    it('应该设置订单状态枚举', async () => {
      await orderService.initialize();
      
      const statuses = await orderService.getOrderStatuses();
      
      expect(statuses).toEqual(
        expect.arrayContaining([
          'pending',
          'paid',
          'processing',
          'completed',
          'cancelled',
          'refunded'
        ])
      );
    });
  });

  describe('购物车管理', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该添加商品到购物车', async () => {
      const result = await addToCart('user-123', 'course-123', 1);
      
      expect(result.success).toBe(true);
      expect(result.cartItem).toEqual(
        expect.objectContaining({
          courseId: 'course-123',
          quantity: 1,
          price: 99.99
        })
      );
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'cart:user-123',
        'course-123',
        expect.any(String)
      );
    });

    it('应该验证课程可用性', async () => {
      mockCourseService.checkCourseAvailability.mockResolvedValue({
        success: false,
        error: { message: 'Course is not available' }
      });
      
      const result = await addToCart('user-123', 'course-unavailable', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'COURSE_UNAVAILABLE',
          message: 'Course is not available for purchase'
        })
      );
    });

    it('应该检查重复购买', async () => {
      mockUserService.getUserPurchaseHistory.mockResolvedValue({
        success: true,
        purchases: [
          { courseId: 'course-123', status: 'completed' }
        ]
      });
      
      const result = await addToCart('user-123', 'course-123', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'DUPLICATE_PURCHASE',
          message: 'Course already purchased'
        })
      );
    });

    it('应该获取购物车内容', async () => {
      const result = await orderService.getCart('user-123');
      
      expect(result.success).toBe(true);
      expect(result.cart).toEqual(
        expect.objectContaining({
          userId: 'user-123',
          items: expect.any(Array),
          totalAmount: expect.any(Number),
          itemCount: expect.any(Number)
        })
      );
      
      expect(mockRedis.hgetall).toHaveBeenCalledWith('cart:user-123');
    });

    it('应该更新购物车商品数量', async () => {
      const result = await orderService.updateCartItem('user-123', 'course-123', 2);
      
      expect(result.success).toBe(true);
      expect(result.cartItem.quantity).toBe(2);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'cart:user-123',
        'course-123',
        expect.stringContaining('"quantity":2')
      );
    });

    it('应该从购物车移除商品', async () => {
      const result = await orderService.removeFromCart('user-123', 'course-123');
      
      expect(result.success).toBe(true);
      
      expect(mockRedis.hdel).toHaveBeenCalledWith(
        'cart:user-123',
        'course-123'
      );
    });

    it('应该清空购物车', async () => {
      const result = await orderService.clearCart('user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockRedis.del).toHaveBeenCalledWith('cart:user-123');
    });

    it('应该计算购物车总价', async () => {
      const result = await orderService.calculateCartTotal('user-123');
      
      expect(result.success).toBe(true);
      expect(result.total).toEqual(
        expect.objectContaining({
          subtotal: expect.any(Number),
          tax: expect.any(Number),
          total: expect.any(Number)
        })
      );
    });
  });

  describe('订单创建', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该从购物车创建订单', async () => {
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay',
        couponCode: 'SAVE10'
      };
      
      const result = await createOrder(orderData);
      
      expect(result.success).toBe(true);
      expect(result.order).toEqual(
        expect.objectContaining({
          id: 'order-123',
          userId: 'user-123',
          status: 'pending',
          totalAmount: 299.98
        })
      );
      
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });

    it('应该验证购物车不为空', async () => {
      mockRedis.hgetall.mockResolvedValue({}); // 空购物车
      
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay'
      };
      
      const result = await createOrder(orderData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'EMPTY_CART',
          message: 'Cart is empty'
        })
      );
    });

    it('应该应用优惠券折扣', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'coupon-123',
          code: 'SAVE10',
          type: 'percentage',
          value: 10,
          minAmount: 100,
          maxDiscount: 50,
          isActive: true,
          expiresAt: '2023-12-31T23:59:59Z'
        },
        error: null
      });
      
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay',
        couponCode: 'SAVE10'
      };
      
      const result = await createOrder(orderData);
      
      expect(result.success).toBe(true);
      expect(result.order.discount).toBeGreaterThan(0);
      expect(result.order.couponCode).toBe('SAVE10');
    });

    it('应该验证优惠券有效性', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'coupon-123',
          code: 'EXPIRED10',
          isActive: false,
          expiresAt: '2022-12-31T23:59:59Z' // 已过期
        },
        error: null
      });
      
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay',
        couponCode: 'EXPIRED10'
      };
      
      const result = await createOrder(orderData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_COUPON',
          message: 'Coupon is expired or invalid'
        })
      );
    });

    it('应该生成唯一订单号', async () => {
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay'
      };
      
      await createOrder(orderData);
      
      expect(mockUuid.v4).toHaveBeenCalled();
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-order-uuid-123'
        })
      );
    });

    it('应该设置订单过期时间', async () => {
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay'
      };
      
      await createOrder(orderData);
      
      expect(mockMoment().add).toHaveBeenCalledWith(30, 'minutes');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(String)
        })
      );
    });

    it('应该创建支付记录', async () => {
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay'
      };
      
      await createOrder(orderData);
      
      expect(mockPaymentService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          amount: 299.98,
          method: 'alipay'
        })
      );
    });
  });

  describe('订单状态管理', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该更新订单状态', async () => {
      const result = await updateOrderStatus('order-123', 'paid');
      
      expect(result.success).toBe(true);
      expect(result.order.status).toBe('paid');
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          updatedAt: expect.any(String)
        })
      );
    });

    it('应该验证状态转换有效性', async () => {
      // 模拟订单已完成，不能再取消
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'order-123',
          status: 'completed'
        },
        error: null
      });
      
      const result = await updateOrderStatus('order-123', 'cancelled');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'INVALID_STATUS_TRANSITION',
          message: 'Cannot cancel completed order'
        })
      );
    });

    it('应该处理订单完成', async () => {
      const result = await orderService.completeOrder('order-123');
      
      expect(result.success).toBe(true);
      
      // 应该更新课程注册数
      expect(mockCourseService.updateEnrollmentCount).toHaveBeenCalled();
      
      // 应该发送完成通知
      expect(mockNotificationService.sendOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          status: 'completed'
        })
      );
    });

    it('应该处理订单取消', async () => {
      const result = await cancelOrder('order-123', '用户主动取消');
      
      expect(result.success).toBe(true);
      expect(result.order.status).toBe('cancelled');
      expect(result.order.cancelReason).toBe('用户主动取消');
      
      // 应该恢复库存
      expect(mockCourseService.updateEnrollmentCount).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number)
      );
    });

    it('应该处理订单超时', async () => {
      const result = await orderService.handleExpiredOrders();
      
      expect(result.success).toBe(true);
      expect(result.expiredCount).toBeGreaterThanOrEqual(0);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          cancelReason: 'Order expired'
        })
      );
    });

    it('应该记录状态变更历史', async () => {
      await updateOrderStatus('order-123', 'paid');
      
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          fromStatus: 'pending',
          toStatus: 'paid',
          changedAt: expect.any(String)
        })
      );
    });
  });

  describe('优惠券管理', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该验证优惠券代码', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'coupon-123',
          code: 'SAVE20',
          type: 'percentage',
          value: 20,
          minAmount: 100,
          isActive: true,
          usageLimit: 100,
          usedCount: 50,
          expiresAt: '2023-12-31T23:59:59Z'
        },
        error: null
      });
      
      const result = await orderService.validateCoupon('SAVE20', 150);
      
      expect(result.success).toBe(true);
      expect(result.coupon).toEqual(
        expect.objectContaining({
          code: 'SAVE20',
          discount: 30 // 20% of 150
        })
      );
    });

    it('应该检查优惠券使用限制', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'coupon-123',
          code: 'LIMITED',
          usageLimit: 100,
          usedCount: 100 // 已达到使用限制
        },
        error: null
      });
      
      const result = await orderService.validateCoupon('LIMITED', 150);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'COUPON_LIMIT_EXCEEDED',
          message: 'Coupon usage limit exceeded'
        })
      );
    });

    it('应该检查最小订单金额', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'coupon-123',
          code: 'SAVE20',
          minAmount: 200,
          isActive: true
        },
        error: null
      });
      
      const result = await orderService.validateCoupon('SAVE20', 150); // 低于最小金额
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'MINIMUM_AMOUNT_NOT_MET',
          message: 'Order amount does not meet coupon minimum requirement'
        })
      );
    });

    it('应该计算固定金额折扣', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'coupon-123',
          code: 'SAVE50',
          type: 'fixed',
          value: 50,
          isActive: true
        },
        error: null
      });
      
      const result = await orderService.validateCoupon('SAVE50', 200);
      
      expect(result.success).toBe(true);
      expect(result.coupon.discount).toBe(50);
    });

    it('应该应用最大折扣限制', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'coupon-123',
          code: 'SAVE20',
          type: 'percentage',
          value: 20,
          maxDiscount: 30,
          isActive: true
        },
        error: null
      });
      
      const result = await orderService.validateCoupon('SAVE20', 200); // 20% of 200 = 40, 但最大折扣30
      
      expect(result.success).toBe(true);
      expect(result.coupon.discount).toBe(30);
    });
  });

  describe('退款处理', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该创建退款请求', async () => {
      const refundData = {
        orderId: 'order-123',
        userId: 'user-123',
        reason: '课程内容不符合预期',
        amount: 99.99
      };
      
      const result = await orderService.createRefundRequest(refundData);
      
      expect(result.success).toBe(true);
      expect(result.refund).toEqual(
        expect.objectContaining({
          orderId: 'order-123',
          amount: 99.99,
          status: 'pending',
          reason: '课程内容不符合预期'
        })
      );
      
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });

    it('应该验证退款时间窗口', async () => {
      // 模拟订单超过退款期限
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'order-123',
          completedAt: '2022-01-01T12:00:00Z', // 超过7天
          status: 'completed'
        },
        error: null
      });
      
      mockMoment().diff.mockReturnValue(10 * 24 * 60 * 60 * 1000); // 10天
      
      const refundData = {
        orderId: 'order-123',
        userId: 'user-123',
        reason: '不满意',
        amount: 99.99
      };
      
      const result = await orderService.createRefundRequest(refundData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'REFUND_WINDOW_EXPIRED',
          message: 'Refund window has expired'
        })
      );
    });

    it('应该处理退款审批', async () => {
      const result = await orderService.approveRefund('refund-123', 'admin-123');
      
      expect(result.success).toBe(true);
      
      // 应该调用支付服务处理退款
      expect(mockPaymentService.refundPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          refundId: 'refund-123',
          amount: expect.any(Number)
        })
      );
    });

    it('应该处理部分退款', async () => {
      const refundData = {
        orderId: 'order-123',
        userId: 'user-123',
        reason: '部分课程不满意',
        amount: 50.00 // 部分退款
      };
      
      const result = await orderService.createRefundRequest(refundData);
      
      expect(result.success).toBe(true);
      expect(result.refund.amount).toBe(50.00);
      expect(result.refund.type).toBe('partial');
    });

    it('应该拒绝退款请求', async () => {
      const result = await orderService.rejectRefund('refund-123', 'admin-123', '不符合退款政策');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          rejectionReason: '不符合退款政策',
          reviewedBy: 'admin-123'
        })
      );
    });
  });

  describe('订单统计和报告', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该生成订单统计报告', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          totalOrders: 1500,
          totalRevenue: 150000.00,
          averageOrderValue: 100.00,
          completionRate: 0.85,
          refundRate: 0.05
        },
        error: null
      });
      
      const result = await orderService.getOrderStatistics({
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
      
      expect(result.success).toBe(true);
      expect(result.statistics).toEqual(
        expect.objectContaining({
          totalOrders: 1500,
          totalRevenue: 150000.00,
          averageOrderValue: 100.00
        })
      );
    });

    it('应该分析销售趋势', async () => {
      const result = await orderService.getSalesTrends({
        period: 'monthly',
        year: 2023
      });
      
      expect(result.success).toBe(true);
      expect(result.trends).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            period: expect.any(String),
            orders: expect.any(Number),
            revenue: expect.any(Number)
          })
        ])
      );
    });

    it('应该获取热门课程排行', async () => {
      mockSupabase.from().select().order().limit.mockResolvedValue({
        data: [
          {
            courseId: 'course-123',
            title: 'JavaScript基础课程',
            orderCount: 500,
            revenue: 49950.00
          },
          {
            courseId: 'course-456',
            title: 'React进阶课程',
            orderCount: 300,
            revenue: 59970.00
          }
        ],
        error: null
      });
      
      const result = await orderService.getTopSellingCourses({
        limit: 10,
        period: 'last_30_days'
      });
      
      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(2);
      expect(result.courses[0].orderCount).toBe(500);
    });

    it('应该分析用户购买行为', async () => {
      const result = await orderService.getUserPurchaseBehavior('user-123');
      
      expect(result.success).toBe(true);
      expect(result.behavior).toEqual(
        expect.objectContaining({
          totalOrders: expect.any(Number),
          totalSpent: expect.any(Number),
          averageOrderValue: expect.any(Number),
          favoriteCategories: expect.any(Array),
          purchaseFrequency: expect.any(String)
        })
      );
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该高效处理大量订单查询', async () => {
      const orderIds = Array.from({ length: 1000 }, (_, i) => `order-${i}`);
      
      const startTime = Date.now();
      const promises = orderIds.map(id => getOrderById(id));
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      const successCount = results.filter(r => r.success).length;
      
      expect(successCount).toBe(1000);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该优化购物车操作性能', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        addToCart('user-123', `course-${i}`, 1)
      );
      
      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该有效管理订单缓存', async () => {
      const orderId = 'order-123';
      
      // 第一次查询
      await getOrderById(orderId);
      
      // 第二次查询应该使用缓存
      mockRedis.get.mockResolvedValue(JSON.stringify({
        id: 'order-123',
        status: 'completed'
      }));
      
      const result = await getOrderById(orderId);
      
      expect(result.success).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('order:order-123')
      );
    });

    it('应该优化批量订单处理', async () => {
      const orderUpdates = Array.from({ length: 100 }, (_, i) => ({
        id: `order-${i}`,
        status: 'completed'
      }));
      
      const startTime = Date.now();
      const result = await orderService.batchUpdateOrders(orderUpdates);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(100);
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().select().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const result = await getOrderById('order-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'DATABASE_ERROR',
          message: 'Failed to fetch order data'
        })
      );
      
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it('应该处理支付服务错误', async () => {
      mockPaymentService.createPayment.mockResolvedValue({
        success: false,
        error: { message: 'Payment service unavailable' }
      });
      
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay'
      };
      
      const result = await createOrder(orderData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'PAYMENT_ERROR',
          message: 'Failed to create payment'
        })
      );
    });

    it('应该处理Redis缓存错误', async () => {
      mockRedis.hgetall.mockRejectedValue(
        new Error('Redis connection failed')
      );
      
      // 应该降级到数据库查询
      const result = await orderService.getCart('user-123');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from().select).toHaveBeenCalled();
    });

    it('应该处理库存不足错误', async () => {
      mockCourseService.checkCourseAvailability.mockResolvedValue({
        success: false,
        error: { type: 'OUT_OF_STOCK', message: 'Course is out of stock' }
      });
      
      const result = await addToCart('user-123', 'course-123', 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'OUT_OF_STOCK',
          message: 'Course is out of stock'
        })
      );
    });

    it('应该处理并发订单冲突', async () => {
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay'
      };
      
      // 模拟并发创建订单
      mockSupabase.from().insert().mockRejectedValue(
        new Error('Unique constraint violation')
      );
      
      const result = await createOrder(orderData);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: 'CONFLICT_ERROR',
          message: 'Order creation conflict detected'
        })
      );
    });

    it('应该实现重试机制', async () => {
      let attemptCount = 0;
      mockSupabase.from().select().eq().single.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary database error');
        }
        return Promise.resolve({
          data: { id: 'order-123', status: 'pending' },
          error: null
        });
      });
      
      const result = await getOrderById('order-123');
      
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // 重试2次后成功
    });
  });

  describe('便捷函数测试', () => {
    beforeEach(async () => {
      await orderService.initialize();
    });

    it('createOrder函数应该正常工作', async () => {
      const orderData = {
        userId: 'user-123',
        paymentMethod: 'alipay'
      };
      
      const result = await createOrder(orderData);
      
      expect(result.success).toBe(true);
      expect(typeof result.order).toBe('object');
    });

    it('updateOrderStatus函数应该正常工作', async () => {
      const result = await updateOrderStatus('order-123', 'paid');
      
      expect(result.success).toBe(true);
      expect(typeof result.order).toBe('object');
    });

    it('cancelOrder函数应该正常工作', async () => {
      const result = await cancelOrder('order-123', '用户取消');
      
      expect(result.success).toBe(true);
      expect(typeof result.order).toBe('object');
    });

    it('getOrderById函数应该正常工作', async () => {
      const result = await getOrderById('order-123');
      
      expect(result.success).toBe(true);
      expect(typeof result.order).toBe('object');
    });

    it('addToCart函数应该正常工作', async () => {
      const result = await addToCart('user-123', 'course-123', 1);
      
      expect(result.success).toBe(true);
      expect(typeof result.cartItem).toBe('object');
    });
  });
});