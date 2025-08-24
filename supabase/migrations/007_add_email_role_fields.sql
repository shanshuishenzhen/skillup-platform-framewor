-- 添加邮箱和角色字段迁移脚本
-- 创建时间: 2024-01-21
-- 描述: 为用户表添加邮箱和角色字段，支持用户导入功能的完整需求

-- ============================================================================
-- 1. 添加邮箱和角色字段
-- ============================================================================

-- 添加邮箱字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 添加角色字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- ============================================================================
-- 2. 添加约束和索引
-- ============================================================================

-- 添加邮箱格式检查约束（可选，因为邮箱可以为空）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_email_format') THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_email_format 
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- 添加角色值检查约束
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role') THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_role 
      CHECK (role IN ('admin', 'expert', 'teacher', 'student', 'user'));
  END IF;
END $$;

-- 添加邮箱唯一性约束（仅对非空值）
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_email ON users(email) WHERE email IS NOT NULL;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- 3. 数据迁移
-- ============================================================================

-- 为现有用户设置默认角色
UPDATE users SET role = 'user' WHERE role IS NULL;

-- ============================================================================
-- 4. 权限设置
-- ============================================================================

-- 确保 anon 和 authenticated 角色有适当的权限
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

-- ============================================================================
-- 5. 添加注释
-- ============================================================================

COMMENT ON COLUMN users.email IS '用户邮箱地址，可选字段，如果提供则必须唯一';
COMMENT ON COLUMN users.role IS '用户角色：admin-管理员，expert-专家，teacher-教师，student-学生，user-普通用户';