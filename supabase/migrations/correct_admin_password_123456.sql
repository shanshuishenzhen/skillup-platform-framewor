-- 使用正确生成的bcrypt哈希值更新管理员密码为123456
-- 哈希值: $2b$10$p6BN7gQWBWIroZwSYfKAd.WUrHEdW3CZ0j0gmOLEbdraW20YppSOG

-- 显示更新前的状态
SELECT 
    'admin_users表更新前' as table_name,
    phone,
    password_hash,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 更新admin_users表中的密码 (使用Node.js bcryptjs生成的正确哈希值)
UPDATE admin_users 
SET 
    password_hash = '$2b$10$p6BN7gQWBWIroZwSYfKAd.WUrHEdW3CZ0j0gmOLEbdraW20YppSOG',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 检查users表中是否存在该账号，如果存在也更新
UPDATE users 
SET 
    password_hash = '$2b$10$p6BN7gQWBWIroZwSYfKAd.WUrHEdW3CZ0j0gmOLEbdraW20YppSOG',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 显示更新后的状态
SELECT 
    'admin_users表更新后' as table_name,
    phone,
    password_hash,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

SELECT 
    'users表更新后' as table_name,
    phone,
    password_hash,
    updated_at
FROM users 
WHERE phone = '13823738278';

-- 显示更新摘要
SELECT 
    NOW() as update_time,
    '管理员密码已正确更新为123456' as status,
    '使用Node.js bcryptjs生成的正确哈希值' as method,
    '$2b$10$p6BN7gQWBWIroZwSYfKAd.WUrHEdW3CZ0j0gmOLEbdraW20YppSOG' as hash_info;

-- 注意事项
-- 1. 新密码: 123456
-- 2. 哈希算法: bcrypt (使用Node.js bcryptjs库生成)
-- 3. Salt rounds: 10
-- 4. 更新表: admin_users, users (如果存在)
-- 5. 哈希值已通过bcrypt.compare验证为正确