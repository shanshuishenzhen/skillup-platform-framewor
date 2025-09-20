-- 查询用户13823738278在admin_users表中的详细信息
SELECT 
    phone,
    role,
    username,
    real_name,
    status,
    created_at,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 查询admin_users表中所有用户的role分布
SELECT 
    role,
    COUNT(*) as count
FROM admin_users 
GROUP BY role
ORDER BY count DESC;

-- 查询users表中该用户的信息（如果存在）
SELECT 
    phone,
    role,
    name,
    created_at
FROM users 
WHERE phone = '13823738278';