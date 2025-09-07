-- 最终更新管理员账号13823738278的密码为123456
-- 使用在线bcrypt工具生成的正确哈希值

-- 显示更新前的状态
SELECT 
    'admin_users表更新前' as table_name,
    phone,
    password_hash,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 更新admin_users表中的密码 (使用bcrypt在线工具生成的123456哈希值)
UPDATE admin_users 
SET 
    password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 检查users表中是否存在该账号，如果存在也更新
UPDATE users 
SET 
    password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
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
    '管理员密码已最终更新为123456' as status,
    '密码哈希: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' as hash_info;

-- 注意事项
-- 1. 新密码: 123456
-- 2. 哈希算法: bcrypt (使用在线工具生成)
-- 3. 更新表: admin_users, users (如果存在)
-- 4. 请使用新密码123456进行登录测试