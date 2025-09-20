/**
 * WebSocket服务器启动文件
 * 用于支持即时通信功能
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// 创建Next.js应用
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // 创建HTTP服务器
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 初始化WebSocket服务
  if (!dev) {
    // 生产环境才启用WebSocket
    try {
      const { websocketService } = require('./src/services/websocketService');
      websocketService.initialize(server);
      console.log('WebSocket服务已启动');
    } catch (error) {
      console.warn('WebSocket服务启动失败:', error.message);
      console.log('将以HTTP模式运行');
    }
  } else {
    console.log('开发环境：WebSocket服务已禁用，使用HTTP轮询');
  }

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
