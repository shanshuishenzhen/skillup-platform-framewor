-- 修复exam_registrations表的行级安全策略
-- 确保用户可以插入和查询自己的报名记录

-- 首先检查现有策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'exam_registrations';

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own registrations" ON exam_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON exam_registrations;
DROP POLICY IF EXISTS "Users can update own registrations" ON exam_registrations;
DROP POLICY IF EXISTS "Admins can manage all registrations" ON exam_registrations;

-- 创建新的RLS策略
-- 用户可以查看自己的报名记录
CREATE POLICY "Users can view own registrations" ON exam_registrations
    FOR SELECT USING (auth.uid() = user_id);

-- 用户可以插入自己的报名记录
CREATE POLICY "Users can insert own registrations" ON exam_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的报名记录
CREATE POLICY "Users can update own registrations" ON exam_registrations
    FOR UPDATE USING (auth.uid() = user_id);

-- 管理员可以管理所有报名记录
CREATE POLICY "Admins can manage all registrations" ON exam_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'ADMIN'
        )
    );

-- 授予必要的权限
GRANT SELECT, INSERT, UPDATE ON exam_registrations TO authenticated;
GRANT SELECT ON exam_registrations TO anon;

-- 验证策略创建结果
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'exam_registrations'
ORDER BY policyname;