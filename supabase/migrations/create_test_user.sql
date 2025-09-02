-- 创建测试用户
INSERT INTO users (
  phone,
  password_hash,
  name,
  user_type,
  is_verified,
  role,
  face_verified
) VALUES (
  '13800138000',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 密码: password
  '测试用户',
  'registered',
  true,
  'user',
  false
) ON CONFLICT (phone) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  updated_at = now();

-- 创建管理员用户
INSERT INTO users (
  phone,
  password_hash,
  name,
  user_type,
  is_verified,
  role,
  face_verified
) VALUES (
  '13800138001',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 密码: password
  '管理员',
  'registered',
  true,
  'admin',
  false
) ON CONFLICT (phone) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();