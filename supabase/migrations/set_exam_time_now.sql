-- 设置测试考试时间为当前时间，允许立即报名和开始
UPDATE exams 
SET 
  start_time = NOW(),
  end_time = NOW() + INTERVAL '24 hours',
  status = 'published'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- 验证更新结果
SELECT 
  id, 
  title, 
  start_time, 
  end_time, 
  status,
  NOW() as current_time,
  CASE 
    WHEN start_time IS NULL THEN '时间未设置'
    WHEN NOW() < start_time THEN '考试尚未开始'
    WHEN NOW() > end_time THEN '考试已结束'
    ELSE '考试可以开始'
  END as exam_status
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';