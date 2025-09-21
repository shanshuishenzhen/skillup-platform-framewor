-- 为exam_participations表授予权限
GRANT ALL PRIVILEGES ON exam_participations TO authenticated;
GRANT SELECT, INSERT ON exam_participations TO anon;

-- 检查当前权限
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'exam_participations'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;