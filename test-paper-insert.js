const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取 Supabase 配置
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestPaper() {
  try {
    const testPaper = {
      title: '测试试卷 - JavaScript基础',
      description: '用于测试试卷关联功能的测试数据',
      category: '前端开发',
      difficulty: 'intermediate',
      total_questions: 2,
      total_score: 10,
      questions_data: [
        {
          id: 'q1',
          content: 'JavaScript是什么类型的语言？',
          type: '单选题',
          options: [
            { id: 'A', text: '编译型', isCorrect: false },
            { id: 'B', text: '解释型', isCorrect: true }
          ],
          correctAnswer: '解释型',
          points: 5,
          difficulty: 'intermediate'
        },
        {
          id: 'q2',
          content: 'HTML是超文本标记语言吗？',
          type: '单选题',
          options: [
            { id: 'A', text: '是', isCorrect: true },
            { id: 'B', text: '否', isCorrect: false }
          ],
          correctAnswer: '是',
          points: 5,
          difficulty: 'beginner'
        }
      ],
      tags: ['测试', 'JavaScript', 'HTML'],
      settings: {
        timeLimit: 30,
        passingScore: 6,
        allowReview: true,
        showCorrectAnswers: false,
        randomizeQuestions: false,
        randomizeOptions: false
      }
    };

    const { data, error } = await supabase
      .from('exam_papers')
      .insert([testPaper])
      .select();

    if (error) {
      console.error('插入试卷失败:', error);
      return;
    }

    console.log('试卷插入成功:', data);
    
    // 查询所有试卷
    const { data: allPapers, error: queryError } = await supabase
      .from('exam_papers')
      .select('*');
    
    if (queryError) {
      console.error('查询试卷失败:', queryError);
      return;
    }
    
    console.log('当前所有试卷:', allPapers);
    
  } catch (error) {
    console.error('操作失败:', error);
  }
}

ins