-- 创建角色表
-- 用于存储系统角色和权限配置

-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
CREATE INDEX IF NOT EXISTS idx_roles_created_at ON roles(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入系统默认角色
INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
(
    'super_admin',
    '超级管理员',
    '系统超级管理员，拥有所有权限',
    '[
        "user.view", "user.create", "user.edit", "user.delete", "user.import", "user.export", "user.batch_update",
        "role.view", "role.create", "role.edit", "role.delete", "role.assign",
        "course.view", "course.create", "course.edit", "course.delete", "course.publish", "course.assign",
        "exam.view", "exam.create", "exam.edit", "exam.delete", "exam.grade", "exam.result",
        "org.view", "org.create", "org.edit", "org.delete",
        "report.view", "report.export", "report.dashboard",
        "system.config", "system.backup", "system.log", "system.audit",
        "content.view", "content.create", "content.edit", "content.delete", "content.upload"
    ]'::jsonb,
    true
),
(
    'admin',
    '管理员',
    '系统管理员，拥有大部分管理权限',
    '[
        "user.view", "user.create", "user.edit", "user.delete", "user.import", "user.export", "user.batch_update",
        "role.view", "role.assign",
        "course.view", "course.create", "course.edit", "course.delete", "course.publish", "course.assign",
        "exam.view", "exam.create", "exam.edit", "exam.delete", "exam.grade", "exam.result",
        "org.view", "org.create", "org.edit", "org.delete",
        "report.view", "report.export", "report.dashboard",
        "content.view", "content.create", "content.edit", "content.delete", "content.upload"
    ]'::jsonb,
    true
),
(
    'teacher',
    '教师',
    '教师角色，可以管理课程和考试',
    '[
        "user.view",
        "course.view", "course.create", "course.edit", "course.assign",
        "exam.view", "exam.create", "exam.edit", "exam.grade", "exam.result",
        "content.view", "content.create", "content.edit", "content.upload",
        "report.view"
    ]'::jsonb,
    true
),
(
    'expert',
    '专家',
    '专家角色，可以创建和管理专业课程',
    '[
        "user.view",
        "course.view", "course.create", "course.edit", "course.publish", "course.assign",
        "exam.view", "exam.create", "exam.edit", "exam.grade", "exam.result",
        "content.view", "content.create", "content.edit", "content.upload",
        "report.view", "report.export"
    ]'::jsonb,
    true
),
(
    'student',
    '学员',
    '学员角色，可以学习课程和参加考试',
    '[
        "course.view",
        "exam.view",
        "content.view"
    ]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- 启用行级安全策略
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 只有管理员可以查看角色
CREATE POLICY "管理员可以查看所有角色" ON roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 只有超级管理员可以修改角色
CREATE POLICY "超级管理员可以修改角色" ON roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- 管理员可以修改非系统角色
CREATE POLICY "管理员可以修改非系统角色" ON roles
    FOR UPDATE
    USING (
        NOT is_system AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 管理员可以创建新角色
CREATE POLICY "管理员可以创建角色" ON roles
    FOR INSERT
    WITH CHECK (
        NOT is_system AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 管理员可以删除非系统角色
CREATE POLICY "管理员可以删除非系统角色" ON roles
    FOR DELETE
    USING (
        NOT is_system AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO authenticated;
GRANT SELECT ON roles TO anon;

-- 添加注释
COMMENT ON TABLE roles IS '系统角色表';
COMMENT ON COLUMN roles.id IS '角色ID';
COMMENT ON COLUMN roles.name IS '角色名称（英文）';
COMMENT ON COLUMN roles.display_name IS '角色显示名称（中文）';
COMMENT ON COLUMN roles.description IS '角色描述';
COMMENT ON COLUMN roles.permissions IS '角色权限列表（JSON数组）';
COMMENT ON COLUMN roles.is_system IS '是否为系统角色';
COMMENT ON COLUMN roles.created_at IS '创建时间';
COMMENT ON COLUMN roles.updated_at IS '更新时间';