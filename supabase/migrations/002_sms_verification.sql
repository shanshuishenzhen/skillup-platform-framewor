-- 创建短信验证码表
CREATE TABLE sms_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'login', 'reset_password')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_sms_verification_codes_phone ON sms_verification_codes(phone);
CREATE INDEX idx_sms_verification_codes_phone_purpose ON sms_verification_codes(phone, purpose);
CREATE INDEX idx_sms_verification_codes_expires_at ON sms_verification_codes(expires_at);
CREATE INDEX idx_sms_verification_codes_created_at ON sms_verification_codes(created_at DESC);

-- 创建复合索引用于验证码查询
CREATE INDEX idx_sms_verification_codes_lookup ON sms_verification_codes(phone, code, purpose, verified, expires_at);

-- 设置权限
GRANT ALL PRIVILEGES ON sms_verification_codes TO authenticated;

-- 创建自动更新 updated_at 字段的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sms_verification_codes_updated_at
    BEFORE UPDATE ON sms_verification_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建清理过期验证码的函数
CREATE OR REPLACE FUNCTION cleanup_expired_sms_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sms_verification_codes 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建定期清理任务（可选，需要 pg_cron 扩展）
-- SELECT cron.schedule('cleanup-expired-sms-codes', '0 */6 * * *', 'SELECT cleanup_expired_sms_codes();');

-- 添加注释
COMMENT ON TABLE sms_verification_codes IS '短信验证码表，用于存储用户注册、登录等场景的验证码';
COMMENT ON COLUMN sms_verification_codes.phone IS '接收验证码的手机号码';
COMMENT ON COLUMN sms_verification_codes.code IS '6位数字验证码';
COMMENT ON COLUMN sms_verification_codes.purpose IS '验证码用途：register(注册)、login(登录)、reset_password(重置密码)';
COMMENT ON COLUMN sms_verification_codes.expires_at IS '验证码过期时间';
COMMENT ON COLUMN sms_verification_codes.verified IS '是否已验证';
COMMENT ON FUNCTION cleanup_expired_sms_codes() IS '清理过期的短信验证码记录';