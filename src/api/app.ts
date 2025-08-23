/**
 * Express应用程序入口文件
 * 用于API测试和开发环境
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// 创建Express应用
const app = express();

// 基础中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// API路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 认证路由
app.post('/api/auth/login', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Login endpoint' });
});

app.post('/api/auth/register', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Register endpoint' });
});

app.post('/api/auth/logout', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Logout endpoint' });
});

// 用户路由
app.get('/api/users/profile', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Profile endpoint' });
});

app.put('/api/users/profile', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Update profile endpoint' });
});

app.get('/api/users', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Users list endpoint' });
});

// 课程路由
app.get('/api/courses', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Courses endpoint' });
});

app.get('/api/courses/:id', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Course detail endpoint' });
});

app.post('/api/courses', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Create course endpoint' });
});

// 管理员路由
app.get('/api/admin/users', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Admin users endpoint' });
});

app.get('/api/admin/stats', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Admin stats endpoint' });
});

app.post('/api/admin/users/import', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Import users endpoint' });
});

// 文件上传路由
app.post('/api/files/upload', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'File upload endpoint' });
});

app.get('/api/files', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Files list endpoint' });
});

app.get('/api/files/:id', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'File detail endpoint' });
});

// 学习进度路由
app.get('/api/learning-progress', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Learning progress endpoint' });
});

app.post('/api/learning-progress', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Save learning progress endpoint' });
});

// 分析路由
app.get('/api/analytics/dashboard', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Analytics dashboard endpoint' });
});

app.get('/api/analytics/reports', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Analytics reports endpoint' });
});

// 短信路由
app.post('/api/sms/send', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Send SMS endpoint' });
});

app.post('/api/sms/verify', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Verify SMS endpoint' });
});

// 人脸识别路由
app.post('/api/face/detect', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Face detection endpoint' });
});

app.post('/api/face/verify', (req, res) => {
  // 这里会被测试mock替换
  res.json({ success: true, message: 'Face verification endpoint' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error:', { error: err.message, stack: err.stack });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export { app };
export default app;