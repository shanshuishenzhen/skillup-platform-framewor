-- 修复缺失的数据库表和字段
-- 创建时间: 2024
-- 描述: 添加测试中发现缺失的表和字段

-- 1. 添加 exams 表缺失的 duration 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exams' AND column_name = 'duration'
    ) THEN
        ALTER TABLE exams ADD COLUMN duration INTEGER DEFAULT 60;
        COMMENT ON COLUMN exams.duration IS '考试时长（分钟）';
    END IF;
END $$;

-- 2. 创建 exam_answers 表（如果不存在）
CREATE TABLE IF NOT EXISTS exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL, -- 用户答案数据
    is_correct BOOLEAN DEFAULT false,
    score_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- 3. 创建 anti_cheat_logs 表（如果不存在）
CREATE TABLE IF NOT EXISTS anti_cheat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 为新表创建索引
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON exam_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_attempt ON anti_cheat_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_user ON anti_cheat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_type ON anti_cheat_logs(violation_type);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_detected ON anti_cheat_logs(detected_at);

-- 5. 启用行级安全策略
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_cheat_logs ENABLE ROW LEVEL SECURITY;

-- 6. 创建 exam_answers 表的 RLS 策略
CREATE POLICY "Users can manage their own exam answers" ON exam_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM exam_attempts 
            WHERE exam_attempts.id = exam_answers.attempt_id 
            AND exam_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Exam creators can view exam answers" ON exam_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exam_attempts 
            JOIN exams ON exams.id = exam_attempts.exam_id
            WHERE exam_attempts.id = exam_answers.attempt_id 
            AND exams.created_by = auth.uid()
        )
    );

-- 7. 创建 anti_cheat_logs 表的 RLS 策略
CREATE POLICY "Users can view their own anti-cheat logs" ON anti_cheat_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert anti-cheat logs" ON anti_cheat_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Exam creators can view anti-cheat logs" ON anti_cheat_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exam_attempts 
            JOIN exams ON exams.id = exam_attempts.exam_id
            WHERE exam_attempts.id = anti_cheat_logs.attempt_id 
            AND exams.created_by = auth.uid()
        )
    );

-- 8. 为新表创建更新时间戳触发器
CREATE TRIGGER update_exam_answers_updated_at BEFORE UPDATE ON exam_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. 添加一些有用的函数

-- 获取考试统计信息的函数
CREATE OR REPLACE FUNCTION get_exam_statistics(exam_uuid UUID)
RETURNS TABLE (
    total_attempts INTEGER,
    completed_attempts INTEGER,
    average_score DECIMAL(5,2),
    pass_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_attempts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_attempts,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN percentage_score END), 0)::DECIMAL(5,2) as average_score,
        COALESCE(
            (COUNT(CASE WHEN status = 'completed' AND is_passed = true THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0) * 100), 0
        )::DECIMAL(5,2) as pass_rate
    FROM exam_attempts 
    WHERE exam_id = exam_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否可以参加考试的函数
CREATE OR REPLACE FUNCTION can_user_take_exam(exam_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    exam_record RECORD;
    attempt_count INTEGER;
    registration_status TEXT;
BEGIN
    -- 获取考试信息
    SELECT * INTO exam_record FROM exams WHERE id = exam_uuid;
    
    -- 检查考试是否存在且已发布
    IF exam_record IS NULL OR exam_record.status NOT IN ('published', 'active') THEN
        RETURN FALSE;
    END IF;
    
    -- 检查考试时间
    IF exam_record.start_time IS NOT NULL AND NOW() < exam_record.start_time THEN
        RETURN FALSE;
    END IF;
    
    IF exam_record.end_time IS NOT NULL AND NOW() > exam_record.end_time THEN
        RETURN FALSE;
    END IF;
    
    -- 检查是否需要报名审批
    IF exam_record.require_approval THEN
        SELECT status INTO registration_status 
        FROM exam_registrations 
        WHERE exam_id = exam_uuid AND user_id = user_uuid;
        
        IF registration_status IS NULL OR registration_status != 'approved' THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- 检查尝试次数限制
    SELECT COUNT(*) INTO attempt_count 
    FROM exam_attempts 
    WHERE exam_id = exam_uuid AND user_id = user_uuid AND status = 'completed';
    
    IF attempt_count >= exam_record.max_attempts THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 插入一些测试数据（可选）
INSERT INTO exams (title, description, category, difficulty, status, duration, total_questions, passing_score, max_attempts)
VALUES 
    ('JavaScript 基础测试', 'JavaScript 编程语言基础知识测试', 'programming', 'beginner', 'published', 30, 10, 60, 3),
    ('Python 进阶测试', 'Python 编程语言进阶知识测试', 'programming', 'intermediate', 'published', 45, 15, 70, 2)
ON CONFLICT DO NOTHING;

-- 为测试考试添加一些题目
DO $$
DECLARE
    js_exam_id UUID;
    python_exam_id UUID;
BEGIN
    -- 获取考试ID
    SELECT id INTO js_exam_id FROM exams WHERE title = 'JavaScript 基础测试' LIMIT 1;
    SELECT id INTO python_exam_id FROM exams WHERE title = 'Python 进阶测试' LIMIT 1;
    
    -- 为 JavaScript 考试添加题目
    IF js_exam_id IS NOT NULL THEN
        INSERT INTO questions (exam_id, question_text, question_type, options, correct_answers, explanation, score, order_index)
        VALUES 
            (js_exam_id, '以下哪个是JavaScript的数据类型？', 'multiple_choice', 
             '["string", "number", "boolean", "以上都是"]', '["以上都是"]', 
             'JavaScript有多种基本数据类型包括string、number、boolean等', 10, 1),
            (js_exam_id, 'JavaScript是一种编译型语言。', 'true_false', 
             '["true", "false"]', '["false"]', 
             'JavaScript是一种解释型语言，不是编译型语言', 10, 2)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- 为 Python 考试添加题目
    IF python_exam_id IS NOT NULL THEN
        INSERT INTO questions (exam_id, question_text, question_type, options, correct_answers, explanation, score, order_index)
        VALUES 
            (python_exam_id, 'Python中哪个关键字用于定义函数？', 'single_choice', 
             '["function", "def", "func", "define"]', '["def"]', 
             'Python使用def关键字来定义函数', 10, 1),
            (python_exam_id, '请解释Python中的列表推导式。', 'short_answer', 
             '[]', '[]', 
             '列表推导式是Python中创建列表的简洁方式', 15, 2)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

COMMIT;