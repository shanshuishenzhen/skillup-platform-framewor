import { NextRequest, NextResponse } from 'next/server';
import { Question, QuestionType, ExamDifficulty } from '../../../../types/exam';
import { QuestionTypeDistribution } from '../../../../utils/examPaperParser';

/**
 * 试卷导入请求数据接口
 */
interface ExamPaperImportRequest {
  /** 试卷标题 */
  examTitle: string;
  /** 题型分布 */
  typeDistribution: QuestionTypeDistribution[];
  /** 题目列表 */
  questions: Question[];
}

/**
 * 试卷导入响应数据接口
 */
interface ExamPaperImportResponse {
  /** 是否成功 */
  success: boolean;
  /** 响应消息 */
  message: string;
  /** 导入的题目数量 */
  importedCount?: number;
  /** 创建的考试ID */
  examId?: string;
  /** 错误详情 */
  errors?: string[];
}

/**
 * 验证题型分布数据
 * @param typeDistribution - 题型分布数据
 * @returns 验证结果
 */
function validateTypeDistribution(typeDistribution: QuestionTypeDistribution[]): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(typeDistribution) || typeDistribution.length === 0) {
    errors.push('题型分布数据不能为空');
    return errors;
  }
  
  typeDistribution.forEach((dist, index) => {
    if (!dist.questionType || typeof dist.questionType !== 'string') {
      errors.push(`第${index + 1}行：题型不能为空`);
    }
    
    if (!dist.count || dist.count <= 0) {
      errors.push(`第${index + 1}行：题目数量必须大于0`);
    }
    
    if (!dist.pointsPerQuestion || dist.pointsPerQuestion <= 0) {
      errors.push(`第${index + 1}行：每题分值必须大于0`);
    }
  });
  
  return errors;
}

/**
 * 验证题目数据
 * @param questions - 题目列表
 * @param typeDistribution - 题型分布
 * @returns 验证结果
 */
function validateQuestions(questions: Question[], typeDistribution: QuestionTypeDistribution[]): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('题目数据不能为空');
    return errors;
  }
  
  // 验证题目数量是否与题型分布匹配
  const typeCountMap = new Map<string, number>();
  typeDistribution.forEach(dist => {
    typeCountMap.set(dist.questionType, dist.count);
  });
  
  const actualTypeCountMap = new Map<string, number>();
  questions.forEach(question => {
    const currentCount = actualTypeCountMap.get(question.type) || 0;
    actualTypeCountMap.set(question.type, currentCount + 1);
  });
  
  // 检查数量匹配
  for (const [type, expectedCount] of typeCountMap) {
    const actualCount = actualTypeCountMap.get(type) || 0;
    if (actualCount !== expectedCount) {
      errors.push(`题型"${type}"的题目数量不匹配：期望${expectedCount}题，实际${actualCount}题`);
    }
  }
  
  // 验证每个题目的必填字段
  questions.forEach((question, index) => {
    if (!question.content || question.content.trim() === '') {
      errors.push(`第${index + 1}题：题目内容不能为空`);
    }
    
    if (!question.type || question.type.trim() === '') {
      errors.push(`第${index + 1}题：题型不能为空`);
    }
    
    if (!question.correctAnswer || question.correctAnswer.trim() === '') {
      errors.push(`第${index + 1}题：正确答案不能为空`);
    }
    
    if (question.points <= 0) {
      errors.push(`第${index + 1}题：分值必须大于0`);
    }
    
    // 验证选择题的选项
    if (question.type === '单选题' || question.type === '多选题') {
      const options = question.options || [];
      if (options.length < 2) {
        errors.push(`第${index + 1}题：选择题至少需要2个选项`);
      }
      
      // 验证正确答案是否在选项中
      const optionTexts = options.map(opt => opt.text);
      const correctAnswers = question.correctAnswer.split(',').map(ans => ans.trim());
      
      correctAnswers.forEach(answer => {
        if (!optionTexts.includes(answer)) {
          errors.push(`第${index + 1}题：正确答案"${answer}"不在选项中`);
        }
      });
    }
  });
  
  return errors;
}

/**
 * 生成唯一的题目ID
 * @returns 题目ID
 */
function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成唯一的考试ID
 * @param examTitle - 考试标题，用于生成更有意义的ID
 * @returns 考试ID
 */
function generateExamId(examTitle?: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 9);
  
  if (examTitle) {
    // 将标题转换为安全的ID格式
    const safeTitle = examTitle
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_') // 保留中文、英文、数字，其他字符替换为下划线
      .substring(0, 20); // 限制长度
    return `exam_${safeTitle}_${timestamp}_${randomStr}`;
  }
  
  return `exam_${timestamp}_${randomStr}`;
}

/**
 * 检查考试ID是否已存在（模拟数据库查询）
 * @param examId - 考试ID
 * @returns 是否存在
 */
async function checkExamIdExists(examId: string): Promise<boolean> {
  // 在实际实现中，这里应该查询数据库
  // 例如：const existing = await db.exams.findUnique({ where: { id: examId } });
  // return !!existing;
  
  // 目前模拟检查，假设ID不存在
  console.log(`检查考试ID是否存在: ${examId}`);
  return false;
}

/**
 * 处理题目数据，确保格式正确
 * @param questions - 原始题目数据
 * @returns 处理后的题目数据
 */
function processQuestions(questions: Question[]): Question[] {
  return questions.map(question => {
    // 确保每个题目都有唯一ID
    const processedQuestion: Question = {
      ...question,
      id: question.id || generateQuestionId(),
      createdAt: question.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // 确保难度有默认值
      difficulty: question.difficulty || 'intermediate' as ExamDifficulty,
      // 确保标签是数组
      tags: Array.isArray(question.tags) ? question.tags : [],
      // 确保解析存在
      explanation: question.explanation || '',
    };
    
    // 处理选择题选项
    if (question.type === '单选题' || question.type === '多选题') {
      if (!processedQuestion.options || processedQuestion.options.length === 0) {
        // 如果没有options，尝试从optionA, optionB等字段构建
        const options = [];
        const questionAny = question as any;
        
        if (questionAny.optionA) options.push({ id: 'A', text: questionAny.optionA, isCorrect: false });
        if (questionAny.optionB) options.push({ id: 'B', text: questionAny.optionB, isCorrect: false });
        if (questionAny.optionC) options.push({ id: 'C', text: questionAny.optionC, isCorrect: false });
        if (questionAny.optionD) options.push({ id: 'D', text: questionAny.optionD, isCorrect: false });
        
        // 标记正确答案
        const correctAnswers = question.correctAnswer.split(',').map(ans => ans.trim());
        options.forEach(option => {
          if (correctAnswers.includes(option.text) || correctAnswers.includes(option.id)) {
            option.isCorrect = true;
          }
        });
        
        processedQuestion.options = options;
      }
    }
    
    return processedQuestion;
  });
}

/**
 * 模拟保存题目到数据库
 * @param questions - 题目列表
 * @returns 保存结果
 */
async function saveQuestionsToDatabase(questions: Question[]): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
  try {
    // 这里应该是实际的数据库保存逻辑
    // 目前模拟保存过程
    
    const processedQuestions = processQuestions(questions);
    
    // 模拟异步保存
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 在实际实现中，这里应该调用数据库API
    // 例如：await db.questions.createMany({ data: processedQuestions });
    
    console.log(`模拟保存${processedQuestions.length}道题目到数据库`);
    
    return {
      success: true,
      savedCount: processedQuestions.length,
      errors: []
    };
  } catch (error) {
    console.error('保存题目到数据库失败:', error);
    return {
      success: false,
      savedCount: 0,
      errors: [error instanceof Error ? error.message : '数据库保存失败']
    };
  }
}

/**
 * 模拟创建考试
 * @param examTitle - 考试标题
 * @param questions - 题目列表
 * @param typeDistribution - 题型分布
 * @returns 创建结果
 */
async function createExam(
  examTitle: string,
  questions: Question[],
  typeDistribution: QuestionTypeDistribution[]
): Promise<{ success: boolean; examId?: string; errors: string[] }> {
  try {
    // 生成唯一的考试ID
    let examId = generateExamId(examTitle);
    
    // 检查ID是否已存在，如果存在则重新生成
    let attempts = 0;
    while (await checkExamIdExists(examId) && attempts < 5) {
      examId = generateExamId(examTitle);
      attempts++;
    }
    
    if (attempts >= 5) {
      return {
        success: false,
        errors: ['无法生成唯一的考试ID，请稍后重试']
      };
    }
    
    // 计算总分
    const totalPoints = typeDistribution.reduce((sum, dist) => {
      return sum + (dist.count * dist.pointsPerQuestion);
    }, 0);
    
    // 模拟创建考试记录
    const examData = {
      id: examId,
      title: examTitle,
      description: `通过Excel导入创建的试卷，包含${questions.length}道题目`,
      totalQuestions: questions.length,
      totalPoints: totalPoints,
      duration: 120, // 默认120分钟
      questionIds: questions.map(q => q.id),
      typeDistribution: typeDistribution,
      status: 'draft', // 默认为草稿状态
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 模拟异步创建
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 在实际实现中，这里应该调用数据库API
    // 例如：await db.exams.create({ data: examData });
    
    console.log(`模拟创建考试: ${examTitle} (ID: ${examId})`);
    
    return {
      success: true,
      examId: examId,
      errors: []
    };
  } catch (error) {
    console.error('创建考试失败:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : '创建考试失败']
    };
  }
}

/**
 * POST /api/admin/exam-paper-import
 * 处理试卷导入请求
 * 
 * @param request - HTTP请求对象
 * @returns HTTP响应
 */
export async function POST(request: NextRequest): Promise<NextResponse<ExamPaperImportResponse>> {
  try {
    // 解析请求体
    const body: ExamPaperImportRequest = await request.json();
    
    // 验证请求数据
    if (!body.examTitle || body.examTitle.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: '试卷标题不能为空'
        },
        { status: 400 }
      );
    }
    
    // 验证题型分布
    const typeDistributionErrors = validateTypeDistribution(body.typeDistribution);
    if (typeDistributionErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: '题型分布数据验证失败',
          errors: typeDistributionErrors
        },
        { status: 400 }
      );
    }
    
    // 验证题目数据
    const questionErrors = validateQuestions(body.questions, body.typeDistribution);
    if (questionErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: '题目数据验证失败',
          errors: questionErrors
        },
        { status: 400 }
      );
    }
    
    // 保存题目到数据库
    const saveResult = await saveQuestionsToDatabase(body.questions);
    if (!saveResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: '保存题目失败',
          errors: saveResult.errors
        },
        { status: 500 }
      );
    }
    
    // 创建考试
    const examResult = await createExam(body.examTitle, body.questions, body.typeDistribution);
    if (!examResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: '创建考试失败',
          errors: examResult.errors
        },
        { status: 500 }
      );
    }
    
    // 返回成功响应
    return NextResponse.json(
      {
        success: true,
        message: `成功导入试卷"${body.examTitle}"，包含${body.questions.length}道题目`,
        importedCount: saveResult.savedCount,
        examId: examResult.examId
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('试卷导入API错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: '服务器内部错误',
        errors: [error instanceof Error ? error.message : '未知错误']
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/exam-paper-import
 * 获取导入状态或配置信息
 * 
 * @param request - HTTP请求对象
 * @returns HTTP响应
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 返回导入配置信息
    const config = {
      supportedFileTypes: ['.xlsx', '.xls'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxQuestions: 1000,
      supportedQuestionTypes: [
        '单选题',
        '多选题',
        '判断题',
        '填空题',
        '简答题',
        '论述题'
      ],
      requiredFields: {
        typeDistribution: ['题型', '题目数量', '每题分值'],
        questions: ['题号', '题型', '题目内容', '正确答案', '分值']
      },
      templateUrl: '/templates/试卷模板.xlsx'
    };
    
    return NextResponse.json(config, { status: 200 });
    
  } catch (error) {
    console.error('获取导入配置失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: '获取配置失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}