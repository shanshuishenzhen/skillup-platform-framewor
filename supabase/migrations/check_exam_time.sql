-- 检查考试时间设置
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