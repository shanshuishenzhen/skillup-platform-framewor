-- 修复users表的role字段约束，添加examiner和internal_supervisor角色
-- 删除现有的chk_users_role约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

-- 添加新的chk_users_role约束，包含所有需要的角色
ALTER TABLE users ADD CONSTRAINT chk_users_role 
  CHECK (role::text = ANY (ARRAY[
    'admin'::character varying, 
    'expert'::character varying, 
    'teacher'::character varying, 
    'student'::character varying, 
    'user'::character varying,
    'examiner'::character varying,
    'internal_supervisor'::character varying
  ]::text[]));

-- 更新role字段的注释
COMMENT ON COLUMN users.role IS '用户角色：admin-管理员，expert-专家，teacher-教师，student-学生，user-普通用户，examiner-考评员，internal_supervisor-内部督导员';