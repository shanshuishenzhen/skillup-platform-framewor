-- 更新管理员密码为正确的bcrypt哈希
-- 密码: admin123
-- 使用bcrypt生成的哈希值

-- 查询当前管理员信息
SELECT 
    id,
    username,
    phone,
    role,
    status,
    LENGTH(password_hash) as hash_length,
    SUBSTRING(password_hash, 1, 10) as hash_prefix
FROM admin_users 
WHERE phone = '13823738278';

-- 更新管理员密码哈希
-- 使用标准bcrypt哈希: $2b$12$rounds
UPDATE admin_users 
SET 
    password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqfC6rdGWGA6jIwHirQapuS',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 验证更新结果
SELECT 
    id,
    username,
    phone,
    role,
    status,
    LENGTH(password_hash) as hash_length,
    SUBSTRING(password_hash, 1, 10) as hash_prefix,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 显示更新摘要
SELECT 
    '管理员密码已更新' as message,
    '新密码: admin123' as password_info,
    '哈希算法: bcrypt' as hash_info;

-- 注意事项
SELECT 
    '重要提醒' as notice,
    '请确保应用程序使用bcrypt.compare()验证密码' as requirement;