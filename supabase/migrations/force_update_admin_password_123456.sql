-- 强制更新管理员密码为123456
-- 使用经过验证的bcrypt哈希值

-- 显示更新前状态
SELECT 
    'UPDATE BEFORE' as status,
    phone,
    password_hash,
    LENGTH(password_hash) as hash_length,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 强制更新admin_users表
UPDATE admin_users 
SET 
    password_hash = '$2b$10$E453Wmng5EcDnxGmbufsa.eYkM3fmA82afOIHdui/q8zeB0E.aw1K',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 如果users表中也存在该账号，同步更新
UPDATE users 
SET 
    password_hash = '$2b$10$E453Wmng5EcDnxGmbufsa.eYkM3fmA82afOIHdui/q8zeB0E.aw1K',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 显示更新后状态
SELECT 
    'UPDATE AFTER' as status,
    phone,
    password_hash,
    LENGTH(password_hash) as hash_length,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 显示更新摘要
SELECT 
    NOW() as update_time,
    '管理员账号13823738278密码已强制更新为123456' as message,
    '$2b$10$E453Wmng5EcDnxGmbufsa.eYkM3fmA82afOIHdui/q8zeB0E.aw1K' as new_hash;

-- 重要提示
SELECT '请重启开发服务器以确保更改生效' as important_note;