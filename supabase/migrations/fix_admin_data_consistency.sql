-- 修复管理员数据一致性问题
-- 确保admin_users表中的管理员账号数据正确

-- 1. 首先检查admin_users表中是否存在手机号为13823738278的管理员
DO $$
BEGIN
    -- 如果不存在该管理员，则创建
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE phone = '13823738278') THEN
        INSERT INTO admin_users (
            username,
            email,
            password_hash,
            real_name,
            role,
            status,
            phone,
            department,
            position,
            login_attempts,
            force_password_change
        ) VALUES (
            'admin',
            'admin@skillup.com',
            '$2b$10$8K1p/a0dqbVXiRm0fuHyqOeRhyh6y2/VhPz4f6RI.LQ/OGxOa5OqG', -- 123456的bcrypt哈希
            '系统管理员',
            'super_admin',
            'active',
            '13823738278',
            '技术部',
            '系统管理员',
            0,
            false
        );
        RAISE NOTICE '已创建管理员账号: 13823738278';
    ELSE
        -- 如果存在，更新密码哈希确保一致
        UPDATE admin_users 
        SET 
            password_hash = '$2b$10$8K1p/a0dqbVXiRm0fuHyqOeRhyh6y2/VhPz4f6RI.LQ/OGxOa5OqG',
            updated_at = NOW(),
            login_attempts = 0,
            status = 'active'
        WHERE phone = '13823738278';
        RAISE NOTICE '已更新管理员账号密码: 13823738278';
    END IF;
END $$;

-- 2. 确保users表中不存在管理员手机号，避免冲突
-- 如果存在，删除users表中的管理员记录（因为管理员应该只在admin_users表中）
DELETE FROM users WHERE phone = '13823738278';

-- 3. 验证修复结果 - admin_users表
SELECT 
    'admin_users' as table_name,
    id::text as record_id,
    username,
    phone,
    role,
    status,
    LEFT(password_hash, 20) || '...' as password_hash_preview
FROM admin_users 
WHERE phone = '13823738278';

-- 验证修复结果 - users表（应该为空）
SELECT 
    'users' as table_name,
    id::text as record_id,
    phone as username,
    phone,
    'user' as role,
    CASE WHEN is_verified THEN 'verified' ELSE 'unverified' END as status,
    LEFT(COALESCE(password_hash, ''), 20) || '...' as password_hash_preview
FROM users 
WHERE phone = '13823738278';

-- 4. 显示修复摘要
SELECT 
    '数据修复完成' as status,
    '管理员账号13823738278已在admin_users表中正确配置' as message,
    '密码: 123456' as password_info,
    'users表中的冲突记录已清理' as cleanup_info;