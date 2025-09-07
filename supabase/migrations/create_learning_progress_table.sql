-- 删除现有的learning_progress表（如果存在）
DROP TABLE IF EXISTS learning_progress CASCADE;

-- 创建正确的学习进度表
CREATE TABLE learning_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  current_time_seconds INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX idx_learning_progress_course_id ON learning_progress(course_id);
CREATE INDEX idx_learning_progress_user_course ON learning_progress(user_id, course_id);
CREATE INDEX idx_learning_progress_video_id ON learning_progress(video_id);

-- 启用行级安全策略
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：允许匿名用户访问（用于测试）
CREATE POLICY "Allow anonymous access" ON learning_progress
  FOR ALL USING (true);

-- 为匿名用户和认证用户授予权限
GRANT ALL PRIVILEGES ON learning_progress TO anon;
GRANT ALL PRIVILEGES ON learning_progress TO authenticated;

-- 插入测试数据（使用不同的视频ID避免冲突）
WITH video_data AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) as rn
  FROM videos 
  WHERE chapter_id = '5c827a60-2582-4b0c-a713-81d2ed1b05a1'
  LIMIT 2
)
INSERT INTO learning_progress (user_id, course_id, video_id, current_time_seconds, total_duration_seconds, is_completed, progress_percentage)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '6f16c705-b745-46ff-809f-99d47fadec22'::UUID,
  v.id,
  CASE WHEN v.rn = 1 THEN 1200 ELSE 2700 END,
  2700,
  CASE WHEN v.rn = 1 THEN false ELSE true END,
  CASE WHEN v.rn = 1 THEN 44.44 ELSE 100.00 END
FROM video_data v;

-- 检查插入结果
SELECT 
  lp.*,
  v.title as video_title,
  c.title as chapter_title,
  co.title as course_title
FROM learning_progress lp
LEFT JOIN videos v ON lp.video_id = v.id
LEFT JOIN chapters c ON v.chapter_id = c.id
LEFT JOIN courses co ON lp.course_id = co.id
WHERE lp.user_id = '550e8400-e29b-41d4-a716-446655440000';