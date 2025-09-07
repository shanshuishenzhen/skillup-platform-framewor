-- 调试考试分配问题
-- 查询最新的考试ID和用户ID
SELECT 'Latest Exam:' as info, id, title, created_at FROM exams ORDER BY created_at DESC LIMIT 1;

SELECT 'Test User:' as info, id, name, phone FROM users WHERE phone = '13800138001';

-- 查询所有考试分配记录
SELECT 'All Assignments:' as info, ea.*, e.title as exam_title, u.name as user_name 
FROM exam_assignments ea 
JOIN exams e ON ea.exam_id = e.id 
JOIN users u ON ea.user_id = u.id 
ORDER BY ea.assigned_at DESC;

-- 查询特定用户的分配记录
SELECT 'User Assignments:' as info, ea.*, e.title as exam_title 
FROM exam_assignments ea 
JOIN exams e ON ea.exam_id = e.id 
JOIN users u ON ea.user_id = u.id 
WHERE u.phone = '13800138001' 
ORDER BY ea.assigned_at DESC;

-- 查询最新考试的分配情况
WITH latest_exam AS (
  SELECT id FROM exams ORDER BY created_at DESC LIMIT 1
),
test_user AS (
  SELECT id FROM users WHERE phone = '13800138001'
)
SELECT 'Latest Exam Assignment Check:' as info, 
       le.id as exam_id, 
       tu.id as user_id,
       ea.id as assignment_id,
       ea.status
FROM latest_exam le
CROSS JOIN test_user tu
LEFT JOIN exam_assignments ea ON ea.exam_id = le.id AND ea.user_id = tu.id;