-- 检查和修复表权限问题
-- 为learning_progress, chapters, videos表授予必要的权限

-- 为anon角色授予基本读取权限
GRANT SELECT ON learning_progress TO anon;
GRANT SELECT ON chapters TO anon;
GRANT SELECT ON videos TO anon;

-- 为authenticated角色授予完整权限
GRANT ALL PRIVILEGES ON learning_progress TO authenticated;
GRANT ALL PRIVILEGES ON chapters TO authenticated;
GRANT ALL PRIVILEGES ON videos TO authenticated;

-- 创建learning_progress表的RLS策略
-- 允许用户查看自己的学习进度
CREATE POLICY "Users can view own learning progress" ON learning_progress
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- 允许用户插入自己的学习进度
CREATE POLICY "Users can insert own learning progress" ON learning_progress
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 允许用户更新自己的学习进度
CREATE POLICY "Users can update own learning progress" ON learning_progress
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 允许用户删除自己的学习进度
CREATE POLICY "Users can delete own learning progress" ON learning_progress
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 为chapters表创建RLS策略（允许所有人查看）
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chapters" ON chapters
    FOR SELECT USING (true);

-- 为videos表创建RLS策略（允许所有人查看）
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view videos" ON videos
    FOR SELECT USING (true);

-- 检查当前权限状态
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated') 
    AND table_name IN ('learning_progress', 'chapters', 'videos')
ORDER BY table_name, grantee;