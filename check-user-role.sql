-- 查询用户13823738278的角色信息
SELECT 
  id,
  phone,
  name,
  role,
  user_type,
  status,
  created_at,
  updated_at
FROM users 
WHERE phone = '13823738278';

-- 查看所有管理员用户
SELECT 
  id,
  phone,
  name,
  role,
  user_type,
  status
FROM users 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- 查看role字段的所有可能值
SELECT DISTINCT role, COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY count DESC;