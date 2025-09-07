-- 创建部门权限配置表
CREATE TABLE IF NOT EXISTS department_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL, -- 资源类型，如 'courses', 'users', 'exams' 等
    action VARCHAR(50) NOT NULL, -- 操作类型，如 'read', 'write', 'delete', 'manage' 等
    granted BOOLEAN NOT NULL DEFAULT false, -- 是否授予权限
    inherit_from_parent BOOLEAN NOT NULL DEFAULT true, -- 是否从父部门继承
    override_children BOOLEAN NOT NULL DEFAULT false, -- 是否覆盖子部门权限
    department_level INTEGER NOT NULL, -- 部门层级（用于权限继承计算）
    conditions JSONB, -- 权限条件（如时间限制、IP限制等）
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 状态：active, inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    -- 确保同一部门的同一资源和操作只有一个权限配置
    UNIQUE(department_id, resource, action)
);

-- 创建权限继承规则表
CREATE TABLE IF NOT EXISTS permission_inheritance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL, -- 资源类型
    action VARCHAR(50) NOT NULL, -- 操作类型
    inheritance_type VARCHAR(20) NOT NULL DEFAULT 'inherit', -- 继承类型：inherit, override, block
    conditions JSONB, -- 继承条件
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    -- 确保同一部门的同一资源和操作只有一个继承规则
    UNIQUE(department_id, resource, action)
);

-- 创建用户权限表（用于用户特定权限覆盖）
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- manual, department, role
    source_id UUID, -- 来源ID（部门ID或角色ID）
    conditions JSONB,
    expires_at TIMESTAMP WITH TIME ZONE, -- 权限过期时间
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    -- 确保同一用户的同一资源和操作只有一个权限配置
    UNIQUE(user_id, resource, action)
);

-- 创建权限变更历史表
CREATE TABLE IF NOT EXISTS permission_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(20) NOT NULL, -- department, user
    target_id UUID NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_granted BOOLEAN,
    new_granted BOOLEAN,
    change_type VARCHAR(20) NOT NULL, -- create, update, delete
    change_reason TEXT,
    changed_by UUID REFERENCES admin_users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- 创建索引
CREATE INDEX idx_department_permissions_department_id ON department_permissions(department_id);
CREATE INDEX idx_department_permissions_resource_action ON department_permissions(resource, action);
CREATE INDEX idx_department_permissions_status ON department_permissions(status);
CREATE INDEX idx_department_permissions_level ON department_permissions(department_level);

CREATE INDEX idx_inheritance_rules_department_id ON permission_inheritance_rules(department_id);
CREATE INDEX idx_inheritance_rules_resource_action ON permission_inheritance_rules(resource, action);
CREATE INDEX idx_inheritance_rules_type ON permission_inheritance_rules(inheritance_type);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_resource_action ON user_permissions(resource, action);
CREATE INDEX idx_user_permissions_status ON user_permissions(status);
CREATE INDEX idx_user_permissions_expires_at ON user_permissions(expires_at);

CREATE INDEX idx_permission_history_target ON permission_change_history(target_type, target_id);
CREATE INDEX idx_permission_history_resource_action ON permission_change_history(resource, action);
CREATE INDEX idx_permission_history_changed_at ON permission_change_history(changed_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_permission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_department_permissions_updated_at
    BEFORE UPDATE ON department_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_permission_updated_at();

CREATE TRIGGER trigger_inheritance_rules_updated_at
    BEFORE UPDATE ON permission_inheritance_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_permission_updated_at();

CREATE TRIGGER trigger_user_permissions_updated_at
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_permission_updated_at();

-- 创建权限变更历史记录触发器
CREATE OR REPLACE FUNCTION log_department_permission_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO permission_change_history (
            target_type, target_id, resource, action,
            old_granted, new_granted, change_type,
            changed_by, changed_at
        ) VALUES (
            'department', NEW.department_id, NEW.resource, NEW.action,
            NULL, NEW.granted, 'create',
            NEW.created_by, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.granted != NEW.granted THEN
            INSERT INTO permission_change_history (
                target_type, target_id, resource, action,
                old_granted, new_granted, change_type,
                changed_by, changed_at
            ) VALUES (
                'department', NEW.department_id, NEW.resource, NEW.action,
                OLD.granted, NEW.granted, 'update',
                NEW.updated_by, CURRENT_TIMESTAMP
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO permission_change_history (
            target_type, target_id, resource, action,
            old_granted, new_granted, change_type,
            changed_by, changed_at
        ) VALUES (
            'department', OLD.department_id, OLD.resource, OLD.action,
            OLD.granted, NULL, 'delete',
            OLD.updated_by, CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_department_permission_changes
    AFTER INSERT OR UPDATE OR DELETE ON department_permissions
    FOR EACH ROW
    EXECUTE FUNCTION log_department_permission_changes();

-- 创建用户权限变更历史记录触发器
CREATE OR REPLACE FUNCTION log_user_permission_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO permission_change_history (
            target_type, target_id, resource, action,
            old_granted, new_granted, change_type,
            changed_by, changed_at
        ) VALUES (
            'user', NEW.user_id, NEW.resource, NEW.action,
            NULL, NEW.granted, 'create',
            NEW.created_by, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.granted != NEW.granted THEN
            INSERT INTO permission_change_history (
                target_type, target_id, resource, action,
                old_granted, new_granted, change_type,
                changed_by, changed_at
            ) VALUES (
                'user', NEW.user_id, NEW.resource, NEW.action,
                OLD.granted, NEW.granted, 'update',
                NEW.updated_by, CURRENT_TIMESTAMP
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO permission_change_history (
            target_type, target_id, resource, action,
            old_granted, new_granted, change_type,
            changed_by, changed_at
        ) VALUES (
            'user', OLD.user_id, OLD.resource, OLD.action,
            OLD.granted, NULL, 'delete',
            OLD.updated_by, CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_user_permission_changes
    AFTER INSERT OR UPDATE OR DELETE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION log_user_permission_changes();

-- 启用行级安全策略
ALTER TABLE department_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_inheritance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_change_history ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 部门权限表策略
CREATE POLICY "管理员可以查看所有部门权限" ON department_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "管理员可以管理所有部门权限" ON department_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

-- 权限继承规则表策略
CREATE POLICY "管理员可以查看所有继承规则" ON permission_inheritance_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "管理员可以管理所有继承规则" ON permission_inheritance_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

-- 用户权限表策略
CREATE POLICY "管理员可以查看所有用户权限" ON user_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "用户可以查看自己的权限" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "管理员可以管理所有用户权限" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

-- 权限变更历史表策略
CREATE POLICY "管理员可以查看所有权限变更历史" ON permission_change_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
            AND status = 'active'
        )
    );

-- 创建权限计算函数
CREATE OR REPLACE FUNCTION calculate_user_effective_permissions(target_user_id UUID)
RETURNS TABLE (
    resource VARCHAR(100),
    action VARCHAR(50),
    granted BOOLEAN,
    source_type VARCHAR(20),
    source_name TEXT,
    department_path TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_departments AS (
        -- 获取用户所在的部门
        SELECT 
            ud.department_id,
            d.name as department_name,
            d.path as department_path,
            ud.is_primary,
            ud.is_manager
        FROM user_departments ud
        JOIN departments d ON ud.department_id = d.id
        WHERE ud.user_id = target_user_id 
        AND ud.status = 'active'
        AND d.status = 'active'
    ),
    department_permissions_expanded AS (
        -- 获取用户部门的所有权限（包括继承的）
        SELECT DISTINCT
            dp.resource,
            dp.action,
            dp.granted,
            'department' as source_type,
            ud.department_name as source_name,
            ud.department_path
        FROM user_departments ud
        JOIN departments d ON ud.department_id = d.id
        JOIN department_permissions dp ON (
            -- 直接权限
            dp.department_id = ud.department_id
            OR 
            -- 继承权限（部门路径包含关系）
            (dp.inherit_from_parent = true AND ud.department_path LIKE dp.department_id || '.%')
        )
        WHERE ud.user_id = target_user_id
        AND ud.status = 'active'
        AND d.status = 'active'
        AND dp.status = 'active'
    ),
    user_specific_permissions AS (
        -- 获取用户特定权限
        SELECT 
            up.resource,
            up.action,
            up.granted,
            'user' as source_type,
            '用户特定权限' as source_name,
            NULL as department_path
        FROM user_permissions up
        WHERE up.user_id = target_user_id
        AND up.status = 'active'
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    )
    -- 合并权限，用户特定权限优先级最高
    SELECT DISTINCT ON (p.resource, p.action)
        p.resource,
        p.action,
        p.granted,
        p.source_type,
        p.source_name,
        p.department_path
    FROM (
        SELECT * FROM user_specific_permissions
        UNION ALL
        SELECT * FROM department_permissions_expanded
    ) p
    ORDER BY p.resource, p.action, 
        CASE p.source_type 
            WHEN 'user' THEN 1 
            WHEN 'department' THEN 2 
            ELSE 3 
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建部门权限统计视图
CREATE OR REPLACE VIEW department_permission_stats AS
SELECT 
    d.id as department_id,
    d.name as department_name,
    d.level as department_level,
    COUNT(dp.id) as direct_permission_count,
    COUNT(CASE WHEN dp.granted = true THEN 1 END) as granted_permission_count,
    COUNT(CASE WHEN dp.inherit_from_parent = true THEN 1 END) as inherited_permission_count,
    COUNT(CASE WHEN dp.override_children = true THEN 1 END) as override_permission_count,
    ARRAY_AGG(DISTINCT dp.resource) FILTER (WHERE dp.resource IS NOT NULL) as resources,
    d.updated_at as last_updated
FROM departments d
LEFT JOIN department_permissions dp ON d.id = dp.department_id AND dp.status = 'active'
WHERE d.status = 'active'
GROUP BY d.id, d.name, d.level, d.updated_at;

-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON department_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON permission_inheritance_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_permissions TO authenticated;
GRANT SELECT ON permission_change_history TO authenticated;
GRANT SELECT ON department_permission_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_effective_permissions(UUID) TO authenticated;

GRANT SELECT ON department_permissions TO anon;
GRANT SELECT ON permission_inheritance_rules TO anon;
GRANT SELECT ON user_permissions TO anon;
GRANT SELECT ON permission_change_history TO anon;
GRANT SELECT ON department_permission_stats TO anon;

-- 插入示例数据
INSERT INTO department_permissions (department_id, resource, action, granted, inherit_from_parent, override_children, department_level, created_by, updated_by)
SELECT 
    d.id,
    'courses',
    'read',
    true,
    true,
    false,
    d.level,
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1),
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM departments d
WHERE d.name IN ('技术部', '产品部', '市场部')
AND d.status = 'active';

INSERT INTO department_permissions (department_id, resource, action, granted, inherit_from_parent, override_children, department_level, created_by, updated_by)
SELECT 
    d.id,
    'users',
    'manage',
    true,
    false,
    true,
    d.level,
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1),
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM departments d
WHERE d.name = '人事部'
AND d.status = 'active';

-- 插入权限继承规则示例
INSERT INTO permission_inheritance_rules (department_id, resource, action, inheritance_type, conditions, created_by, updated_by)
SELECT 
    d.id,
    'exams',
    'create',
    'inherit',
    '{"min_level": 2, "max_level": 4}',
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1),
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM departments d
WHERE d.name = '技术部'
AND d.status = 'active';