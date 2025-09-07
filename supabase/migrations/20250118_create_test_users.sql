-- 创建测试用户数据
-- 用于端到端测试

-- 插入测试用户（密码都是 'password123'，已经过 bcrypt 加密）
INSERT INTO users (
  phone,
  password_hash,
  name,
  role,
  user_type,
  is_verified,
  status,
  created_at,
  updated_at
) VALUES 
-- 管理员用户
('13800000001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '测试管理员', 'admin', 'registered', true, 'active', NOW(), NOW()),
-- 教师用户
('13800000002', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '测试教师', 'teacher', 'registered', true, 'active', NOW(), NOW()),
-- 学生用户
('13800000003', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '测试学生', 'student', 'registered', true, 'active', NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 插入管理员用户到 admin_users 表
INSERT INTO admin_users (
  username,
  email,
  password_hash,
  real_name,
  role,
  status,
  phone,
  department,
  position,
  created_at,
  updated_at
) VALUES 
('admin001', 'admin@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '系统管理员', 'admin', 'active', '13800000001', '技术部', '系统管理员', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  real_name = EXCLUDED.real_name,
  updated_at = NOW();

-- 确保权限设置正确
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO authenticated;