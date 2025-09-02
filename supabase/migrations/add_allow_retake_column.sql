-- 添加 allowRetake 列到 exams 表
ALTER TABLE exams ADD COLUMN allow_retake BOOLEAN DEFAULT true;

-- 添加注释
COMMENT ON COLUMN exams.allow_retake IS '是否允许重考';