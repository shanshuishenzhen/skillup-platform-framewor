-- 添加 exam_assignments 表的外键约束

-- 添加与 exams 表的外键关系
ALTER TABLE exam_assignments 
ADD CONSTRAINT exam_assignments_exam_id_fkey 
FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

-- 添加与 users 表的外键关系
ALTER TABLE exam_assignments 
ADD CONSTRAINT exam_assignments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 添加唯一约束，防止同一用户被分配同一考试多次
ALTER TABLE exam_assignments 
ADD CONSTRAINT exam_assignments_exam_user_unique 
UNIQUE (exam_id, user_id);

-- 为查询性能添加索引
CREATE INDEX IF NOT EXISTS idx_exam_assignments_user_id ON exam_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam_id ON exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_status ON exam_assignments(status);