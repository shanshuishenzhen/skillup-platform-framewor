-- SkillUp Platform 数据库初始化脚本
-- 创建所有必要的表结构、索引、权限和示例数据

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建讲师表
CREATE TABLE instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    expertise VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar_url TEXT,
    user_type VARCHAR(20) DEFAULT 'registered' CHECK (user_type IN ('guest', 'registered', 'premium')),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建课程表
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    price DECIMAL(10,2) DEFAULT 0,
    cover_image_url TEXT,
    instructor_id UUID REFERENCES instructors(id),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建章节表
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建视频表
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    video_url TEXT,
    preview_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建选课记录表
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, course_id)
);

-- 创建订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    payment_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 创建订单项表
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建人脸识别记录表
CREATE TABLE face_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    face_encoding TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_difficulty ON courses(difficulty);
CREATE INDEX idx_courses_price ON courses(price);
CREATE INDEX idx_courses_is_published ON courses(is_published);
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);

CREATE INDEX idx_chapters_course_id ON chapters(course_id);
CREATE INDEX idx_chapters_order_index ON chapters(order_index);

CREATE INDEX idx_videos_chapter_id ON videos(chapter_id);

CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_progress ON enrollments(progress_percentage);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_course_id ON order_items(course_id);

CREATE INDEX idx_face_records_user_id ON face_records(user_id);
CREATE INDEX idx_face_records_last_verified ON face_records(last_verified_at DESC);

-- 设置权限
GRANT SELECT ON instructors TO anon;
GRANT ALL PRIVILEGES ON instructors TO authenticated;

GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

GRANT SELECT ON courses TO anon;
GRANT ALL PRIVILEGES ON courses TO authenticated;

GRANT SELECT ON chapters TO anon;
GRANT ALL PRIVILEGES ON chapters TO authenticated;

GRANT SELECT ON videos TO anon;
GRANT ALL PRIVILEGES ON videos TO authenticated;

GRANT ALL PRIVILEGES ON enrollments TO authenticated;

GRANT ALL PRIVILEGES ON orders TO authenticated;

GRANT ALL PRIVILEGES ON order_items TO authenticated;

GRANT ALL PRIVILEGES ON face_records TO authenticated;

-- 插入示例讲师数据
INSERT INTO instructors (name, bio, avatar_url, expertise) VALUES
('张伟', '金融科技专家，拥有15年金融行业经验，专注于区块链和量化交易领域。', 'https://placehold.co/150x150/165DFF/FFFFFF?text=ZW', '金融科技,区块链,量化交易'),
('李娜', '人工智能医疗专家，医学博士，在AI辅助诊断领域有丰富的研究和实践经验。', 'https://placehold.co/150x150/36D399/FFFFFF?text=LN', '人工智能,医疗诊断,深度学习'),
('王芳', '在线教育产品专家，曾主导多个知名教育平台的产品设计和用户体验优化。', 'https://placehold.co/150x150/6B7280/FFFFFF?text=WF', '产品设计,用户体验,在线教育');

-- 插入示例课程数据
INSERT INTO courses (title, description, category, difficulty, price, cover_image_url, instructor_id, is_published) 
SELECT 
    '金融科技基础与实践',
    '深入了解金融科技的核心概念，学习区块链、数字货币、智能合约等前沿技术在金融领域的应用。',
    '金融科技',
    'beginner',
    299.00,
    'https://placehold.co/400x225/165DFF/FFFFFF?text=FinTech',
    i.id,
    true
FROM instructors i WHERE i.name = '张伟';

INSERT INTO courses (title, description, category, difficulty, price, cover_image_url, instructor_id, is_published) 
SELECT 
    'AI医疗诊断技术',
    '学习人工智能在医疗诊断中的应用，包括医学影像分析、疾病预测模型等核心技术。',
    '人工智能',
    'intermediate',
    499.00,
    'https://placehold.co/400x225/36D399/FFFFFF?text=AI+Medical',
    i.id,
    true
FROM instructors i WHERE i.name = '李娜';

INSERT INTO courses (title, description, category, difficulty, price, cover_image_url, instructor_id, is_published) 
SELECT 
    '在线教育产品设计',
    '从用户需求分析到产品上线，全面掌握在线教育产品的设计思路和实践方法。',
    '产品设计',
    'advanced',
    399.00,
    'https://placehold.co/400x225/6B7280/FFFFFF?text=Product+Design',
    i.id,
    true
FROM instructors i WHERE i.name = '王芳';

-- 为每个课程创建章节
INSERT INTO chapters (course_id, title, description, order_index, duration_minutes)
SELECT 
    c.id,
    '第一章：基础概念介绍',
    '介绍课程的基础概念和核心理论',
    1,
    45
FROM courses c;

INSERT INTO chapters (course_id, title, description, order_index, duration_minutes)
SELECT 
    c.id,
    '第二章：实践案例分析',
    '通过实际案例深入理解理论知识的应用',
    2,
    60
FROM courses c;

INSERT INTO chapters (course_id, title, description, order_index, duration_minutes)
SELECT 
    c.id,
    '第三章：项目实战演练',
    '动手实践，完成完整的项目案例',
    3,
    90
FROM courses c;

-- 为每个章节创建视频
INSERT INTO videos (chapter_id, title, video_url, preview_url, duration_seconds)
SELECT 
    ch.id,
    ch.title || ' - 视频讲解',
    'https://example.com/videos/' || ch.id || '.mp4',
    'https://example.com/previews/' || ch.id || '.mp4',
    ch.duration_minutes * 60
FROM chapters ch;