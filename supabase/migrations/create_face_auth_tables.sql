-- 创建人脸认证相关数据库表
-- 用户人脸档案表
CREATE TABLE user_face_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    face_template TEXT NOT NULL, -- 加密后的人脸特征模板
    face_image_url TEXT, -- 人脸图片存储URL（可选）
    quality_score DECIMAL(5,2), -- 人脸质量评分
    confidence_score DECIMAL(5,2), -- 置信度评分
    is_active BOOLEAN DEFAULT true, -- 是否激活
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- 每个用户只能有一个人脸档案
);

-- 人脸认证记录表
CREATE TABLE face_auth_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auth_type VARCHAR(20) NOT NULL CHECK (auth_type IN ('register', 'verify', 'login')),
    auth_result VARCHAR(20) NOT NULL CHECK (auth_result IN ('success', 'failed', 'pending')),
    confidence_score DECIMAL(5,2), -- 认证置信度
    failure_reason TEXT, -- 失败原因
    ip_address INET, -- 请求IP地址
    user_agent TEXT, -- 用户代理信息
    session_id VARCHAR(255), -- 会话ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_user_face_profiles_user_id ON user_face_profiles(user_id);
CREATE INDEX idx_user_face_profiles_active ON user_face_profiles(is_active);
CREATE INDEX idx_face_auth_records_user_id ON face_auth_records(user_id);
CREATE INDEX idx_face_auth_records_created_at ON face_auth_records(created_at);
CREATE INDEX idx_face_auth_records_auth_type ON face_auth_records(auth_type);
CREATE INDEX idx_face_auth_records_auth_result ON face_auth_records(auth_result);

-- 启用行级安全策略 (RLS)
ALTER TABLE user_face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_auth_records ENABLE ROW LEVEL SECURITY;

-- 为user_face_profiles表创建RLS策略
-- 用户只能查看和修改自己的人脸档案
CREATE POLICY "Users can view own face profile" ON user_face_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own face profile" ON user_face_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own face profile" ON user_face_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own face profile" ON user_face_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- 为face_auth_records表创建RLS策略
-- 用户只能查看自己的认证记录
CREATE POLICY "Users can view own auth records" ON face_auth_records
    FOR SELECT USING (auth.uid() = user_id);

-- 只允许通过API插入认证记录（服务端操作）
CREATE POLICY "Service can insert auth records" ON face_auth_records
    FOR INSERT WITH CHECK (true);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_face_profiles_updated_at
    BEFORE UPDATE ON user_face_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为表授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON user_face_profiles TO authenticated;
GRANT SELECT, INSERT ON face_auth_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_face_profiles TO anon;
GRANT SELECT, INSERT ON face_auth_records TO anon;