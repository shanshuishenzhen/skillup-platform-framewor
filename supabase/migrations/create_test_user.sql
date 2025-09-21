-- 创建测试用户记录
INSERT INTO users (id, phone, password_hash, role, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  '13800138002',
  '$2b$10$dummy.hash.for.test.user.only',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();