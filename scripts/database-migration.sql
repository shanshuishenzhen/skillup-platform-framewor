-- SkillUp Platform 数据库迁移脚本
-- 创建新功能所需的数据库表结构
-- 版本: 1.0.0
-- 创建时间: 2025-08-22

-- ===========================================
-- 监控相关表
-- ===========================================

-- 监控事件表
CREATE TABLE IF NOT EXISTS monitoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warning', 'info')),
    message TEXT NOT NULL,
    service VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    version VARCHAR(50),
    error_type VARCHAR(100),
    error_code VARCHAR(50),
    stack_trace TEXT,
    context JSONB,
    tags JSONB,
    extra JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 监控事件索引
CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp ON monitoring_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_level ON monitoring_events(level);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_service ON monitoring_events(service);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_error_type ON monitoring_events(error_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_context ON monitoring_events USING GIN(context);

-- 监控统计表
CREATE TABLE IF NOT EXISTS monitoring_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    service VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    total_requests INTEGER DEFAULT 0,
    error_requests INTEGER DEFAULT 0,
    avg_response_time DECIMAL(10,2) DEFAULT 0,
    p95_response_time DECIMAL(10,2) DEFAULT 0,
    p99_response_time DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, hour, service, environment)
);

-- 监控统计索引
CREATE INDEX IF NOT EXISTS idx_monitoring_stats_date ON monitoring_stats(date);
CREATE INDEX IF NOT EXISTS idx_monitoring_stats_service ON monitoring_stats(service);

-- ===========================================
-- 人脸识别相关表
-- ===========================================

-- 人脸模板表
CREATE TABLE IF NOT EXISTS face_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_data TEXT NOT NULL, -- 加密的人脸特征模板
    template_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    quality_score DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    landmark_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB
);

-- 人脸模板索引
CREATE INDEX IF NOT EXISTS idx_face_templates_user_id ON face_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_face_templates_active ON face_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_face_templates_created_at ON face_templates(created_at);

-- 人脸验证记录表
CREATE TABLE IF NOT EXISTS face_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_id UUID,
    verification_result BOOLEAN NOT NULL,
    confidence_score DECIMAL(5,2),
    similarity_score DECIMAL(5,2),
    verification_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 人脸验证记录索引
CREATE INDEX IF NOT EXISTS idx_face_verification_user_id ON face_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_face_verification_time ON face_verification_logs(verification_time);
CREATE INDEX IF NOT EXISTS idx_face_verification_result ON face_verification_logs(verification_result);

-- ===========================================
-- 短信验证相关表
-- ===========================================

-- 短信验证码表
CREATE TABLE IF NOT EXISTS sms_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- register, login, reset_password, etc.
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT
);

-- 短信验证码索引
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone ON sms_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_code ON sms_verifications(code);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_purpose ON sms_verifications(purpose);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_expires_at ON sms_verifications(expires_at);

-- ===========================================
-- 学习进度增强表
-- ===========================================

-- 学习进度详细记录表
CREATE TABLE IF NOT EXISTS learning_progress_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    time_spent INTEGER DEFAULT 0, -- 学习时间（秒）
    last_position INTEGER DEFAULT 0, -- 视频播放位置（秒）
    completion_status VARCHAR(20) DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'paused')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    device_type VARCHAR(50),
    ip_address INET,
    notes TEXT,
    bookmarks JSONB, -- 书签位置
    quiz_scores JSONB, -- 测验分数
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id, lesson_id)
);

-- 学习进度详细记录索引
CREATE INDEX IF NOT EXISTS idx_learning_progress_details_user_id ON learning_progress_details(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_details_course_id ON learning_progress_details(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_details_lesson_id ON learning_progress_details(lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_details_status ON learning_progress_details(completion_status);
CREATE INDEX IF NOT EXISTS idx_learning_progress_details_last_accessed ON learning_progress_details(last_accessed_at);

-- 学习会话记录表
CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    lesson_id UUID,
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    duration INTEGER, -- 会话时长（秒）
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address INET,
    location JSONB, -- 地理位置信息
    activities JSONB, -- 学习活动记录
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 学习会话记录索引
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_course_id ON learning_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_start ON learning_sessions(session_start);

-- ===========================================
-- 系统配置表
-- ===========================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    category VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 系统配置索引
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_system_configs_category ON system_configs(category);
CREATE INDEX IF NOT EXISTS idx_system_configs_public ON system_configs(is_public);

-- ===========================================
-- 审计日志表
-- ===========================================

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'error')),
    error_message TEXT,
    metadata JSONB
);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- ===========================================
-- 性能监控表
-- ===========================================

-- API 性能监控表
CREATE TABLE IF NOT EXISTS api_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- 响应时间（毫秒）
    request_size INTEGER,
    response_size INTEGER,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_id VARCHAR(255),
    error_message TEXT,
    metadata JSONB
);

-- API 性能监控索引
CREATE INDEX IF NOT EXISTS idx_api_performance_endpoint ON api_performance_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_performance_method ON api_performance_logs(method);
CREATE INDEX IF NOT EXISTS idx_api_performance_status ON api_performance_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_performance_timestamp ON api_performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_performance_response_time ON api_performance_logs(response_time);

-- ===========================================
-- 触发器和函数
-- ===========================================

-- 更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加 updated_at 触发器
CREATE TRIGGER update_monitoring_events_updated_at BEFORE UPDATE ON monitoring_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_stats_updated_at BEFORE UPDATE ON monitoring_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_face_templates_updated_at BEFORE UPDATE ON face_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_progress_details_updated_at BEFORE UPDATE ON learning_progress_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 初始数据插入
-- ===========================================

-- 插入系统配置初始数据
INSERT INTO system_configs (config_key, config_value, config_type, description, category, is_public) VALUES
('app_name', 'SkillUp Platform', 'string', '应用程序名称', 'general', true),
('app_version', '1.0.0', 'string', '应用程序版本', 'general', true),
('maintenance_mode', 'false', 'boolean', '维护模式开关', 'system', false),
('registration_enabled', 'true', 'boolean', '用户注册开关', 'auth', true),
('face_auth_enabled', 'true', 'boolean', '人脸识别认证开关', 'auth', true),
('sms_verification_enabled', 'true', 'boolean', '短信验证开关', 'auth', true),
('max_login_attempts', '5', 'number', '最大登录尝试次数', 'security', false),
('session_timeout', '86400', 'number', '会话超时时间（秒）', 'security', false),
('file_upload_max_size', '52428800', 'number', '文件上传最大大小（字节）', 'upload', true),
('supported_file_types', '["jpg","jpeg","png","pdf","mp4","mp3"]', 'json', '支持的文件类型', 'upload', true)
ON CONFLICT (config_key) DO NOTHING;

-- ===========================================
-- 权限和安全
-- ===========================================

-- 创建只读用户（用于监控和报表）
-- CREATE USER skillup_readonly WITH PASSWORD 'your_readonly_password';
-- GRANT CONNECT ON DATABASE skillup_platform TO skillup_readonly;
-- GRANT USAGE ON SCHEMA public TO skillup_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO skillup_readonly;

-- 创建应用用户（用于应用程序连接）
-- CREATE USER skillup_app WITH PASSWORD 'your_app_password';
-- GRANT CONNECT ON DATABASE skillup_platform TO skillup_app;
-- GRANT USAGE ON SCHEMA public TO skillup_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO skillup_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skillup_app;

-- ===========================================
-- 数据清理策略
-- ===========================================

-- 创建数据清理函数
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- 清理过期的短信验证码（7天前）
    DELETE FROM sms_verifications WHERE expires_at < NOW() - INTERVAL '7 days';
    
    -- 清理旧的监控事件（30天前）
    DELETE FROM monitoring_events WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- 清理旧的人脸验证记录（90天前）
    DELETE FROM face_verification_logs WHERE verification_time < NOW() - INTERVAL '90 days';
    
    -- 清理旧的学习会话记录（180天前）
    DELETE FROM learning_sessions WHERE session_start < NOW() - INTERVAL '180 days';
    
    -- 清理旧的API性能日志（30天前）
    DELETE FROM api_performance_logs WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- 清理旧的审计日志（1年前）
    DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- 注释：在生产环境中，建议设置定时任务来执行数据清理
-- 例如：SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

-- ===========================================
-- 迁移完成标记
-- ===========================================

-- 插入迁移记录
INSERT INTO system_configs (config_key, config_value, config_type, description, category, is_public) VALUES
('database_migration_version', '1.0.0', 'string', '数据库迁移版本', 'system', false),
('database_migration_date', NOW()::text, 'string', '数据库迁移执行时间', 'system', false)
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();
