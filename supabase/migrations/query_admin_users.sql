-- 查询管理员用户信息
SELECT 
  id,
  username,
  email,
  phone,
  real_name,
  role,
  status,
  created_at
FROM admin_users 
WHERE status = 'active'
ORDER BY created_at DESC;