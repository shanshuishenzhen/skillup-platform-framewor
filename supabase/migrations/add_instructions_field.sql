-- 添加 exams 表的 instructions 字段
-- 创建时间: 2024
-- 描述: 为 exams 表添加缺失的 instructions 字段

-- 添加 instructions 字段（如果不存在）
ALTER TABLE exams ADD COLUMN IF NOT EXISTS instructions TEXT;
COMMENT ON COLUMN exams.instructions IS '考试说明和注意事项';