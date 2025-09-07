-- 检查chapters表中的数据
SELECT id, course_id, title FROM chapters LIMIT 10;

-- 检查所有不同的course_id值
SELECT DISTINCT course_id FROM chapters;

-- 检查courses表是否存在
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses';