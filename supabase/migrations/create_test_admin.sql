-- 创建测试管理员账户
-- 手机号: 13823738278
-- 密码: admin123 (bcrypt加密后的hash)

-- 首先删除可能存在的测试账户
DELETE FROM admin_users WHERE phone = '13823738278';

-- 插入测试管理员账户
-- 密码 'admin123' 的 bcrypt hash (salt rounds: 10)
INSERT INTO admin_users (
  username,
  email,
  password_hash,
  real_name,
  role,
  permissions,
  status,
  phone,
  department,
  position
) VALUES (
  'testadmin',
  'testadmin@example.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 密码: admin123
  '测试管理员',
  'super_admin',
  ARRAY['user_management', 'content_management', 'system_settings', 'data_analytics'],
  'active',
  '13823738278',
  '技术部',
  '系统管理员'
);

-- 验证插入结果
SELECT 
  id,
  username,
  email,
  real_name,
  role,
  permissions,
  status,
  phone,
  department,
  position,
  created_at
FROM admin_users 
WHERE phone = '13823738278';