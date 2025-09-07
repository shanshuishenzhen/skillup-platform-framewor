-- 查询所有试卷数据
SELECT 
  id,
  title,
  description,
  category,
  difficulty,
  total_questions,
  total_score,
  question_ids,
  questions_data,
  tags,
  settings,
  created_by,
  created_at,
  updated_at
FROM exam_papers
ORDER BY created_at DESC;

-- 查询试卷总数
SELECT COUNT(*) as total_papers FROM exam_papers;