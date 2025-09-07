-- 创建部门表，支持树形结构和层级管理
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- 部门编码
    description TEXT,
    parent_id UUID REFERENCES departments(id) ON DELETE CASCADE, -- 父部门ID，支持树形结构
    level INTEGER NOT NULL DEFAULT 1, -- 部门层级，根部门为1
    path TEXT NOT NULL DEFAULT '', -- 部门路径，用于快速查询子部门
    sort_order INTEGER DEFAULT 0, -- 排序字段
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 部门负责人
    contact_phone VARCHAR(20), -- 联系电话
    contact_email VARCHAR(100), -- 联系邮箱
    address TEXT, -- 部门地址
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')), -- 部门状态
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    updated_by UUID REFERENCES admin_users(id)
);

-- 创建索引
CREATE INDEX idx_departments_parent_id ON departments(parent_id);
CREATE INDEX idx_departments_path ON departments(path);
CREATE INDEX idx_departments_level ON departments(level);
CREATE INDEX idx_departments_status ON departments(status);
CREATE INDEX idx_departments_manager_id ON departments(manager_id);
CREATE INDEX idx_departments_code ON departments(code);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_departments_updated_at();

-- 创建路径更新函数
CREATE OR REPLACE FUNCTION update_department_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT := '';
    new_path TEXT;
BEGIN
    -- 如果有父部门，获取父部门路径
    IF NEW.parent_id IS NOT NULL THEN
        SELECT path INTO parent_path FROM departments WHERE id = NEW.parent_id;
        NEW.path = parent_path || '/' || NEW.id::TEXT;
        
        -- 更新层级
        SELECT level + 1 INTO NEW.level FROM departments WHERE id = NEW.parent_id;
    ELSE
        -- 根部门
        NEW.path = '/' || NEW.id::TEXT;
        NEW.level = 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_department_path
    BEFORE INSERT OR UPDATE OF parent_id ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_department_path();

-- 创建递归更新子部门路径的函数
CREATE OR REPLACE FUNCTION update_children_paths(dept_id UUID, old_path TEXT, new_path TEXT)
RETURNS VOID AS $$
DECLARE
    child_record RECORD;
BEGIN
    -- 更新所有子部门的路径
    FOR child_record IN 
        SELECT id, path FROM departments WHERE parent_id = dept_id
    LOOP
        UPDATE departments 
        SET path = REPLACE(child_record.path, old_path, new_path),
            level = (LENGTH(REPLACE(new_path, '/', '')) - LENGTH(REPLACE(REPLACE(new_path, '/', ''), '', ''))) + 1
        WHERE id = child_record.id;
        
        -- 递归更新子部门的子部门
        PERFORM update_children_paths(child_record.id, child_record.path, 
            REPLACE(child_record.path, old_path, new_path));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 创建路径更新后触发器
CREATE OR REPLACE FUNCTION after_department_path_update()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果路径发生变化，更新所有子部门路径
    IF OLD.path IS DISTINCT FROM NEW.path THEN
        PERFORM update_children_paths(NEW.id, OLD.path, NEW.path);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_department_path_update
    AFTER UPDATE OF path ON departments
    FOR EACH ROW
    EXECUTE FUNCTION after_department_path_update();

-- 插入一些示例部门数据
INSERT INTO departments (name, code, description, parent_id, manager_id, status) VALUES
('总公司', 'HQ', '集团总部', NULL, NULL, 'active'),
('技术部', 'TECH', '技术研发部门', NULL, NULL, 'active'),
('人事部', 'HR', '人力资源部门', NULL, NULL, 'active'),
('财务部', 'FIN', '财务管理部门', NULL, NULL, 'active');

-- 添加子部门
INSERT INTO departments (name, code, description, parent_id, status) VALUES
('前端开发组', 'TECH-FE', '前端开发团队', (SELECT id FROM departments WHERE code = 'TECH'), 'active'),
('后端开发组', 'TECH-BE', '后端开发团队', (SELECT id FROM departments WHERE code = 'TECH'), 'active'),
('测试组', 'TECH-QA', '质量保证团队', (SELECT id FROM departments WHERE code = 'TECH'), 'active'),
('招聘组', 'HR-REC', '人才招聘团队', (SELECT id FROM departments WHERE code = 'HR'), 'active'),
('薪酬组', 'HR-PAY', '薪酬福利团队', (SELECT id FROM departments WHERE code = 'HR'), 'active');

-- 启用行级安全策略
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "管理员可以查看所有部门" ON departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "管理员可以管理所有部门" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "部门负责人可以查看自己管理的部门" ON departments
    FOR SELECT USING (
        manager_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM departments d2
            WHERE d2.manager_id = auth.uid()
            AND departments.path LIKE d2.path || '%'
        )
    );

-- 授权给相关角色
GRANT SELECT, INSERT, UPDATE, DELETE ON departments TO authenticated;
GRANT SELECT ON departments TO anon;

-- 创建部门查询视图
CREATE OR REPLACE VIEW departments_with_manager AS
SELECT 
    d.*,
    u.name as manager_name,
    u.email as manager_email,
    (SELECT COUNT(*) FROM departments child WHERE child.parent_id = d.id) as children_count,
    (SELECT COUNT(*) FROM users WHERE department = d.name) as user_count
FROM departments d
LEFT JOIN users u ON d.manager_id = u.id;

-- 授权视图访问
GRANT SELECT ON departments_with_manager TO authenticated;
GRANT SELECT ON departments_with_manager TO anon;