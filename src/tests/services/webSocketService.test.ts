/**
 * WebSocket服务模块单元测试
 * 
 * 测试覆盖范围：
 * 1. WebSocket连接管理
 * 2. 实时消息传输
 * 3. 房间和频道管理
 * 4. 用户在线状态管理
 * 5. 消息广播和私聊
 * 6. 连接认证和授权
 * 7. 心跳检测和重连机制
 * 8. 消息队列和缓存
 * 9. 负载均衡和集群支持
 * 10. 错误处理和监控
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testUtils } from '../setup';

// 模拟依赖
jest.mock('@/utils/envConfig');
jest.mock('@/utils/errorHandler');
jest.mock('@/services/monitoringService');
jest.mock('@/services/authService');
jest.mock('@/services/userService');
jest.mock('@/services/notificationService');
jest.mock('@supabase/supabase-js');
jest.mock('socket.io');
jest.mock('socket.io-client');
jest.mock('socket.io-redis');
jest.mock('node:crypto');
jest.mock('node:events');
jest.mock('uuid');
jest.mock('moment');
jest.mock('redis');
jest.mock('bull');
jest.mock('lodash');
jest.mock('jsonwebtoken');
jest.mock('rate-limiter-flexible');

const mockEnvConfig = {
  WEBSOCKET: {
    port: 3001,
    cors: {
      origin: ['http://localhost:3000', 'https://app.example.com'],
      credentials: true
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: 'redis_password'
    },
    heartbeatInterval: 25000,
    heartbeatTimeout: 60000,
    maxConnections: 10000,
    rateLimiting: {
      points: 100,
      duration: 60
    },
    clustering: {
      enabled: true,
      adapter: 'redis'
    }
  },
  JWT: {
    secret: 'jwt_secret_key',
    expiresIn: '24h'
  }
};

const mockMonitoringService = {
  recordMetric: jest.fn(),
  recordError: jest.fn(),
  recordLatency: jest.fn(),
  recordWebSocketEvent: jest.fn()
};

const mockErrorHandler = {
  createError: jest.fn(),
  logError: jest.fn(),
  handleError: jest.fn()
};

const mockAuthService = {
  verifyToken: jest.fn(),
  validateSession: jest.fn(),
  getUserFromToken: jest.fn()
};

const mockUserService = {
  getUserById: jest.fn(),
  updateUserOnlineStatus: jest.fn(),
  getUsersByIds: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  createNotification: jest.fn()
};

// Supabase模拟
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
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })),
  rpc: jest.fn(),
  channel: jest.fn(() => ({
    on: jest.fn(),
    subscribe: jest.fn()
  }))
};

// Socket.IO模拟
const mockSocket = {
  id: 'socket-123',
  userId: 'user-123',
  rooms: new Set(['room-1', 'room-2']),
  handshake: {
    auth: {
      token: 'jwt-token-123'
    },
    address: '127.0.0.1',
    headers: {
      'user-agent': 'Mozilla/5.0'
    }
  },
  emit: jest.fn(),
  broadcast: jest.fn(() => ({
    emit: jest.fn()
  })),
  to: jest.fn(() => ({
    emit: jest.fn()
  })),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockIo = {
  on: jest.fn(),
  emit: jest.fn(),
  to: jest.fn(() => ({
    emit: jest.fn()
  })),
  in: jest.fn(() => ({
    emit: jest.fn()
  })),
  sockets: {
    sockets: new Map([['socket-123', mockSocket]]),
    adapter: {
      rooms: new Map([
        ['room-1', new Set(['socket-123'])],
        ['room-2', new Set(['socket-123', 'socket-456'])]
      ])
    }
  },
  engine: {
    clientsCount: 100
  },
  use: jest.fn(),
  close: jest.fn()
};

// Socket.IO Server模拟
const mockSocketIOServer = jest.fn(() => mockIo);

// Socket.IO Redis Adapter模拟
const mockRedisAdapter = {
  createAdapter: jest.fn()
};

// Redis模拟
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  quit: jest.fn()
};

// Bull队列模拟
const mockBullQueue = {
  add: jest.fn(),
  process: jest.fn(),
  getJob: jest.fn(),
  getJobs: jest.fn(),
  clean: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  close: jest.fn()
};

// Lodash模拟
const mockLodash = {
  debounce: jest.fn(),
  throttle: jest.fn(),
  groupBy: jest.fn(),
  uniq: jest.fn()
};

// JWT模拟
const mockJwt = {
  verify: jest.fn(),
  sign: jest.fn(),
  decode: jest.fn()
};

// Rate Limiter模拟
const mockRateLimiter = {
  consume: jest.fn(),
  get: jest.fn(),
  reset: jest.fn()
};

const mockCrypto = {
  randomUUID: jest.fn(),
  randomBytes: jest.fn(),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn()
  }))
};

const mockUuid = {
  v4: jest.fn()
};

const mockMoment = jest.fn(() => ({
  format: jest.fn(),
  add: jest.fn().mockReturnThis(),
  subtract: jest.fn().mockReturnThis(),
  isBefore: jest.fn(),
  isAfter: jest.fn(),
  toDate: jest.fn(),
  valueOf: jest.fn()
}));

const mockEventEmitter = {
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn()
};

// 导入被测试的模块
import {
  WebSocketService,
  WebSocketConnection,
  WebSocketMessage,
  WebSocketRoom,
  OnlineUser,
  MessageType,
  ConnectionStatus,
  broadcastMessage,
  sendPrivateMessage,
  joinRoom,
  leaveRoom
} from '@/services/websocketService';

describe('WebSocket服务模块', () => {
  let wsService: WebSocketService;
  let mockServer: any;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟返回值
    require('@/utils/envConfig').envConfig = mockEnvConfig;
    require('@/utils/errorHandler').errorHandler = mockErrorHandler;
    require('@/services/monitoringService').monitoringService = mockMonitoringService;
    require('@/services/authService').authService = mockAuthService;
    require('@/services/userService').userService = mockUserService;
    require('@/services/notificationService').notificationService = mockNotificationService;
    
    // 设置Supabase模拟
    require('@supabase/supabase-js').createClient = jest.fn(() => mockSupabase);
    
    // 设置其他依赖模拟
    require('socket.io').Server = mockSocketIOServer;
    require('socket.io-redis').default = mockRedisAdapter;
    require('redis').createClient = jest.fn(() => mockRedis);
    require('bull').default = jest.fn(() => mockBullQueue);
    require('lodash').default = mockLodash;
    require('jsonwebtoken').default = mockJwt;
    require('rate-limiter-flexible').RateLimiterRedis = jest.fn(() => mockRateLimiter);
    require('node:crypto').default = mockCrypto;
    require('node:events').EventEmitter = jest.fn(() => mockEventEmitter);
    require('uuid').default = mockUuid;
    require('moment').default = mockMoment;
    
    // 创建模拟HTTP服务器
    mockServer = {
      listen: jest.fn(),
      close: jest.fn()
    };
    
    // 创建WebSocket服务实例
    wsService = new WebSocketService({
      server: mockServer,
      websocket: mockEnvConfig.WEBSOCKET,
      jwt: mockEnvConfig.JWT
    });
    
    // 设置默认模拟返回值
    mockCrypto.randomUUID.mockReturnValue('ws-123');
    mockUuid.v4.mockReturnValue('uuid-v4-123');
    
    mockMoment().format.mockReturnValue('2023-01-01 12:00:00');
    mockMoment().toDate.mockReturnValue(new Date('2023-01-01'));
    mockMoment().valueOf.mockReturnValue(1672574400000);
    
    // Redis默认响应
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.hset.mockResolvedValue(1);
    mockRedis.hget.mockResolvedValue(null);
    mockRedis.hgetall.mockResolvedValue({});
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.srem.mockResolvedValue(1);
    mockRedis.smembers.mockResolvedValue([]);
    
    // Auth Service默认响应
    mockAuthService.verifyToken.mockResolvedValue({
      valid: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      }
    });
    
    mockAuthService.getUserFromToken.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    });
    
    // User Service默认响应
    mockUserService.getUserById.mockResolvedValue({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      isOnline: false
    });
    
    // Rate Limiter默认响应
    mockRateLimiter.consume.mockResolvedValue({
      remainingPoints: 99,
      msBeforeNext: 0
    });
    
    // Bull队列默认响应
    mockBullQueue.add.mockResolvedValue({ id: 'job-123' });
    
    // Lodash默认响应
    mockLodash.debounce.mockImplementation((fn) => fn);
    mockLodash.throttle.mockImplementation((fn) => fn);
    mockLodash.groupBy.mockImplementation((array, key) => {
      return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      }, {});
    });
  });

  afterEach(() => {
    if (wsService) {
      wsService.destroy();
    }
  });

  describe('服务初始化', () => {
    it('应该正确初始化WebSocket服务', async () => {
      await wsService.initialize();
      
      expect(wsService).toBeDefined();
      expect(wsService.io).toBeDefined();
      expect(wsService.config).toBeDefined();
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new WebSocketService({
          server: null,
          websocket: mockEnvConfig.WEBSOCKET
        });
      }).toThrow('HTTP server is required');
    });

    it('应该初始化Socket.IO服务器', async () => {
      await wsService.initialize();
      
      expect(mockSocketIOServer).toHaveBeenCalledWith(
        mockServer,
        expect.objectContaining({
          cors: mockEnvConfig.WEBSOCKET.cors
        })
      );
    });

    it('应该设置Redis适配器', async () => {
      await wsService.initialize();
      
      expect(mockRedisAdapter.createAdapter).toHaveBeenCalled();
    });

    it('应该初始化速率限制器', async () => {
      await wsService.initialize();
      
      expect(wsService.rateLimiter).toBeDefined();
    });

    it('应该设置连接中间件', async () => {
      await wsService.initialize();
      
      expect(mockIo.use).toHaveBeenCalled();
    });

    it('应该设置连接事件监听器', async () => {
      await wsService.initialize();
      
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('连接管理', () => {
    beforeEach(async () => {
      await wsService.initialize();
    });

    it('应该处理新的WebSocket连接', async () => {
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      await connectionHandler(mockSocket);
      
      expect(wsService.connections.has('socket-123')).toBe(true);
      
      expect(mockMonitoringService.recordWebSocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_established',
          socketId: 'socket-123'
        })
      );
    });

    it('应该验证连接认证', async () => {
      const authMiddleware = mockIo.use.mock.calls[0][0];
      const mockNext = jest.fn();
      
      await authMiddleware(mockSocket, mockNext);
      
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('jwt-token-123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('应该拒绝无效的认证', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token'
      });
      
      const authMiddleware = mockIo.use.mock.calls[0][0];
      const mockNext = jest.fn();
      
      await authMiddleware(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed'
        })
      );
    });

    it('应该应用速率限制', async () => {
      mockRateLimiter.consume.mockRejectedValue(
        new Error('Rate limit exceeded')
      );
      
      const authMiddleware = mockIo.use.mock.calls[0][0];
      const mockNext = jest.fn();
      
      await authMiddleware(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rate limit exceeded'
        })
      );
    });

    it('应该处理连接断开', async () => {
      // 先建立连接
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      await connectionHandler(mockSocket);
      
      // 模拟断开事件
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      await disconnectHandler('client disconnect');
      
      expect(wsService.connections.has('socket-123')).toBe(false);
      
      expect(mockUserService.updateUserOnlineStatus).toHaveBeenCalledWith(
        'user-123',
        false
      );
      
      expect(mockMonitoringService.recordWebSocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connection_closed',
          socketId: 'socket-123',
          reason: 'client disconnect'
        })
      );
    });

    it('应该更新用户在线状态', async () => {
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      await connectionHandler(mockSocket);
      
      expect(mockUserService.updateUserOnlineStatus).toHaveBeenCalledWith(
        'user-123',
        true
      );
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'online_users',
        'user-123',
        expect.any(String)
      );
    });

    it('应该获取连接统计信息', () => {
      const stats = wsService.getConnectionStats();
      
      expect(stats).toEqual({
        totalConnections: 0,
        activeRooms: 0,
        onlineUsers: 0,
        messagesPerSecond: 0
      });
    });
  });

  describe('消息传输', () => {
    beforeEach(async () => {
      await wsService.initialize();
      
      // 建立连接
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      await connectionHandler(mockSocket);
    });

    it('应该发送私人消息', async () => {
      const message: WebSocketMessage = {
        type: 'private_message',
        from: 'user-123',
        to: 'user-456',
        content: 'Hello, how are you?',
        timestamp: new Date()
      };
      
      const result = await wsService.sendPrivateMessage(message);
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      
      expect(mockMonitoringService.recordWebSocketEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'private_message_sent',
          from: 'user-123',
          to: 'user-456'
        })
      );
    });

    it('应该广播消息到房间', async () => {
      const message: WebSocketMessage = {
        type: 'room_message',
        from: 'user-123',
        room: 'room-1',
        content: 'Hello everyone!',
        timestamp: new Date()
      };
      
      const result = await wsService.broadcastToRoom('room-1', message);
      
      expect(result.success).toBe(true);
      
      expect(mockIo.to).toHaveBeenCalledWith('room-1');
    });

    it('应该广播系统消息', async () => {
      const message: WebSocketMessage = {
        type: 'system_message',
        content: 'System maintenance in 5 minutes',
        timestamp: new Date()
      };
      
      const result = await wsService.broadcastSystemMessage(message);
      
      expect(result.success).toBe(true);
      
      expect(mockIo.emit).toHaveBeenCalledWith('system_message', message);
    });

    it('应该处理消息事件', async () => {
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      
      const messageData = {
        type: 'chat_message',
        content: 'Hello!',
        room: 'room-1'
      };
      
      await messageHandler(messageData);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });

    it('应该验证消息内容', () => {
      const validMessage = {
        type: 'chat_message',
        content: 'Valid message',
        room: 'room-1'
      };
      
      const invalidMessage = {
        type: 'chat_message',
        content: '', // 空内容
        room: 'room-1'
      };
      
      expect(wsService.validateMessage(validMessage)).toBe(true);
      expect(wsService.validateMessage(invalidMessage)).toBe(false);
    });

    it('应该过滤敏感内容', () => {
      const message = {
        content: 'This contains bad words and spam'
      };
      
      const filtered = wsService.filterMessage(message);
      
      expect(filtered.content).toBeDefined();
      expect(filtered.filtered).toBe(true);
    });

    it('应该处理文件消息', async () => {
      const fileMessage: WebSocketMessage = {
        type: 'file_message',
        from: 'user-123',
        room: 'room-1',
        content: 'Shared a file',
        fileData: {
          name: 'document.pdf',
          size: 1024000,
          type: 'application/pdf',
          url: 'https://storage.example.com/files/document.pdf'
        },
        timestamp: new Date()
      };
      
      const result = await wsService.sendFileMessage(fileMessage);
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });
  });

  describe('房间管理', () => {
    beforeEach(async () => {
      await wsService.initialize();
      
      // 建立连接
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      await connectionHandler(mockSocket);
    });

    it('应该创建房间', async () => {
      const room: WebSocketRoom = {
        id: 'room-123',
        name: 'Test Room',
        type: 'public',
        createdBy: 'user-123',
        maxMembers: 100,
        isActive: true
      };
      
      const result = await wsService.createRoom(room);
      
      expect(result.success).toBe(true);
      expect(result.room.id).toBe('room-123');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('rooms');
    });

    it('应该加入房间', async () => {
      const result = await wsService.joinRoom('socket-123', 'room-1');
      
      expect(result.success).toBe(true);
      
      expect(mockSocket.join).toHaveBeenCalledWith('room-1');
      
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'room:room-1:members',
        'user-123'
      );
      
      expect(mockIo.to).toHaveBeenCalledWith('room-1');
    });

    it('应该离开房间', async () => {
      const result = await wsService.leaveRoom('socket-123', 'room-1');
      
      expect(result.success).toBe(true);
      
      expect(mockSocket.leave).toHaveBeenCalledWith('room-1');
      
      expect(mockRedis.srem).toHaveBeenCalledWith(
        'room:room-1:members',
        'user-123'
      );
    });

    it('应该获取房间成员', async () => {
      mockRedis.smembers.mockResolvedValue(['user-123', 'user-456', 'user-789']);
      
      const members = await wsService.getRoomMembers('room-1');
      
      expect(members).toHaveLength(3);
      expect(members).toContain('user-123');
    });

    it('应该获取房间列表', async () => {
      mockSupabase.from().select().eq().then.mockResolvedValue({
        data: [
          {
            id: 'room-1',
            name: 'General',
            type: 'public',
            memberCount: 50
          },
          {
            id: 'room-2',
            name: 'Development',
            type: 'private',
            memberCount: 10
          }
        ],
        error: null
      });
      
      const rooms = await wsService.getRooms();
      
      expect(rooms).toHaveLength(2);
      expect(rooms[0].name).toBe('General');
      expect(rooms[1].name).toBe('Development');
    });

    it('应该删除房间', async () => {
      const result = await wsService.deleteRoom('room-1', 'user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('rooms');
      
      // 应该通知所有房间成员
      expect(mockIo.to).toHaveBeenCalledWith('room-1');
    });

    it('应该验证房间权限', async () => {
      mockSupabase.from().select().eq().single().then.mockResolvedValue({
        data: {
          id: 'room-1',
          type: 'private',
          createdBy: 'user-123',
          members: ['user-123', 'user-456']
        },
        error: null
      });
      
      const hasPermission = await wsService.checkRoomPermission('user-123', 'room-1', 'join');
      
      expect(hasPermission).toBe(true);
    });

    it('应该处理房间事件', async () => {
      const joinRoomHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'join_room'
      )[1];
      
      await joinRoomHandler({ roomId: 'room-1' });
      
      expect(mockSocket.join).toHaveBeenCalledWith('room-1');
    });
  });

  describe('在线状态管理', () => {
    beforeEach(async () => {
      await wsService.initialize();
    });

    it('应该获取在线用户列表', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'user-123': JSON.stringify({
          id: 'user-123',
          name: 'User 1',
          status: 'online',
          lastSeen: new Date().toISOString()
        }),
        'user-456': JSON.stringify({
          id: 'user-456',
          name: 'User 2',
          status: 'away',
          lastSeen: new Date().toISOString()
        })
      });
      
      const onlineUsers = await wsService.getOnlineUsers();
      
      expect(onlineUsers).toHaveLength(2);
      expect(onlineUsers[0].id).toBe('user-123');
      expect(onlineUsers[1].id).toBe('user-456');
    });

    it('应该更新用户状态', async () => {
      const result = await wsService.updateUserStatus('user-123', 'away');
      
      expect(result.success).toBe(true);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'online_users',
        'user-123',
        expect.stringContaining('"status":"away"')
      );
      
      // 应该广播状态变更
      expect(mockIo.emit).toHaveBeenCalledWith(
        'user_status_changed',
        expect.objectContaining({
          userId: 'user-123',
          status: 'away'
        })
      );
    });

    it('应该处理用户状态变更事件', async () => {
      const statusHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'status_change'
      )[1];
      
      await statusHandler({ status: 'busy' });
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'online_users',
        'user-123',
        expect.stringContaining('"status":"busy"')
      );
    });

    it('应该清理离线用户', async () => {
      const result = await wsService.cleanupOfflineUsers();
      
      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it('应该获取用户的连接信息', async () => {
      const connections = await wsService.getUserConnections('user-123');
      
      expect(connections).toBeDefined();
      expect(Array.isArray(connections)).toBe(true);
    });
  });

  describe('心跳检测和重连', () => {
    beforeEach(async () => {
      await wsService.initialize();
    });

    it('应该发送心跳检测', async () => {
      const result = await wsService.sendHeartbeat('socket-123');
      
      expect(result.success).toBe(true);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('ping');
    });

    it('应该处理心跳响应', async () => {
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];
      
      await pongHandler();
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'connection_heartbeats',
        'socket-123',
        expect.any(String)
      );
    });

    it('应该检测超时连接', async () => {
      const timeoutConnections = await wsService.checkTimeoutConnections();
      
      expect(timeoutConnections).toBeDefined();
      expect(Array.isArray(timeoutConnections)).toBe(true);
    });

    it('应该断开超时连接', async () => {
      const result = await wsService.disconnectTimeoutConnections();
      
      expect(result.success).toBe(true);
      expect(result.disconnectedCount).toBeGreaterThanOrEqual(0);
    });

    it('应该启动心跳检测定时器', async () => {
      wsService.startHeartbeatTimer();
      
      expect(wsService.heartbeatTimer).toBeDefined();
    });

    it('应该停止心跳检测定时器', () => {
      wsService.startHeartbeatTimer();
      wsService.stopHeartbeatTimer();
      
      expect(wsService.heartbeatTimer).toBeNull();
    });
  });

  describe('消息队列和缓存', () => {
    beforeEach(async () => {
      await wsService.initialize();
    });

    it('应该缓存离线消息', async () => {
      const message: WebSocketMessage = {
        type: 'private_message',
        from: 'user-123',
        to: 'user-456',
        content: 'Offline message',
        timestamp: new Date()
      };
      
      const result = await wsService.cacheOfflineMessage(message);
      
      expect(result.success).toBe(true);
      
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'offline_messages:user-456',
        expect.any(String)
      );
    });

    it('应该获取离线消息', async () => {
      mockRedis.smembers.mockResolvedValue([
        JSON.stringify({
          type: 'private_message',
          from: 'user-123',
          content: 'Message 1',
          timestamp: new Date().toISOString()
        }),
        JSON.stringify({
          type: 'private_message',
          from: 'user-456',
          content: 'Message 2',
          timestamp: new Date().toISOString()
        })
      ]);
      
      const messages = await wsService.getOfflineMessages('user-789');
      
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
    });

    it('应该清除离线消息', async () => {
      const result = await wsService.clearOfflineMessages('user-123');
      
      expect(result.success).toBe(true);
      
      expect(mockRedis.del).toHaveBeenCalledWith('offline_messages:user-123');
    });

    it('应该处理消息队列', async () => {
      const message = {
        type: 'queued_message',
        content: 'Queued message'
      };
      
      const result = await wsService.queueMessage(message);
      
      expect(result.success).toBe(true);
      
      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'websocket_message',
        message
      );
    });
  });

  describe('便捷函数', () => {
    beforeEach(() => {
      // 设置全局WebSocket服务实例
      global.websocketService = wsService;
    });

    it('broadcastMessage 函数应该正常工作', async () => {
      const message: WebSocketMessage = {
        type: 'broadcast',
        content: 'Broadcast message',
        timestamp: new Date()
      };
      
      const result = await broadcastMessage(message);
      
      expect(result.success).toBe(true);
    });

    it('sendPrivateMessage 函数应该正常工作', async () => {
      const message: WebSocketMessage = {
        type: 'private_message',
        from: 'user-123',
        to: 'user-456',
        content: 'Private message',
        timestamp: new Date()
      };
      
      const result = await sendPrivateMessage(message);
      
      expect(result.success).toBe(true);
    });

    it('joinRoom 函数应该正常工作', async () => {
      const result = await joinRoom('socket-123', 'room-1');
      
      expect(result.success).toBe(true);
    });

    it('leaveRoom 函数应该正常工作', async () => {
      const result = await leaveRoom('socket-123', 'room-1');
      
      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    beforeEach(async () => {
      await wsService.initialize();
    });

    it('应该处理Redis连接错误', async () => {
      mockRedis.hset.mockRejectedValue(new Error('Redis connection failed'));
      
      // 应该降级到不使用缓存
      const result = await wsService.updateUserStatus('user-123', 'online');
      
      expect(result.success).toBe(true);
      
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'redis_error'
        })
      );
    });

    it('应该处理数据库连接错误', async () => {
      mockSupabase.from().insert().then.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      // 应该降级到不记录数据库
      const message: WebSocketMessage = {
        type: 'private_message',
        from: 'user-123',
        to: 'user-456',
        content: 'Test message',
        timestamp: new Date()
      };
      
      const result = await wsService.sendPrivateMessage(message);
      
      expect(result.success).toBe(true);
    });

    it('应该处理Socket.IO错误', async () => {
      mockSocket.emit.mockImplementation(() => {
        throw new Error('Socket emit failed');
      });
      
      await expect(
        wsService.sendToSocket('socket-123', 'test_event', { data: 'test' })
      ).rejects.toThrow('Socket emit failed');
    });

    it('应该处理无效的消息格式', () => {
      const invalidMessage = {
        // 缺少必需字段
        content: 'Invalid message'
      };
      
      expect(wsService.validateMessage(invalidMessage)).toBe(false);
    });

    it('应该处理房间权限错误', async () => {
      mockSupabase.from().select().eq().single().then.mockResolvedValue({
        data: null,
        error: new Error('Room not found')
      });
      
      await expect(
        wsService.joinRoom('socket-123', 'nonexistent-room')
      ).rejects.toThrow('Room not found');
    });
  });

  describe('性能测试', () => {
    beforeEach(async () => {
      await wsService.initialize();
    });

    it('应该高效处理大量连接', async () => {
      const connections = Array.from({ length: 1000 }, (_, i) => ({
        id: `socket-${i}`,
        userId: `user-${i}`
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(connections.map(conn => 
          wsService.handleConnection(conn)
        ));
      });
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该优化消息广播性能', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        type: 'broadcast',
        content: `Message ${i}`,
        timestamp: new Date()
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(messages.map(message => 
          wsService.broadcastSystemMessage(message)
        ));
      });
      
      expect(duration).toBeLessThan(3000); // 应该在3秒内完成
    });

    it('应该优化房间管理性能', async () => {
      const rooms = Array.from({ length: 50 }, (_, i) => ({
        id: `room-${i}`,
        name: `Room ${i}`,
        type: 'public'
      }));
      
      const { duration } = await testUtils.performanceUtils.measureTime(async () => {
        return Promise.all(rooms.map(room => 
          wsService.createRoom(room)
        ));
      });
      
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成
    });
  });
});