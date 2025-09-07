-- 删除现有的RLS策略
DROP POLICY IF EXISTS "管理员可以查看所有部门权限" ON department_permissions;
DROP POLICY IF EXISTS "管理员可以管理所有部门权限" ON department_permissions;
DROP POLICY IF EXISTS "管理员可以查看所有继承规则" ON permission_inheritance_rules;
DROP POLICY IF EXISTS "管理员可以管理所有继承规则" ON permission_inheritance_rules;
DROP POLICY IF EXISTS "管理员可以查看所有用户权限" ON user_permissions;
DROP POLICY IF EXISTS "用户可以查看自己的权限" ON user_permissions;
DROP POLICY IF EXISTS "管理员可以管理所有用户权限" ON user_permissions;
DROP POLICY IF EXISTS "管理员可以查看所有权限变更历史" ON permission_change_history;

-- 删除现有表（如果存在）
DROP TABLE IF EXISTS permission_change_history CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS permission_inheritance_rules CASCADE;
DROP TABLE IF EXISTS department_permissions CASCADE;

-- 重新创建部门权限配置表
CREATE TABLE department_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,
    inherit_from_parent BOOLEAN NOT NULL DEFAULT true,
    override_children BOOLEAN NOT NULL DEFAULT false,
    department_level INTEGER NOT NULL,
    conditions JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    UNIQUE(department_id, resource, action)
);

-- 创建权限继承规则表
CREATE TABLE permission_inheritance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    inheritance_type VARCHAR(20) NOT NULL DEFAULT 'inherit',
    conditions JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    UNIQUE(department_id, resource, action)
);

-- 创建用户权限表
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    source_id UUID,
    conditions JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    UNIQUE(user_id, resource, action)
);

-- 创建权限变更历史表
CREATE TABLE permission_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_granted BOOLEAN,
    new_granted BOOLEAN,
    change_type VARCHAR(20) NOT NULL,
    change_reason TEXT,
    changed_by UUID REFERENCES admin_users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- 创建基本索引
CREATE INDEX idx_department_permissions_department_id ON department_permissions(department_id);
CREATE INDEX idx_department_permissions_resource_action ON department_permissions(resource, action);
CREATE INDEX idx_department_permissions_status ON department_permissions(status);

CREATE INDEX idx_inheritance_rules_department_id ON permission_inheritance_rules(department_id);
CREATE INDEX idx_inheritance_rules_resource_action ON permission_inheritance_rules(resource, action);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_resource_action ON user_permissions(resource, action);
CREATE INDEX idx_user_permissions_status ON user_permissions(status);

CREATE INDEX idx_permission_history_target ON permission_change_history(target_type, target_id);
CREATE INDEX idx_permission_history_changed_at ON permission_change_history(changed_at);

-- 启用行级安全策略
ALTER TABLE department_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_inheritance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_change_history ENABLE ROW LEVEL SECURITY;

-- 创建基本RLS策略
CREATE POLICY "dept_perms_admin_select" ON department_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "dept_perms_admin_all" ON department_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "inherit_rules_admin_select" ON permission_inheritance_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "inherit_rules_admin_all" ON permission_inheritance_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "user_perms_admin_select" ON user_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "user_perms_self_select" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_perms_admin_all" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "perm_history_admin_select" ON permission_change_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

-- 授予基本权限
GRANT SELECT, INSERT, UPDATE, DELETE ON department_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON permission_inheritance_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_permissions TO authenticated;
GRANT SELECT ON permission_change_history TO authenticated;

GRANT SELECT ON department_permissions TO anon;
GRANT SELECT ON permission_inheritance_rules TO anon;
GRANT SELECT ON user_permissions TO anon;
GRANT SELECT ON permission_change_history TO anon;

-- 插入示例数据
INSERT INTO department_permissions (department_id, resource, action, granted, department_level, created_by) 
SELECT 
    d.id,
    'users',
    'read',
    true,
    d.level,
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM departments d
WHERE d.status = 'active'
LIMIT 3;

INSERT INTO permission_inheritance_rules (department_id, resource, action, inheritance_type, created_by)
SELECT 
    d.id,
    'users',
    'read',
    'inherit',
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM departments d
WHERE d.status = 'active' AND d.parent_id IS NOT NULL
LIMIT 2;