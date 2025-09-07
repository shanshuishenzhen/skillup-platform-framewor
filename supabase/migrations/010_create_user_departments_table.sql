-- 创建用户部门关联表，支持用户与部门的多对多关系
CREATE TABLE user_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    position VARCHAR(100), -- 在该部门的职位
    is_primary BOOLEAN DEFAULT false, -- 是否为主要部门
    is_manager BOOLEAN DEFAULT false, -- 是否为部门管理者
    start_date DATE DEFAULT CURRENT_DATE, -- 加入部门日期
    end_date DATE, -- 离开部门日期（NULL表示仍在该部门）
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')), -- 关联状态
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id),
    
    -- 确保用户在同一部门只能有一个活跃记录
    UNIQUE(user_id, department_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- 创建索引
CREATE INDEX idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX idx_user_departments_department_id ON user_departments(department_id);
CREATE INDEX idx_user_departments_status ON user_departments(status);
CREATE INDEX idx_user_departments_is_primary ON user_departments(is_primary);
CREATE INDEX idx_user_departments_is_manager ON user_departments(is_manager);
CREATE INDEX idx_user_departments_start_date ON user_departments(start_date);
CREATE INDEX idx_user_departments_end_date ON user_departments(end_date);

-- 创建复合索引
CREATE INDEX idx_user_departments_active ON user_departments(user_id, department_id) WHERE status = 'active';
CREATE INDEX idx_user_departments_primary ON user_departments(user_id) WHERE is_primary = true AND status = 'active';

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_user_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_departments_updated_at
    BEFORE UPDATE ON user_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_user_departments_updated_at();

-- 创建确保用户只有一个主要部门的触发器
CREATE OR REPLACE FUNCTION ensure_single_primary_department()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果设置为主要部门，取消该用户其他部门的主要标记
    IF NEW.is_primary = true AND NEW.status = 'active' THEN
        UPDATE user_departments 
        SET is_primary = false 
        WHERE user_id = NEW.user_id 
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_department
    BEFORE INSERT OR UPDATE ON user_departments
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_department();

-- 创建部门管理者更新触发器
CREATE OR REPLACE FUNCTION update_department_manager()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果设置为部门管理者，更新部门表的manager_id
    IF NEW.is_manager = true AND NEW.status = 'active' THEN
        UPDATE departments 
        SET manager_id = NEW.user_id,
            updated_at = NOW()
        WHERE id = NEW.department_id;
        
        -- 取消该部门其他用户的管理者标记
        UPDATE user_departments 
        SET is_manager = false 
        WHERE department_id = NEW.department_id 
        AND user_id != NEW.user_id 
        AND status = 'active';
    END IF;
    
    -- 如果取消管理者标记，清除部门表的manager_id
    IF OLD.is_manager = true AND NEW.is_manager = false THEN
        UPDATE departments 
        SET manager_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.department_id AND manager_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_department_manager
    AFTER INSERT OR UPDATE ON user_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_department_manager();

-- 创建删除时清理部门管理者的触发器
CREATE OR REPLACE FUNCTION cleanup_department_manager()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果删除的是部门管理者，清除部门表的manager_id
    IF OLD.is_manager = true THEN
        UPDATE departments 
        SET manager_id = NULL,
            updated_at = NOW()
        WHERE id = OLD.department_id AND manager_id = OLD.user_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_department_manager
    AFTER DELETE ON user_departments
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_department_manager();

-- 创建用户部门历史表（用于记录部门变更历史）
CREATE TABLE user_department_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('join', 'leave', 'transfer', 'promote', 'demote')),
    old_position VARCHAR(100),
    new_position VARCHAR(100),
    old_department_id UUID REFERENCES departments(id),
    reason TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id)
);

-- 创建历史表索引
CREATE INDEX idx_user_department_history_user_id ON user_department_history(user_id);
CREATE INDEX idx_user_department_history_department_id ON user_department_history(department_id);
CREATE INDEX idx_user_department_history_action ON user_department_history(action);
CREATE INDEX idx_user_department_history_effective_date ON user_department_history(effective_date);

-- 启用行级安全策略
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_department_history ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略 - user_departments
CREATE POLICY "管理员可以查看所有用户部门关联" ON user_departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "管理员可以管理所有用户部门关联" ON user_departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "部门管理者可以查看本部门用户" ON user_departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_departments ud
            WHERE ud.user_id = auth.uid()
            AND ud.department_id = user_departments.department_id
            AND ud.is_manager = true
            AND ud.status = 'active'
        )
    );

CREATE POLICY "用户可以查看自己的部门关联" ON user_departments
    FOR SELECT USING (user_id = auth.uid());

-- 创建RLS策略 - user_department_history
CREATE POLICY "管理员可以查看所有部门变更历史" ON user_department_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "用户可以查看自己的部门变更历史" ON user_department_history
    FOR SELECT USING (user_id = auth.uid());

-- 授权给相关角色
GRANT SELECT, INSERT, UPDATE, DELETE ON user_departments TO authenticated;
GRANT SELECT ON user_departments TO anon;
GRANT SELECT, INSERT ON user_department_history TO authenticated;
GRANT SELECT ON user_department_history TO anon;

-- 创建用户部门关联视图
CREATE OR REPLACE VIEW user_departments_with_details AS
SELECT 
    ud.*,
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone,
    d.name as department_name,
    d.code as department_code,
    d.level as department_level,
    d.path as department_path,
    pd.name as parent_department_name
FROM user_departments ud
JOIN users u ON ud.user_id = u.id
JOIN departments d ON ud.department_id = d.id
LEFT JOIN departments pd ON d.parent_id = pd.id;

-- 创建部门成员统计视图
CREATE OR REPLACE VIEW department_member_stats AS
SELECT 
    d.id as department_id,
    d.name as department_name,
    d.code as department_code,
    COUNT(CASE WHEN ud.status = 'active' THEN 1 END) as active_members,
    COUNT(CASE WHEN ud.status = 'active' AND ud.is_manager = true THEN 1 END) as managers,
    COUNT(CASE WHEN ud.status = 'inactive' THEN 1 END) as inactive_members,
    COUNT(CASE WHEN ud.status = 'transferred' THEN 1 END) as transferred_members,
    COUNT(*) as total_members
FROM departments d
LEFT JOIN user_departments ud ON d.id = ud.department_id
GROUP BY d.id, d.name, d.code;

-- 授权视图访问
GRANT SELECT ON user_departments_with_details TO authenticated;
GRANT SELECT ON user_departments_with_details TO anon;
GRANT SELECT ON department_member_stats TO authenticated;
GRANT SELECT ON department_member_stats TO anon;

-- 插入一些示例数据（将现有用户分配到部门）
-- 注意：这里假设已有用户数据，实际使用时需要根据具体情况调整
INSERT INTO user_departments (user_id, department_id, position, is_primary, is_manager, status)
SELECT 
    u.id,
    d.id,
    CASE 
        WHEN u.role = 'admin' THEN '管理员'
        WHEN u.role = 'instructor' THEN '讲师'
        WHEN u.role = 'student' THEN '学员'
        ELSE '员工'
    END,
    true, -- 设为主要部门
    false, -- 暂不设置管理者
    'active'
FROM users u
CROSS JOIN departments d
WHERE d.code = 'HQ' -- 默认分配到总公司
AND NOT EXISTS (
    SELECT 1 FROM user_departments ud 
    WHERE ud.user_id = u.id AND ud.status = 'active'
)
LIMIT 10; -- 限制数量，避免过多数据