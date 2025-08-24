-- 用户管理功能扩展迁移脚本
-- 创建时间: 2024-01-20
-- 描述: 为用户表添加学习、考试、批量导入相关字段，支持80%批量导入用户的管理需求

-- ============================================================================
-- 1. 用户表结构扩展
-- ============================================================================

-- 身份信息扩展
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(100);

-- 学习相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_level VARCHAR(20) DEFAULT 'beginner' 
  CHECK (learning_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_progress JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_hours INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_learning_time TIMESTAMP WITH TIME ZONE;

-- 考试相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS exam_permissions TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS exam_history JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_status VARCHAR(20) DEFAULT 'none'
  CHECK (certification_status IN ('none', 'pending', 'certified', 'expired'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_date TIMESTAMP WITH TIME ZONE;

-- 批量导入管理字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS import_source VARCHAR(20) DEFAULT 'manual'
  CHECK (import_source IN ('manual', 'excel_import', 'api_import', 'sync'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 同步状态字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced'
  CHECK (sync_status IN ('synced', 'pending_sync', 'sync_failed', 'sync_disabled'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

-- ============================================================================
-- 2. 创建索引优化查询性能
-- ============================================================================

-- 单字段索引
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization) WHERE organization IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_import_batch ON users(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status);
CREATE INDEX IF NOT EXISTS idx_users_learning_level ON users(learning_level);
CREATE INDEX IF NOT EXISTS idx_users_certification_status ON users(certification_status);
CREATE INDEX IF NOT EXISTS idx_users_import_source ON users(import_source);

-- 复合索引
CREATE INDEX IF NOT EXISTS idx_users_org_dept ON users(organization, department) WHERE organization IS NOT NULL AND department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_sync_batch ON users(sync_status, import_batch_id) WHERE import_batch_id IS NOT NULL;

-- ============================================================================
-- 3. 数据迁移脚本
-- ============================================================================

-- 为现有用户设置默认值
UPDATE users SET 
  import_source = 'manual',
  sync_status = 'synced',
  learning_level = 'beginner',
  certification_status = 'none',
  import_date = created_at
WHERE import_source IS NULL;

-- 为管理员用户设置特殊权限
UPDATE users SET 
  exam_permissions = ARRAY['all_exams', 'manage_users', 'view_reports']
WHERE user_type = 'ADMIN' OR user_type = 'SUPER_ADMIN';

-- 为普通用户设置基础权限
UPDATE users SET 
  exam_permissions = ARRAY['basic_exams']
WHERE user_type = 'USER' AND exam_permissions = '{}';

-- ============================================================================
-- 4. 添加注释
-- ============================================================================

COMMENT ON COLUMN users.employee_id IS '员工工号，用于企业内部管理';
COMMENT ON COLUMN users.department IS '部门名称';
COMMENT ON COLUMN users.position IS '职位名称';
COMMENT ON COLUMN users.organization IS '组织机构名称';
COMMENT ON COLUMN users.learning_level IS '学习等级：beginner-初级，intermediate-中级，advanced-高级，expert-专家';
COMMENT ON COLUMN users.learning_progress IS '学习进度JSON数据，存储课程完成情况';
COMMENT ON COLUMN users.learning_hours IS '累计学习时长（小时）';
COMMENT ON COLUMN users.last_learning_time IS '最后学习时间';
COMMENT ON COLUMN users.exam_permissions IS '考试权限数组，控制用户可参加的考试类型';
COMMENT ON COLUMN users.exam_history IS '考试历史JSON数据，存储考试记录';
COMMENT ON COLUMN users.certification_status IS '认证状态：none-无认证，pending-待认证，certified-已认证，expired-已过期';
COMMENT ON COLUMN users.certification_date IS '认证获得日期';
COMMENT ON COLUMN users.import_batch_id IS '批量导入批次ID，用于追踪批量导入的用户';
COMMENT ON COLUMN users.import_source IS '导入来源：manual-手动创建，excel_import-Excel导入，api_import-API导入，sync-同步导入';
COMMENT ON COLUMN users.import_date IS '导入日期';
COMMENT ON COLUMN users.sync_status IS '同步状态：synced-已同步，pending_sync-待同步，sync_failed-同步失败，sync_disabled-禁用同步';
COMMENT ON COLUMN users.last_sync_time IS '最后同步时间';
COMMENT ON COLUMN users.sync_error_message IS '同步错误信息';