-- 插入测试试卷数据
INSERT INTO exam_papers (
  title,
  description,
  category,
  difficulty,
  total_questions,
  total_score,
  questions_data,
  tags,
  settings
) VALUES (
  '测试试卷 - JavaScript基础',
  '用于测试试卷关联功能的测试数据',
  '前端开发',
  'intermediate',
  2,
  10,
  '[
    {
      "id": "q1",
      "content": "JavaScript是什么类型的语言？",
      "type": "单选题",
      "options": [
        {"id": "A", "text": "编译型", "isCorrect": false},
        {"id": "B", "text": "解释型", "isCorrect": true}
      ],
      "correctAnswer": "解释型",
      "points": 5,
      "difficulty": "intermediate"
    },
    {
      "id": "q2",
      "content": "HTML是超文本标记语言吗？",
      "type": "单选题",
      "options": [
        {"id": "A", "text": "是", "isCorrect": true},
        {"id": "B", "text": "否", "isCorrect": false}
      ],
      "correctAnswer": "是",
      "points": 5,
      "difficulty": "beginner"
    }
  ]'::jsonb,
  ARRAY['测试', 'JavaScript', 'HTML'],
  '{
    "timeLimit": 30,
    "passingScore": 6,
    "allowReview": true,
    "showCorrectAnswers": false,
    "randomizeQuestions": false,
    "randomizeOptions": false
  }'::jsonb
);

-- 查询插入的数据
SELECT id, title, description, category, difficulty, total_questions, total_score 
FROM exam_papers 
WHERE title = '测试试卷 - JavaScript基础';