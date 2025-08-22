-- 为用户表添加人脸验证字段
-- 用于标识用户是否已完成人脸识别验证

-- 添加face_verified字段
ALTER TABLE users 
ADD COLUMN face_verified BOOLEAN DEFAULT false;

-- 添加字段注释
COMMENT ON COLUMN users.face_verified IS '用户是否已完成人脸识别验证';

-- 创建索引以提高查询性能
CREATE INDEX idx_users_face_verified ON users(face_verified);

-- 创建复合索引，用于查询付费用户的人脸验证状态
CREATE INDEX idx_users_premium_face_verified ON users(user_type, face_verified) 
WHERE user_type = 'premium';

-- 更新现有付费用户的人脸验证状态（可选，根据业务需求决定）
-- 如果希望现有付费用户需要重新进行人脸验证，保持默认值false
-- 如果希望现有付费用户暂时跳过人脸验证，可以设置为true
-- UPDATE users SET face_verified = true WHERE user_type = 'premium';

-- 添加触发器，当用户升级为付费用户时，自动设置face_verified为false
CREATE OR REPLACE FUNCTION reset_face_verification_on_premium_upgrade()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果用户类型从非premium变为premium，重置人脸验证状态
    IF OLD.user_type != 'premium' AND NEW.user_type = 'premium' THEN
        NEW.face_verified = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_reset_face_verification
    BEFORE UPDATE OF user_type ON users
    FOR EACH ROW
    EXECUTE FUNCTION reset_face_verification_on_premium_upgrade();

-- 添加约束：确保face_verified字段不为null
ALTER TABLE users 
ALTER COLUMN face_verified SET NOT NULL;