-- 检查考试相关表的权限设置
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated') 
    AND table_name IN ('exams', 'questions', 'exam_attempts', 'exam_registrations') 
ORDER BY table_name, grantee;

-- 为考试相关表设置权限
-- 为anon角色授予基本读取权限
GRANT SELECT ON exams TO anon;
GRANT SELECT ON questions TO anon;

-- 为authenticated角色授予完整权限
GRANT ALL PRIVILEGES ON exams TO authenticated;
GRANT ALL PRIVILEGES ON questions TO authenticated;
GRANT ALL PRIVILEGES ON exam_attempts TO authenticated;
GRANT ALL PRIVILEGES ON exam_registrations TO authenticated;

-- 删除可能存在的旧策略（如果存在）
DROP POLICY IF EXISTS "Public exams are viewable by everyone" ON exams;
DROP POLICY IF EXISTS "Users can view own exams" ON exams;
DROP POLICY IF EXISTS "Users can update own exams" ON exams;
DROP POLICY IF EXISTS "Authenticated users can insert exams" ON exams;
DROP POLICY IF EXISTS "Public questions are viewable" ON questions;
DROP POLICY IF EXISTS "Users can manage own exam attempts" ON exam_attempts;
DROP POLICY IF EXISTS "Users can manage own registrations" ON exam_registrations;

-- 创建基本的RLS策略
-- 考试表：所有人可以查看已发布的考试
CREATE POLICY "Public exams are viewable by everyone" ON exams
    FOR SELECT USING (status = 'published' OR status = 'active');

-- 考试表：认证用户可以查看自己创建的考试
CREATE POLICY "Users can view own exams" ON exams
    FOR SELECT USING (auth.uid() = created_by);

-- 考试表：认证用户可以修改自己创建的考试
CREATE POLICY "Users can update own exams" ON exams
    FOR UPDATE USING (auth.uid() = created_by);

-- 考试表：认证用户可以创建考试
CREATE POLICY "Authenticated users can insert exams" ON exams
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 题目表：所有人可以查看已发布考试的题目
CREATE POLICY "Public questions are viewable" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = questions.exam_id 
            AND (exams.status = 'published' OR exams.status = 'active')
        )
    );

-- 考试尝试表：用户只能查看和修改自己的考试尝试
CREATE POLICY "Users can manage own exam attempts" ON exam_attempts
    FOR ALL USING (auth.uid() = user_id);

-- 考试报名表：用户只能查看和修改自己的报名记录
CREATE POLICY "Users can manage own registrations" ON exam_registrations
    FOR ALL USING (auth.uid() = user_id);

-- 验证权限设置
SELECT 
    'Permissions check completed' as status,
    COUNT(*) as total_permissions
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated') 
    AND table_name IN ('exams', 'questions', 'exam_attempts', 'exam_registrations');

-- 显示当前RLS策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('exams', 'questions', 'exam_attempts', 'exam_registrations')
ORDER BY tablename, policyname;