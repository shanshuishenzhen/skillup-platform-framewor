# SkillUp Platform 管理员快速参考

## 🚀 快速操作指南

### 用户管理

#### 批量导入用户
```bash
# 1. 下载模板
GET /api/admin/users/import/template

# 2. 填写用户信息
# 必填字段：name, email
# 可选字段：phone, department, position, employee_id, role, status

# 3. 上传文件
POST /api/admin/users/import
Content-Type: multipart/form-data
{
  "file": user_data.xlsx,
  "options": {
    "sendWelcomeEmail": true,
    "generatePassword": true,
    "activateUsers": true
  }
}
```

#### 单个用户操作
```bash
# 创建用户
POST /api/admin/users
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "student",
  "department": "技术部"
}

# 重置密码
POST /api/admin/users/{userId}/reset-password
{
  "sendEmail": true
}

# 禁用/启用用户
PATCH /api/admin/users/{userId}
{
  "status": "active" | "inactive"
}
```

### 课程管理

#### 创建课程
```bash
POST /api/admin/courses
{
  "title": "JavaScript 基础教程",
  "description": "从零开始学习JavaScript",
  "category": "programming",
  "difficulty": "beginner",
  "duration": 3600,
  "isPublic": true
}
```

#### 添加课程内容
```bash
# 添加章节
POST /api/admin/courses/{courseId}/chapters
{
  "title": "第一章：JavaScript简介",
  "description": "了解JavaScript的基本概念",
  "order": 1
}

# 添加课时
POST /api/admin/courses/{courseId}/chapters/{chapterId}/lessons
{
  "title": "什么是JavaScript",
  "type": "video",
  "content": "lesson_content_here",
  "duration": 600,
  "order": 1
}
```

### 文件上传

#### 上传学习资源
```bash
POST /api/admin/resources/upload
Content-Type: multipart/form-data
{
  "file": video_file.mp4,
  "metadata": {
    "title": "JavaScript基础视频",
    "description": "JavaScript入门教学视频",
    "category": "video",
    "tags": ["javascript", "programming"],
    "courseId": "course_123",
    "isPublic": true,
    "allowDownload": true
  }
}
```

#### 支持的文件类型
- **视频**: MP4, AVI, MOV, WMV, FLV, WebM (最大2GB)
- **音频**: MP3, WAV, AAC, FLAC, OGG (最大500MB)
- **文档**: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX (最大100MB)
- **图片**: JPG, PNG, GIF, WebP (最大10MB)

### 数据导出

#### 导出用户数据
```bash
GET /api/admin/users/export?format=xlsx&startDate=2025-01-01&endDate=2025-12-31
```

#### 导出学习统计
```bash
GET /api/admin/reports/learning-stats?format=xlsx&groupBy=course&period=month
```

#### 导出监控数据
```bash
GET /api/monitoring/stats?format=xlsx&startDate=2025-08-01&endDate=2025-08-31
```

## 📊 常用查询

### 用户统计
```sql
-- 按部门统计用户数量
SELECT department, COUNT(*) as user_count 
FROM user_profiles 
WHERE status = 'active' 
GROUP BY department;

-- 查看最近注册的用户
SELECT name, email, created_at 
FROM user_profiles 
ORDER BY created_at DESC 
LIMIT 10;
```

### 学习进度统计
```sql
-- 课程完成率统计
SELECT 
  c.title as course_title,
  COUNT(DISTINCT lp.user_id) as enrolled_users,
  COUNT(DISTINCT CASE WHEN lp.completion_status = 'completed' THEN lp.user_id END) as completed_users,
  ROUND(
    COUNT(DISTINCT CASE WHEN lp.completion_status = 'completed' THEN lp.user_id END) * 100.0 / 
    COUNT(DISTINCT lp.user_id), 2
  ) as completion_rate
FROM courses c
LEFT JOIN learning_progress_details lp ON c.id = lp.course_id
GROUP BY c.id, c.title;
```

### 系统监控
```sql
-- 错误率统计
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_events,
  COUNT(CASE WHEN level = 'error' THEN 1 END) as error_events,
  ROUND(COUNT(CASE WHEN level = 'error' THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate
FROM monitoring_events 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

## 🔧 系统配置

### 环境变量配置
```bash
# 数据库配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 文件存储配置
STORAGE_PROVIDER=supabase
STORAGE_BUCKET=learning-resources

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password

# 短信配置
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY=your_access_key
SMS_SECRET_KEY=your_secret_key

# 人脸识别配置
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key
```

### 系统配置项
```bash
# 获取系统配置
GET /api/admin/config

# 更新系统配置
PUT /api/admin/config
{
  "app_name": "SkillUp Platform",
  "registration_enabled": true,
  "face_auth_enabled": true,
  "sms_verification_enabled": true,
  "max_file_size_mb": 100,
  "session_timeout": 86400
}
```

## 🚨 故障排除

### 常见问题解决

#### 用户导入失败
1. 检查Excel文件格式是否正确
2. 确认邮箱格式是否有效
3. 检查是否有重复邮箱
4. 查看错误日志：`/api/admin/logs?type=user_import`

#### 文件上传失败
1. 检查文件大小是否超限
2. 确认文件格式是否支持
3. 检查存储空间是否充足
4. 查看上传日志：`/api/admin/logs?type=file_upload`

#### 视频播放问题
1. 检查视频编码格式
2. 确认CDN配置是否正确
3. 测试网络连接速度
4. 查看转码状态：`/api/admin/resources/{id}/status`

### 日志查看
```bash
# 查看系统日志
GET /api/admin/logs?level=error&startDate=2025-08-22

# 查看用户操作日志
GET /api/admin/audit-logs?userId={userId}&action=login

# 查看API调用日志
GET /api/admin/api-logs?endpoint=/api/face/verify&status=500
```

### 性能监控
```bash
# 查看系统性能
GET /api/admin/system/performance

# 查看数据库性能
GET /api/admin/database/performance

# 查看存储使用情况
GET /api/admin/storage/usage
```

## 📱 移动端管理

### 管理员APP功能
- 用户管理（查看、禁用、重置密码）
- 课程审核（审核用户提交的课程）
- 消息推送（发送系统通知）
- 数据统计（查看关键指标）

### 快捷操作
- 扫码添加用户
- 语音录制课程介绍
- 拍照上传课程封面
- 一键发送通知

## 🔐 安全注意事项

### 权限管理
- 定期审查管理员权限
- 使用最小权限原则
- 启用操作日志记录
- 设置敏感操作二次确认

### 数据保护
- 定期备份重要数据
- 加密存储敏感信息
- 限制数据导出权限
- 监控异常数据访问

### 账户安全
- 强制使用强密码
- 启用双因素认证
- 定期更换密码
- 监控异常登录行为

## 📞 紧急联系

### 技术支持
- **热线**: 400-xxx-xxxx
- **邮箱**: tech-support@skillup.com
- **微信**: skillup-tech-support

### 运维支持
- **24小时热线**: +86-xxx-xxxx-xxxx
- **邮箱**: ops@skillup.com
- **钉钉群**: SkillUp运维支持群

---

**版本**: v1.0.0  
**更新时间**: 2025-08-22  
**适用范围**: 管理员、运营人员、技术支持
