-- 更新测试考试的时间设置
-- 查看当前考试时间
SELECT id, title, start_time, end_time, status 
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- 更新考试时间为当前时间+1小时开始，+25小时结束
UPDATE exams 
SET 
  start_time = NOW() + INTERVAL '1 hour',
  end_time = NOW() + INTERVAL '25 hours',
  status = 'published'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- 验证更新结果
SELECT id, title, start_time, end_time, status 
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';