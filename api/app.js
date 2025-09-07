/**
 * Express应用主文件
 * 整合所有API路由和中间件
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入路由
const departmentStatsRoutes = require('./routes/department-stats');

const app = express();
const PORT = process.env.PORT || 4000;

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // 允许前端访问
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API路由
app.use('/api/department-stats', departmentStatsRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'department-stats-api'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '部门统计和报表API服务',
    version: '1.0.0',
    endpoints: {
      personnel: '/api/department-stats/personnel',
      performance: '/api/department-stats/performance',
      costs: '/api/department-stats/costs',
      comparison: '/api/department-stats/comparison',
      trends: '/api/department-stats/trends',
      export: '/api/department-stats/export',
      dashboard: '/api/department-stats/dashboard'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : '服务器错误'
  });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 部门统计API服务已启动`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`📊 API文档: http://localhost:${PORT}`);
    console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
    console.log(`\n可用的API端点:`);
    console.log(`  GET  /api/department-stats/personnel    - 部门人员统计`);
    console.log(`  GET  /api/department-stats/performance  - 部门绩效统计`);
    console.log(`  GET  /api/department-stats/costs        - 部门成本统计`);
    console.log(`  GET  /api/department-stats/comparison   - 跨部门对比分析`);
    console.log(`  GET  /api/department-stats/trends       - 时间维度趋势分析`);
    console.log(`  POST /api/department-stats/export       - 导出部门报表`);
    console.log(`  GET  /api/department-stats/dashboard    - 管理驾驶舱数据`);
    console.log(`\n`);
  });
}

module.exports = app;