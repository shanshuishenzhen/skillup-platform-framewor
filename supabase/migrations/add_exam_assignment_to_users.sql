-- 为用户表添加试卷分配字段
ALTER TABLE users ADD COLUMN assigned_exam_id uuid REFERENCES exams(id);
ALTER TABLE users ADD COLUMN exam_assignment_date timestamp with time zone;
ALTER TABLE users ADD COLUMN exam_assignment_status varchar(20) DEFAULT 'assigned' CHECK (exam_assignment_status IN ('assigned', 'started', 'completed', 'expired'));

-- 添加注释
COMMENT ON COLUMN users.assigned_exam_id IS '分配给用户的试卷ID';
COMMENT ON COLUMN users.exam_assignment_date IS '试卷分配日期';
COMMENT ON COLUMN users.exam_assignment_status IS '试卷分配状态：assigned-已分配，started-已开始，completed-已完成，expired-已过期';

-- 为查询性能添加索引
CREATE INDEX idx_users_assigned_exam_id ON users(assigned_exam_id);
CREATE INDEX idx_users_exam_assignment_status ON users(exam_assignment_status);

-- 授权给anon和authenticated角色
GRANT SELECT, UPDATE ON users TO anon;
GRANT SELECT, UPDATE ON users TO authenticated;