-- 在线考试系统核心数据表创建脚本
-- 创建时间: 2024
-- 描述: 创建考试系统所需的核心数据表

-- 1. 考试表 (exams)
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'completed', 'cancelled')),
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_questions INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 100,
    passing_score INTEGER DEFAULT 60,
    max_attempts INTEGER DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    show_results_immediately BOOLEAN DEFAULT true,
    allow_review BOOLEAN DEFAULT true,
    require_approval BOOLEAN DEFAULT false,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 题目表 (questions)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'single_choice', 'true_false', 'short_answer', 'essay', 'file_upload')),
    options JSONB, -- 选择题选项
    correct_answers JSONB, -- 正确答案
    explanation TEXT, -- 答案解释
    score INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 考试报名表 (exam_registrations)
CREATE TABLE IF NOT EXISTS exam_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    UNIQUE(exam_id, user_id)
);

-- 4. 考试记录表 (exam_attempts)
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    percentage_score DECIMAL(5,2) DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    answers JSONB, -- 用户答案
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 用户答案表 (user_answers)
CREATE TABLE IF NOT EXISTS user_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer_data JSONB, -- 用户答案数据
    is_correct BOOLEAN,
    score_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- 6. 考试违规记录表 (exam_violations)
CREATE TABLE IF NOT EXISTS exam_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- 7. 证书表 (certificates)
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    certificate_data JSONB, -- 证书详细信息
    file_url TEXT, -- 证书文件URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 证书模板表 (certificate_templates)
CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL, -- 模板配置
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exam_registrations_user ON exam_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_registrations_exam ON exam_registrations(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_user_answers_attempt ON user_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_exam ON certificates(exam_id);

-- 启用行级安全策略 (RLS)
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 考试表策略
CREATE POLICY "Users can view published exams" ON exams
    FOR SELECT USING (status IN ('published', 'active'));

CREATE POLICY "Exam creators can manage their exams" ON exams
    FOR ALL USING (auth.uid() = created_by);

-- 题目表策略
CREATE POLICY "Users can view questions of accessible exams" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = questions.exam_id 
            AND (exams.status IN ('published', 'active') OR exams.created_by = auth.uid())
        )
    );

CREATE POLICY "Exam creators can manage questions" ON questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = questions.exam_id 
            AND exams.created_by = auth.uid()
        )
    );

-- 考试报名策略
CREATE POLICY "Users can view their own registrations" ON exam_registrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can register for exams" ON exam_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Exam creators can manage registrations" ON exam_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_registrations.exam_id 
            AND exams.created_by = auth.uid()
        )
    );

-- 考试记录策略
CREATE POLICY "Users can view their own attempts" ON exam_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" ON exam_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON exam_attempts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Exam creators can view all attempts" ON exam_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_attempts.exam_id 
            AND exams.created_by = auth.uid()
        )
    );

-- 用户答案策略
CREATE POLICY "Users can manage their own answers" ON user_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM exam_attempts 
            WHERE exam_attempts.id = user_answers.attempt_id 
            AND exam_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Exam creators can view answers" ON user_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exam_attempts 
            JOIN exams ON exams.id = exam_attempts.exam_id
            WHERE exam_attempts.id = user_answers.attempt_id 
            AND exams.created_by = auth.uid()
        )
    );

-- 证书策略
CREATE POLICY "Users can view their own certificates" ON certificates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Exam creators can manage certificates" ON certificates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = certificates.exam_id 
            AND exams.created_by = auth.uid()
        )
    );

-- 证书模板策略
CREATE POLICY "Users can view certificate templates" ON certificate_templates
    FOR SELECT USING (true);

CREATE POLICY "Template creators can manage their templates" ON certificate_templates
    FOR ALL USING (auth.uid() = created_by);

-- 创建触发器函数用于更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间戳触发器
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_attempts_updated_at BEFORE UPDATE ON exam_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificate_templates_updated_at BEFORE UPDATE ON certificate_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建函数用于生成证书编号
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
    cert_number TEXT;
BEGIN
    cert_number := 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                   LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' ||
                   LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN cert_number;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器自动生成证书编号
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
        NEW.certificate_number := generate_certificate_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_certificate_number_trigger
    BEFORE INSERT ON certificates
    FOR EACH ROW EXECUTE FUNCTION set_certificate_number();

-- 插入默认证书模板
INSERT INTO certificate_templates (name, description, template_data, is_default) VALUES
('默认证书模板', '系统默认的证书模板', '{
  "layout": "standard",
  "title": "技能认证证书",
  "subtitle": "Certificate of Achievement",
  "fields": [
    {"type": "text", "label": "姓名", "field": "user_name", "required": true},
    {"type": "text", "label": "考试名称", "field": "exam_title", "required": true},
    {"type": "text", "label": "成绩", "field": "score", "required": true},
    {"type": "date", "label": "颁发日期", "field": "issued_date", "required": true}
  ],
  "style": {
    "background": "#ffffff",
    "border": "#cccccc",
    "font_family": "Arial, sans-serif",
    "font_size": "14px"
  }
}', true);

COMMIT;