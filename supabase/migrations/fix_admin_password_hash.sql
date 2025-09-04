-- 修复admin_users表中用户13823738278的密码哈希值
-- 将密码哈希更新为与密码"123456"匹配的正确哈希值

UPDATE admin_users 
SET password_hash = '$2b$12$hHqOBklFbmQi6KG.Y33nAe5iz8KF3IoBwWY.n8ZKwP8QDZwkrfu12'
WHERE phone = '13823738278';

-- 验证更新结果
SELECT id, username, phone, password_hash, role, status 
FROM admin_users 
WHERE phone = '13823738278';