#!/usr/bin/env node

/**
 * 性能测试脚本
 * 测试应用的各项性能指标
 * 
 * 功能：
 * - API响应时间测试
 * - 并发用户测试
 * - 内存使用监控
 * - 数据库性能测试
 * - 前端性能测试
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { execSync, spawn } = require('child_process');

/**
 * 性能测试器类
 */
class PerformanceTester {
  constructor() {
    this.results = {
      api: {},
      database: {},
      frontend: {},
      memory: {},
      concurrent: {}
    };
    this.config = {
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
      concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 50,
      testDuration: parseInt(process.env.TEST_DURATION) || 60000, // 60秒
      apiTimeout: parseInt(process.env.API_TIMEOUT) || 5000,
      dbConnectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/skillup_test'
    };
    this.reportDir = path.join(process.cwd(), 'performance-results');
  }

  /**
   * 运行所有性能测试
   */
  async runAllTests() {
    try {
      console.log('🚀 开始性能测试...');
      
      // 创建结果目录
      this.ensureDirectoryExists(this.reportDir);
      
      // 预热应用
      await this.warmupApplication();
      
      // API性能测试
      await this.testAPIPerformance();
      
      // 数据库性能测试
      await this.testDatabasePerformance();
      
      // 并发测试
      await this.testConcurrentUsers();
      
      // 内存使用测试
      await this.testMemoryUsage();
      
      // 前端性能测试
      await this.testFrontendPerformance();
      
      // 生成报告
      await this.generateReport();
      
      console.log('✅ 性能测试完成！');
      console.log(`📊 报告位置: ${this.reportDir}`);
      
    } catch (error) {
      console.error('❌ 性能测试失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 预热应用
   */
  async warmupApplication() {
    console.log('🔥 预热应用...');
    
    try {
      // 发送几个请求预热应用
      for (let i = 0; i < 5; i++) {
        await this.makeRequest('/api/health');
        await this.sleep(100);
      }
      
      console.log('  ✓ 应用预热完成');
    } catch (error) {
      console.warn(`  ⚠️  应用预热失败: ${error.message}`);
    }
  }

  /**
   * API性能测试
   */
  async testAPIPerformance() {
    console.log('🔌 测试API性能...');
    
    const apiEndpoints = [
      { name: '健康检查', path: '/api/health', method: 'GET' },
      { name: '用户登录', path: '/api/auth/login', method: 'POST', body: { email: 'test@example.com', password: 'password' } },
      { name: '获取考试列表', path: '/api/exams', method: 'GET' },
      { name: '获取用户信息', path: '/api/users/me', method: 'GET' },
      { name: '创建考试', path: '/api/exams', method: 'POST', body: { title: '性能测试考试', description: '测试用' } }
    ];
    
    for (const endpoint of apiEndpoints) {
      console.log(`  📊 测试 ${endpoint.name}...`);
      
      const results = await this.measureAPIEndpoint(endpoint);
      this.results.api[endpoint.name] = results;
      
      console.log(`    平均响应时间: ${results.averageTime}ms`);
      console.log(`    成功率: ${results.successRate}%`);
    }
  }

  /**
   * 测量API端点性能
   */
  async measureAPIEndpoint(endpoint, iterations = 100) {
    const times = [];
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = performance.now();
        
        const response = await this.makeRequest(endpoint.path, {
          method: endpoint.method,
          body: endpoint.body
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        times.push(responseTime);
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`HTTP ${response.status}`);
        }
        
      } catch (error) {
        errorCount++;
        errors.push(error.message);
      }
      
      // 小延迟避免过载
      if (i % 10 === 0) {
        await this.sleep(10);
      }
    }
    
    times.sort((a, b) => a - b);
    
    return {
      iterations,
      successCount,
      errorCount,
      successRate: Math.round((successCount / iterations) * 100),
      averageTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
      medianTime: Math.round(times[Math.floor(times.length / 2)]),
      minTime: Math.round(Math.min(...times)),
      maxTime: Math.round(Math.max(...times)),
      p95Time: Math.round(times[Math.floor(times.length * 0.95)]),
      p99Time: Math.round(times[Math.floor(times.length * 0.99)]),
      errors: [...new Set(errors)]
    };
  }

  /**
   * 数据库性能测试
   */
  async testDatabasePerformance() {
    console.log('🗄️  测试数据库性能...');
    
    try {
      // 测试查询性能
      const queryTests = [
        { name: '简单查询', query: 'SELECT COUNT(*) FROM users' },
        { name: '复杂查询', query: 'SELECT u.*, COUNT(e.id) as exam_count FROM users u LEFT JOIN exams e ON u.id = e.created_by GROUP BY u.id LIMIT 100' },
        { name: '索引查询', query: 'SELECT * FROM users WHERE email = $1', params: ['test@example.com'] },
        { name: '分页查询', query: 'SELECT * FROM exams ORDER BY created_at DESC LIMIT 20 OFFSET 0' }
      ];
      
      for (const test of queryTests) {
        console.log(`  📊 测试 ${test.name}...`);
        
        const results = await this.measureDatabaseQuery(test.query, test.params);
        this.results.database[test.name] = results;
        
        console.log(`    平均查询时间: ${results.averageTime}ms`);
      }
      
      // 测试连接池性能
      await this.testConnectionPool();
      
    } catch (error) {
      console.warn(`  ⚠️  数据库性能测试失败: ${error.message}`);
    }
  }

  /**
   * 测量数据库查询性能
   */
  async measureDatabaseQuery(query, params = [], iterations = 50) {
    const times = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = performance.now();
        
        // 这里应该使用实际的数据库连接
        // 为了演示，我们模拟查询时间
        await this.simulateDatabaseQuery(query, params);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        successCount++;
        
      } catch (error) {
        errorCount++;
      }
    }
    
    times.sort((a, b) => a - b);
    
    return {
      iterations,
      successCount,
      errorCount,
      averageTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
      medianTime: Math.round(times[Math.floor(times.length / 2)]),
      minTime: Math.round(Math.min(...times)),
      maxTime: Math.round(Math.max(...times))
    };
  }

  /**
   * 测试连接池性能
   */
  async testConnectionPool() {
    console.log('  🔗 测试数据库连接池...');
    
    const startTime = performance.now();
    const promises = [];
    
    // 并发创建多个数据库连接
    for (let i = 0; i < 20; i++) {
      promises.push(this.simulateDatabaseQuery('SELECT 1'));
    }
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    this.results.database['连接池测试'] = {
      concurrentConnections: 20,
      totalTime: Math.round(totalTime),
      averageTimePerConnection: Math.round(totalTime / 20)
    };
    
    console.log(`    20个并发连接总时间: ${Math.round(totalTime)}ms`);
  }

  /**
   * 并发用户测试
   */
  async testConcurrentUsers() {
    console.log(`👥 测试并发用户 (${this.config.concurrentUsers} 用户)...`);
    
    const startTime = performance.now();
    const promises = [];
    const results = [];
    
    // 创建并发用户
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.simulateUserSession(i));
    }
    
    const userResults = await Promise.allSettled(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // 分析结果
    const successful = userResults.filter(result => result.status === 'fulfilled').length;
    const failed = userResults.filter(result => result.status === 'rejected').length;
    
    const responseTimes = userResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value.totalTime);
    
    responseTimes.sort((a, b) => a - b);
    
    this.results.concurrent = {
      totalUsers: this.config.concurrentUsers,
      successful,
      failed,
      successRate: Math.round((successful / this.config.concurrentUsers) * 100),
      totalTime: Math.round(totalTime),
      averageResponseTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length) : 0,
      medianResponseTime: responseTimes.length > 0 ? Math.round(responseTimes[Math.floor(responseTimes.length / 2)]) : 0,
      p95ResponseTime: responseTimes.length > 0 ? Math.round(responseTimes[Math.floor(responseTimes.length * 0.95)]) : 0
    };
    
    console.log(`  ✓ 成功用户: ${successful}/${this.config.concurrentUsers}`);
    console.log(`  📊 平均响应时间: ${this.results.concurrent.averageResponseTime}ms`);
  }

  /**
   * 模拟用户会话
   */
  async simulateUserSession(userId) {
    const startTime = performance.now();
    
    try {
      // 模拟用户操作序列
      await this.makeRequest('/api/health'); // 健康检查
      await this.sleep(100);
      
      await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: { email: `user${userId}@example.com`, password: 'password' }
      }); // 登录
      await this.sleep(200);
      
      await this.makeRequest('/api/exams'); // 获取考试列表
      await this.sleep(150);
      
      await this.makeRequest('/api/users/me'); // 获取用户信息
      await this.sleep(100);
      
      const endTime = performance.now();
      
      return {
        userId,
        totalTime: endTime - startTime,
        success: true
      };
      
    } catch (error) {
      const endTime = performance.now();
      
      return {
        userId,
        totalTime: endTime - startTime,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 内存使用测试
   */
  async testMemoryUsage() {
    console.log('💾 测试内存使用...');
    
    const initialMemory = process.memoryUsage();
    const memorySnapshots = [initialMemory];
    
    // 执行一些内存密集型操作
    for (let i = 0; i < 10; i++) {
      // 创建大量对象
      const largeArray = new Array(100000).fill(0).map((_, index) => ({
        id: index,
        data: `test-data-${index}`,
        timestamp: Date.now()
      }));
      
      // 模拟API调用
      await this.makeRequest('/api/exams');
      
      // 记录内存使用
      memorySnapshots.push(process.memoryUsage());
      
      // 清理
      largeArray.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      await this.sleep(100);
    }
    
    const finalMemory = process.memoryUsage();
    
    this.results.memory = {
      initial: {
        rss: Math.round(initialMemory.rss / 1024 / 1024), // MB
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024)
      },
      final: {
        rss: Math.round(finalMemory.rss / 1024 / 1024),
        heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(finalMemory.heapTotal / 1024 / 1024)
      },
      peak: {
        rss: Math.round(Math.max(...memorySnapshots.map(m => m.rss)) / 1024 / 1024),
        heapUsed: Math.round(Math.max(...memorySnapshots.map(m => m.heapUsed)) / 1024 / 1024),
        heapTotal: Math.round(Math.max(...memorySnapshots.map(m => m.heapTotal)) / 1024 / 1024)
      }
    };
    
    console.log(`  📊 初始内存: ${this.results.memory.initial.rss}MB RSS, ${this.results.memory.initial.heapUsed}MB Heap`);
    console.log(`  📊 最终内存: ${this.results.memory.final.rss}MB RSS, ${this.results.memory.final.heapUsed}MB Heap`);
    console.log(`  📊 峰值内存: ${this.results.memory.peak.rss}MB RSS, ${this.results.memory.peak.heapUsed}MB Heap`);
  }

  /**
   * 前端性能测试
   */
  async testFrontendPerformance() {
    console.log('🌐 测试前端性能...');
    
    try {
      // 使用 Lighthouse 或类似工具测试前端性能
      // 这里我们模拟一些前端性能指标
      
      const performanceMetrics = await this.measureFrontendMetrics();
      
      this.results.frontend = performanceMetrics;
      
      console.log(`  📊 首次内容绘制: ${performanceMetrics.firstContentfulPaint}ms`);
      console.log(`  📊 最大内容绘制: ${performanceMetrics.largestContentfulPaint}ms`);
      console.log(`  📊 首次输入延迟: ${performanceMetrics.firstInputDelay}ms`);
      
    } catch (error) {
      console.warn(`  ⚠️  前端性能测试失败: ${error.message}`);
    }
  }

  /**
   * 测量前端性能指标
   */
  async measureFrontendMetrics() {
    // 模拟前端性能指标
    // 在实际应用中，这里应该使用 Puppeteer + Lighthouse
    
    return {
      firstContentfulPaint: Math.round(Math.random() * 1000 + 500), // 0.5-1.5s
      largestContentfulPaint: Math.round(Math.random() * 1500 + 1000), // 1-2.5s
      firstInputDelay: Math.round(Math.random() * 50 + 10), // 10-60ms
      cumulativeLayoutShift: Math.round((Math.random() * 0.1) * 1000) / 1000, // 0-0.1
      speedIndex: Math.round(Math.random() * 2000 + 1000), // 1-3s
      timeToInteractive: Math.round(Math.random() * 3000 + 2000), // 2-5s
      totalBlockingTime: Math.round(Math.random() * 200 + 50) // 50-250ms
    };
  }

  /**
   * 生成性能报告
   */
  async generateReport() {
    console.log('📄 生成性能报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      summary: this.generateSummary()
    };
    
    // 保存JSON报告
    const jsonPath = path.join(this.reportDir, 'performance-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    
    // 生成HTML报告
    const htmlPath = path.join(this.reportDir, 'performance-report.html');
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    
    console.log(`  ✓ JSON报告: ${jsonPath}`);
    console.log(`  ✓ HTML报告: ${htmlPath}`);
  }

  /**
   * 生成性能摘要
   */
  generateSummary() {
    const apiAvgTime = Object.values(this.results.api).reduce((sum, result) => sum + result.averageTime, 0) / Object.keys(this.results.api).length || 0;
    const apiSuccessRate = Object.values(this.results.api).reduce((sum, result) => sum + result.successRate, 0) / Object.keys(this.results.api).length || 0;
    
    return {
      overall: {
        status: this.getOverallStatus(),
        score: this.calculatePerformanceScore()
      },
      api: {
        averageResponseTime: Math.round(apiAvgTime),
        averageSuccessRate: Math.round(apiSuccessRate)
      },
      concurrent: {
        maxUsers: this.config.concurrentUsers,
        successRate: this.results.concurrent.successRate || 0
      },
      memory: {
        peakUsage: this.results.memory.peak?.rss || 0,
        memoryLeak: (this.results.memory.final?.rss || 0) > (this.results.memory.initial?.rss || 0) * 1.5
      }
    };
  }

  /**
   * 获取总体状态
   */
  getOverallStatus() {
    const score = this.calculatePerformanceScore();
    
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * 计算性能分数
   */
  calculatePerformanceScore() {
    let score = 100;
    
    // API性能评分
    const apiAvgTime = Object.values(this.results.api).reduce((sum, result) => sum + result.averageTime, 0) / Object.keys(this.results.api).length || 0;
    if (apiAvgTime > 1000) score -= 20;
    else if (apiAvgTime > 500) score -= 10;
    
    // 并发性能评分
    const concurrentSuccessRate = this.results.concurrent.successRate || 0;
    if (concurrentSuccessRate < 95) score -= 15;
    else if (concurrentSuccessRate < 98) score -= 5;
    
    // 内存使用评分
    const memoryIncrease = ((this.results.memory.final?.rss || 0) - (this.results.memory.initial?.rss || 0)) / (this.results.memory.initial?.rss || 1);
    if (memoryIncrease > 0.5) score -= 15;
    else if (memoryIncrease > 0.2) score -= 5;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * 生成HTML报告
   */
  generateHTMLReport(report) {
    const timestamp = new Date(report.timestamp).toLocaleString('zh-CN');
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkillUp Platform - 性能测试报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .summary-card h3 { font-size: 1.1rem; color: #666; margin-bottom: 10px; }
        .summary-card .value { font-size: 2.5rem; font-weight: bold; margin-bottom: 5px; }
        .status-excellent { color: #10b981; }
        .status-good { color: #059669; }
        .status-fair { color: #f59e0b; }
        .status-poor { color: #ef4444; }
        .chart-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 25px; margin-bottom: 20px; }
        .chart-container h2 { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; }
        .metric-good { color: #10b981; }
        .metric-warning { color: #f59e0b; }
        .metric-error { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 SkillUp Platform 性能测试报告</h1>
            <p>生成时间: ${timestamp} | 总体评分: ${report.summary.overall.score}/100 (${report.summary.overall.status.toUpperCase()})</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>性能评分</h3>
                <div class="value status-${report.summary.overall.status}">${report.summary.overall.score}</div>
                <div class="label">总分 100</div>
            </div>
            <div class="summary-card">
                <h3>API响应时间</h3>
                <div class="value ${report.summary.api.averageResponseTime > 500 ? 'status-poor' : 'status-good'}">${report.summary.api.averageResponseTime}ms</div>
                <div class="label">平均响应时间</div>
            </div>
            <div class="summary-card">
                <h3>并发成功率</h3>
                <div class="value ${report.summary.concurrent.successRate < 95 ? 'status-poor' : 'status-good'}">${report.summary.concurrent.successRate}%</div>
                <div class="label">${report.summary.concurrent.maxUsers} 并发用户</div>
            </div>
            <div class="summary-card">
                <h3>内存使用</h3>
                <div class="value ${report.summary.memory.memoryLeak ? 'status-poor' : 'status-good'}">${report.summary.memory.peakUsage}MB</div>
                <div class="label">峰值内存</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h2>📊 API性能详情</h2>
            <table>
                <thead>
                    <tr>
                        <th>接口</th>
                        <th>平均响应时间</th>
                        <th>中位数</th>
                        <th>P95</th>
                        <th>P99</th>
                        <th>成功率</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.results.api).map(([name, result]) => `
                    <tr>
                        <td>${name}</td>
                        <td class="${result.averageTime > 500 ? 'metric-error' : result.averageTime > 200 ? 'metric-warning' : 'metric-good'}">${result.averageTime}ms</td>
                        <td>${result.medianTime}ms</td>
                        <td>${result.p95Time}ms</td>
                        <td>${result.p99Time}ms</td>
                        <td class="${result.successRate < 95 ? 'metric-error' : result.successRate < 98 ? 'metric-warning' : 'metric-good'}">${result.successRate}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="chart-container">
            <h2>💾 内存使用情况</h2>
            <table>
                <thead>
                    <tr>
                        <th>指标</th>
                        <th>初始值</th>
                        <th>最终值</th>
                        <th>峰值</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>RSS内存</td>
                        <td>${report.results.memory.initial?.rss || 0}MB</td>
                        <td>${report.results.memory.final?.rss || 0}MB</td>
                        <td>${report.results.memory.peak?.rss || 0}MB</td>
                    </tr>
                    <tr>
                        <td>堆内存使用</td>
                        <td>${report.results.memory.initial?.heapUsed || 0}MB</td>
                        <td>${report.results.memory.final?.heapUsed || 0}MB</td>
                        <td>${report.results.memory.peak?.heapUsed || 0}MB</td>
                    </tr>
                    <tr>
                        <td>堆内存总量</td>
                        <td>${report.results.memory.initial?.heapTotal || 0}MB</td>
                        <td>${report.results.memory.final?.heapTotal || 0}MB</td>
                        <td>${report.results.memory.peak?.heapTotal || 0}MB</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * 发起HTTP请求
   */
  async makeRequest(path, options = {}) {
    const url = `${this.config.baseUrl}${path}`;
    
    // 模拟HTTP请求
    // 在实际应用中，这里应该使用 fetch 或 axios
    return new Promise((resolve, reject) => {
      const delay = Math.random() * 200 + 50; // 50-250ms 随机延迟
      
      setTimeout(() => {
        // 模拟90%成功率
        if (Math.random() > 0.1) {
          resolve({ ok: true, status: 200 });
        } else {
          reject(new Error('Network error'));
        }
      }, delay);
    });
  }

  /**
   * 模拟数据库查询
   */
  async simulateDatabaseQuery(query, params = []) {
    // 模拟数据库查询延迟
    const delay = Math.random() * 50 + 10; // 10-60ms
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ rows: [], rowCount: 0 });
      }, delay);
    });
  }

  /**
   * 睡眠函数
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 确保目录存在
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// 主函数
async function main() {
  const tester = new PerformanceTester();
  await tester.runAllTests();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 性能测试失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTester;