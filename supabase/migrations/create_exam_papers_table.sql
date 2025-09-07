-- 创建试卷表
-- 用于存储导入的试卷模板，与考试表分离

CREATE TABLE IF NOT EXISTS exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  question_ids JSONB DEFAULT '[]'::jsonb,
  questions_data JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_exam_papers_title ON exam_papers(title);
CREATE INDEX IF NOT EXISTS idx_exam_papers_category ON exam_papers(category);
CREATE INDEX IF NOT EXISTS idx_exam_papers_difficulty ON exam_papers(difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_papers_created_by ON exam_papers(created_by);
CREATE INDEX IF NOT EXISTS idx_exam_papers_created_at ON exam_papers(created_at);

-- 为考试表添加试卷关联字段
ALTER TABLE exams ADD COLUMN IF NOT EXISTS paper_id UUID REFERENCES exam_papers(id);
CREATE INDEX IF NOT EXISTS idx_exams_paper_id ON exams(paper_id);

-- 启用RLS
ALTER TABLE exam_papers ENABLE ROW LEVEL SECURITY;

-- 授权给anon和authenticated角色
GRANT SELECT, INSERT, UPDATE, DELETE ON exam_papers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON exam_papers TO authenticated;