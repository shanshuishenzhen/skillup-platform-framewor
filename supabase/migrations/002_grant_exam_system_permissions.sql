-- 为考试系统表授予权限
-- 创建时间: 2024
-- 描述: 为anon和authenticated角色授予考试系统表的访问权限

-- 为anon角色授予基本读取权限
GRANT SELECT ON exams TO anon;
GRANT SELECT ON questions TO anon;
GRANT SELECT ON exam_registrations TO anon;
GRANT SELECT ON exam_attempts TO anon;
GRANT SELECT ON user_answers TO anon;
GRANT SELECT ON exam_violations TO anon;
GRANT SELECT ON certificates TO anon;
GRANT SELECT ON certificate_templates TO anon;

-- 为authenticated角色授予完整权限
GRANT ALL PRIVILEGES ON exams TO authenticated;
GRANT ALL PRIVILEGES ON questions TO authenticated;
GRANT ALL PRIVILEGES ON exam_registrations TO authenticated;
GRANT ALL PRIVILEGES ON exam_attempts TO authenticated;
GRANT ALL PRIVILEGES ON user_answers TO authenticated;
GRANT ALL PRIVILEGES ON exam_violations TO authenticated;
GRANT ALL PRIVILEGES ON certificates TO authenticated;
GRANT ALL PRIVILEGES ON certificate_templates TO authenticated;

-- 为序列授予权限（如果有的话）
-- 注意：UUID主键使用gen_random_uuid()函数，不需要序列权限

COMMIT;