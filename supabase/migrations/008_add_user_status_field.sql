-- 为users表添加status字段
-- 用于统一用户状态管理，替代通过is_verified字段模拟状态的方式

-- 创建用户状态枚举类型
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- 为users表添加status字段
ALTER TABLE users 
ADD COLUMN status user_status DEFAULT 'active' NOT NULL;

-- 添加status字段的索引以提高查询性能
CREATE INDEX idx_users_status ON users(status);

-- 为现有用户设置状态值，基于is_verified字段进行迁移
-- is_verified为true的用户设置为active，false的设置为inactive
UPDATE users 
SET status = CASE 
    WHEN is_verified = true THEN 'active'::user_status
    ELSE 'inactive'::user_status
END;

-- 添加注释说明字段用途
COMMENT ON COLUMN users.status IS '用户状态：active-活跃，inactive-非活跃，suspended-暂停';
COMMENT ON TYPE user_status IS '用户状态枚举类型';

-- 为anon和authenticated角色授予对新字段的访问权限
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

-- 更新RLS策略以包含status字段的访问控制
-- 用户只能查看自己的详细信息或其他用户的基本信息
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id OR status = 'active');

-- 管理员可以管理所有用户状态
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );