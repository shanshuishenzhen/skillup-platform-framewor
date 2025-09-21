-- 创建考试提交表
CREATE TABLE IF NOT EXISTS exam_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '{}',
    score INTEGER DEFAULT 0,
    percentage_score DECIMAL(5,2) DEFAULT 0.00,
    is_passed BOOLEAN DEFAULT false,
    time_spent_minutes INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'expired')),
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_exam_submissions_exam_id ON exam_submissions(exam_id);
CREATE INDEX idx_exam_submissions_user_id ON exam_submissions(user_id);
CREATE INDEX idx_exam_submissions_status ON exam_submissions(status);

-- 启用行级安全策略
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Users can view their own exam submissions" ON exam_submissions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own exam submissions" ON exam_submissions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own exam submissions" ON exam_submissions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 授予权限
GRANT SELECT, INSERT, UPDATE ON exam_submissions TO anon;
GRANT ALL PRIVILEGES ON exam_submissions TO authenticated;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_exam_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_submissions_updated_at
    BEFORE UPDATE ON exam_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_submissions_updated_at();