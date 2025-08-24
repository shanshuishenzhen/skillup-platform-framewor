-- 添加身份证号码字段迁移脚本
-- 创建时间: 2024-01-21
-- 描述: 为用户表添加身份证号码字段，支持用户导入模板的身份证号码必填要求

-- ============================================================================
-- 1. 添加身份证号码字段
-- ============================================================================

-- 添加身份证号码字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card VARCHAR(18);

-- ============================================================================
-- 2. 添加约束和索引
-- ============================================================================

-- 添加身份证号码格式检查约束
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_id_card_format') THEN
    ALTER TABLE users ADD CONSTRAINT chk_id_card_format 
      CHECK (id_card IS NULL OR id_card ~ '^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$');
  END IF;
END $$;

-- 添加唯一性约束（身份证号码应该是唯一的）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uk_users_id_card') THEN
    ALTER TABLE users ADD CONSTRAINT uk_users_id_card UNIQUE (id_card);
  END IF;
END $$;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_users_id_card ON users(id_card) WHERE id_card IS NOT NULL;

-- ============================================================================
-- 3. 添加注释
-- ============================================================================

COMMENT ON COLUMN users.id_card IS '身份证号码，15位或18位，用于用户身份验证';

-- ============================================================================
-- 4. 数据完整性检查
-- ============================================================================

-- 检查是否有重复的身份证号码（在添加唯一约束之前）
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT id_card, COUNT(*) as cnt
    FROM users 
    WHERE id_card IS NOT NULL AND id_card != ''
    GROUP BY id_card
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '警告: 发现 % 个重复的身份证号码，请检查数据完整性', duplicate_count;
  ELSE
    RAISE NOTICE '身份证号码数据检查通过，无重复记录';
  END IF;
END $$;

-- ============================================================================
-- 5. 权限设置
-- ============================================================================

-- 确保 anon 和 authenticated 角色可以访问新字段
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;