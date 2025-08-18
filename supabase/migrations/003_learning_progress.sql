-- 创建学习进度表
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    current_time_seconds INTEGER NOT NULL DEFAULT 0, -- 当前播放时间（秒）
    duration INTEGER NOT NULL DEFAULT 0, -- 视频总时长（秒）
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- 完成百分比
    is_completed BOOLEAN NOT NULL DEFAULT FALSE, -- 是否已完成
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 确保每个用户对每个课时只有一条进度记录
    UNIQUE(user_id, course_id, lesson_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_course_id ON learning_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_lesson_id ON learning_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_course ON learning_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_completed ON learning_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_learning_progress_last_updated ON learning_progress(last_updated_at);

-- 启用行级安全策略
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：用户只能访问自己的学习进度
CREATE POLICY "Users can view own learning progress" ON learning_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning progress" ON learning_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning progress" ON learning_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning progress" ON learning_progress
    FOR DELETE USING (auth.uid() = user_id);

-- 创建触发器函数：自动更新 last_updated_at 字段
CREATE OR REPLACE FUNCTION update_learning_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_learning_progress_updated_at
    BEFORE UPDATE ON learning_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_progress_updated_at();

-- 创建函数：获取用户课程进度统计
CREATE OR REPLACE FUNCTION get_user_course_progress_stats(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (
    total_lessons INTEGER,
    completed_lessons INTEGER,
    progress_percentage DECIMAL(5,2),
    total_watch_time INTEGER,
    last_study_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_lessons,
        COUNT(CASE WHEN lp.is_completed THEN 1 END)::INTEGER as completed_lessons,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN lp.is_completed THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL(5,2)
        END as progress_percentage,
        COALESCE(SUM(lp.current_time_seconds), 0)::INTEGER as total_watch_time,
        MAX(lp.last_updated_at) as last_study_time
    FROM learning_progress lp
    WHERE lp.user_id = p_user_id AND lp.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取用户学习统计
CREATE OR REPLACE FUNCTION get_user_learning_stats(p_user_id UUID)
RETURNS TABLE (
    total_study_time INTEGER,
    completed_courses INTEGER,
    in_progress_courses INTEGER,
    weekly_study_time INTEGER,
    total_lessons_completed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH course_stats AS (
        SELECT 
            lp.course_id,
            COUNT(*) as total_lessons,
            COUNT(CASE WHEN lp.is_completed THEN 1 END) as completed_lessons,
            SUM(lp.current_time_seconds) as course_watch_time
        FROM learning_progress lp
        WHERE lp.user_id = p_user_id
        GROUP BY lp.course_id
    ),
    weekly_progress AS (
        SELECT SUM(lp.current_time_seconds) as weekly_time
        FROM learning_progress lp
        WHERE lp.user_id = p_user_id 
        AND lp.last_updated_at >= NOW() - INTERVAL '7 days'
    )
    SELECT 
        COALESCE(SUM(cs.course_watch_time), 0)::INTEGER as total_study_time,
        COUNT(CASE WHEN cs.completed_lessons = cs.total_lessons AND cs.total_lessons > 0 THEN 1 END)::INTEGER as completed_courses,
        COUNT(CASE WHEN cs.completed_lessons > 0 AND cs.completed_lessons < cs.total_lessons THEN 1 END)::INTEGER as in_progress_courses,
        COALESCE(wp.weekly_time, 0)::INTEGER as weekly_study_time,
        COALESCE(SUM(cs.completed_lessons), 0)::INTEGER as total_lessons_completed
    FROM course_stats cs
    CROSS JOIN weekly_progress wp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：清理旧的学习进度记录（可选，用于数据维护）
CREATE OR REPLACE FUNCTION cleanup_old_learning_progress(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除超过指定天数且未完成的学习进度记录
    DELETE FROM learning_progress
    WHERE last_updated_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND is_completed = FALSE
    AND progress_percentage < 10; -- 只删除进度很少的记录
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予权限给认证用户
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_progress TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_course_progress_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_learning_stats(UUID) TO authenticated;

-- 授予基本查询权限给匿名用户（如果需要）
GRANT SELECT ON learning_progress TO anon;
GRANT USAGE ON SCHEMA public TO anon;