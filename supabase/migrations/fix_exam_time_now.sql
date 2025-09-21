-- 直接将考试设置为已开始状态
UPDATE exams 
SET 
  start_time = NOW() - INTERVAL '1 hour',
  end_time = NOW() + INTERVAL '23 hours',
  status = 'active'
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
    ELSE '考试进行中'
  END as exam_status
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';