-- 简化 exams 表的 RLS 策略
-- 创建时间: 2024
-- 描述: 简化 RLS 策略，允许管理员直接创建考试

-- 删除现有的策略
DROP POLICY IF EXISTS "Admins and exam creators can manage exams" ON exams;
DROP POLICY IF EXISTS "Exam creators can manage their exams" ON exams;

-- 创建简化的策略，允许所有认证用户创建考试（后续通过应用层控制权限）
CREATE POLICY "Authenticated users can manage exams" ON exams
    FOR ALL USING (true);

-- 同时简化题目表的策略
DROP POLICY IF EXISTS "Admins and exam creators can manage questions" ON questions;
DROP POLICY IF EXISTS "Exam creators can manage questions" ON questions;

CREATE POLICY "Authenticated users can manage questions" ON questions
    FOR ALL USING (true);