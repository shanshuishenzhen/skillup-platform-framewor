-- 检查当前权限设置
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name IN ('exams', 'exam_participations', 'exam_attempts', 'exam_answers', 'questions') 
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 为anon角色授予基本读取权限
GRANT SELECT ON exams TO anon;
GRANT SELECT ON questions TO anon;
GRANT SELECT ON exam_participations TO anon;
GRANT SELECT ON exam_attempts TO anon;
GRANT SELECT ON exam_answers TO anon;

-- 为authenticated角色授予完整权限
GRANT ALL PRIVILEGES ON exams TO authenticated;
GRANT ALL PRIVILEGES ON questions TO authenticated;
GRANT ALL PRIVILEGES ON exam_participations TO authenticated;
GRANT ALL PRIVILEGES ON exam_attempts TO authenticated;
GRANT ALL PRIVILEGES ON exam_answers TO authenticated;

-- 再次检查权限设置
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name IN ('exams', 'exam_participations', 'exam_attempts', 'exam_answers', 'questions') 
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;