-- 添加 exams 表的缺失字段
-- 创建时间: 2024
-- 描述: 为 exams 表添加 question_ids, tags, settings 等缺失字段

-- 添加 question_ids 字段（存储题目ID数组）
ALTER TABLE exams ADD COLUMN IF NOT EXISTS question_ids TEXT[] DEFAULT '{}';
COMMENT ON COLUMN exams.question_ids IS '考试包含的题目ID数组';

-- 添加 tags 字段（存储标签数组）
ALTER TABLE exams ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
COMMENT ON COLUMN exams.tags IS '考试标签数组';

-- 添加 settings 字段（存储考试设置JSON）
ALTER TABLE exams ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
COMMENT ON COLUMN exams.settings IS '考试设置JSON对象';