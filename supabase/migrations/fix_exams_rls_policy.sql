-- 修复 exams 表的 RLS 策略以支持管理员用户
-- 创建时间: 2024
-- 描述: 更新 exams 表的 RLS 策略，允许管理员创建和管理考试

-- 删除现有的考试创建者策略
DROP POLICY IF EXISTS "Exam creators can manage their exams" ON exams;

-- 创建新的策略，允许管理员和考试创建者管理考试
CREATE POLICY "Admins and exam creators can manage exams" ON exams
    FOR ALL USING (
        -- 允许考试创建者管理自己的考试
        auth.uid() = created_by 
        OR 
        -- 允许管理员管理所有考试
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin', 'teacher')
        )
    );

-- 同时更新题目表的策略
DROP POLICY IF EXISTS "Exam creators can manage questions" ON questions;

CREATE POLICY "Admins and exam creators can manage questions" ON questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = questions.exam_id 
            AND (
                exams.created_by = auth.uid()
                OR 
                EXISTS (
                    SELECT 1 FROM admin_users 
                    WHERE admin_users.id = auth.uid() 
                    AND admin_users.role IN ('super_admin', 'admin', 'teacher')
                )
            )
        )
    );