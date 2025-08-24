-- 创建系统内置管理员用户
-- 手机号：13823738278，密码：123456

-- 首先检查是否已存在该管理员用户
DO $$
BEGIN
    -- 如果不存在该手机号和邮箱的管理员用户，则创建
    IF NOT EXISTS (
        SELECT 1 FROM admin_users WHERE phone = '13823738278' OR email = 'system_admin@skillup.com'
    ) THEN
        INSERT INTO admin_users (
            username,
            email,
            password_hash,
            real_name,
            role,
            permissions,
            status,
            phone,
            department,
            position,
            login_attempts,
            last_login_at,
            last_login_ip,
            password_changed_at,
            force_password_change,
            created_at,
            updated_at,
            created_by
        ) VALUES (
            'system_admin',
            'system_admin@skillup.com',
            -- 使用bcrypt加密密码123456，这里使用PostgreSQL的crypt函数
            crypt('123456', gen_salt('bf')),
            '系统管理员',
            'super_admin',
            ARRAY[
                'user_management',
                'course_management', 
                'order_management',
                'payment_management',
                'content_management',
                'system_settings',
                'security_management',
                'admin_management',
                'report_view',
                'data_export'
            ],
            'active',
            '13823738278',
            '技术部',
            '系统管理员',
            0,
            NULL,
            NULL,
            NOW(),
            false,
            NOW(),
            NOW(),
            NULL
        );
        
        RAISE NOTICE '系统管理员用户创建成功！';
        RAISE NOTICE '用户名: system_admin';
        RAISE NOTICE '手机号: 13823738278';
        RAISE NOTICE '密码: 123456';
        RAISE NOTICE '角色: super_admin';
    ELSE
        RAISE NOTICE '手机号为 13823738278 或邮箱为 system_admin@skillup.com 的管理员用户已存在，跳过创建。';
    END IF;
END $$;

-- 确保pgcrypto扩展已启用（用于密码加密）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 为admin_users表设置RLS策略（如果需要）
-- 注意：管理员表通常不需要RLS，因为它们通过应用层控制访问

-- 授权给anon和authenticated角色访问admin_users表的权限
GRANT SELECT ON admin_users TO anon;
GRANT ALL PRIVILEGES ON admin_users TO authenticated;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admin_users_phone ON admin_users(phone);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);