/**
 * API监控和统计相关的类型定义
 * 包含API调用统计、性能监控、错误追踪等数据结构
 */

// API调用记录
export interface ApiCallRecord {
  id: string;
  endpoint: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip: string;
  timestamp: Date;
  responseTime: number; // 毫秒
  statusCode: number;
  requestSize: number; // 字节
  responseSize: number; // 字节
  error?: string;
  errorType?: ErrorType;
}

// 错误类型枚举
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api'
}

// API端点统计
export interface EndpointStats {
  endpoint: string;
  method: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalRequestSize: number;
  totalResponseSize: number;
  errorRate: number; // 百分比
  lastCalled: Date;
}

// 用户使用统计
export interface UserUsageStats {
  userId: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  averageResponseTime: number;
  totalDataTransfer: number; // 字节
  mostUsedEndpoints: Array<{
    endpoint: string;
    method: string;
    count: number;
  }>;
  lastActivity: Date;
  dailyUsage: Array<{
    date: string;
    calls: number;
  }>;
}

// 系统性能指标
export interface SystemMetrics {
  timestamp: Date;
  totalRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  activeUsers: number;
  memoryUsage: number; // MB
  cpuUsage: number; // 百分比
  diskUsage: number; // 百分比
  networkIn: number; // 字节/秒
  networkOut: number; // 字节/秒
}

// 实时监控数据
export interface RealTimeMetrics {
  currentRps: number; // 当前每秒请求数
  currentActiveUsers: number;
  currentResponseTime: number;
  currentErrorRate: number;
  recentErrors: Array<{
    timestamp: Date;
    endpoint: string;
    error: string;
    count: number;
  }>;
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    rps: number;
    responseTime: number;
  }>;
}

// 监控配置
export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number; // 采样率 0-1
  retentionDays: number; // 数据保留天数
  alertThresholds: {
    errorRate: number; // 错误率阈值
    responseTime: number; // 响应时间阈值(ms)
    requestsPerSecond: number; // RPS阈值
  };
  excludeEndpoints: string[]; // 排除监控的端点
  enableRealTime: boolean;
}

// 报警规则
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: {
    metric: 'error_rate' | 'response_time' | 'rps' | 'cpu_usage' | 'memory_usage';
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number; // 持续时间(秒)
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'sms';
    target: string;
    template?: string;
  }>;
  cooldown: number; // 冷却时间(秒)
  lastTriggered?: Date;
}

// 报警记录
export interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
}

// 仪表板数据
export interface DashboardData {
  overview: {
    totalRequests: number;
    totalUsers: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number; // 百分比
  };
  timeSeriesData: {
    requests: Array<{ timestamp: Date; value: number }>;
    responseTime: Array<{ timestamp: Date; value: number }>;
    errors: Array<{ timestamp: Date; value: number }>;
    users: Array<{ timestamp: Date; value: number }>;
  };
  topEndpoints: EndpointStats[];
  recentErrors: Array<{
    timestamp: Date;
    endpoint: string;
    method: string;
    error: string;
    userId?: string;
  }>;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    lastCheck: Date;
  };
}

// API监控中间件选项
export interface MonitoringMiddlewareOptions {
  config: MonitoringConfig;
  onRecord?: (record: ApiCallRecord) => void;
  onError?: (error: Error, record: Partial<ApiCallRecord>) => void;
}

// 统计查询参数
export interface StatsQuery {
  startDate?: Date;
  endDate?: Date;
  endpoint?: string;
  method?: string;
  userId?: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  offset?: number;
}

// 导出数据格式
export interface ExportData {
  format: 'json' | 'csv' | 'xlsx';
  data: Record<string, unknown>[];
  metadata: {
    generatedAt: Date;
    totalRecords: number;
    query: StatsQuery;
  };
}