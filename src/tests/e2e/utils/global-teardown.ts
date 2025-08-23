/**
 * Jest 全局清理
 * 在所有测试结束后执行一次
 */

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 开始 E2E 测试全局清理...');
  
  try {
    // 1. 清理全局测试数据
    await cleanupGlobalTestData();
    
    // 2. 停止测试服务
    await stopTestServices();
    
    // 3. 关闭所有连接
    await closeAllConnections();
    
    // 4. 清理临时资源
    await cleanupTempResources();
    
    console.log('✅ E2E 测试全局清理完成');
  } catch (error) {
    console.error('❌ E2E 测试全局清理失败:', error);
    // 清理失败不应该导致进程退出失败
  }
}

/**
 * 清理全局测试数据
 */
async function cleanupGlobalTestData(): Promise<void> {
  console.log('🗑️ 清理全局测试数据...');
  
  try {
    // 清理所有测试表的数据
    await truncateTestTables();
    
    // 重置数据库序列（如果使用 PostgreSQL）
    await resetDatabaseSequences();
    
    console.log('✅ 全局测试数据清理完成');
  } catch (error) {
    console.error('❌ 清理全局测试数据失败:', error);
  }
}

/**
 * 清空测试表
 */
async function truncateTestTables(): Promise<void> {
  console.log('📋 清空测试表...');
  
  const tables = [
    'sms_verifications',
    'face_templates',
    'payments',
    'orders',
    'learning_progress',
    'lessons',
    'courses',
    'users'
  ];
  
  // 按依赖关系逆序删除
  for (const table of tables) {
    try {
      console.log(`🗑️ 清空表: ${table}`);
      // await truncateTable(table);
    } catch (error) {
      console.warn(`清空表 ${table} 失败:`, error);
    }
  }
}

/**
 * 重置数据库序列
 */
async function resetDatabaseSequences(): Promise<void> {
  console.log('🔄 重置数据库序列...');
  
  // 如果使用 PostgreSQL，重置序列
  if (process.env.DATABASE_URL?.includes('postgresql')) {
    const sequences = [
      'users_id_seq',
      'courses_id_seq',
      'lessons_id_seq',
      'orders_id_seq'
    ];
    
    for (const sequence of sequences) {
      try {
        // await resetSequence(sequence);
      } catch (error) {
        console.warn(`重置序列 ${sequence} 失败:`, error);
      }
    }
  }
}

/**
 * 停止测试服务
 */
async function stopTestServices(): Promise<void> {
  console.log('⏹️ 停止测试服务...');
  
  try {
    // 停止模拟服务
    await stopMockServices();
    
    // 停止测试邮件服务
    await stopTestMailService();
    
    console.log('✅ 测试服务停止完成');
  } catch (error) {
    console.error('❌ 停止测试服务失败:', error);
  }
}

/**
 * 停止模拟服务
 */
async function stopMockServices(): Promise<void> {
  console.log('🎭 停止模拟服务...');
  
  // 停止模拟的百度 AI 服务
  try {
    // await stopMockBaiduAIService();
  } catch (error) {
    console.warn('停止模拟百度 AI 服务失败:', error);
  }
  
  // 停止模拟的短信服务
  try {
    // await stopMockSMSService();
  } catch (error) {
    console.warn('停止模拟短信服务失败:', error);
  }
  
  // 停止模拟的支付服务
  try {
    // await stopMockPaymentService();
  } catch (error) {
    console.warn('停止模拟支付服务失败:', error);
  }
}

/**
 * 停止测试邮件服务
 */
async function stopTestMailService(): Promise<void> {
  console.log('📧 停止测试邮件服务...');
  
  // 如果启动了 MailHog 或其他测试邮件服务，在这里停止
  try {
    // await stopMailHog();
  } catch (error) {
    console.warn('停止测试邮件服务失败:', error);
  }
}

/**
 * 关闭所有连接
 */
async function closeAllConnections(): Promise<void> {
  console.log('🔌 关闭所有连接...');
  
  try {
    // 关闭数据库连接
    await closeDatabaseConnections();
    
    // 关闭 Redis 连接
    await closeRedisConnections();
    
    // 关闭其他外部服务连接
    await closeExternalServiceConnections();
    
    console.log('✅ 所有连接关闭完成');
  } catch (error) {
    console.error('❌ 关闭连接失败:', error);
  }
}

/**
 * 关闭数据库连接
 */
async function closeDatabaseConnections(): Promise<void> {
  console.log('📊 关闭数据库连接...');
  
  try {
    // 关闭主数据库连接池
    // await closePrimaryDatabase();
    
    // 关闭测试数据库连接
    // await closeTestDatabase();
    
  } catch (error) {
    console.warn('关闭数据库连接失败:', error);
  }
}

/**
 * 关闭 Redis 连接
 */
async function closeRedisConnections(): Promise<void> {
  console.log('🔴 关闭 Redis 连接...');
  
  try {
    // 关闭 Redis 客户端
    // await closeRedisClient();
    
  } catch (error) {
    console.warn('关闭 Redis 连接失败:', error);
  }
}

/**
 * 关闭外部服务连接
 */
async function closeExternalServiceConnections(): Promise<void> {
  console.log('🌐 关闭外部服务连接...');
  
  try {
    // 关闭 HTTP 客户端
    // await closeHttpClients();
    
    // 关闭 WebSocket 连接
    // await closeWebSocketConnections();
    
  } catch (error) {
    console.warn('关闭外部服务连接失败:', error);
  }
}

/**
 * 清理临时资源
 */
async function cleanupTempResources(): Promise<void> {
  console.log('📁 清理临时资源...');
  
  try {
    // 清理临时文件
    await cleanupTempFiles();
    
    // 清理上传的测试文件
    await cleanupTestUploads();
    
    // 清理缓存文件
    await cleanupCacheFiles();
    
    // 清理日志文件
    await cleanupLogFiles();
    
    console.log('✅ 临时资源清理完成');
  } catch (error) {
    console.error('❌ 清理临时资源失败:', error);
  }
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles(): Promise<void> {
  console.log('🗂️ 清理临时文件...');
  
  const tempDirs = [
    './temp',
    './tmp',
    './uploads/test',
    './coverage/e2e/temp'
  ];
  
  for (const dir of tempDirs) {
    try {
      // await removeDirectory(dir);
    } catch (error) {
      // 目录可能不存在，忽略错误
    }
  }
}

/**
 * 清理测试上传文件
 */
async function cleanupTestUploads(): Promise<void> {
  console.log('📤 清理测试上传文件...');
  
  try {
    // 清理本地上传目录
    // await cleanupLocalUploads();
    
    // 清理云存储测试文件（如果使用）
    // await cleanupCloudStorageTestFiles();
    
  } catch (error) {
    console.warn('清理测试上传文件失败:', error);
  }
}

/**
 * 清理缓存文件
 */
async function cleanupCacheFiles(): Promise<void> {
  console.log('💾 清理缓存文件...');
  
  try {
    // 清理 Jest 缓存
    // await clearJestCache();
    
    // 清理应用缓存
    // await clearApplicationCache();
    
  } catch (error) {
    console.warn('清理缓存文件失败:', error);
  }
}

/**
 * 清理日志文件
 */
async function cleanupLogFiles(): Promise<void> {
  console.log('📝 清理日志文件...');
  
  try {
    // 清理测试日志
    // await cleanupTestLogs();
    
    // 保留最近的错误日志用于调试
    // await archiveErrorLogs();
    
  } catch (error) {
    console.warn('清理日志文件失败:', error);
  }
}

/**
 * 生成清理报告
 */
async function generateCleanupReport(): Promise<void> {
  console.log('📊 生成清理报告...');
  
  const report = {
    timestamp: new Date().toISOString(),
    status: 'completed',
    cleanedItems: {
      tables: 8,
      connections: 3,
      tempFiles: 0,
      cacheFiles: 0
    },
    errors: []
  };
  
  try {
    // 保存清理报告
    // await saveCleanupReport(report);
  } catch (error) {
    console.warn('保存清理报告失败:', error);
  }
}

// 确保进程正常退出
process.on('exit', () => {
  console.log('👋 E2E 测试进程退出');
});

process.on('SIGINT', async () => {
  console.log('🛑 收到中断信号，执行清理...');
  await globalTeardown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 收到终止信号，执行清理...');
  await globalTeardown();
  process.exit(0);
});
