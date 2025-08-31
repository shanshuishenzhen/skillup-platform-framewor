/**
 * 导入试卷API路由
 * POST /api/admin/import/questions - 批量导入试题
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';
import { z } from 'zod';

// 试题选项验证模式
const OptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, '选项内容不能为空'),
  isCorrect: z.boolean().default(false)
});

// 试题验证模式
const QuestionSchema = z.object({
  type: z.enum(['single', 'multiple', 'judge', 'fill', 'essay']),
  title: z.string().min(1, '题目标题不能为空'),
  content: z.string().min(1, '题目内容不能为空'),
  options: z.array(OptionSchema).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  score: z.number().min(1, '分值必须大于0').default(1),
  timeLimit: z.number().optional(), // 单题时间限制（秒）
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional()
});

// 试卷验证模式
const PaperSchema = z.object({
  title: z.string().min(1, '试卷标题不能为空'),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  duration: z.number().min(1, '考试时长必须大于0'),
  totalScore: z.number().min(1, '总分必须大于0'),
  passingScore: z.number().min(1, '及格分必须大于0'),
  questions: z.array(QuestionSchema).min(1, '至少需要一道题目'),
  randomOrder: z.boolean().default(false), // 是否随机排序
  showResult: z.boolean().default(false), // 是否立即显示结果
  allowReview: z.boolean().default(true), // 是否允许查看答案
  maxAttempts: z.number().min(1).default(1) // 最大尝试次数
});

/**
 * 批量导入试题/试卷
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 403 }
      );
    }

    const { user } = authResult;
    const body = await request.json();

    // 检查是导入单个试卷还是批量试题
    if (body.questions && Array.isArray(body.questions)) {
      // 导入试卷
      const validationResult = PaperSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          message: '试卷数据验证失败',
          errors: validationResult.error.errors
        }, { status: 400 });
      }

      const paper = validationResult.data;
      
      // 验证试卷逻辑
      const totalQuestionScore = paper.questions.reduce((sum, q) => sum + q.score, 0);
      if (totalQuestionScore !== paper.totalScore) {
        return NextResponse.json({
          success: false,
          message: `题目总分(${totalQuestionScore})与试卷总分(${paper.totalScore})不匹配`
        }, { status: 400 });
      }

      if (paper.passingScore > paper.totalScore) {
        return NextResponse.json({
          success: false,
          message: '及格分不能大于总分'
        }, { status: 400 });
      }

      // 创建试卷
      // TODO: 实现试卷创建逻辑
      const paperId = `paper_${Date.now()}`;
      
      return NextResponse.json({
        success: true,
        message: `试卷"${paper.title}"导入成功`,
        data: {
          paperId,
          title: paper.title,
          questionCount: paper.questions.length,
          totalScore: paper.totalScore
        }
      });

    } else {
      // 批量导入试题
      const questions = z.array(QuestionSchema).safeParse(body);
      if (!questions.success) {
        return NextResponse.json({
          success: false,
          message: '试题数据验证失败',
          errors: questions.error.errors
        }, { status: 400 });
      }

      const results = {
        total: questions.data.length,
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const question of questions.data) {
        try {
          // 验证试题逻辑
          if (question.type === 'single' || question.type === 'multiple') {
            if (!question.options || question.options.length < 2) {
              throw new Error('选择题至少需要2个选项');
            }
            
            const correctOptions = question.options.filter(opt => opt.isCorrect);
            if (question.type === 'single' && correctOptions.length !== 1) {
              throw new Error('单选题必须有且仅有一个正确答案');
            }
            if (question.type === 'multiple' && correctOptions.length < 1) {
              throw new Error('多选题至少需要一个正确答案');
            }
          }

          // 创建试题
          // TODO: 实现试题创建逻辑
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`题目"${question.title}": ${error instanceof Error ? error.message : '导入失败'}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: `导入完成：成功 ${results.success} 题，失败 ${results.failed} 题`,
        data: results
      });
    }

  } catch (error) {
    console.error('导入试题失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '导入试题失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * 获取导入模板
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'questions';

    if (type === 'paper') {
      // 试卷模板
      const paperTemplate = {
        title: "JavaScript基础技能认证考试",
        description: "测试JavaScript基础知识和编程能力",
        category: "前端开发",
        difficulty: "intermediate",
        duration: 120,
        totalScore: 100,
        passingScore: 60,
        randomOrder: false,
        showResult: false,
        allowReview: true,
        maxAttempts: 1,
        questions: [
          {
            type: "single",
            title: "JavaScript变量声明",
            content: "以下哪种方式是正确的JavaScript变量声明？",
            options: [
              { id: "A", text: "var name = 'John';", isCorrect: true },
              { id: "B", text: "variable name = 'John';", isCorrect: false },
              { id: "C", text: "v name = 'John';", isCorrect: false },
              { id: "D", text: "declare name = 'John';", isCorrect: false }
            ],
            difficulty: "easy",
            category: "基础语法",
            tags: ["变量", "声明"],
            score: 5,
            explanation: "var是JavaScript中声明变量的关键字之一"
          }
        ]
      };

      return NextResponse.json({
        success: true,
        data: {
          type: 'paper',
          template: paperTemplate,
          notes: [
            '试卷包含基本信息和题目列表',
            '题目总分必须等于试卷总分',
            '及格分不能大于总分',
            '支持的题型：single(单选)、multiple(多选)、judge(判断)、fill(填空)、essay(问答)'
          ]
        }
      });
    } else {
      // 试题模板
      const questionTemplates = [
        {
          type: "single",
          title: "单选题示例",
          content: "这是一道单选题的题目内容",
          options: [
            { id: "A", text: "选项A", isCorrect: true },
            { id: "B", text: "选项B", isCorrect: false },
            { id: "C", text: "选项C", isCorrect: false },
            { id: "D", text: "选项D", isCorrect: false }
          ],
          difficulty: "medium",
          category: "示例分类",
          tags: ["标签1", "标签2"],
          score: 5,
          explanation: "答案解析内容"
        },
        {
          type: "multiple",
          title: "多选题示例", 
          content: "这是一道多选题的题目内容",
          options: [
            { id: "A", text: "选项A", isCorrect: true },
            { id: "B", text: "选项B", isCorrect: true },
            { id: "C", text: "选项C", isCorrect: false },
            { id: "D", text: "选项D", isCorrect: false }
          ],
          difficulty: "medium",
          score: 10
        },
        {
          type: "judge",
          title: "判断题示例",
          content: "这是一道判断题的题目内容",
          correctAnswer: "true",
          difficulty: "easy",
          score: 3
        },
        {
          type: "fill",
          title: "填空题示例",
          content: "这是一道填空题，请填写____的内容",
          correctAnswer: "正确答案",
          difficulty: "medium",
          score: 8
        }
      ];

      return NextResponse.json({
        success: true,
        data: {
          type: 'questions',
          templates: questionTemplates,
          notes: [
            '支持的题型：single(单选)、multiple(多选)、judge(判断)、fill(填空)、essay(问答)',
            '难度等级：easy(简单)、medium(中等)、hard(困难)',
            '单选题必须有且仅有一个正确答案',
            '多选题至少需要一个正确答案',
            '判断题的正确答案为"true"或"false"'
          ]
        }
      });
    }

  } catch (error) {
    console.error('获取导入模板失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取导入模板失败'
    }, { status: 500 });
  }
}
