-- 修复users表的角色约束，添加examiner和internal_supervisor角色
-- 这将允许考评员和内部督导员角色的用户正常导入

-- 删除现有的角色约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 添加新的角色约束，包含examiner和internal_supervisor
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role::text = ANY (ARRAY[
    'admin'::character varying, 
    'expert'::character varying, 
    'teacher'::character varying, 
    'student'::character varying, 
    'user'::character varying,
    'examiner'::character varying,
    'internal_supervisor'::character varying
  ]::text[]));

-- 添加注释说明新增的角色
COMMENT ON COLUMN users.role IS '用户角色：admin-管理员，expert-专家，teacher-教师，student-学生，user-普通用户，examiner-考评员，internal_supervisor-内部督导员';