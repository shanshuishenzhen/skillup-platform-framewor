-- 创建操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL, -- 操作类型：batch_operation, single_operation等
  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 操作者ID
  operator_role VARCHAR(20), -- 操作者角色
  operation VARCHAR(50) NOT NULL, -- 具体操作：activate, deactivate, update_role等
  affected_user_count INTEGER DEFAULT 0, -- 影响的用户数量
  affected_user_ids UUID[], -- 影响的用户ID列表
  operation_description TEXT, -- 操作描述
  operation_data JSONB, -- 操作相关数据
  ip_address INET, -- 操作者IP地址
  user_agent TEXT, -- 用户代理信息
  success BOOLEAN DEFAULT true, -- 操作是否成功
  error_message TEXT, -- 错误信息（如果有）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_operation_logs_operator_id ON operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation ON operation_logs(operation);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_affected_user_ids ON operation_logs USING GIN(affected_user_ids);

-- 启用行级安全策略
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：只有管理员和专家可以查看操作日志
CREATE POLICY "管理员和专家可以查看操作日志" ON operation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'expert')
      AND users.status = 'active'
    )
  );

-- 创建RLS策略：只有管理员和专家可以插入操作日志
CREATE POLICY "管理员和专家可以插入操作日志" ON operation_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'expert')
      AND users.status = 'active'
    )
  );

-- 授权给anon和authenticated角色
GRANT SELECT, INSERT ON operation_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 创建触发器函数：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_operation_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_operation_logs_updated_at
  BEFORE UPDATE ON operation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_operation_logs_updated_at();

-- 添加表注释
COMMENT ON TABLE operation_logs IS '系统操作日志表，记录管理员的各种操作';
COMMENT ON COLUMN operation_logs.operation_type IS '操作类型，如batch_operation批量操作';
COMMENT ON COLUMN operation_logs.operator_id IS '执行操作的用户ID';
COMMENT ON COLUMN operation_logs.operator_role IS '执行操作的用户角色';
COMMENT ON COLUMN operation_logs.operation IS '具体的操作名称';
COMMENT ON COLUMN operation_logs.affected_user_count IS '本次操作影响的用户数量';
COMMENT ON COLUMN operation_logs.affected_user_ids IS '本次操作影响的用户ID数组';
COMMENT ON COLUMN operation_logs.operation_data IS '操作相关的数据，JSON格式';
COMMENT ON COLUMN operation_logs.success IS '操作是否执行成功';
COMMENT ON COLUMN operation_logs.error_message IS '操作失败时的错误信息';