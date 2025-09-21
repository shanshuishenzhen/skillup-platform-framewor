-- 创建测试考试数据

-- 插入测试考试
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
    instructions,
    tags,
    settings
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'JavaScript基础知识测试',
    '这是一个JavaScript基础知识测试，包含选择题和判断题',
    'programming',
    'beginner',
    'published',
    30,
    5,
    100,
    60,
    3,
    false,
    false,
    true,
    true,
    false,
    NOW(),
    NOW() + INTERVAL '30 days',
    '请仔细阅读每道题目，选择最合适的答案。考试时间为30分钟，共5道题。',
    ARRAY['javascript', 'programming', 'beginner'],
    '{"allowBacktrack": true, "showTimer": true}'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
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
    is_required
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440001',
    'JavaScript中用于声明变量的关键字有哪些？',
    'multiple_choice',
    '[{"id": "a", "text": "var"}, {"id": "b", "text": "let"}, {"id": "c", "text": "const"}, {"id": "d", "text": "function"}]',
    '["a", "b", "c"]',
    'JavaScript中可以使用var、let和const来声明变量，function用于声明函数。',
    20,
    1,
    true
),
(
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440001',
    'JavaScript是一种编译型语言。',
    'true_false',
    '[{"id": "true", "text": "正确"}, {"id": "false", "text": "错误"}]',
    '["false"]',
    'JavaScript是一种解释型语言，不是编译型语言。',
    20,
    2,
    true
),
(
    '550e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440001',
    '以下哪个方法可以向数组末尾添加元素？',
    'single_choice',
    '[{"id": "a", "text": "push()"}, {"id": "b", "text": "pop()"}, {"id": "c", "text": "shift()"}, {"id": "d", "text": "unshift()"}]',
    '["a"]',
    'push()方法用于向数组末尾添加一个或多个元素。',
    20,
    3,
    true
),
(
    '550e8400-e29b-41d4-a716-446655440014',
    '550e8400-e29b-41d4-a716-446655440001',
    '== 和 === 的区别是什么？',
    'single_choice',
    '[{"id": "a", "text": "没有区别"}, {"id": "b", "text": "==会进行类型转换，===不会"}, {"id": "c", "text": "===会进行类型转换，==不会"}, {"id": "d", "text": "都会进行类型转换"}]',
    '["b"]',
    '==会进行类型转换后比较，===会同时比较值和类型，不进行类型转换。',
    20,
    4,
    true
),
(
    '550e8400-e29b-41d4-a716-446655440015',
    '550e8400-e29b-41d4-a716-446655440001',
    '请简述JavaScript中闭包的概念。',
    'short_answer',
    '[]',
    '["闭包是指函数能够访问其外部作用域中的变量，即使在外部函数已经执行完毕后仍然可以访问。"]',
    '闭包是JavaScript中的重要概念，它允许内部函数访问外部函数的变量。',
    20,
    5,
    true
)
ON CONFLICT (id) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    options = EXCLUDED.options,
    correct_answers = EXCLUDED.correct_answers,
    updated_at = NOW();

-- 更新考试的题目ID数组
UPDATE exams 
SET question_ids = ARRAY['550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440015']
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- 验证数据插入
SELECT 'Exam created:' as info, title, total_questions, status FROM exams WHERE id = '550e8400-e29b-41d4-a716-446655440001';
SELECT 'Questions created:' as info, COUNT(*) as question_count FROM questions WHERE exam_id = '550e8400-e29b-41d4-a716-446655440001';