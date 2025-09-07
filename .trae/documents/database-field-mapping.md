# 数据库字段映射技术文档

## 概述
本文档定义了数据库表字段与前端代码中使用的字段名之间的映射关系，确保整个应用的字段名一致性。

## 数据库表结构与字段映射

### 1. courses 表
| 数据库字段 | 前端字段 | 类型 | 说明 |
|-----------|---------|------|------|
| id | id | uuid | 课程ID |
| title | title | string | 课程标题 |
| description | description | string | 课程描述 |
| instructor_id | instructor.id | uuid | 讲师ID |
| price | price | number | 课程价格 |
| difficulty | level | enum | 课程难度 (beginner/intermediate/advanced) |
| cover_image_url | imageUrl | string | 课程封面图片URL |
| category | tags[0] | string | 课程分类 |
| created_at | createdAt | timestamp | 创建时间 |
| updated_at | updatedAt | timestamp | 更新时间 |

### 2. chapters 表
| 数据库字段 | 前端字段 | 类型 | 说明 |
|-----------|---------|------|------|
| id | id | uuid | 章节ID |
| course_id | courseId | uuid | 所属课程ID |
| title | title | string | 章节标题 |
| description | description | string | 章节描述 |
| order_index | orderIndex | number | 章节排序索引 |
| duration_minutes | duration | number | 章节时长(分钟) |
| created_at | createdAt | timestamp | 创建时间 |

### 3. videos 表
| 数据库字段 | 前端字段 | 类型 | 说明 |
|-----------|---------|------|------|
| id | id | uuid | 视频ID |
| chapter_id | chapterId | uuid | 所属章节ID |
| title | title | string | 视频标题 |
| description | description | string | 视频描述 |
| video_url | videoUrl | string | 视频URL |
| preview_url | previewUrl | string | 预览图URL |
| duration_seconds | duration | number | 视频时长(秒，前端转换为分钟) |
| order_index | orderIndex | number | 视频排序索引 |
| is_preview | isPreview | boolean | 是否为预览视频 |
| created_at | createdAt | timestamp | 创建时间 |

### 4. learning_progress 表
| 数据库字段 | 前端字段 | 类型 | 说明 |
|-----------|---------|------|------|
| id | id | uuid | 进度记录ID |
| user_id | userId | uuid | 用户ID |
| lesson_id | lessonId | uuid | 课时ID (对应videos.id) |
| is_completed | isCompleted | boolean | 是否完成 |
| progress_percentage | progressPercentage | number | 进度百分比 |
| last_watched_at | lastWatchedAt | timestamp | 最后观看时间 |
| created_at | createdAt | timestamp | 创建时间 |
| updated_at | updatedAt | timestamp | 更新时间 |

### 5. instructors 表
| 数据库字段 | 前端字段 | 类型 | 说明 |
|-----------|---------|------|------|
| id | id | uuid | 讲师ID |
| name | name | string | 讲师姓名 |
| avatar_url | avatar | string | 头像URL |
| bio | bio | string | 讲师简介 |
| created_at | createdAt | timestamp | 创建时间 |

## API 接口规范

### 课程相关接口
- `GET /api/courses` - 获取课程列表
- `GET /api/courses/[courseId]` - 获取单个课程详情
- `GET /api/courses/[courseId]/chapters` - 获取课程章节列表
- `GET /api/courses/[courseId]/preview` - 获取课程预览视频

### 学习进度相关接口
- `GET /api/learning-progress` - 获取用户学习进度
- `GET /api/learning-progress/[courseId]` - 获取特定课程的学习进度
- `POST /api/learning-progress` - 更新学习进度

## 数据转换规则

### 时长转换
- 数据库存储：`duration_seconds` (秒)
- 前端显示：`duration` (分钟)
- 转换公式：`Math.round(duration_seconds / 60)`

### 布尔值默认值
- `is_preview` 默认为 `false`
- `is_completed` 默认为 `false`

### 数字字段默认值
- `order_index` 默认为 `0`
- `duration_minutes` 默认为 `0`
- `duration_seconds` 默认为 `0`
- `progress_percentage` 默认为 `0`

## 常见错误和解决方案

### 1. 字段名不匹配
**错误**: 使用 `duration` 查询数据库，但实际字段是 `duration_minutes` 或 `duration_seconds`
**解决**: 使用正确的数据库字段名，并在代码中进行字段映射

### 2. 联表查询语法错误
**错误**: 使用 `chapters!inner(course_id)` 语法
**解决**: 使用标准的 Supabase 联表查询语法

### 3. 缺失字段
**错误**: 查询不存在的字段导致错误
**解决**: 确保数据库表包含所有必需字段，使用迁移添加缺失字段

## 代码规范

### 服务层字段映射
在 `courseService.ts` 和 `learningProgressService.ts` 中，所有数据库查询结果都应该通过映射函数转换为前端格式：

```typescript
// 正确的字段映射示例
const transformVideoData = (video: any) => ({
  id: video.id,
  chapterId: video.chapter_id,
  title: video.title,
  description: video.description,
  videoUrl: video.video_url,
  duration: Math.round((video.duration_seconds || 0) / 60),
  orderIndex: video.order_index || 0,
  isPreview: video.is_preview || false
});
```

### 查询语句规范
```typescript
// 正确的查询语句
const { data, error } = await supabase
  .from('videos')
  .select('id, chapter_id, title, description, video_url, duration_seconds, order_index, is_preview')
  .eq('chapter_id', chapterId);
```

## 更新日志
- 2024-01-XX: 创建初始版本
- 2024-01-XX: 添加 videos 表的 order_index 和 is_preview 字段
- 2024-01-XX: 修复字段名映射不一致问题
