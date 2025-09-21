-- 检查测试用户的报名记录
SELECT 
  'exam_registrations' as table_name,
  id,
  user_id,
  exam_id,
  registered_at,
  status
FROM exam_registrations 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND exam_id = '550e8400-e29b-41d4-a716-446655440001';

-- 检查所有相关的报名记录
SELECT 
  'all_registrations_for_user' as info,
  id,
  user_id,
  exam_id,
  registered_at,
  status
FROM exam_registrations 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- 检查考试信息
SELECT 
  'exam_info' as info,
  id,
  title,
  start_time,
  end_time,
  status,
  NOW() as current_time
FROM exams 
WHERE id = '550e8400-e29b-41d4-a716-