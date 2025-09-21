-- 强制删除测试用户的所有报名记录
DELETE FROM exam_registrations 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- 删除测试用户的所有考试提交记录
DELETE FROM exam_submissions 
WHERE user_id = '550e