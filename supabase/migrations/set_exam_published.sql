-- 将考试设置为已发布状态，并确保时间正确
UPDATE exams 
SET 
  start_time = NOW() - INTERVAL '1 hour',
  end_time = NOW() + INTERVAL '23 hours',
  status = 'published'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- 验证更新结果
SELECT 
  id, 
  title, 
  start_time, 
  end_time, 
  status,
  NOW() as current_time
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';