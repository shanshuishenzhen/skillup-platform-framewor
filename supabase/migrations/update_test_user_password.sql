-- 更新测试用户密码哈希
-- 测试用户手机号: 13800138001
-- 测试密码: test123456
-- 使用正确的bcrypt哈希

UPDATE users 
SET password_hash = '$2b$12$PuH9Waa3Kp1hqszRrm9YxOIx/1xTFjJscb7dwtF523qIK8Lei3D82',
    updated_at = now()
WHERE phone = '13800138001';

-- 验证更新结果
SELECT id, name, phone, password_hash, role, status 
FROM users 
WHERE phone = '13800138001';