-- 检查并修复考试报名问题
-- 首先查看当前考试状态
SELECT 
  id, 
  title, 
  status,
  start_time, 
  end_time, 
  NOW() as current_time,
  CASE 
    WHEN start_time IS NULL THEN '时间未设置'
    WHEN NOW() < start_time THEN '考试尚未开始'
    WHEN NOW() > end_time THEN '考试已结束'
    ELSE '考试进行中'
  END as exam_status
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- 修复考试设置：设置为published状态，允许报名但考试1小时后开始
UPDATE exams 
SET 
  status = 'published',
  start_time = NOW() + INTERVAL '1 hour',
  end_time = NOW() + INTERVAL '25 hours'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- 验证修复结果
SELECT 
  id, 
  title, 
  status,
  start_time, 
  end_time, 
  NOW() as current_time,
  CASE 
    WHEN start_time IS NULL THEN '时间未设置'
    WHEN NOW() < start_time THEN '考试尚未开始，可以报名'
    WHEN NOW() > end_time THEN '考试已结束'
    ELSE '考试进行中'
  END as exam_status
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';