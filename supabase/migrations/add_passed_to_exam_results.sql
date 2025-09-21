-- 添加exam_results表缺失的passed列

-- 添加passed列（是否通过）
ALTER TABLE exam_results 
ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT false;

-- 添加列注释
COMMENT ON COLUMN exam_results.passed IS '是否通过考试';

-- 更新现有记录的默认值
UPDATE exam_results 
SET passed = COALESCE(passed, false)
WHERE passed IS NULL;