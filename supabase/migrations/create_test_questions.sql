-- 创建测试题目数据
-- 为测试考试 '550e8400-e29b-41d4-a716-446655440001' 创建题目

-- 删除可能存在的冲突题目
DELETE FROM questions WHERE exam_id = '550e8400-e29b-41d4-a716-446655440001';

-- 插入测试题目数据
INSERT INTO questions (id, exam_id, question_text, question_type, options, correct_answers, score, order_index, created_at, updated_at) VALUES
(
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440001',
  '以下哪个是JavaScript的基本数据类型？',
  'multiple_choice',
  '[{"key": "A", "text": "String"}, {"key": "B", "text": "Object"}, {"key": "C", "text": "Array"}, {"key": "D", "text": "Function"}]'::jsonb,
  '["A"]'::jsonb,
  10,
  1,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440001',
  '下列哪个方法可以向数组末尾添加元素？',
  'multiple_choice',
  '[{"key": "A", "text": "pop()"}, {"key": "B", "text": "push()"}, {"key": "C", "text": "shift()"}, {"key": "D", "text": "unshift()"}]'::jsonb,
  '["B"]'::jsonb,
  10,
  2,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440001',
  'JavaScript中如何声明一个常量？',
  'multiple_choice',
  '[{"key": "A", "text": "const"}, {"key": "B", "text": "let"}, {"key": "C", "text": "var"}, {"key": "D", "text": "final"}]'::jsonb,
  '["A"]'::jsonb,
  10,
  3,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440014',
  '550e8400-e29b-41d4-a716-446655440001',
  '以下哪个操作符用于严格相等比较？',
  'multiple_choice',
  '[{"key": "A", "text": "==="}, {"key": "B", "text": "=="}, {"key": "C", "text": "!="}, {"key": "D", "text": "<>"}]'::jsonb,
  '["A"]'::jsonb,
  10,
  4,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440015',
  '550e8400-e29b-41d4-a716-446655440001',
  'JavaScript中哪个方法用于将字符串转换为整数？',
  'multiple_choice',
  '[{"key": "A", "text": "parseFloat()"}, {"key": "B", "text": "parseInt()"}, {"key": "C", "text": "toString()"}, {"key": "D", "text": "valueOf()"}]'::jsonb,
  '["B"]'::jsonb,
  10,
  5,
  NOW(),
  NOW()
);

-- 验证插入的题目数据
SELECT 
  id,
  exam_id,
  question_text,
  question_type,
  correct_answers,
  score,
  order_index
FROM questions 
WHERE exam_id = '550e8400-e29b-41d4-a716-446655440001'
ORDER BY order_index;