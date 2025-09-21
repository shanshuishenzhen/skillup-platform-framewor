-- 创建考试结果表
CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    percentage_score DECIMAL(5,2) DEFAULT 0.00,
    is_passed BOOLEAN DEFAULT false,
    time_spent_minutes INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}',
    feedback TEXT,
    grade VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON public.exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_attempt_id ON public.exam_results(attempt_id);

-- 创建RLS策略
-- 用户只能查看自己的考试结果
CREATE POLICY "Users can view own exam results" ON public.exam_results
    FOR SELECT USING (auth.uid() = user_id);

-- 系统可以创建考试结果
CREATE POLICY "System can create exam results" ON public.exam_results
    FOR INSERT WITH CHECK (true);

-- 系统可以更新考试结果
CREATE POLICY "System can update exam results" ON public.exam_results
    FOR UPDATE USING (true);

-- 管理员和教师可以查看所有考试结果
CREATE POLICY "Admins and teachers can view all exam results" ON public.exam_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'teacher')
        )
    );

-- 授予权限
GRANT SELECT, INSERT, UPDATE ON public.exam_results TO anon;
GRANT ALL PRIVILEGES ON public.exam_results TO authenticated;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_exam_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_results_updated_at_trigger
    BEFORE UPDATE ON public.exam_results
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_results_updated_at();