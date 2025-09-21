-- 删除可能存在的测试用户（避免冲突）
DELETE FROM users WHERE phone = '13800138000' OR id = '550e8400-e29b-41d4-a716-446655440000';

-- 创建测试用户
INSERT INTO users (id, phone, password_hash, name, user_type, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '13800138000',
  '$2b$10$dummy.hash.for.testing.purposes.only',
  '测试用户',
  'registered',
  'user'
);

-- 检查用户是否创建成功
SELECT id, phone, name, user_type, role FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';