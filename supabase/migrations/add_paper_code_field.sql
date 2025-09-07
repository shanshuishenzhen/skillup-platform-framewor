-- 为exam_papers表添加paper_code字段
-- 创建时间: 2024
-- 描述: 添加paper_code字段存储模板中的试卷ID，作为试卷的唯一标识符

-- 添加paper_code字段
ALTER TABLE exam_papers ADD COLUMN IF NOT EXISTS paper_code VARCHAR(100);
COMMENT ON COLUMN exam_papers.paper_code IS '试卷编码，来自模板中的试卷ID，用于人工识别';

-- 创建唯一索引确保paper_code不重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_papers_paper_code ON exam_papers(paper_code) WHERE paper_code IS NOT NULL;

-- 创建普通索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_exam_papers_paper_code_search ON exam_papers(paper_code);