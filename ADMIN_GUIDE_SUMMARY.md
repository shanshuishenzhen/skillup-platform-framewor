# SkillUp Platform 管理员操作说明书总结

## 📚 文档概览

我已经为您创建了完整的管理员操作说明书，包含以下文档：

### 1. 主要文档
- **`docs/admin-manual.md`** - 完整的管理员操作手册 (详细版)
- **`docs/admin-quick-reference.md`** - 管理员快速参考卡片 (速查版)
- **`docs/admin-training-script.md`** - 管理员培训视频脚本 (培训版)

### 2. 技术实现
- **`src/app/api/admin/users/import/route.ts`** - 用户批量导入API
- **`src/app/api/admin/resources/upload/route.ts`** - 学习资源上传API
- **`templates/user-import-template.csv`** - 用户导入模板

## 🎯 核心功能说明

### 用户管理

#### 批量导入用户
```bash
# 1. 下载模板
GET /api/admin/users/import/template

# 2. 填写用户数据 (CSV/Excel格式)
name,email,phone,department,position,employee_id,role,status
张三,zhangsan@example.com,+8613800138001,技术部,软件工程师,EMP001,student,active

# 3. 上传导入
POST /api/admin/users/import
Content-Type: multipart/form-data
- file: 用户数据文件
- options: 导入选项配置
```

**支持字段**:
- `name` (必填): 用户姓名
- `email` (必填): 邮箱地址，不能重复
- `phone` (可选): 手机号码，建议包含国家代码
- `department` (可选): 所属部门
- `position` (可选): 职位
- `employee_id` (可选): 员工编号
- `role` (可选): 用户角色 (student/teacher/admin)
- `status` (可选): 账户状态 (active/inactive)

#### 单个用户操作
- **创建用户**: 填写基本信息，设置角色权限
- **编辑用户**: 修改用户资料，更改角色
- **重置密码**: 发送重置邮件或设置临时密码
- **禁用/启用**: 管理用户访问权限

### 学习资源管理

#### 文件上传支持
```bash
POST /api/admin/resources/upload
Content-Type: multipart/form-data
- file: 资源文件
- metadata: 文件元数据
```

**支持的文件类型**:
- **视频**: MP4, AVI, MOV, WMV, FLV, WebM (最大2GB)
- **音频**: MP3, WAV, AAC, FLAC, OGG (最大500MB)  
- **文档**: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX (最大100MB)
- **图片**: JPG, PNG, GIF, WebP (最大10MB)

**元数据字段**:
```json
{
  "title": "资源标题",
  "description": "资源描述",
  "category": "资源分类",
  "tags": ["标签1", "标签2"],
  "courseId": "关联课程ID",
  "lessonId": "关联课时ID",
  "isPublic": true,
  "allowDownload": true
}
```

### 课程管理

#### 创建课程流程
1. **基本信息设置**
   - 课程名称、描述、分类
   - 难度级别、预计学习时长
   - 课程封面图片

2. **课程结构设计**
   - 添加章节和课时
   - 设置内容顺序
   - 配置学习路径

3. **内容上传**
   - 上传视频、文档、音频等资源
   - 设置课时属性
   - 配置访问权限

4. **发布管理**
   - 预览课程内容
   - 设置发布状态
   - 管理课程维护

## 🔧 系统配置

### 环境配置
```bash
# 基础配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 文件存储
STORAGE_PROVIDER=supabase
STORAGE_BUCKET=learning-resources

# 通信服务
SMTP_HOST=smtp.example.com
SMS_PROVIDER=aliyun
```

### 安全设置
- **密码策略**: 长度、复杂度、有效期
- **访问控制**: IP白名单、会话超时
- **双因素认证**: 强制启用2FA
- **审计日志**: 记录管理员操作

## 📊 数据监控

### 学习数据分析
- **用户统计**: 学习进度、时长、活跃度
- **课程分析**: 热度排行、完成率、评分
- **报表导出**: Excel、CSV、PDF格式

### 系统监控
- **性能监控**: CPU、内存、磁盘、网络
- **应用监控**: 响应时间、错误率、并发数
- **告警设置**: 阈值告警、自动通知

## 🚀 快速开始

### 1. 环境准备
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.monitoring.example .env.local
# 编辑 .env.local 填入实际配置
```

### 2. 管理员设置
```bash
# 生成管理员文档
npm run admin:setup

# 验证管理员配置
npm run admin:validate
```

### 3. 常用操作
```bash
# 下载用户导入模板
curl -O https://api.skillup.com/api/admin/users/import/template

# 批量导入用户
curl -X POST https://api.skillup.com/api/admin/users/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@users.xlsx" \
  -F "options={\"sendWelcomeEmail\":true}"

# 上传学习资源
curl -X POST https://api.skillup.com/api/admin/resources/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@video.mp4" \
  -F "metadata={\"title\":\"课程视频\",\"category\":\"video\"}"
```

## 📱 移动端管理

### 管理员APP功能
- **用户管理**: 查看、禁用、重置密码
- **课程审核**: 审核用户提交的课程
- **消息推送**: 发送系统通知
- **数据统计**: 查看关键指标

### 快捷操作
- 扫码添加用户
- 语音录制课程介绍
- 拍照上传课程封面
- 一键发送通知

## ❓ 常见问题

### 用户导入问题
**Q: 批量导入用户时出现错误怎么办？**
A: 
1. 检查Excel文件格式是否正确
2. 确认必填字段都已填写
3. 检查邮箱格式是否有效
4. 下载错误报告，修正后重新导入

### 文件上传问题
**Q: 视频上传失败怎么解决？**
A:
1. 检查视频文件大小是否超过2GB
2. 确认视频格式是否为支持的格式
3. 检查网络连接是否稳定
4. 尝试分段上传大文件

### 权限管理问题
**Q: 如何批量修改用户角色？**
A:
1. 在用户列表中选择多个用户
2. 点击"批量操作"按钮
3. 选择"修改角色"
4. 选择新角色并确认

## 🔗 相关资源

### 在线工具
- **Postman集合**: 导入API测试集合
- **Excel模板**: 用户导入模板下载
- **视频压缩**: 在线视频压缩工具

### 技术文档
- [API文档](./docs/api-documentation.md)
- [数据库设计](./scripts/database-migration.sql)
- [监控配置](./docs/monitoring.md)
- [安全配置](./docs/security-config.md)

### 培训资源
- [培训视频脚本](./docs/admin-training-script.md)
- [快速参考卡片](./docs/admin-quick-reference.md)
- [操作演示视频](https://training.skillup.com/admin)

## 📞 技术支持

### 联系方式
- **技术热线**: 400-xxx-xxxx
- **邮件支持**: admin-support@skillup.com
- **在线客服**: 工作日 9:00-18:00
- **紧急联系**: +86-xxx-xxxx-xxxx

### 支持范围
- 功能使用指导
- 技术问题解答
- 系统故障处理
- 数据恢复协助

## 🎯 最佳实践

### 用户管理
- 定期清理无效用户账户
- 合理分配用户角色权限
- 及时处理用户反馈问题
- 保护用户隐私数据

### 内容管理
- 确保上传内容质量
- 定期更新过时内容
- 优化文件存储结构
- 备份重要学习资源

### 系统维护
- 定期检查系统性能
- 及时处理告警信息
- 保持系统版本更新
- 做好数据备份工作

---

**文档版本**: v1.0.0  
**创建时间**: 2025-08-22  
**适用版本**: SkillUp Platform v1.0.0  
**维护团队**: SkillUp 开发团队

🎉 **管理员操作说明书已完成！包含完整的操作指南、API接口、培训材料和技术支持信息。**
