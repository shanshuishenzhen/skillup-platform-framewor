-- 批量导入和同步相关表创建脚本
-- 创建时间: 2024-01-20
-- 描述: 创建批量导入记录表和用户同步日志表，支持批量操作的追踪和管理

-- ============================================================================
-- 1. 批量导入记录表
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id VARCHAR(50) UNIQUE NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  total_records INTEGER NOT NULL,
  success_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  duplicate_records INTEGER DEFAULT 0,
  import_status VARCHAR(20) DEFAULT 'processing' 
    CHECK (import_status IN ('processing', 'completed', 'failed', 'cancelled')),
  error_summary JSONB DEFAULT '{}',
  validation_errors JSONB DEFAULT '[]',
  import_options JSONB DEFAULT '{}',
  imported_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 批量导入记录表索引
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON user_import_batches(import_status);
CREATE INDEX IF NOT EXISTS idx_import_batches_date ON user_import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_imported_by ON user_import_batches(imported_by);
CREATE INDEX IF NOT EXISTS idx_import_batches_batch_id ON user_import_batches(batch_id);

-- ============================================================================
-- 2. 用户同步日志表
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('user_data', 'learning_progress', 'exam_results', 'certification')),
  sync_direction VARCHAR(10) NOT NULL CHECK (sync_direction IN ('upload', 'download', 'bidirectional')),
  sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('success', 'failed', 'partial', 'pending')),
  data_snapshot JSONB,
  changes_detected JSONB,
  error_message TEXT,
  error_code VARCHAR(50),
  sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER,
  target_system VARCHAR(50),
  sync_batch_id VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户同步日志表索引
CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON user_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON user_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_time ON user_sync_logs(sync_time DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON user_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_batch ON user_sync_logs(sync_batch_id) WHERE sync_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_logs_target_system ON user_sync_logs(target_system);

-- 复合索引
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_type ON user_sync_logs(user_id, sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_time ON user_sync_logs(sync_status, sync_time DESC);

-- ============================================================================
-- 3. 批量操作记录表
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_batch_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id VARCHAR(50) UNIQUE NOT NULL,
  operation_type VARCHAR(30) NOT NULL CHECK (operation_type IN (
    'activate', 'deactivate', 'delete', 'update_permissions', 'sync', 
    'update_department', 'update_organization', 'reset_password', 'export'
  )),
  target_criteria JSONB NOT NULL, -- 目标用户筛选条件
  operation_data JSONB, -- 操作相关数据
  total_targets INTEGER NOT NULL,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  operation_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (operation_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  results JSONB DEFAULT '[]', -- 操作结果详情
  error_summary JSONB DEFAULT '{}',
  operated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 批量操作记录表索引
CREATE INDEX IF NOT EXISTS idx_batch_operations_status ON user_batch_operations(operation_status);
CREATE INDEX IF NOT EXISTS idx_batch_operations_type ON user_batch_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_batch_operations_date ON user_batch_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_operations_operated_by ON user_batch_operations(operated_by);

-- ============================================================================
-- 4. 触发器：自动更新时间戳
-- ============================================================================

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表添加更新时间戳触发器
CREATE TRIGGER update_user_import_batches_updated_at 
    BEFORE UPDATE ON user_import_batches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_batch_operations_updated_at 
    BEFORE UPDATE ON user_batch_operations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. 行级安全策略 (RLS)
-- ============================================================================

-- 启用行级安全
ALTER TABLE user_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_batch_operations ENABLE ROW LEVEL SECURITY;

-- 批量导入记录表策略
CREATE POLICY "管理员可以查看所有导入记录" ON user_import_batches
    FOR SELECT USING (auth.jwt() ->> 'user_type' IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "用户只能查看自己的导入记录" ON user_import_batches
    FOR SELECT USING (imported_by = auth.uid());

CREATE POLICY "管理员可以创建导入记录" ON user_import_batches
    FOR INSERT WITH CHECK (auth.jwt() ->> 'user_type' IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "管理员可以更新导入记录" ON user_import_batches
    FOR UPDATE USING (auth.jwt() ->> 'user_type' IN ('ADMIN', 'SUPER_ADMIN'));

-- 同步日志表策略
CREATE POLICY "管理员可以查看所有同步日志" ON user_sync_logs
    FOR SELECT USING (auth.jwt() ->> 'user_type' IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "用户只能查看自己的同步日志" ON user_sync_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "系统可以创建同步日志" ON user_sync_logs
    FOR INSERT WITH CHECK (true);

-- 批量操作记录表策略
CREATE POLICY "管理员可以查看所有批量操作记录" ON user_batch_operations
    FOR SELECT USING (auth.jwt() ->> 'user_type' IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "管理员可以创建批量操作" ON user_batch_operations
    FOR INSERT WITH CHECK (auth.jwt() ->> 'user_type' IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "管理员可以更新批量操作" ON user_batch_operations
    FOR UPDATE USING (auth.jwt() ->> 'user_type' IN ('ADMIN', 'SUPER_ADMIN'));

-- ============================================================================
-- 6. 权限授予
-- ============================================================================

-- 授予匿名用户基本查询权限（用于公开API）
GRANT SELECT ON user_import_batches TO anon;
GRANT SELECT ON user_sync_logs TO anon;
GRANT SELECT ON user_batch_operations TO anon;

-- 授予认证用户完整权限
GRANT ALL PRIVILEGES ON user_import_batches TO authenticated;
GRANT ALL PRIVILEGES ON user_sync_logs TO authenticated;
GRANT ALL PRIVILEGES ON user_batch_operations TO authenticated;

-- ============================================================================
-- 7. 表注释
-- ============================================================================

COMMENT ON TABLE user_import_batches IS '用户批量导入记录表，追踪Excel导入操作';
COMMENT ON TABLE user_sync_logs IS '用户数据同步日志表，记录与外部系统的数据同步';
COMMENT ON TABLE user_batch_operations IS '用户批量操作记录表，追踪批量管理操作';

-- 字段注释
COMMENT ON COLUMN user_import_batches.batch_id IS '批次唯一标识符';
COMMENT ON COLUMN user_import_batches.file_name IS '导入文件名';
COMMENT ON COLUMN user_import_batches.total_records IS '文件中总记录数';
COMMENT ON COLUMN user_import_batches.success_records IS '成功导入记录数';
COMMENT ON COLUMN user_import_batches.failed_records IS '导入失败记录数';
COMMENT ON COLUMN user_import_batches.error_summary IS '错误汇总信息JSON';
COMMENT ON COLUMN user_import_batches.validation_errors IS '数据验证错误详情JSON数组';

COMMENT ON COLUMN user_sync_logs.sync_type IS '同步类型：user_data-用户数据，learning_progress-学习进度，exam_results-考试结果';
COMMENT ON COLUMN user_sync_logs.sync_direction IS '同步方向：upload-上传，download-下载，bidirectional-双向';
COMMENT ON COLUMN user_sync_logs.data_snapshot IS '同步时的数据快照';
COMMENT ON COLUMN user_sync_logs.target_system IS '目标系统标识';

COMMENT ON COLUMN user_batch_operations.operation_type IS '操作类型：activate-激活，deactivate-停用，delete-删除等';
COMMENT ON COLUMN user_batch_operations.target_criteria IS '目标用户筛选条件JSON';
COMMENT ON COLUMN user_batch_operations.results IS '操作结果详情JSON数组';