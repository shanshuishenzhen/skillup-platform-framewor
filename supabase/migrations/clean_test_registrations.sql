-- 清理测试用户的考试报名记录
DELETE FROM exam_participations 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
  AND exam_id = '550e8400-e29b-41d4-a716-446655440001';

-- 验证清理结果
SELECT COUNT(*) as remaining_registrations 
FROM exam_participations 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
  AND exam_id = '550e8400-e29b-41d4-a716-446655440001';

-- 显示考试当前状态
SELECT 
  id, 
  title, 
  status,
  start_time, 
  end_time, 
  NOW() as current_time,
  CASE 
    WHEN NOW() < start_time THEN '可以报名'
    WHEN NOW() > end_time THEN '考试已结束'
    ELSE '考试进行中'
  END as registration_status
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-446655440001';