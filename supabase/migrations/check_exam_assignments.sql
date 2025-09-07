-- 查询考试分配记录
SELECT 
    ea.id,
    ea.exam_id,
    ea.user_id,
    ea.status,
    ea.assigned_at,
    e.title as exam_title,
    u.name as user_name,
    u.phone as user_phone
FROM exam_assignments ea
JOIN exams e ON ea.exam_id = e.id
JOIN users u ON ea.user_id = u.id
WHERE u.phone = '13800138001'
ORDER BY ea.assigned_at DESC
LIMIT 10;

-- 查询最近的考试记录
SELECT 
    e.id as exam_id,
    e.title,
    e.created_at
FROM exams e
WHERE e.title LIKE '%在线考试全流程测试%'
ORDER BY e.created_at DESC
LIMIT 5;

-- 查询用户信息
SELECT 
    id,
    name,
    phone,
    created_at
FROM users
WHERE phone = '13800138001'