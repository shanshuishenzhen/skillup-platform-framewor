-- 添加exam_results表缺失的max_score列

-- 添加max_score列（最大分数）
ALTER TABLE exam_results 
ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 0;

-- 添加列注释
COMMENT ON COLUMN exam_results.max_score IS '考试最大分数';

-- 更新现有记录的默认值
UPDATE exam_results 
SET max_score = COALESCE(max_score, 0)
WHERE max_score IS NULL;