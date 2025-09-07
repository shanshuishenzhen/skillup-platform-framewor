-- 授予表权限
-- 为anon角色授予基本读取权限
GRANT SELECT ON learning_progress TO anon;
GRANT SELECT ON chapters TO anon;
GRANT SELECT ON videos TO anon;

-- 为authenticated角色授予完整权限
GRANT ALL PRIVILEGES ON learning_progress TO authenticated;
GRANT ALL PRIVILEGES ON chapters TO authenticated;
GRANT ALL PRIVILEGES ON videos TO authenticated;

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