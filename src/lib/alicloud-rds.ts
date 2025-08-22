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
}

/**
 * 查询结果接口
 * @interface QueryResult
 * @property {any[]} rows - 查询结果行
 * @property {number} rowCount - 影响行数
 * @property {any} fields - 字段信息
 */
interface QueryResult {
  rows: any[]
  rowCount: number
  fields?: any
}

/**
 * 阿里云RDS数据库客户端类
 * 支持MySQL和PostgreSQL数据库
 */
class AliCloudRDS {
  private config: RDSConfig
  private pool: Pool | mysql.Pool | null = null

  /**
   * 构造函数
   * @param {RDSConfig} config - RDS配置
   */
  constructor(config: RDSConfig) {
    this.config = {
      connectionLimit: 10,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      ssl: true,
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
      if (this.config.type === DatabaseType.POSTGRESQL) {
        const poolConfig: PoolConfig = {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
          ssl: this.config.ssl,
          max: this.config.connectionLimit,
          acquireTimeoutMillis: this.config.acquireTimeoutMillis,
          idleTimeoutMillis: this.config.idleTimeoutMillis
        }
        this.pool = new Pool(poolConfig)
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
      }
      
      console.log(`阿里云RDS ${this.config.type} 连接池初始化成功`)
    } catch (error) {
      console.error('RDS连接池初始化失败:', error)
      throw new Error(`RDS连接池初始化失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 执行查询
   * @param {string} sql - SQL语句
   * @param {any[]} params - 查询参数
   * @returns {Promise<QueryResult>} 查询结果
   * @example
   * const result = await rdsClient.query('SELECT * FROM users WHERE id = $1', [1])
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
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
      console.error('数据库查询失败:', error)
      throw new Error(`数据库查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 执行事务
   * @param {Function} callback - 事务回调函数
   * @returns {Promise<any>} 事务结果
   * @example
   * const result = await rdsClient.transaction(async (client) => {
   *   await client.query('INSERT INTO users (name) VALUES ($1)', ['John'])
   *   await client.query('UPDATE users SET status = $1 WHERE name = $2', ['active', 'John'])
   *   return { success: true }
   * })
   */
  async transaction(callback: (client: any) => Promise<any>): Promise<any> {
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
   * 获取数据库信息
   * @returns {Promise<any>} 数据库信息
   * @example
   * const dbInfo = await rdsClient.getDatabaseInfo()
   */
  async getDatabaseInfo(): Promise<any> {
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
   * 关闭数据库连接池
   * @returns {Promise<void>}
   * @example
   * await rdsClient.close()
   */
  async close(): Promise<void> {
    if (this.pool) {
      if (this.config.type === DatabaseType.POSTGRESQL) {
        await (this.pool as Pool).end()
      } else if (this.config.type === DatabaseType.MYSQL) {
        await (this.pool as mysql.Pool).end()
      }
      this.pool = null
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
    port: parseInt(process.env.ALICLOUD_RDS_PORT || '3306'),
    database: process.env.ALICLOUD_RDS_DATABASE || '',
    username: process.env.ALICLOUD_RDS_USERNAME || '',
    password: process.env.ALICLOUD_RDS_PASSWORD || '',
    ssl: process.env.ALICLOUD_RDS_SSL === 'true',
    connectionLimit: parseInt(process.env.ALICLOUD_RDS_CONNECTION_LIMIT || '10')
  }

  if (!config.host || !config.database || !config.username || !config.password) {
    throw new Error('阿里云RDS配置不完整，请检查环境变量')
  }

  return new AliCloudRDS(config)
}

// 导出RDS客户端类和相关类型
export { AliCloudRDS, DatabaseType, createRDSClient }
export type { RDSConfig, QueryResult }

// 默认导出创建RDS客户端的函数
export default createRDSClient