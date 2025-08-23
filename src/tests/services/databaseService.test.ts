/**
 * 数据库服务单元测试
 * 测试数据库连接、查询、事务、连接池等功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 模拟依赖
jest.mock('../../config/envConfig', () => ({
  envConfig: {
    database: {
      host: 'localhost',
      port: 3306,
      username: 'test',
      password: 'test',
      database: 'test_db',
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      ssl: false
    }
  }
}));

jest.mock('../../utils/errorHandler', () => ({
  errorHandler: {
    handleError: jest.fn(),
    logError: jest.fn(),
    createError: jest.fn((message: string, code?: string) => new Error(message))
  }
}));

jest.mock('../../utils/validator', () => ({
  validator: {
    validateRequired: jest.fn(() => true),
    validateString: jest.fn(() => true),
    validateNumber: jest.fn(() => true),
    validateObject: jest.fn(() => true),
    validateArray: jest.fn(() => true)
  }
}));

// 模拟 mysql2
const mockConnection = {
  execute: jest.fn(),
  query: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn(),
  destroy: jest.fn(),
  ping: jest.fn()
};

const mockPool = {
  getConnection: jest.fn(() => Promise.resolve(mockConnection)),
  execute: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
  on: jest.fn()
};

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => mockPool)
}));

// 导入要测试的模块
import {
  // 数据库连接管理
  initializeDatabase,
  destroyDatabase,
  isDatabaseInitialized,
  getDatabaseStatus,
  
  // 基础查询操作
  executeQuery,
  executeTransaction,
  executeBatch,
  
  // 数据操作
  insert,
  update,
  deleteRecord,
  select,
  selectOne,
  selectCount,
  
  // 表操作
  createTable,
  dropTable,
  alterTable,
  truncateTable,
  
  // 索引操作
  createIndex,
  dropIndex,
  getIndexes,
  
  // 连接池管理
  getPoolStatus,
  getActiveConnections,
  getIdleConnections,
  closeIdleConnections,
  
  // 健康检查
  checkDatabaseHealth,
  pingDatabase,
  testConnection,
  
  // 备份和恢复
  backupDatabase,
  restoreDatabase,
  exportTable,
  importTable,
  
  // 监控和统计
  getDatabaseStats,
  getQueryStats,
  resetStats,
  
  // 配置管理
  getDatabaseConfig,
  updateDatabaseConfig,
  
  // 类型定义
  DatabaseConfig,
  QueryResult,
  TransactionCallback,
  DatabaseStats,
  PoolStatus,
  HealthStatus,
  
  // 数据库服务实例
  databaseService
} from '../../services/databaseService';

describe('数据库服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /**
   * 数据库连接管理测试
   */
  describe('数据库连接管理', () => {
    it('应该成功初始化数据库连接', async () => {
      const result = await initializeDatabase();
      expect(result).toBe(true);
      expect(isDatabaseInitialized()).toBe(true);
    });

    it('应该处理数据库初始化失败', async () => {
      mockPool.getConnection.mockRejectedValueOnce(new Error('连接失败'));
      
      const result = await initializeDatabase();
      expect(result).toBe(false);
    });

    it('应该成功销毁数据库连接', async () => {
      await initializeDatabase();
      const result = await destroyDatabase();
      expect(result).toBe(true);
      expect(isDatabaseInitialized()).toBe(false);
    });

    it('应该获取数据库状态', async () => {
      await initializeDatabase();
      const status = await getDatabaseStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('pool');
      expect(status).toHaveProperty('uptime');
    });
  });

  /**
   * 基础查询操作测试
   */
  describe('基础查询操作', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该成功执行查询', async () => {
      const mockResult = [{ id: 1, name: 'test' }];
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);
      
      const result = await executeQuery('SELECT * FROM users WHERE id = ?', [1]);
      expect(result).toEqual(mockResult);
      expect(mockPool.execute).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
    });

    it('应该处理查询错误', async () => {
      mockPool.execute.mockRejectedValueOnce(new Error('查询失败'));
      
      await expect(executeQuery('INVALID SQL')).rejects.toThrow('查询失败');
    });

    it('应该成功执行事务', async () => {
      mockConnection.execute.mockResolvedValue([[], []]);
      mockConnection.beginTransaction.mockResolvedValue(undefined);
      mockConnection.commit.mockResolvedValue(undefined);
      
      const callback = jest.fn(async (conn) => {
        await conn.execute('INSERT INTO users (name) VALUES (?)', ['test']);
        return { success: true };
      });
      
      const result = await executeTransaction(callback);
      expect(result).toEqual({ success: true });
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('应该在事务失败时回滚', async () => {
      mockConnection.beginTransaction.mockResolvedValue(undefined);
      mockConnection.rollback.mockResolvedValue(undefined);
      
      const callback = jest.fn(async () => {
        throw new Error('事务失败');
      });
      
      await expect(executeTransaction(callback)).rejects.toThrow('事务失败');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('应该成功执行批量操作', async () => {
      const queries = [
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['user1'] },
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['user2'] }
      ];
      
      mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }, []]);
      
      const results = await executeBatch(queries);
      expect(results).toHaveLength(2);
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * 数据操作测试
   */
  describe('数据操作', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该成功插入数据', async () => {
      const mockResult = { insertId: 1, affectedRows: 1 };
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);
      
      const result = await insert('users', { name: 'test', email: 'test@example.com' });
      expect(result.insertId).toBe(1);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['test', 'test@example.com']
      );
    });

    it('应该成功更新数据', async () => {
      const mockResult = { affectedRows: 1 };
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);
      
      const result = await update('users', { name: 'updated' }, { id: 1 });
      expect(result.affectedRows).toBe(1);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE users SET name = ? WHERE id = ?',
        ['updated', 1]
      );
    });

    it('应该成功删除数据', async () => {
      const mockResult = { affectedRows: 1 };
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);
      
      const result = await deleteRecord('users', { id: 1 });
      expect(result.affectedRows).toBe(1);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      );
    });

    it('应该成功查询多条数据', async () => {
      const mockResult = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }];
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);
      
      const result = await select('users', { status: 'active' });
      expect(result).toEqual(mockResult);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE status = ?',
        ['active']
      );
    });

    it('应该成功查询单条数据', async () => {
      const mockResult = [{ id: 1, name: 'test' }];
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);
      
      const result = await selectOne('users', { id: 1 });
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('应该成功查询数据数量', async () => {
      const mockResult = [{ count: 5 }];
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);
      
      const result = await selectCount('users', { status: 'active' });
      expect(result).toBe(5);
    });
  });

  /**
   * 表操作测试
   */
  describe('表操作', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该成功创建表', async () => {
      const schema = {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        name: 'VARCHAR(255) NOT NULL',
        email: 'VARCHAR(255) UNIQUE',
        created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      };
      
      mockPool.execute.mockResolvedValueOnce([{}, []]);
      
      const result = await createTable('test_table', schema);
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE test_table')
      );
    });

    it('应该成功删除表', async () => {
      mockPool.execute.mockResolvedValueOnce([{}, []]);
      
      const result = await dropTable('test_table');
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith('DROP TABLE IF EXISTS test_table');
    });

    it('应该成功修改表结构', async () => {
      mockPool.execute.mockResolvedValueOnce([{}, []]);
      
      const result = await alterTable('users', 'ADD COLUMN phone VARCHAR(20)');
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'ALTER TABLE users ADD COLUMN phone VARCHAR(20)'
      );
    });

    it('应该成功清空表', async () => {
      mockPool.execute.mockResolvedValueOnce([{}, []]);
      
      const result = await truncateTable('test_table');
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith('TRUNCATE TABLE test_table');
    });
  });

  /**
   * 索引操作测试
   */
  describe('索引操作', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该成功创建索引', async () => {
      mockPool.execute.mockResolvedValueOnce([{}, []]);
      
      const result = await createIndex('users', 'idx_email', ['email']);
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'CREATE INDEX idx_email ON users (email)'
      );
    });

    it('应该成功删除索引', async () => {
      mockPool.execute.mockResolvedValueOnce([{}, []]);
      
      const result = await dropIndex('users', 'idx_email');
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'DROP INDEX idx_email ON users'
      );
    });

    it('应该成功获取索引列表', async () => {
      const mockIndexes = [
        { Key_name: 'PRIMARY', Column_name: 'id' },
        { Key_name: 'idx_email', Column_name: 'email' }
      ];
      mockPool.execute.mockResolvedValueOnce([mockIndexes, []]);
      
      const result = await getIndexes('users');
      expect(result).toEqual(mockIndexes);
    });
  });

  /**
   * 连接池管理测试
   */
  describe('连接池管理', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该获取连接池状态', async () => {
      const status = await getPoolStatus();
      
      expect(status).toHaveProperty('totalConnections');
      expect(status).toHaveProperty('activeConnections');
      expect(status).toHaveProperty('idleConnections');
      expect(status).toHaveProperty('queuedRequests');
    });

    it('应该获取活跃连接数', async () => {
      const activeCount = await getActiveConnections();
      expect(typeof activeCount).toBe('number');
      expect(activeCount).toBeGreaterThanOrEqual(0);
    });

    it('应该获取空闲连接数', async () => {
      const idleCount = await getIdleConnections();
      expect(typeof idleCount).toBe('number');
      expect(idleCount).toBeGreaterThanOrEqual(0);
    });

    it('应该成功关闭空闲连接', async () => {
      const result = await closeIdleConnections();
      expect(typeof result).toBe('number');
    });
  });

  /**
   * 健康检查测试
   */
  describe('健康检查', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该成功检查数据库健康状态', async () => {
      mockConnection.ping.mockResolvedValueOnce(undefined);
      
      const health = await checkDatabaseHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('responseTime');
      expect(health).toHaveProperty('connections');
      expect(health.status).toBe('healthy');
    });

    it('应该检测到数据库不健康状态', async () => {
      mockConnection.ping.mockRejectedValueOnce(new Error('连接失败'));
      
      const health = await checkDatabaseHealth();
      expect(health.status).toBe('unhealthy');
    });

    it('应该成功ping数据库', async () => {
      mockConnection.ping.mockResolvedValueOnce(undefined);
      
      const result = await pingDatabase();
      expect(result).toBe(true);
    });

    it('应该成功测试连接', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ result: 1 }], []]);
      
      const result = await testConnection();
      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith('SELECT 1 as result');
    });
  });

  /**
   * 备份和恢复测试
   */
  describe('备份和恢复', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该成功备份数据库', async () => {
      const backupPath = '/tmp/backup.sql';
      
      const result = await backupDatabase(backupPath);
      expect(result).toBe(true);
    });

    it('应该成功恢复数据库', async () => {
      const backupPath = '/tmp/backup.sql';
      
      const result = await restoreDatabase(backupPath);
      expect(result).toBe(true);
    });

    it('应该成功导出表数据', async () => {
      const exportPath = '/tmp/users.sql';
      
      const result = await exportTable('users', exportPath);
      expect(result).toBe(true);
    });

    it('应该成功导入表数据', async () => {
      const importPath = '/tmp/users.sql';
      
      const result = await importTable('users', importPath);
      expect(result).toBe(true);
    });
  });

  /**
   * 监控和统计测试
   */
  describe('监控和统计', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该获取数据库统计信息', async () => {
      const stats = await getDatabaseStats();
      
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('successfulQueries');
      expect(stats).toHaveProperty('failedQueries');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats).toHaveProperty('connectionStats');
    });

    it('应该获取查询统计信息', async () => {
      const queryStats = await getQueryStats();
      
      expect(queryStats).toHaveProperty('totalQueries');
      expect(queryStats).toHaveProperty('queryTypes');
      expect(queryStats).toHaveProperty('slowQueries');
      expect(queryStats).toHaveProperty('averageExecutionTime');
    });

    it('应该成功重置统计信息', async () => {
      const result = await resetStats();
      expect(result).toBe(true);
    });
  });

  /**
   * 配置管理测试
   */
  describe('配置管理', () => {
    it('应该获取数据库配置', async () => {
      const config = await getDatabaseConfig();
      
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('connectionLimit');
    });

    it('应该成功更新数据库配置', async () => {
      const newConfig = {
        connectionLimit: 20,
        acquireTimeout: 120000
      };
      
      const result = await updateDatabaseConfig(newConfig);
      expect(result).toBe(true);
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该处理连接池耗尽错误', async () => {
      mockPool.getConnection.mockRejectedValueOnce(new Error('连接池耗尽'));
      
      await expect(executeQuery('SELECT 1')).rejects.toThrow('连接池耗尽');
    });

    it('应该处理SQL语法错误', async () => {
      mockPool.execute.mockRejectedValueOnce(new Error('SQL语法错误'));
      
      await expect(executeQuery('INVALID SQL')).rejects.toThrow('SQL语法错误');
    });

    it('应该处理数据库连接超时', async () => {
      mockPool.execute.mockRejectedValueOnce(new Error('连接超时'));
      
      await expect(executeQuery('SELECT SLEEP(100)')).rejects.toThrow('连接超时');
    });

    it('应该处理事务死锁', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('死锁检测'));
      
      const callback = jest.fn(async (conn) => {
        await conn.execute('UPDATE users SET name = ? WHERE id = ?', ['test', 1]);
      });
      
      await expect(executeTransaction(callback)).rejects.toThrow('死锁检测');
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('应该快速处理大量查询', async () => {
      const startTime = Date.now();
      const promises = [];
      
      mockPool.execute.mockResolvedValue([[{ id: 1 }], []]);
      
      for (let i = 0; i < 100; i++) {
        promises.push(executeQuery('SELECT * FROM users WHERE id = ?', [i]));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该高效处理批量插入', async () => {
      const startTime = Date.now();
      const queries = [];
      
      mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }, []]);
      
      for (let i = 0; i < 1000; i++) {
        queries.push({
          sql: 'INSERT INTO users (name) VALUES (?)',
          params: [`user${i}`]
        });
      }
      
      await executeBatch(queries);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
    });

    it('应该优化内存使用', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      mockPool.execute.mockResolvedValue([[{ data: 'x'.repeat(1000) }], []]);
      
      // 执行大量查询
      for (let i = 0; i < 100; i++) {
        await executeQuery('SELECT * FROM large_table LIMIT 1000');
      }
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 小于100MB
    });
  });

  /**
   * 导出测试
   */
  describe('数据库服务导出', () => {
    it('应该导出所有数据库连接管理函数', () => {
      expect(typeof initializeDatabase).toBe('function');
      expect(typeof destroyDatabase).toBe('function');
      expect(typeof isDatabaseInitialized).toBe('function');
      expect(typeof getDatabaseStatus).toBe('function');
    });

    it('应该导出所有基础查询操作函数', () => {
      expect(typeof executeQuery).toBe('function');
      expect(typeof executeTransaction).toBe('function');
      expect(typeof executeBatch).toBe('function');
    });

    it('应该导出所有数据操作函数', () => {
      expect(typeof insert).toBe('function');
      expect(typeof update).toBe('function');
      expect(typeof deleteRecord).toBe('function');
      expect(typeof select).toBe('function');
      expect(typeof selectOne).toBe('function');
      expect(typeof selectCount).toBe('function');
    });

    it('应该导出所有表操作函数', () => {
      expect(typeof createTable).toBe('function');
      expect(typeof dropTable).toBe('function');
      expect(typeof alterTable).toBe('function');
      expect(typeof truncateTable).toBe('function');
    });

    it('应该导出所有索引操作函数', () => {
      expect(typeof createIndex).toBe('function');
      expect(typeof dropIndex).toBe('function');
      expect(typeof getIndexes).toBe('function');
    });

    it('应该导出所有连接池管理函数', () => {
      expect(typeof getPoolStatus).toBe('function');
      expect(typeof getActiveConnections).toBe('function');
      expect(typeof getIdleConnections).toBe('function');
      expect(typeof closeIdleConnections).toBe('function');
    });

    it('应该导出所有健康检查函数', () => {
      expect(typeof checkDatabaseHealth).toBe('function');
      expect(typeof pingDatabase).toBe('function');
      expect(typeof testConnection).toBe('function');
    });

    it('应该导出所有备份和恢复函数', () => {
      expect(typeof backupDatabase).toBe('function');
      expect(typeof restoreDatabase).toBe('function');
      expect(typeof exportTable).toBe('function');
      expect(typeof importTable).toBe('function');
    });

    it('应该导出所有监控和统计函数', () => {
      expect(typeof getDatabaseStats).toBe('function');
      expect(typeof getQueryStats).toBe('function');
      expect(typeof resetStats).toBe('function');
    });

    it('应该导出所有配置管理函数', () => {
      expect(typeof getDatabaseConfig).toBe('function');
      expect(typeof updateDatabaseConfig).toBe('function');
    });

    it('应该导出所有类型定义', () => {
      expect(DatabaseConfig).toBeDefined();
      expect(QueryResult).toBeDefined();
      expect(TransactionCallback).toBeDefined();
      expect(DatabaseStats).toBeDefined();
      expect(PoolStatus).toBeDefined();
      expect(HealthStatus).toBeDefined();
    });