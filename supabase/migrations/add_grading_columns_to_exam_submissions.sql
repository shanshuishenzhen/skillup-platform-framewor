-- 添加exam_submissions表缺失的评分相关列

-- 添加max_score列（最大分数）
ALTER TABLE exam_submissions 
ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 0;

-- 添加passed列（是否通过）
ALTER TABLE exam_submissions 
ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT false;

-- 添加grading_details列（评分详情）
ALTER TABLE exam_submissions 
ADD COLUMN IF NOT EXISTS grading_details JSONB DEFAULT '{}'::jsonb;

-- 添加列注释
COMMENT ON COLUMN exam_submissions.max_score IS '考试最大分数';
COMMENT ON COLUMN exam_submissions.passed IS '是否通过考试';
COMMENT ON COLUMN exam_submissions.grading_details IS '评分详细信息';

-- 更新现有记录的默认值
UPDATE exam_submissions 
SET 
  max_score = COALESCE(max_score, 0),
  passed = COALESCE(passed, false),
  grading_details = COALESCE(grading_details, '{}'::jsonb)
WHERE max_score IS NULL OR passed IS NULL OR grading_details IS NULL;