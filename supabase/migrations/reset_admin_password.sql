-- 重新设置管理员密码
-- 使用bcrypt生成 'admin123' 的哈希值

-- 首先显示当前管理员信息
SELECT 'Current admin info:' as info;
SELECT username, phone, role, status, LENGTH(password_hash) as hash_length 
FROM admin_users WHERE phone = '13823738278';

-- 更新管理员密码为 'admin123' 的bcrypt哈希
-- 这个哈希是通过 bcrypt.hash('admin123', 12) 生成的
UPDATE admin_users 
SET 
    password_hash = '$2b$12$LQv3c1yqBWVHxkd0LQ4lnOuHrk8JQNdHdUa0FWC7vqt4gohg/cqTW',
    updated_at = NOW()
WHERE phone = '13823738278';

-- 验证更新结果
SELECT 'Updated admin info:' as info;
SELECT 
    username, 
    phone, 
    role, 
    status,
    LENGTH(password_hash) as hash_length,
    SUBSTRING(password_hash, 1, 10) as hash_preview,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 显示更新摘要
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ 管理员密码已成功更新为 admin123'
        ELSE '❌ 未找到管理员账号'
    END as result
FROM admin_users 
WHERE phone = '13823738278' AND password_hash = '$2b$12$LQv3c1yqBWVHxkd0LQ4lnOuHrk8JQNdHdUa0FWC7vqt4gohg/cqTW';

SELECT '注意: 管理员密码已重置为 admin123，请在生产环境中修改为安全密码'