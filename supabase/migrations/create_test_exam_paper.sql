-- 创建测试试卷数据
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
  '测试试卷',
  '用于测试试卷关联功能的试卷',
  '测试',
  'intermediate',
  10,
  100,
  '[
    {
      "id": "q1",
      "type": "single_choice",
      "question": "测试题目1：以下哪个是正确答案？",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correct_answer": "A",
      "score": 10
    },
    {
      "id": "q2",
      "type": "single_choice",
      "question": "测试题目2：这是第二道题？",
      "options": ["是的", "不是", "可能", "不知道"],
      "correct_answer": "是的",
      "score": 10
    }
  ]'::jsonb,
  ARRAY['测试', '样例'],
  '{"time_limit": 60, "shuffle_questions": false}'::jsonb
);