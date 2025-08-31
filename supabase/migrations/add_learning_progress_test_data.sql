-- 添加学习进度测试数据
-- 为活跃用户统计提供数据基础

-- 插入一些学习进度记录
INSERT INTO learning_progress (
  user_id,
  course_id,
  lesson_id,
  current_time_seconds,
  duration,
  progress_percentage,
  is_completed,
  last_updated_at,
  created_at
) VALUES 
-- 用户1的学习记录（最近30天内）
(
  '1c0c29b7-047a-4e3a-a5cd-eb0b0eb8e7d3',
  (SELECT id FROM courses LIMIT 1),
  gen_random_uuid(),
  120,
  300,
  40.0,
  false,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
-- 用户2的学习记录（最近30天内）
(
  (SELECT id FROM users WHERE phone = '13800138001' LIMIT 1),
  (SELECT id FROM courses LIMIT 1),
  gen_random_uuid(),
  250,
  300,
  83.3,
  false,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
-- 用户3的学习记录（最近30天内）
(
  (SELECT id FROM users WHERE phone = '13800138002' LIMIT 1),
  (SELECT id FROM courses LIMIT 1),
  gen_random_uuid(),
  300,
  300,
  100.0,
  true,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
-- 用户4的学习记录（最近30天内）
(
  (SELECT id FROM users WHERE phone = '13800138003' LIMIT 1),
  (SELECT id FROM courses LIMIT 1),
  gen_random_uuid(),
  180,
  400,
  45.0,
  false,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
),
-- 用户5的学习记录（最近30天内）
(
  (SELECT id FROM users WHERE phone = '13800138004' LIMIT 1),
  (SELECT id FROM courses LIMIT 1),
  gen_random_uuid(),
  350,
  500,
  70.0,
  false,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
);

-- 验证插入的数据
SELECT 
  COUNT(*) as total_learning_records,
  COUNT(DISTINCT user_id) as unique_learners,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_records
FROM learning_progress;

-- 检查最近30天的活跃用户
SELECT 
  COUNT(DISTINCT user_id) as active_users_last_30_days
FROM learning_progress 
WHERE created_at >= NOW() - INTERVAL '30 days';