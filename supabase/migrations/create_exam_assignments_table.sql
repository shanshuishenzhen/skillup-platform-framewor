-- 创建考试分配表
CREATE TABLE IF NOT EXISTS exam_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID NOT NULL,
    user_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'expired')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam_id ON exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_user_id ON exam_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_status ON exam_assignments(status);

-- 启用RLS
ALTER TABLE exam_assignments ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "管理员可以查看所有考试分配" ON exam_assignments
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "管理员可以创建考试分配" ON exam_assignments
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "管理员可以更新考试分配" ON exam_assignments
    FOR UPDATE USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "用户可以查看自己的考试分配" ON exam_assignments
    FOR SELECT USING (user_id::text = auth.jwt() ->> 'sub');

CREATE POLICY "用户可以更新自己的考试分配状态" ON exam_assignments
    FOR UPDATE USING (user_id::text = auth.jwt() ->> 'sub')
    WITH CHECK (user_id::text = auth.jwt() ->> 'sub');

-- 授权给角色
GRANT SELECT, INSERT, UPDATE ON exam_assignments TO authenticated;
GRANT SELECT ON exam_assignments TO anon;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_exam_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_assignments_updated_at_trigger
    BEFORE UPDATE ON exam_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_assignments_updated_at();