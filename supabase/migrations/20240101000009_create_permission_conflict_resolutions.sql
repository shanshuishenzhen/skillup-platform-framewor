-- 创建权限冲突解决历史表
-- 用于记录权限冲突的解决历史和审计追踪

-- 权限冲突解决历史表
CREATE TABLE IF NOT EXISTS permission_conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id VARCHAR(255) NOT NULL, -- 冲突标识符
    conflict_type VARCHAR(50) NOT NULL, -- 冲突类型：inheritance, override, priority, condition
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL, -- 资源类型
    action VARCHAR(100) NOT NULL, -- 操作类型
    
    -- 解决信息
    resolution_strategy VARCHAR(50) NOT NULL, -- 解决策略：keep_parent, keep_child, merge, manual, priority_based
    resolved_by UUID NOT NULL REFERENCES admin_users(id), -- 解决者
    resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 解决时间
    
    -- 解决前状态
    before_state JSONB, -- 解决前的权限状态
    
    -- 解决后状态
    after_state JSONB, -- 解决后的权限状态
    
    -- 解决详情
    resolution_details JSONB, -- 解决的详细信息
    notes TEXT, -- 解决说明
    
    -- 影响范围
    affected_permissions INTEGER DEFAULT 0, -- 受影响的权限数量
    applied_to_children BOOLEAN DEFAULT FALSE, -- 是否应用到子部门
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_permission_conflict_resolutions_conflict_id ON permission_conflict_resolutions(conflict_id);
CREATE INDEX idx_permission_conflict_resolutions_department_id ON permission_conflict_resolutions(department_id);
CREATE INDEX idx_permission_conflict_resolutions_resolved_by ON permission_conflict_resolutions(resolved_by);
CREATE INDEX idx_permission_conflict_resolutions_resolved_at ON permission_conflict_resolutions(resolved_at);
CREATE INDEX idx_permission_conflict_resolutions_resource_action ON permission_conflict_resolutions(resource, action);
CREATE INDEX idx_permission_conflict_resolutions_strategy ON permission_conflict_resolutions(resolution_strategy);

-- 权限冲突检测缓存表
-- 用于缓存冲突检测结果，提高性能
CREATE TABLE IF NOT EXISTS permission_conflict_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    conflict_hash VARCHAR(64) NOT NULL, -- 冲突内容的哈希值
    
    -- 冲突信息
    conflict_id VARCHAR(255) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    
    -- 冲突详情
    conflict_details JSONB NOT NULL,
    conflicting_permissions JSONB NOT NULL,
    
    -- 解决状态
    auto_resolvable BOOLEAN DEFAULT FALSE,
    suggested_resolution VARCHAR(50), -- 建议的解决策略
    
    -- 缓存管理
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'), -- 缓存过期时间
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_permission_conflict_cache_department_id ON permission_conflict_cache(department_id);
CREATE INDEX idx_permission_conflict_cache_conflict_id ON permission_conflict_cache(conflict_id);
CREATE INDEX idx_permission_conflict_cache_hash ON permission_conflict_cache(conflict_hash);
CREATE INDEX idx_permission_conflict_cache_expires_at ON permission_conflict_cache(expires_at);
CREATE INDEX idx_permission_conflict_cache_severity ON permission_conflict_cache(severity);
CREATE INDEX idx_permission_conflict_cache_auto_resolvable ON permission_conflict_cache(auto_resolvable);

-- 权限变更历史表
-- 记录所有权限配置的变更历史
CREATE TABLE IF NOT EXISTS permission_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_id UUID, -- 部门权限ID（可能为空，如删除操作）
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    
    -- 变更信息
    change_type VARCHAR(20) NOT NULL, -- create, update, delete, resolve_conflict
    changed_by UUID NOT NULL REFERENCES admin_users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 变更内容
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    
    -- 变更前后状态
    old_values JSONB, -- 变更前的值
    new_values JSONB, -- 变更后的值
    
    -- 变更原因
    reason VARCHAR(100), -- manual, template_apply, conflict_resolution, inheritance_update
    notes TEXT,
    
    -- 关联信息
    related_conflict_id VARCHAR(255), -- 如果是冲突解决引起的变更
    related_template_name VARCHAR(255), -- 如果是模板应用引起的变更
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_permission_change_history_department_id ON permission_change_history(department_id);
CREATE INDEX idx_permission_change_history_changed_by ON permission_change_history(changed_by);
CREATE INDEX idx_permission_change_history_changed_at ON permission_change_history(changed_at);
CREATE INDEX idx_permission_change_history_change_type ON permission_change_history(change_type);
CREATE INDEX idx_permission_change_history_resource_action ON permission_change_history(resource, action);
CREATE INDEX idx_permission_change_history_reason ON permission_change_history(reason);

-- 权限模板应用历史表
-- 记录权限模板的应用历史
CREATE TABLE IF NOT EXISTS permission_template_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL, -- 模板名称（不使用外键，因为模板表可能不存在）
    template_data JSONB NOT NULL, -- 模板数据快照
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    
    -- 应用信息
    applied_by UUID NOT NULL REFERENCES admin_users(id),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 应用配置
    override_existing BOOLEAN DEFAULT FALSE, -- 是否覆盖现有权限
    apply_to_children BOOLEAN DEFAULT FALSE, -- 是否应用到子部门
    
    -- 应用结果
    permissions_created INTEGER DEFAULT 0, -- 创建的权限数量
    permissions_updated INTEGER DEFAULT 0, -- 更新的权限数量
    permissions_skipped INTEGER DEFAULT 0, -- 跳过的权限数量
    
    -- 应用详情
    application_details JSONB, -- 应用的详细结果
    notes TEXT,
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_permission_template_applications_template_name ON permission_template_applications(template_name);
CREATE INDEX idx_permission_template_applications_department_id ON permission_template_applications(department_id);
CREATE INDEX idx_permission_template_applications_applied_by ON permission_template_applications(applied_by);
CREATE INDEX idx_permission_template_applications_applied_at ON permission_template_applications(applied_at);

-- 创建触发器函数：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_permission_conflict_resolutions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_permission_conflict_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_permission_conflict_resolutions_updated_at
    BEFORE UPDATE ON permission_conflict_resolutions
    FOR EACH ROW
    EXECUTE FUNCTION update_permission_conflict_resolutions_updated_at();

CREATE TRIGGER trigger_update_permission_conflict_cache_updated_at
    BEFORE UPDATE ON permission_conflict_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_permission_conflict_cache_updated_at();

-- 创建清理过期缓存的函数
CREATE OR REPLACE FUNCTION clean_expired_conflict_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM permission_conflict_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE permission_conflict_resolutions IS '权限冲突解决历史表';
COMMENT ON TABLE permission_conflict_cache IS '权限冲突检测缓存表';
COMMENT ON TABLE permission_change_history IS '权限变更历史表';
COMMENT ON TABLE permission_template_applications IS '权限模板应用历史表';

COMMENT ON COLUMN permission_conflict_resolutions.conflict_id IS '冲突标识符，格式：{type}_{department_id}_{resource}_{action}';
COMMENT ON COLUMN permission_conflict_resolutions.resolution_strategy IS '解决策略：keep_parent(保留父级), keep_child(保留子级), merge(合并), manual(手动), priority_based(基于优先级)';
COMMENT ON COLUMN permission_conflict_resolutions.before_state IS '解决前的权限状态快照';
COMMENT ON COLUMN permission_conflict_resolutions.after_state IS '解决后的权限状态快照';

COMMENT ON COLUMN permission_conflict_cache.conflict_hash IS '冲突内容的MD5哈希值，用于快速比较';
COMMENT ON COLUMN permission_conflict_cache.severity IS '冲突严重程度：low(低), medium(中), high(高), critical(严重)';
COMMENT ON COLUMN permission_conflict_cache.expires_at IS '缓存过期时间，默认1小时';

COMMENT ON COLUMN permission_change_history.change_type IS '变更类型：create(创建), update(更新), delete(删除), resolve_conflict(解决冲突)';
COMMENT ON COLUMN permission_change_history.reason IS '变更原因：manual(手动), template_apply(模板应用), conflict_resolution(冲突解决), inheritance_update(继承更新)';

COMMENT ON FUNCTION clean_expired_conflict_cache() IS '清理过期的权限冲突缓存';