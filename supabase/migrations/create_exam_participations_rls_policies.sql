-- 为exam_participations表创建临时宽松的RLS策略用于测试

-- 删除现有策略
DROP POLICY IF EXISTS "Users can view own participations" ON exam_participations;
DROP POLICY IF EXISTS "Users can insert own participations" ON exam_participations;
DROP POLICY IF EXISTS "Users can update own participations" ON exam_participations;
DROP POLICY IF EXISTS "Allow anonymous read" ON exam_participations;
DROP POLICY IF EXISTS "Allow all operations for testing" ON exam_participations;

-- 创建临时的宽松策略用于测试
CREATE POLICY "Allow all operations for testing" ON exam_participations
    FOR ALL USING (true) WITH CHECK (true);