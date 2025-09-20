const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Socket.io配置
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // React开发服务器地址
        methods: ["GET", "POST"],
        credentials: true
    }
});

// --- Middleware ---
// Enable Cross-Origin Resource Sharing
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

// Enable express to parse JSON bodies from POST/PUT requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 用于文件下载
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Database Connection ---
// We will connect to MongoDB. For now, I'll use a placeholder URI.
// In a real application, this should be stored in an environment variable.
const dbURI = 'mongodb://localhost:27017/simple-oa';

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.log('MongoDB connection error:', err));

// --- Socket.io Setup ---
const { initializeSocketHandlers } = require('./socket/socketHandlers');
initializeSocketHandlers(io);

// --- Routes ---
// We will define our authentication routes in a separate file.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/files', require('./routes/files'));
app.use('/api/messages', require('./routes/messages'));

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Demo endpoints for testing without authentication
app.get('/api/demo/projects', (req, res) => {
  res.json([
    {
      id: '1',
      name: '网站重构项目',
      description: '对公司官网进行全面重构',
      status: 'active',
      progress: 75,
      startDate: '2024-01-15',
      endDate: '2024-03-15',
      teamMembers: ['张三', '李四', '王五']
    },
    {
      id: '2',
      name: '移动应用开发',
      description: '开发企业移动端应用',
      status: 'planning',
      progress: 25,
      startDate: '2024-02-01',
      endDate: '2024-05-01',
      teamMembers: ['赵六', '钱七']
    }
  ]);
});

app.get('/api/demo/tasks', (req, res) => {
  res.json([
    {
      id: '1',
      title: '设计首页布局',
      description: '完成网站首页的设计和布局',
      status: 'completed',
      priority: 'high',
      assignee: '张三',
      projectId: '1',
      dueDate: '2024-02-01',
      createdAt: '2024-01-20'
    },
    {
      id: '2',
      title: '开发用户登录功能',
      description: '实现用户注册和登录系统',
      status: 'in_progress',
      priority: 'medium',
      assignee: '李四',
      projectId: '1',
      dueDate: '2024-02-15',
      createdAt: '2024-01-25'
    },
    {
      id: '3',
      title: '移动端界面设计',
      description: '设计移动应用的用户界面',
      status: 'pending',
      priority: 'high',
      assignee: '赵六',
      projectId: '2',
      dueDate: '2024-03-01',
      createdAt: '2024-02-01'
    }
  ]);
});

app.get('/api/demo/files', (req, res) => {
  res.json([
    {
      id: '1',
      name: '项目需求文档.pdf',
      size: 2048576,
      type: 'application/pdf',
      uploadDate: '2024-01-20',
      uploader: '张三',
      projectId: '1',
      downloadCount: 15
    },
    {
      id: '2',
      name: '设计稿.psd',
      size: 15728640,
      type: 'application/photoshop',
      uploadDate: '2024-01-25',
      uploader: '李四',
      projectId: '1',
      downloadCount: 8
    },
    {
      id: '3',
      name: '移动端原型图.sketch',
      size: 5242880,
      type: 'application/sketch',
      uploadDate: '2024-02-01',
      uploader: '赵六',
      projectId: '2',
      downloadCount: 3
    }
  ]);
});

// Demo endpoints for messages/chat functionality
app.get('/api/demo/messages/rooms', (req, res) => {
  res.json([
    {
      id: '1',
      name: '项目讨论组',
      description: '网站重构项目讨论',
      type: 'group',
      participants: ['张三', '李四', '王五'],
      lastMessage: {
        content: '今天的进度如何？',
        sender: '张三',
        timestamp: '2024-02-20T10:30:00Z'
      },
      unreadCount: 2
    },
    {
      id: '2',
      name: '技术交流',
      description: '技术问题讨论和分享',
      type: 'group',
      participants: ['李四', '赵六', '钱七'],
      lastMessage: {
        content: '新的框架文档已更新',
        sender: '李四',
        timestamp: '2024-02-20T09:15:00Z'
      },
      unreadCount: 0
    },
    {
      id: '3',
      name: '张三',
      description: '与张三的私聊',
      type: 'direct',
      participants: ['张三'],
      lastMessage: {
        content: '明天的会议准备好了吗？',
        sender: '张三',
        timestamp: '2024-02-19T16:45:00Z'
      },
      unreadCount: 1
    }
  ]);
});

app.get('/api/demo/messages/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  // 模拟不同聊天室的消息
  const messagesData = {
    '1': [
      {
        id: '1',
        content: '大家好，今天开始网站重构项目',
        sender: '张三',
        timestamp: '2024-02-20T08:00:00Z',
        type: 'text'
      },
      {
        id: '2',
        content: '收到，我负责前端部分',
        sender: '李四',
        timestamp: '2024-02-20T08:05:00Z',
        type: 'text'
      },
      {
        id: '3',
        content: '我来处理后端API',
        sender: '王五',
        timestamp: '2024-02-20T08:10:00Z',
        type: 'text'
      },
      {
        id: '4',
        content: '今天的进度如何？',
        sender: '张三',
        timestamp: '2024-02-20T10:30:00Z',
        type: 'text'
      }
    ],
    '2': [
      {
        id: '5',
        content: '有人用过新的React框架吗？',
        sender: '李四',
        timestamp: '2024-02-20T09:00:00Z',
        type: 'text'
      },
      {
        id: '6',
        content: '我在项目中使用过，效果不错',
        sender: '赵六',
        timestamp: '2024-02-20T09:10:00Z',
        type: 'text'
      },
      {
        id: '7',
        content: '新的框架文档已更新',
        sender: '李四',
        timestamp: '2024-02-20T09:15:00Z',
        type: 'text'
      }
    ],
    '3': [
      {
        id: '8',
        content: '明天的会议准备好了吗？',
        sender: '张三',
        timestamp: '2024-02-19T16:45:00Z',
        type: 'text'
      }
    ]
  };
  
  const messages = messagesData[roomId] || [];
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedMessages = messages.slice(startIndex, endIndex);
  
  res.json({
    messages: paginatedMessages,
    pagination: {
      page,
      limit,
      total: messages.length,
      totalPages: Math.ceil(messages.length / limit)
    }
  });
});

app.post('/api/demo/messages/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const { content, type = 'text' } = req.body;
  
  // 模拟发送消息的响应
  const newMessage = {
    id: Date.now().toString(),
    content,
    sender: '当前用户', // 在实际应用中，这应该来自认证信息
    timestamp: new Date().toISOString(),
    type
  };
  
  res.status(201).json({
    success: true,
    message: newMessage
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.io server is ready for connections`);
});
