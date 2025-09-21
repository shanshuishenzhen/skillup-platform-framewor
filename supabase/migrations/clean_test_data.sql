-- 清除测试用户的报名记录，允许重新测试
DELETE FROM exam_registrations 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
  AND exam_id = '550e8400-e29b-41d4-a716-446655440001';

-- 清除测试用户的考试提交记录
DELETE FROM exam_submissions 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
  AND exam_id = '550e8400-e29b-41d4-a716-446655440001';

-- 验证清理结果
SELECT 
  'exam_registrations' as table_name,
  COUNT(*) as record_count
FROM exam_registrations 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
  'exam_submissions' as table_name,
  COUNT(*) as record_count
FROM exam_submissions 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';