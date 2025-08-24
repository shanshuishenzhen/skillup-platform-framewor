import { Pool, PoolConfig } from 'pg'
import mysql from 'mysql2/promise'

/**
 * 数据库类型枚举
 */
enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql'
}

/**
 * 阿里云RDS配置接口
 * @interface RDSConfig
 * @property {DatabaseType} type - 数据库类型
 * @property {string} host - 数据库主机地址
 * @property {number} port - 数据库端口
 * @property {string} database - 数据库名称
 * @property {string} username - 用户名
 * @property {string} password - 密码
 * @property {boolean} ssl - 是否启用SSL
 * @property {number} connectionLimit - 连接池大小
 * @property {number} acquireTimeoutMillis - 获取连接超时时间
 * @property {number} idleTimeoutMillis - 空闲连接超时时间
 * @property {number} maxRetries - 最大重试次数
 * @property {number} retryDelay - 重试延迟时间（毫秒）
 * @property {number} healthCheckInterval - 健康检查间隔（毫秒）
 * @property {boolean} enableHealthCheck - 是否启用健康检查
 */
interface RDSConfig {
  type: DatabaseType
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  connectionLimit?: number
  acquireTimeoutMillis?: number
  idleTimeoutMillis?: number
  maxRetries?: number
  retryDelay?: number
  healthCheckInterval?: number
  enableHealthCheck?: boolean
}

/**
 * 数据库行记录类型
 */
type DatabaseRow = Record<string, unknown>

/**
 * 数据库字段信息类型
 */
type DatabaseField = {
  name: string
  dataTypeID?: number
  dataTypeSize?: number
  dataTypeModifier?: number
  format?: string
}

/**
 * 查询结果接口
 * @interface QueryResult
 * @property {DatabaseRow[]} rows - 查询结果行
 * @property {number} rowCount - 影响行数
 * @property {DatabaseField[]} fields - 字段信息
 */
interface QueryResult {
  rows: DatabaseRow[]
  rowCount: number
  fields?: DatabaseField[]
}

/**
 * 连接池状态接口
 * @interface PoolStatus
 * @property {number} totalConnections - 总连接数
 * @property {number} idleConnections - 空闲连接数
 * @property {number} waitingClients - 等待连接的客户端数
 * @property {boolean} isHealthy - 连接池是否健康
 * @property {Date} lastHealthCheck - 最后健康检查时间
 */
interface PoolStatus {
  totalConnections: number
  idleConnections: number
  waitingClients: number
  isHealthy: boolean
  lastHealthCheck: Date
}

/**
 * 阿里云RDS数据库客户端类
 * 支持MySQL和PostgreSQL数据库
 */
class AliCloudRDS {
  private config: RDSConfig
  private pool: Pool | mysql.Pool | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null
  private isConnected: boolean = false
  private lastHealthCheck: Date = new Date()
  private retryCount: number = 0

  /**
   * 构造函数
   * @param {RDSConfig} config - RDS配置
   * @example
   * const rdsClient = new AliCloudRDS({
   *   type: DatabaseType.MYSQL,
   *   host: 'localhost',
   *   port: 3306,
   *   database: 'test',
   *   username: 'root',
   *   password: 'password'
   * })
   */
  constructor(config: RDSConfig) {
    this.config = {
      connectionLimit: 10,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      ssl: true,
      maxRetries: 3,
      retryDelay: 5000,
      healthCheckInterval: 30000,
      enableHealthCheck: true,
      ...config
    }
  }

  /**
   * 初始化数据库连接池
   * @returns {Promise<void>}
   * @example
   * await rdsClient.initialize()
   */
  async initialize(): Promise<void> {
    try {
      await this.createConnectionPool()
      
      // 测试连接
      const isConnected = await this.testConnection()
      if (!isConnected) {
        throw new Error('数据库连接测试失败')
      }
      
      this.isConnected = true
      this.retryCount = 0
      
      // 启动健康检查
      if (this.config.enableHealthCheck) {
        this.startHealthCheck()
      }
      
      console.log(`阿里云RDS ${this.config.type} 连接池初始化成功`)
    } catch (error) {
      console.error('RDS连接池初始化失败:', error)
      await this.handleConnectionError(error)
    }
  }

  /**
   * 创建数据库连接池
   * @private
   * @returns {Promise<void>}
   */
  private async createConnectionPool(): Promise<void> {
    if (this.config.type === DatabaseType.POSTGRESQL) {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? {} : false,
        max: this.config.connectionLimit,
        acquireTimeoutMillis: this.config.acquireTimeoutMillis,
        idleTimeoutMillis: this.config.idleTimeoutMillis
      })
      
      // 监听连接池事件
      this.pool.on('error', (err) => {
        console.error('PostgreSQL连接池错误:', err)
        this.handleConnectionError(err)
      })
      
      this.pool.on('connect', () => {
        console.log('PostgreSQL连接池建立新连接')
      })
      
    } else if (this.config.type === DatabaseType.MYSQL) {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? {} : false,
        connectionLimit: this.config.connectionLimit,
        acquireTimeout: this.config.acquireTimeoutMillis,
        timeout: this.config.idleTimeoutMillis
      })
      
      // 监听连接池事件
      this.pool.on('error', (err) => {
        console.error('MySQL连接池错误:', err)
        this.handleConnectionError(err)
      })
      
      this.pool.on('connection', () => {
        console.log('MySQL连接池建立新连接')
      })
    }
  }

  /**
   * 执行查询（带重试机制）
   * @param {string} sql - SQL语句
   * @param {unknown[]} params - 查询参数
   * @param {number} retryCount - 当前重试次数
   * @returns {Promise<QueryResult>} 查询结果
   * @example
   * const result = await rdsClient.query('SELECT * FROM users WHERE id = $1', [1])
   */
  async query(sql: string, params: unknown[] = [], retryCount: number = 0): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化，请先调用 initialize() 方法')
    }

    try {
      if (this.config.type === DatabaseType.POSTGRESQL) {
        const client = await (this.pool as Pool).connect()
        try {
          const result = await client.query(sql, params)
          return {
            rows: result.rows,
            rowCount: result.rowCount || 0,
            fields: result.fields
          }
        } finally {
          client.release()
        }
      } else if (this.config.type === DatabaseType.MYSQL) {
        const [rows, fields] = await (this.pool as mysql.Pool).execute(sql, params)
        return {
          rows: Array.isArray(rows) ? rows : [],
          rowCount: Array.isArray(rows) ? rows.length : 0,
          fields
        }
      }
      
      throw new Error('不支持的数据库类型')
    } catch (error) {
      console.error(`数据库查询失败 (尝试 ${retryCount + 1}/${this.config.maxRetries! + 1}):`, error)
      
      // 检查是否为连接相关错误且可以重试
      const isConnectionError = this.isConnectionError(error)
      if (isConnectionError && retryCount < this.config.maxRetries!) {
        console.log(`检测到连接错误，${this.config.retryDelay}ms后进行重试...`)
        
        // 等待重试延迟
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!))
        
        // 尝试重新连接
        try {
          await this.reconnect()
          return await this.query(sql, params, retryCount + 1)
        } catch (reconnectError) {
          console.error('重新连接失败:', reconnectError)
        }
      }
      
      throw new Error(`数据库查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 判断是否为连接相关错误
   * @private
   * @param {unknown} error - 错误对象
   * @returns {boolean} 是否为连接错误
   */
  private isConnectionError(error: unknown): boolean {
    if (!error) return false
    
    const errorMessage = error.message?.toLowerCase() || ''
    const connectionErrorKeywords = [
      'connection',
      'connect',
      'timeout',
      'network',
      'econnrefused',
      'enotfound',
      'etimedout',
      'connection terminated',
      'server closed the connection',
      'connection lost'
    ]
    
    return connectionErrorKeywords.some(keyword => errorMessage.includes(keyword))
  }

  /**
   * 数据库客户端类型
   */
  type DatabaseClient = {
    query: (sql: string, params?: unknown[]) => Promise<QueryResult>
    release?: () => void
    beginTransaction?: () => Promise<void>
    commit?: () => Promise<void>
    rollback?: () => Promise<void>
  }

  /**
   * 执行事务
   * @param {Function} callback - 事务回调函数
   * @returns {Promise<T>} 事务结果
   * @example
   * const result = await rdsClient.transaction(async (client) => {
   *   await client.query('INSERT INTO users (name) VALUES ($1)', ['John'])
   *   await client.query('UPDATE users SET status = $1 WHERE name = $2', ['active', 'John'])
   *   return { success: true }
   * })
   */
  async transaction<T = unknown>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化，请先调用 initialize() 方法')
    }

    if (this.config.type === DatabaseType.POSTGRESQL) {
      const client = await (this.pool as Pool).connect()
      try {
        await client.query('BEGIN')
        const result = await callback(client)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } else if (this.config.type === DatabaseType.MYSQL) {
      const connection = await (this.pool as mysql.Pool).getConnection()
      try {
        await connection.beginTransaction()
        const result = await callback(connection)
        await connection.commit()
        return result
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    }

    throw new Error('不支持的数据库类型')
  }

  /**
   * 测试数据库连接
   * @returns {Promise<boolean>} 连接是否成功
   * @example
   * const isConnected = await rdsClient.testConnection()
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch (error) {
      console.error('数据库连接测试失败:', error)
      return false
    }
  }

  /**
   * 数据库信息类型
   */
  type DatabaseInfo = {
    type: string
    version: string
    database: string
  }

  /**
   * 获取数据库信息
   * @returns {Promise<DatabaseInfo>} 数据库信息
   * @example
   * const dbInfo = await rdsClient.getDatabaseInfo()
   */
  async getDatabaseInfo(): Promise<DatabaseInfo> {
    try {
      if (this.config.type === DatabaseType.POSTGRESQL) {
        const result = await this.query('SELECT version()')
        return {
          type: 'PostgreSQL',
          version: result.rows[0]?.version,
          database: this.config.database
        }
      } else if (this.config.type === DatabaseType.MYSQL) {
        const result = await this.query('SELECT VERSION() as version')
        return {
          type: 'MySQL',
          version: result.rows[0]?.version,
          database: this.config.database
        }
      }
    } catch (error) {
      console.error('获取数据库信息失败:', error)
      throw new Error(`获取数据库信息失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 启动健康检查
   * @private
   * @returns {void}
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        const isHealthy = await this.performHealthCheck()
        this.lastHealthCheck = new Date()
        
        if (!isHealthy && this.isConnected) {
          console.warn('数据库健康检查失败，尝试重新连接')
          await this.reconnect()
        }
      } catch (error) {
        console.error('健康检查过程中发生错误:', error)
      }
    }, this.config.healthCheckInterval!)
  }

  /**
   * 执行健康检查
   * @private
   * @returns {Promise<boolean>} 是否健康
   */
  private async performHealthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch (error) {
      console.error('健康检查失败:', error)
      return false
    }
  }

  /**
   * 处理连接错误
   * @private
   * @param {unknown} error - 错误对象
   * @returns {Promise<void>}
   */
  private async handleConnectionError(error: unknown): Promise<void> {
    this.isConnected = false
    
    if (this.retryCount < this.config.maxRetries!) {
      this.retryCount++
      console.log(`连接失败，${this.config.retryDelay}ms后进行第${this.retryCount}次重试`)
      
      setTimeout(async () => {
        try {
          await this.reconnect()
        } catch (retryError) {
          console.error(`第${this.retryCount}次重试失败:`, retryError)
          if (this.retryCount >= this.config.maxRetries!) {
            throw new Error(`数据库连接失败，已达到最大重试次数(${this.config.maxRetries})`)
          }
        }
      }, this.config.retryDelay!)
    } else {
      throw new Error(`数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 重新连接数据库
   * @private
   * @returns {Promise<void>}
   */
  private async reconnect(): Promise<void> {
    try {
      // 关闭现有连接
      if (this.pool) {
        await this.close()
      }
      
      // 重新创建连接池
      await this.createConnectionPool()
      
      // 测试连接
      const isConnected = await this.testConnection()
      if (isConnected) {
        this.isConnected = true
        this.retryCount = 0
        console.log('数据库重新连接成功')
      } else {
        throw new Error('重新连接后测试失败')
      }
    } catch (error) {
      console.error('重新连接失败:', error)
      throw error
    }
  }

  /**
   * 获取连接池状态
   * @returns {Promise<PoolStatus>} 连接池状态
   * @example
   * const status = await rdsClient.getPoolStatus()
   */
  async getPoolStatus(): Promise<PoolStatus> {
    if (!this.pool) {
      return {
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        isHealthy: false,
        lastHealthCheck: this.lastHealthCheck
      }
    }

    try {
      if (this.config.type === DatabaseType.POSTGRESQL) {
        const pool = this.pool as Pool
        return {
          totalConnections: pool.totalCount,
          idleConnections: pool.idleCount,
          waitingClients: pool.waitingCount,
          isHealthy: this.isConnected,
          lastHealthCheck: this.lastHealthCheck
        }
      } else if (this.config.type === DatabaseType.MYSQL) {
        // MySQL连接池状态获取相对简单
        return {
          totalConnections: this.config.connectionLimit || 10,
          idleConnections: 0, // MySQL2不直接提供此信息
          waitingClients: 0,  // MySQL2不直接提供此信息
          isHealthy: this.isConnected,
          lastHealthCheck: this.lastHealthCheck
        }
      }
    } catch (error) {
      console.error('获取连接池状态失败:', error)
    }

    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      isHealthy: false,
      lastHealthCheck: this.lastHealthCheck
    }
  }

  /**
   * 停止健康检查
   * @private
   * @returns {void}
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  /**
   * 关闭数据库连接池
   * @returns {Promise<void>}
   * @example
   * await rdsClient.close()
   */
  async close(): Promise<void> {
    // 停止健康检查
    this.stopHealthCheck()
    
    if (this.pool) {
      if (this.config.type === DatabaseType.POSTGRESQL) {
        await (this.pool as Pool).end()
      } else if (this.config.type === DatabaseType.MYSQL) {
        await (this.pool as mysql.Pool).end()
      }
      this.pool = null
      this.isConnected = false
      console.log('数据库连接池已关闭')
    }
  }
}

/**
 * 从环境变量创建RDS客户端实例
 * @param {DatabaseType} type - 数据库类型
 * @returns {AliCloudRDS} RDS客户端实例
 */
const createRDSClient = (type: DatabaseType = DatabaseType.MYSQL): AliCloudRDS => {
  const config: RDSConfig = {
    type,
    host: process.env.ALICLOUD_RDS_HOST || '',
    port: parseInt(process.env.ALICLOUD_RDS_PORT || (type === DatabaseType.POSTGRESQL ? '5432' : '3306')),
    database: process.env.ALICLOUD_RDS_DATABASE || '',
    username: process.env.ALICLOUD_RDS_USERNAME || '',
    password: process.env.ALICLOUD_RDS_PASSWORD || '',
    ssl: process.env.ALICLOUD_RDS_SSL === 'true',
    connectionLimit: parseInt(process.env.ALICLOUD_RDS_CONNECTION_LIMIT || '10'),
    acquireTimeoutMillis: parseInt(process.env.ALICLOUD_RDS_ACQUIRE_TIMEOUT || '60000'),
    idleTimeoutMillis: parseInt(process.env.ALICLOUD_RDS_IDLE_TIMEOUT || '600000'),
    maxRetries: parseInt(process.env.ALICLOUD_RDS_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.ALICLOUD_RDS_RETRY_DELAY || '5000'),
    healthCheckInterval: parseInt(process.env.ALICLOUD_RDS_HEALTH_CHECK_INTERVAL || '30000'),
    enableHealthCheck: process.env.ALICLOUD_RDS_ENABLE_HEALTH_CHECK !== 'false'
  }

  if (!config.host || !config.database || !config.username || !config.password) {
    throw new Error('阿里云RDS配置不完整，请检查环境变量：ALICLOUD_RDS_HOST, ALICLOUD_RDS_DATABASE, ALICLOUD_RDS_USERNAME, ALICLOUD_RDS_PASSWORD')
  }

  return new AliCloudRDS(config)
}

// 导出RDS客户端类和相关类型
export { AliCloudRDS, DatabaseType, createRDSClient }
export type { RDSConfig, QueryResult, PoolStatus }

// 默认导出创建RDS客户端的函数
export default createRDSClient