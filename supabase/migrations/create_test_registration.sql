-- 创建测试用户的考试报名记录
-- 确保测试用户可以报名和参加考试

-- 插入测试用户的考试报名记录
INSERT INTO exam_registrations (
  id,
  exam_id,
  user_id,
  status,
  registered_at,
  approved_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440001', -- 测试考试ID
  '550e8400-e29b-41d4-a716-446655440000', -- 测试用户ID
  'approved',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  approved_at = NOW();

-- 验证插入结果
SELECT 
  er.id,
  er.exam_id,
  er.user_id,
  er.status,
  er.registered_at,
  e.title as exam_title
FROM exam_registrations er
JOIN exams e ON er.exam_id = e.id
WHERE er.user_id = '550e8400-e29b-41d4-a716-446655440000';