-- 为exam_results表添加缺失的字段
ALTER TABLE public.exam_results 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';

-- 添加状态检查约束
ALTER TABLE public.exam_results 
ADD CONSTRAINT exam_results_status_check 
CHECK (status IN ('in_progress', 'completed', 'abandoned', 'expired'));

-- 更新现有记录的completed_at字段
UPDATE public.exam_results 
SET completed_at = created_at 
WHERE completed_at IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_exam_results_status ON public.exam_results(status);
CREATE INDEX IF NOT EXISTS idx_exam_results_completed_at ON public.exam_results(completed_at);