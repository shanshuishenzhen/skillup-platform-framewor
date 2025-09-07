-- 更新管理员账号13823738278的密码为123456
-- 使用预生成的bcrypt哈希值

-- 显示更新前的状态
SELECT 
    'admin_users表更新前' as table_name,
    phone,
    password_hash,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 更新admin_users表中的密码
UPDATE admin_users 
SET 
    password_hash = '$2b$10$8K1p/a0dhrxSH/VjQzNOiOeB8XxFzVpjh.RjAqc/GgTeaGjU6ELW6',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 检查users表中是否存在该账号，如果存在也更新
UPDATE users 
SET 
    password_hash = '$2b$10$8K1p/a0dhrxSH/VjQzNOiOeB8XxFzVpjh.RjAqc/GgTeaGjU6ELW6',
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
    '管理员密码已更新为123456' as status,
    '密码哈希: $2b$10$8K1p/a0dhrxSH/VjQzNOiOeB8XxFzVpjh.RjAqc/GgTeaGjU6ELW6' as hash_info;

-- 注意事项
-- 1. 新密码: 123456
-- 2. 哈希算法: bcrypt (saltRounds=10)
-- 3. 更新表: admin_users, users (如果存在)
-- 4. 请使用新密码123456进行登录测试