-- 为videos表添加缺失的字段
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT;

-- 为chapters表添加缺失的字段（如果需要）
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 更新现有数据的默认值
UPDATE videos SET order_index = 1 WHERE order_index IS NULL OR order_index = 0;
UPDATE videos SET is_preview = false WHERE is_preview IS NULL;
UPDATE chapters SET order_index = 1 WHERE order_index IS NULL OR order_index = 0;

-- 为新添加的字段创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_videos_order_index ON videos(order_index);
CREATE INDEX IF NOT EXISTS idx_videos_is_preview ON videos(is_preview);
CREATE INDEX IF NOT EXISTS idx_chapters_order_index ON chapters(order_index);

-- 注释：示例数据需要根据实际的课程UUID来插入