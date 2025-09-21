-- 创建测试数据：用户和考试
-- 插入测试用户
INSERT INTO users (
  id,
  phone,
  password_hash,
  name,
  role,
  is_verified,
  face_verified,
  status
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '13800138000',
  '$2b$10$dummy.hash.for.testing.purposes.only',
  '测试用户',
  'user',
  true,
  true,
  'active'
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified,
  face_verified = EXCLUDED.face_verified,
  status = EXCLUDED.status;

-- 插入测试考试数据
INSERT INTO exams (
    id,
    title,
    description,
    category,
    difficulty,
    status,
    duration_minutes,
    total_questions,
    total_score,
    passing_score,
    max_attempts,
    shuffle_questions,
    shuffle_options,
    show_results_immediately,
    allow_review,
    require_approval,
    start_time,
    end_time,
    created_by,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '测试考试',
    '这是一个用于测试的考试',
    '技能测试',
    'intermediate',
    'published',
    60,
    10,
    100,
    60,
    3,
    false,
    false,
    true,
    true,
    false,
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '25 hours',
    '550e8400-e29b-41d4-a716-446655440000',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    difficulty = EXCLUDED.difficulty,
    status = EXCLUDED.status,
    duration_minutes = EXCLUDED.duration_minutes,
    total_questions = EXCLUDED.total_questions,
    total_score = EXCLUDED.total_score,
    passing_score = EXCLUDED.passing_score,
    max_attempts = EXCLUDED.max_attempts,
    shuffle_questions = EXCLUDED.shuffle_questions,
    shuffle_options = EXCLUDED.shuffle_options,
    show_results_immediately = EXCLUDED.show_results_immediately,
    allow_review = EXCLUDED.allow_review,
    require_approval = EXCLUDED.require_approval,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    updated_at = NOW();

-- 插入测试题目
INSERT INTO questions (
    id,
    exam_id,
    question_text,
    question_type,
    options,
    correct_answers,
    explanation,
    score,
    order_index,
    is_required,
    created_at,
    updated_at
) VALUES 
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '以下哪个是JavaScript的数据类型？', 'multiple_choice', 
 '[{"id": "a", "text": "string"}, {"id": "b", "text": "number"}, {"id": "c", "text": "boolean"}, {"id": "d", "text": "以上都是"}]'::jsonb, 
 '["d"]'::jsonb, '所有选项都是JavaScript的基本数据类型', 10, 1, true, NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'JavaScript是一种编译型语言。', 'true_false', 
 '[{"id": "true", "text": "正确"}, {"id": "false", "text": "错误"}]'::jsonb, 
 '["false"]'::jsonb, 'JavaScript是一种解释型语言，不是编译型语言', 10, 2, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    options = EXCLUDED.options,
    correct_answers = EXCLUDED.correct_answers,
    explanation = EXCLUDED.explanation,
    score = EXCLUDED.score,
    order_index = EXCLUDED.order_index,
    is_required = EXCLUDED.is_required,
    updated_at = NOW();

-- 确保anon和authenticated角色有访问权限
GRANT SELECT, INSERT, UPDATE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON exams TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON exam_registrations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON exam_attempts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON exam_submissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON exam_results TO anon, authenticated;