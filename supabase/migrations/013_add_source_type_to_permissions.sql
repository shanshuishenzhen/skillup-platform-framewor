-- 添加source_type字段到department_permissions表
ALTER TABLE department_permissions 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'direct';

-- 更新现有数据的source_type
UPDATE department_permissions 
SET source_type = 'direct' 
WHERE source_type IS NULL;

-- 创建source_type的索引
CREATE INDEX IF NOT EXISTS idx_department_permissions_source_type ON department_permissions(source_type);
CREATE INDEX IF NOT EXISTS idx_user_permissions_source_type ON user_permissions(source_type);