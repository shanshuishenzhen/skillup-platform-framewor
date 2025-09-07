-- 检查管理员密码哈希值
SELECT 
    id,
    username,
    phone,
    password_hash,
    LENGTH(password_hash) as hash_length,
    SUBSTRING(password_hash, 1, 4) as hash_prefix,
    updated_at
FROM admin_users 
WHERE phone = '13823738278';

-- 检查哈希格式是否正确（应该以$2b$12$开头）
SELECT 
    CASE 
        WHEN password_hash LIKE '$2b$12$%' THEN '✅ 哈希格式正确'
        WHEN password_hash LIKE '$2a$%' THEN '⚠️ 使用$2a格式'
        WHEN password_hash LIKE '$2y$%' THEN '⚠️ 使用$2y格式'
        ELSE '❌ 哈希格式错误'
    END as hash_format_check,
    password_hash
FROM admin_users 
WHERE phone = '13823738278