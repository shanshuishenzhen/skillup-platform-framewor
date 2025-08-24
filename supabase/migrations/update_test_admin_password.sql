-- 更新测试管理员账户的密码hash
-- 使用正确的bcrypt hash for 'admin123'

UPDATE admin_users 
SET password_hash = '$2b$10$b42eN.EBzQ42o3dJh3txsuM6SKqZkkCnDC2y7lw59n2K3GgKVNqU.'
WHERE phone = '13823738278';

-- 验证更新结果
SELECT 
  id,
  username,
  phone,
  role,
  status,
  substring(password_hash, 1, 20) || '...' as password_hash_preview
FROM admin_users 
WHERE phone = '13823738278';