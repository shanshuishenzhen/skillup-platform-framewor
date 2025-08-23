# SkillUp Platform API 文档

## 📋 目录

- [概述](#概述)
- [认证](#认证)
- [监控统计 API](#监控统计-api)
- [人脸识别 API](#人脸识别-api)
- [短信验证 API](#短信验证-api)
- [学习进度 API](#学习进度-api)
- [错误处理](#错误处理)
- [限流策略](#限流策略)

## 🔍 概述

SkillUp Platform 提供 RESTful API 服务，支持用户认证、课程学习、人脸识别、监控统计等功能。

### 基础信息

- **Base URL**: `https://api.skillup.com/v1`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

### 版本信息

- **当前版本**: v1.0.0
- **最后更新**: 2025-08-22
- **兼容性**: 向后兼容

## 🔐 认证

### JWT Token 认证

所有需要认证的 API 都使用 JWT Token 进行身份验证。

```http
Authorization: Bearer <your-jwt-token>
```

### 获取 Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "张三"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 86400
  },
  "message": "登录成功"
}
```

## 📊 监控统计 API

### 获取监控统计数据

获取系统监控统计信息，支持多种导出格式。

```http
GET /api/monitoring/stats
```

**查询参数**:

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `startDate` | string | 否 | 开始日期 (YYYY-MM-DD) |
| `endDate` | string | 否 | 结束日期 (YYYY-MM-DD) |
| `service` | string | 否 | 服务名称 |
| `environment` | string | 否 | 环境 (development/staging/production) |
| `format` | string | 否 | 导出格式 (json/csv/xlsx) |
| `groupBy` | string | 否 | 分组方式 (hour/day/week) |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stats": [
      {
        "date": "2025-08-22",
        "hour": 14,
        "service": "skillup-platform",
        "environment": "production",
        "totalRequests": 1250,
        "errorRequests": 15,
        "avgResponseTime": 245.5,
        "p95ResponseTime": 580.2,
        "p99ResponseTime": 1200.8
      }
    ],
    "metadata": {
      "totalRecords": 1,
      "dateRange": {
        "start": "2025-08-22T00:00:00Z",
        "end": "2025-08-22T23:59:59Z"
      },
      "generatedAt": "2025-08-22T14:30:00Z"
    }
  },
  "message": "统计数据获取成功"
}
```

### 导出监控数据

支持导出为 Excel 文件格式。

```http
GET /api/monitoring/stats?format=xlsx
```

**响应**: 直接下载 Excel 文件

**文件名格式**: `monitoring-stats-YYYYMMDD-HHMMSS.xlsx`

## 👤 人脸识别 API

### 人脸检测

检测图片中的人脸并返回质量评分。

```http
POST /api/face/detect
Content-Type: application/json
Authorization: Bearer <token>

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "options": {
    "returnLandmarks": true,
    "returnQuality": true
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "faceCount": 1,
    "faces": [
      {
        "faceToken": "face_token_12345",
        "confidence": 0.95,
        "quality": {
          "blur": 0.1,
          "illumination": 85,
          "completeness": 0.98,
          "occlusion": {
            "leftEye": 0.0,
            "rightEye": 0.0,
            "nose": 0.0,
            "mouth": 0.0
          }
        },
        "landmarks": [
          {"x": 120, "y": 150},
          {"x": 180, "y": 150}
        ]
      }
    ]
  },
  "message": "人脸检测成功"
}
```

### 生成人脸模板

为用户生成加密的人脸特征模板。

```http
POST /api/face/template/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "templateId": "template_12345",
    "encryptedTemplate": "encrypted_template_data_here",
    "qualityScore": 92.5,
    "confidenceScore": 95.8,
    "expiresAt": "2025-11-22T14:30:00Z"
  },
  "message": "人脸模板生成成功"
}
```

### 人脸验证

验证当前图片与存储的人脸模板是否匹配。

```http
POST /api/face/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "isMatch": true,
    "confidence": 0.92,
    "similarity": 0.89,
    "verificationId": "verification_12345"
  },
  "message": "人脸验证成功"
}
```

## 📱 短信验证 API

### 发送验证码

发送短信验证码到指定手机号。

```http
POST /api/sms/send
Content-Type: application/json

{
  "phone": "+8613800138000",
  "purpose": "register",
  "template": "default"
}
```

**参数说明**:
- `purpose`: 验证目的 (register/login/reset_password/change_phone)
- `template`: 短信模板 (default/urgent)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "messageId": "sms_12345",
    "phone": "+8613800138000",
    "expiresIn": 300,
    "rateLimitRemaining": 4
  },
  "message": "验证码发送成功"
}
```

### 验证验证码

验证用户输入的短信验证码。

```http
POST /api/sms/verify
Content-Type: application/json

{
  "phone": "+8613800138000",
  "code": "123456",
  "purpose": "register"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "verified": true,
    "verificationId": "verification_12345"
  },
  "message": "验证码验证成功"
}
```

## 📚 学习进度 API

### 更新学习进度

更新用户的课程学习进度。

```http
POST /api/learning/progress
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "courseId": "course_12345",
  "lessonId": "lesson_12345",
  "progress": 75.5,
  "timeSpent": 1800,
  "lastPosition": 1650,
  "completed": false
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "progressId": "progress_12345",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "courseId": "course_12345",
    "lessonId": "lesson_12345",
    "progressPercentage": 75.5,
    "timeSpent": 1800,
    "lastPosition": 1650,
    "completionStatus": "in_progress",
    "updatedAt": "2025-08-22T14:30:00Z"
  },
  "message": "学习进度更新成功"
}
```

### 获取学习进度

获取用户的学习进度信息。

```http
GET /api/learning/progress/{userId}/{courseId}
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "courseProgress": {
      "courseId": "course_12345",
      "totalLessons": 20,
      "completedLessons": 15,
      "overallProgress": 75.0,
      "totalTimeSpent": 36000,
      "lastAccessedAt": "2025-08-22T14:30:00Z"
    },
    "lessonProgress": [
      {
        "lessonId": "lesson_12345",
        "progressPercentage": 100.0,
        "timeSpent": 1800,
        "completionStatus": "completed",
        "completedAt": "2025-08-22T13:30:00Z"
      }
    ]
  },
  "message": "学习进度获取成功"
}
```

## ❌ 错误处理

### 错误响应格式

所有错误响应都遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息",
    "timestamp": "2025-08-22T14:30:00Z",
    "requestId": "req_12345"
  }
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |

### 人脸识别特定错误

| 错误码 | 描述 |
|--------|------|
| `NO_FACE_DETECTED` | 未检测到人脸 |
| `MULTIPLE_FACES_DETECTED` | 检测到多张人脸 |
| `LOW_FACE_CONFIDENCE` | 人脸置信度过低 |
| `IMAGE_TOO_BLURRY` | 图片模糊度过高 |
| `INSUFFICIENT_LIGHTING` | 光线不足 |
| `INCOMPLETE_FACE` | 人脸不完整 |

## 🚦 限流策略

### 全局限流

- **窗口时间**: 15分钟
- **最大请求数**: 1000次/IP
- **超限响应**: HTTP 429

### API 特定限流

| API 类型 | 限制 | 窗口时间 |
|----------|------|----------|
| 人脸识别 | 20次/用户 | 1小时 |
| 短信发送 | 5次/手机号 | 1小时 |
| 登录尝试 | 5次/IP | 15分钟 |

### 限流响应头

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 📞 支持

- **技术支持**: api-support@skillup.com
- **文档反馈**: docs@skillup.com
- **状态页面**: https://status.skillup.com

## 🔗 相关文档

- [OpenAPI 规范](./openapi.yaml)
- [Postman 集合](./postman-collection.json)
- [SDK 文档](./sdk-documentation.md)
- [监控配置](./monitoring.md)
- [安全配置](./security-config.md)
