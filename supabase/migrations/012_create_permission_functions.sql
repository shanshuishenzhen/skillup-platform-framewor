-- 创建权限计算函数
CREATE OR REPLACE FUNCTION calculate_user_effective_permissions(
    p_user_id UUID,
    p_resource VARCHAR DEFAULT NULL,
    p_action VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    resource VARCHAR,
    action VARCHAR,
    granted BOOLEAN,
    source_type VARCHAR,
    source_id UUID,
    department_path TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE department_hierarchy AS (
        -- 获取用户所在的部门
        SELECT 
            d.id,
            d.name,
            d.parent_id,
            d.level,
            ARRAY[d.name] as path,
            ud.is_primary,
            ud.is_manager
        FROM departments d
        JOIN user_departments ud ON d.id = ud.department_id
        WHERE ud.user_id = p_user_id AND ud.status = 'active'
        
        UNION ALL
        
        -- 递归获取父部门
        SELECT 
            d.id,
            d.name,
            d.parent_id,
            d.level,
            dh.path || d.name,
            dh.is_primary,
            dh.is_manager
        FROM departments d
        JOIN department_hierarchy dh ON d.id = dh.parent_id
    ),
    
    -- 获取部门权限（包括继承的权限）
    department_perms AS (
        SELECT DISTINCT
            dp.resource,
            dp.action,
            dp.granted,
            'department'::VARCHAR as source_type,
            dp.department_id as source_id,
            dh.path
        FROM department_permissions dp
        JOIN department_hierarchy dh ON dp.department_id = dh.id
        WHERE dp.status = 'active'
        AND (p_resource IS NULL OR dp.resource = p_resource)
        AND (p_action IS NULL OR dp.action = p_action)
        AND (
            -- 直接权限
            dp.department_id = dh.id
            OR 
            -- 继承权限
            (dp.inherit_from_parent = true AND dp.department_level <= dh.level)
        )
    ),
    
    -- 获取用户直接权限
    user_perms AS (
        SELECT 
            up.resource,
            up.action,
            up.granted,
            up.source_type,
            up.source_id,
            ARRAY[]::TEXT[] as path
        FROM user_permissions up
        WHERE up.user_id = p_user_id 
        AND up.status = 'active'
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
        AND (p_resource IS NULL OR up.resource = p_resource)
        AND (p_action IS NULL OR up.action = p_action)
    ),
    
    -- 合并所有权限，用户权限优先级最高
    all_permissions AS (
        SELECT * FROM user_perms
        UNION ALL
        SELECT * FROM department_perms
        WHERE NOT EXISTS (
            SELECT 1 FROM user_perms up 
            WHERE up.resource = department_perms.resource 
            AND up.action = department_perms.action
        )
    )
    
    SELECT 
        ap.resource,
        ap.action,
        ap.granted,
        ap.source_type,
        ap.source_id,
        ap.path
    FROM all_permissions ap
    ORDER BY ap.resource, ap.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限检查函数
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT granted INTO has_permission
    FROM calculate_user_effective_permissions(p_user_id, p_resource, p_action)
    WHERE resource = p_resource AND action = p_action
    LIMIT 1;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限继承更新函数
CREATE OR REPLACE FUNCTION update_inherited_permissions(
    p_department_id UUID
)
RETURNS VOID AS $$
DECLARE
    dept_record RECORD;
    child_dept RECORD;
BEGIN
    -- 获取当前部门信息
    SELECT * INTO dept_record FROM departments WHERE id = p_department_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '部门不存在: %', p_department_id;
    END IF;
    
    -- 更新子部门的继承权限
    FOR child_dept IN 
        SELECT id FROM departments 
        WHERE parent_id = p_department_id AND status = 'active'
    LOOP
        -- 删除旧的继承权限
        DELETE FROM department_permissions 
        WHERE department_id = child_dept.id 
        AND source_type = 'inherited';
        
        -- 插入新的继承权限
        INSERT INTO department_permissions (
            department_id, resource, action, granted, 
            inherit_from_parent, department_level, 
            source_type, created_by
        )
        SELECT 
            child_dept.id,
            dp.resource,
            dp.action,
            dp.granted,
            true,
            dept_record.level + 1,
            'inherited',
            dp.created_by
        FROM department_permissions dp
        WHERE dp.department_id = p_department_id
        AND dp.status = 'active'
        AND dp.inherit_from_parent = true
        ON CONFLICT (department_id, resource, action) 
        DO UPDATE SET
            granted = EXCLUDED.granted,
            updated_at = CURRENT_TIMESTAMP;
        
        -- 递归更新子部门的子部门
        PERFORM update_inherited_permissions(child_dept.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限变更记录函数
CREATE OR REPLACE FUNCTION log_permission_change(
    p_target_type VARCHAR,
    p_target_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR,
    p_old_granted BOOLEAN,
    p_new_granted BOOLEAN,
    p_change_type VARCHAR,
    p_change_reason TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO permission_change_history (
        target_type, target_id, resource, action,
        old_granted, new_granted, change_type, change_reason,
        changed_by, ip_address, user_agent
    ) VALUES (
        p_target_type, p_target_id, p_resource, p_action,
        p_old_granted, p_new_granted, p_change_type, p_change_reason,
        COALESCE(p_changed_by, auth.uid()),
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限更新触发器
CREATE OR REPLACE FUNCTION trigger_permission_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_permission_change(
            'department', NEW.department_id, NEW.resource, NEW.action,
            NULL, NEW.granted, 'create', 'Permission created'
        );
        
        -- 更新子部门继承权限
        IF NEW.inherit_from_parent = true THEN
            PERFORM update_inherited_permissions(NEW.department_id);
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.granted != NEW.granted THEN
            PERFORM log_permission_change(
                'department', NEW.department_id, NEW.resource, NEW.action,
                OLD.granted, NEW.granted, 'update', 'Permission updated'
            );
        END IF;
        
        -- 更新子部门继承权限
        IF OLD.inherit_from_parent != NEW.inherit_from_parent 
           OR OLD.granted != NEW.granted THEN
            PERFORM update_inherited_permissions(NEW.department_id);
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_permission_change(
            'department', OLD.department_id, OLD.resource, OLD.action,
            OLD.granted, NULL, 'delete', 'Permission deleted'
        );
        
        -- 更新子部门继承权限
        PERFORM update_inherited_permissions(OLD.department_id);
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户权限变更触发器
CREATE OR REPLACE FUNCTION trigger_user_permission_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_permission_change(
            'user', NEW.user_id, NEW.resource, NEW.action,
            NULL, NEW.granted, 'create', 'User permission created'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.granted != NEW.granted THEN
            PERFORM log_permission_change(
                'user', NEW.user_id, NEW.resource, NEW.action,
                OLD.granted, NEW.granted, 'update', 'User permission updated'
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_permission_change(
            'user', OLD.user_id, OLD.resource, OLD.action,
            OLD.granted, NULL, 'delete', 'User permission deleted'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS department_permission_change_trigger ON department_permissions;
CREATE TRIGGER department_permission_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON department_permissions
    FOR EACH ROW EXECUTE FUNCTION trigger_permission_change();

DROP TRIGGER IF EXISTS user_permission_change_trigger ON user_permissions;
CREATE TRIGGER user_permission_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION trigger_user_permission_change();

-- 创建权限统计视图
CREATE OR REPLACE VIEW department_permission_stats AS
SELECT 
    d.id as department_id,
    d.name as department_name,
    d.level,
    COUNT(dp.id) as total_permissions,
    COUNT(CASE WHEN dp.granted = true THEN 1 END) as granted_permissions,
    COUNT(CASE WHEN dp.inherit_from_parent = true THEN 1 END) as inherited_permissions,
    COUNT(CASE WHEN dp.override_children = true THEN 1 END) as override_permissions,
    COUNT(DISTINCT dp.resource) as unique_resources,
    MAX(dp.updated_at) as last_updated
FROM departments d
LEFT JOIN department_permissions dp ON d.id = dp.department_id AND dp.status = 'active'
WHERE d.status = 'active'
GROUP BY d.id, d.name, d.level
ORDER BY d.level, d.name;

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION calculate_user_effective_permissions(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_inherited_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_permission_change(VARCHAR, UUID, VARCHAR, VARCHAR, BOOLEAN, BOOLEAN, VARCHAR, TEXT, UUID) TO authenticated;

-- 授予视图查询权限
GRANT SELECT ON department_permission_stats TO authenticated;
GRANT SELECT ON department_permission_stats TO anon;

-- 插入示例权限数据
INSERT INTO department_permissions (department_id, resource, action, granted, inherit_from_parent, department_level, created_by)
SELECT 
    d.id,
    'courses',
    'read',
    true,
    true,
    d.level,
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM departments d
WHERE d.status = 'active'
ON CONFLICT (department_id, resource, action) DO NOTHING;

INSERT INTO department_permissions (department_id, resource, action, granted, inherit_from_parent, department_level, created_by)
SELECT 
    d.id,
    'users',
    'read',
    CASE WHEN d.level <= 2 THEN true ELSE false END,
    true,
    d.level,
    (SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1)
FROM departments d
WHERE d.status = 'active'
ON CONFLICT (department_id, resource, action) DO NOTHING;