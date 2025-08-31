# OA系统API接口文档

## 📋 接口概览

### 基础信息
- **Base URL**: `{host}/api/oa`
- **版本**: v1.0.0
- **认证方式**: Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 统一响应格式
```json
{
  "success": boolean,
  "code": number,
  "message": string,
  "data": any,
  "timestamp": string,
  "requestId": string
}
```

## 🔐 认证接口

### 1. 用户认证
```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "username": "john_doe",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "roles": ["employee"],
      "permissions": ["project:view", "file:upload"]
    }
  }
}
```

### 2. 获取当前用户信息
```http
GET /auth/me
Authorization: Bearer {token}
```

### 3. 刷新Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}
```

## 👥 用户管理接口

### 1. 获取用户列表
```http
GET /users?page=1&limit=20&search=keyword&department=dept_id
Authorization: Bearer {token}
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20, 最大: 100)
- `search`: 搜索关键词
- `department`: 部门ID
- `status`: 用户状态 (active|inactive|suspended)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123",
        "username": "john_doe",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "https://example.com/avatar.jpg",
        "phone": "+86 138 0000 0000",
        "status": "active",
        "department": {
          "id": "dept_001",
          "name": "技术部"
        },
        "roles": ["employee"],
        "createdAt": "2024-01-01T10:00:00Z",
        "lastLoginAt": "2024-01-15T09:30:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 5,
      "count": 50,
      "limit": 20
    }
  }
}
```

### 2. 获取用户详情
```http
GET /users/{userId}
Authorization: Bearer {token}
```

### 3. 更新用户信息
```http
PUT /users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "avatar": "string",
  "departmentId": "string"
}
```

## 📋 项目管理接口

### 1. 获取项目列表
```http
GET /projects?page=1&limit=20&status=active&priority=high&member=user_id
Authorization: Bearer {token}
```

**查询参数**:
- `status`: 项目状态 (planning|active|on_hold|completed|cancelled)
- `priority`: 优先级 (low|medium|high|urgent)
- `member`: 成员ID (筛选包含指定成员的项目)
- `owner`: 负责人ID
- `search`: 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "proj_123",
        "name": "OA系统开发",
        "description": "企业办公自动化系统",
        "status": "active",
        "priority": "high",
        "progress": 75,
        "startDate": "2024-01-01",
        "endDate": "2024-03-31",
        "owner": {
          "id": "user_123",
          "name": "John Doe",
          "avatar": "https://example.com/avatar.jpg"
        },
        "members": [
          {
            "id": "user_123",
            "name": "John Doe",
            "role": "owner",
            "joinedAt": "2024-01-01T10:00:00Z"
          }
        ],
        "stats": {
          "totalTasks": 20,
          "completedTasks": 15,
          "totalFiles": 8,
          "memberCount": 5
        },
        "tags": ["开发", "系统"],
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-15T14:30:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 3,
      "count": 25,
      "limit": 20
    }
  }
}
```

### 2. 创建项目
```http
POST /projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "priority": "medium",
  "startDate": "2024-01-01",
  "endDate": "2024-03-31",
  "members": ["user_123", "user_456"],
  "tags": ["tag1", "tag2"]
}
```

### 3. 更新项目
```http
PUT /projects/{projectId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "status": "active",
  "priority": "high",
  "progress": 80,
  "endDate": "2024-04-30"
}
```

### 4. 项目成员管理
```http
POST /projects/{projectId}/members
Authorization: Bearer {token}
Content-Type: application/json

{
  "userIds": ["user_789"],
  "role": "member"
}
```

```http
DELETE /projects/{projectId}/members/{userId}
Authorization: Bearer {token}
```

## 📁 文件管理接口

### 1. 上传文件
```http
POST /files/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: (binary)
projectId: string (optional)
taskId: string (optional)
description: string (optional)
tags: string (optional, comma-separated)
isPublic: boolean (optional)
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file_123",
      "filename": "document_20240115_143022.pdf",
      "originalName": "项目需求文档.pdf",
      "mimetype": "application/pdf",
      "size": 2048576,
      "category": "document",
      "url": "/api/oa/files/download/file_123",
      "uploadedBy": {
        "id": "user_123",
        "name": "John Doe"
      },
      "project": {
        "id": "proj_123",
        "name": "OA系统开发"
      },
      "description": "项目需求分析文档",
      "tags": ["需求", "文档"],
      "isPublic": false,
      "downloadCount": 0,
      "createdAt": "2024-01-15T14:30:22Z"
    }
  }
}
```

### 2. 获取文件列表
```http
GET /files?page=1&limit=20&category=document&project=proj_123&search=keyword
Authorization: Bearer {token}
```

**查询参数**:
- `category`: 文件分类 (document|image|video|audio|archive|other)
- `project`: 项目ID
- `task`: 任务ID
- `uploader`: 上传者ID
- `search`: 搜索关键词 (文件名、描述、标签)

### 3. 下载文件
```http
GET /files/download/{fileId}
Authorization: Bearer {token}
```

### 4. 获取文件详情
```http
GET /files/{fileId}
Authorization: Bearer {token}
```

### 5. 更新文件信息
```http
PUT /files/{fileId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "string",
  "tags": ["tag1", "tag2"],
  "isPublic": boolean
}
```

### 6. 删除文件
```http
DELETE /files/{fileId}
Authorization: Bearer {token}
```

### 7. 文件权限管理
```http
POST /files/{fileId}/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user_456",
  "permission": "read"
}
```

## 💬 消息通讯接口

### 1. 获取聊天室列表
```http
GET /messages/rooms?page=1&limit=20&type=group
Authorization: Bearer {token}
```

**查询参数**:
- `type`: 房间类型 (private|group|project|public)
- `includeArchived`: 是否包含归档房间 (true|false)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "room_123",
        "name": "项目讨论组",
        "type": "group",
        "description": "OA系统开发项目讨论",
        "avatar": "https://example.com/room_avatar.jpg",
        "members": [
          {
            "user": {
              "id": "user_123",
              "name": "John Doe",
              "avatar": "https://example.com/avatar.jpg"
            },
            "role": "owner",
            "joinedAt": "2024-01-01T10:00:00Z",
            "lastSeen": "2024-01-15T14:25:00Z"
          }
        ],
        "project": {
          "id": "proj_123",
          "name": "OA系统开发"
        },
        "lastMessage": {
          "id": "msg_456",
          "content": "今天的进度如何？",
          "messageType": "text",
          "sender": {
            "id": "user_123",
            "name": "John Doe"
          },
          "createdAt": "2024-01-15T14:20:00Z"
        },
        "unreadCount": 3,
        "activeMemberCount": 5,
        "onlineMemberCount": 2,
        "lastActivity": "2024-01-15T14:20:00Z",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

### 2. 创建聊天室
```http
POST /messages/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "type": "group",
  "members": ["user_456", "user_789"],
  "projectId": "proj_123"
}
```

### 3. 创建私聊
```http
POST /messages/rooms/private
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user_456"
}
```

### 4. 获取消息历史
```http
GET /messages/rooms/{roomId}/messages?page=1&limit=50&before=2024-01-15T14:00:00Z
Authorization: Bearer {token}
```

**查询参数**:
- `before`: 获取指定时间之前的消息
- `after`: 获取指定时间之后的消息

**响应示例**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_123",
        "content": "大家好，项目进展如何？",
        "messageType": "text",
        "sender": {
          "id": "user_123",
          "name": "John Doe",
          "avatar": "https://example.com/avatar.jpg"
        },
        "room": "room_123",
        "replyTo": {
          "id": "msg_122",
          "content": "今天开会讨论需求",
          "sender": {
            "id": "user_456",
            "name": "Jane Smith"
          }
        },
        "readBy": [
          {
            "user": "user_456",
            "readAt": "2024-01-15T14:21:00Z"
          }
        ],
        "reactions": [
          {
            "user": "user_456",
            "emoji": "👍",
            "createdAt": "2024-01-15T14:21:30Z"
          }
        ],
        "edited": false,
        "createdAt": "2024-01-15T14:20:00Z"
      },
      {
        "id": "msg_124",
        "messageType": "file",
        "sender": {
          "id": "user_456",
          "name": "Jane Smith",
          "avatar": "https://example.com/avatar2.jpg"
        },
        "file": {
          "id": "file_789",
          "filename": "screenshot.png",
          "originalName": "界面截图.png",
          "size": 1024000,
          "mimetype": "image/png"
        },
        "fileUrl": "/api/oa/files/download/file_789",
        "fileName": "界面截图.png",
        "fileSize": 1024000,
        "createdAt": "2024-01-15T14:25:00Z"
      }
    ]
  }
}
```

### 5. 发送消息
```http
POST /messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "roomId": "room_123",
  "content": "string",
  "messageType": "text",
  "fileId": "file_123",
  "replyTo": "msg_122"
}
```

### 6. 标记消息已读
```http
PUT /messages/{messageId}/read
Authorization: Bearer {token}
```

### 7. 标记房间所有消息已读
```http
PUT /messages/rooms/{roomId}/read-all
Authorization: Bearer {token}
```

### 8. 搜索消息
```http
GET /messages/search?q=keyword&roomId=room_123&messageType=text&page=1&limit=20
Authorization: Bearer {token}
```

## 📊 统计接口

### 1. 获取仪表板统计
```http
GET /dashboard/stats
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "projects": {
      "total": 25,
      "active": 15,
      "completed": 8,
      "overdue": 2
    },
    "tasks": {
      "total": 120,
      "completed": 85,
      "inProgress": 25,
      "overdue": 10
    },
    "files": {
      "total": 450,
      "totalSize": 2147483648,
      "recentUploads": 15
    },
    "messages": {
      "total": 2500,
      "unread": 12,
      "todayCount": 45
    },
    "recentActivities": [
      {
        "id": "activity_123",
        "type": "project_created",
        "description": "创建了项目 \"移动端开发\"",
        "user": {
          "id": "user_123",
          "name": "John Doe"
        },
        "createdAt": "2024-01-15T14:30:00Z"
      }
    ]
  }
}
```

## 🔍 搜索接口

### 1. 全局搜索
```http
GET /search?q=keyword&type=all&page=1&limit=20
Authorization: Bearer {token}
```

**查询参数**:
- `type`: 搜索类型 (all|projects|files|messages|users)
- `q`: 搜索关键词

## ⚠️ 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求参数格式和必填字段 |
| 401 | 未授权访问 | 检查Token是否有效 |
| 403 | 权限不足 | 联系管理员分配相应权限 |
| 404 | 资源不存在 | 检查资源ID是否正确 |
| 409 | 资源冲突 | 检查是否存在重复数据 |
| 413 | 文件过大 | 减小文件大小或联系管理员 |
| 415 | 不支持的文件类型 | 使用支持的文件格式 |
| 429 | 请求频率过高 | 降低请求频率 |
| 500 | 服务器内部错误 | 联系技术支持 |

## 📝 接口调用示例

### JavaScript/TypeScript
```typescript
// 配置API客户端
const apiClient = axios.create({
  baseURL: 'https://api.example.com/api/oa',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

// 获取项目列表
const getProjects = async (params: ProjectQueryParams) => {
  const response = await apiClient.get('/projects', { params });
  return response.data;
};

// 上传文件
const uploadFile = async (file: File, projectId?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId) {
    formData.append('projectId', projectId);
  }
  
  const response = await apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};
```

### Python
```python
import requests

class OAApiClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_projects(self, **params):
        response = requests.get(
            f'{self.base_url}/projects',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def upload_file(self, file_path: str, project_id: str = None):
        files = {'file': open(file_path, 'rb')}
        data = {}
        if project_id:
            data['projectId'] = project_id
            
        response = requests.post(
            f'{self.base_url}/files/upload',
            headers={'Authorization': self.headers['Authorization']},
            files=files,
            data=data
        )
        return response.json()
```

这份API文档提供了完整的接口规范，包括请求格式、响应示例、错误处理和调用示例，便于其他系统集成时参考使用。
