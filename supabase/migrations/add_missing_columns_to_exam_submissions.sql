-- 添加缺失的列到exam_submissions表
ALTER TABLE public.exam_submissions 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- 添加注释
COMMENT ON COLUMN public.exam_submissions.attempt_number IS '考试尝试次数';
COMMENT ON COLUMN public.exam_submissions.end_time IS '考试结束时间';