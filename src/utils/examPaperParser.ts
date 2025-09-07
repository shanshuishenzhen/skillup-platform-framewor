import * as XLSX from 'xlsx';
import { Question, QuestionType, QuestionDifficulty } from '../types/exam';

/**
 * 题型分布数据结构
 * 定义试卷中各种题型的数量和分值分配
 */
export interface QuestionTypeDistribution {
  /** 题型名称 */
  questionType: string;
  /** 题目数量 */
  count: number;
  /** 每题分值 */
  pointsPerQuestion: number;
  /** 总分值 */
  totalPoints: number;
  /** 难度等级 */
  difficulty?: string;
}

/**
 * 试卷题目数据结构
 * 包含具体的题目内容和选项
 */
export interface ExamPaperQuestion {
  /** 题目序号 */
  questionNumber: number;
  /** 题型 */
  questionType: string;
  /** 题目内容 */
  content: string;
  /** 选项A */
  optionA?: string;
  /** 选项B */
  optionB?: string;
  /** 选项C */
  optionC?: string;
  /** 选项D */
  optionD?: string;
  /** 正确答案 */
  correctAnswer: string;
  /** 题目分值 */
  points: number;
  /** 难度等级 */
  difficulty?: string;
  /** 解析说明 */
  explanation?: string;
}

/**
 * 试卷解析结果
 * 包含题型分布和具体题目数据
 */
export interface ExamPaperParseResult {
  /** 试卷名称 */
  examTitle?: string;
  /** 试卷ID（来自模板） */
  paperId?: string;
  /** 题型分布 */
  typeDistribution: QuestionTypeDistribution[];
  /** 试卷题目 */
  questions: ExamPaperQuestion[];
  /** 解析错误信息 */
  errors: string[];
  /** 解析警告信息 */
  warnings: string[];
}

/**
 * 题型映射表
 * 将Excel中的题型名称映射到系统定义的题型
 */
const QUESTION_TYPE_MAPPING: Record<string, QuestionType> = {
  '单选题': 'single_choice',
  '多选题': 'multiple_choice',
  '判断题': 'true_false',
  '填空题': 'fill_blank',
  '简答题': 'short_answer',
  '论述题': 'essay',
  '计算题': 'calculation',
  '编程题': 'programming'
};

/**
 * 难度映射表
 * 将Excel中的难度描述映射到系统定义的难度等级
 */
const DIFFICULTY_MAPPING: Record<string, QuestionDifficulty> = {
  '简单': 'easy',
  '容易': 'easy',
  '中等': 'medium',
  '普通': 'medium',
  '困难': 'hard',
  '难': 'hard'
};

/**
 * 解析题型分布工作表
 * @param worksheet - Excel工作表对象
 * @returns 题型分布数据数组和试卷ID
 */
function parseTypeDistribution(worksheet: XLSX.WorkSheet): {
  data: QuestionTypeDistribution[];
  errors: string[];
  paperId?: string;
} {
  const errors: string[] = [];
  const data: QuestionTypeDistribution[] = [];
  let paperId: string | undefined;
  
  try {
    // 将工作表转换为JSON数组
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      errors.push('题型分布工作表数据不足，至少需要标题行和一行数据');
      return { data, errors, paperId };
    }
    
    // 查找标题行（通常是第一行或第二行）
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(3, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.some((cell: any) => 
        typeof cell === 'string' && 
        (cell.includes('题型') || cell.includes('数量') || cell.includes('分值'))
      )) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      errors.push('未找到有效的标题行，请确保包含"题型"、"数量"、"分值"等列标题');
      return { data, errors, paperId };
    }
    
    const headers = jsonData[headerRowIndex].map((h: any) => String(h || '').trim());
    
    // 根据实际题型分布工作表列标题查找关键列的索引
    // 实际列标题：['试卷ID', '题型代码', '题量', '分值', 'Total']
    const paperIdIndex = headers.findIndex(h => h.includes('试卷ID') || h.includes('试卷编号'));
    const typeIndex = headers.findIndex(h => h.includes('题型代码') || h.includes('题型'));
    const countIndex = headers.findIndex(h => h.includes('题量') || h.includes('数量'));
    const pointsIndex = headers.findIndex(h => h.includes('分值') || h.includes('分数'));
    const difficultyIndex = headers.findIndex(h => h.includes('难度'));
    
    if (typeIndex === -1 || countIndex === -1 || pointsIndex === -1) {
      errors.push('缺少必要的列：题型、数量、分值');
      return { data, errors, paperId };
    }
    
    // 用于检查重复的题型代码
    const usedTypes = new Set<string>();
    
    // 解析数据行
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      // 提取试卷ID（只从第一行数据中提取）
      if (!paperId && paperIdIndex >= 0) {
        const extractedPaperId = String(row[paperIdIndex] || '').trim();
        if (extractedPaperId) {
          // 验证试卷ID格式（可以包含字母、数字、下划线、连字符）
          const paperIdPattern = /^[A-Za-z0-9_-]+$/;
          if (paperIdPattern.test(extractedPaperId)) {
            paperId = extractedPaperId;
          } else {
            errors.push(`第${i + 1}行：试卷ID格式不正确，只能包含字母、数字、下划线和连字符，当前值：${extractedPaperId}`);
          }
        }
      }
      
      const questionType = String(row[typeIndex] || '').trim();
      const count = Number(row[countIndex]) || 0;
      const pointsPerQuestion = Number(row[pointsIndex]) || 0;
      const difficulty = difficultyIndex >= 0 ? String(row[difficultyIndex] || '').trim() : '';
      
      if (!questionType) {
        errors.push(`第${i + 1}行：题型不能为空`);
        continue;
      }
      
      if (count <= 0) {
        errors.push(`第${i + 1}行：题目数量必须大于0`);
        continue;
      }
      
      if (pointsPerQuestion <= 0) {
        errors.push(`第${i + 1}行：分值必须大于0`);
        continue;
      }
      
      // 检查题型代码是否重复
      if (usedTypes.has(questionType)) {
        errors.push(`第${i + 1}行：题型代码"${questionType}"重复`);
        continue;
      }
      usedTypes.add(questionType);
      
      data.push({
        questionType,
        count,
        pointsPerQuestion,
        totalPoints: count * pointsPerQuestion,
        difficulty
      });
    }
    
  } catch (error) {
    errors.push(`解析题型分布时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return { data, errors, paperId };
}

/**
 * 解析试卷题目工作表
 * @param worksheet - Excel工作表对象
 * @returns 试卷题目数据数组
 */
function parseQuestions(worksheet: XLSX.WorkSheet): {
  data: ExamPaperQuestion[];
  errors: string[];
} {
  const errors: string[] = [];
  const data: ExamPaperQuestion[] = [];
  
  try {
    // 将工作表转换为JSON数组
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      errors.push('试卷题目工作表数据不足，至少需要标题行和一行数据');
      return { data, errors };
    }
    
    // 查找标题行
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(3, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.some((cell: any) => 
        typeof cell === 'string' && 
        (cell.includes('题目') || cell.includes('内容') || cell.includes('答案'))
      )) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      errors.push('未找到有效的标题行，请确保包含"题目"、"内容"、"答案"等列标题');
      return { data, errors };
    }
    
    const headers = jsonData[headerRowIndex].map((h: any) => String(h || '').trim());
    
    // 根据实际模板列标题查找关键列的索引
    // 实际模板列标题：['试卷ID', '试题ID', '序号', '认定点代码', '题型代码', '题号', '试题（题干）', '试题（选项 A）', '试题（选项 B）', '试题（选项 C）', '试题（选项 D）', '试题（选项 E）', '试题（选项 F）', '答案', '难度']
    const numberIndex = headers.findIndex(h => h.includes('序号') || h.includes('题号'));
    const typeIndex = headers.findIndex(h => h.includes('题型代码') || h.includes('题型'));
    const contentIndex = headers.findIndex(h => h.includes('试题（题干）') || h.includes('题干') || h.includes('题目') || h.includes('内容'));
    const optionAIndex = headers.findIndex(h => h.includes('试题（选项 A）'));
    const optionBIndex = headers.findIndex(h => h.includes('试题（选项 B）'));
    const optionCIndex = headers.findIndex(h => h.includes('试题（选项 C）'));
    const optionDIndex = headers.findIndex(h => h.includes('试题（选项 D）'));
    const answerIndex = headers.findIndex(h => h.includes('答案') || h.includes('正确答案'));
    const pointsIndex = headers.findIndex(h => h.includes('分值') || h.includes('分数'));
    const difficultyIndex = headers.findIndex(h => h.includes('难度'));
    const explanationIndex = headers.findIndex(h => h.includes('解析') || h.includes('说明'));
    const knowledgePointIndex = headers.findIndex(h => h.includes('认定点代码') || h.includes('知识点') || h.includes('标签'));
    
    if (contentIndex === -1 || answerIndex === -1) {
      errors.push('缺少必要的列：题目内容、正确答案');
      return { data, errors };
    }
    
    // 用于检查重复的题目序号
    const usedNumbers = new Set<number>();
    
    // 解析数据行
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const questionNumber = numberIndex >= 0 ? Number(row[numberIndex]) || (i - headerRowIndex) : (i - headerRowIndex);
      const questionType = typeIndex >= 0 ? String(row[typeIndex] || '').trim() : '';
      const content = String(row[contentIndex] || '').trim();
      const optionA = optionAIndex >= 0 ? String(row[optionAIndex] || '').trim() : '';
      const optionB = optionBIndex >= 0 ? String(row[optionBIndex] || '').trim() : '';
      const optionC = optionCIndex >= 0 ? String(row[optionCIndex] || '').trim() : '';
      const optionD = optionDIndex >= 0 ? String(row[optionDIndex] || '').trim() : '';
      const correctAnswer = String(row[answerIndex] || '').trim();
      const points = pointsIndex >= 0 ? Number(row[pointsIndex]) || 1 : 1;
      const difficulty = difficultyIndex >= 0 ? String(row[difficultyIndex] || '').trim() : '';
      const explanation = explanationIndex >= 0 ? String(row[explanationIndex] || '').trim() : '';
      
      if (!content) {
        errors.push(`第${i + 1}行：题目内容不能为空`);
        continue;
      }
      
      if (!correctAnswer) {
        errors.push(`第${i + 1}行：正确答案不能为空`);
        continue;
      }
      
      // 检查题目序号是否重复
      if (usedNumbers.has(questionNumber)) {
        errors.push(`第${i + 1}行：题目序号"${questionNumber}"重复`);
        continue;
      }
      usedNumbers.add(questionNumber);
      
      // 验证答案格式
      const answerPattern = /^[A-D]+$/i;
      if (!answerPattern.test(correctAnswer)) {
        errors.push(`第${i + 1}行：答案格式不正确，应为A、B、C、D的组合，当前值：${correctAnswer}`);
        continue;
      }
      
      const question: ExamPaperQuestion = {
        questionNumber,
        questionType,
        content,
        correctAnswer: correctAnswer.toUpperCase(),
        points
      };
      
      // 添加选项（如果存在）
      if (optionA) question.optionA = optionA;
      if (optionB) question.optionB = optionB;
      if (optionC) question.optionC = optionC;
      if (optionD) question.optionD = optionD;
      if (difficulty) question.difficulty = difficulty;
      if (explanation) question.explanation = explanation;
      
      data.push(question);
    }
    
  } catch (error) {
    errors.push(`解析试卷题目时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return { data, errors };
}

/**
 * 验证题型分布与题目数据的一致性
 * @param typeDistribution - 题型分布数据
 * @param questions - 题目数据
 * @returns 验证错误信息
 */
function validateConsistency(
  typeDistribution: QuestionTypeDistribution[],
  questions: ExamPaperQuestion[]
): string[] {
  const errors: string[] = [];
  
  // 统计实际题目数量和分值
  const actualCounts: Record<string, number> = {};
  const actualPoints: Record<string, number> = {};
  
  questions.forEach(q => {
    const type = q.questionType || '未分类';
    actualCounts[type] = (actualCounts[type] || 0) + 1;
    actualPoints[type] = (actualPoints[type] || 0) + q.points;
  });
  
  // 检查题型分布与实际题目数量是否一致
  typeDistribution.forEach(dist => {
    const actualCount = actualCounts[dist.questionType] || 0;
    const actualTotalPoints = actualPoints[dist.questionType] || 0;
    
    if (actualCount !== dist.count) {
      errors.push(
        `题型"${dist.questionType}"数量不一致：分布表显示${dist.count}题，实际有${actualCount}题`
      );
    }
    
    // 检查总分值是否一致（允许小的浮点数误差）
    if (Math.abs(actualTotalPoints - dist.totalPoints) > 0.01) {
      errors.push(
        `题型"${dist.questionType}"总分值不一致：分布表显示${dist.totalPoints}分，实际总分${actualTotalPoints}分`
      );
    }
  });
  
  // 检查是否有未在分布表中定义的题型
  Object.keys(actualCounts).forEach(type => {
    if (!typeDistribution.find(dist => dist.questionType === type)) {
      errors.push(`题型"${type}"在题型分布表中未定义`);
    }
  });
  
  // 检查题目序号是否连续
  const sequences = questions.map(q => q.questionNumber).sort((a, b) => a - b);
  for (let i = 0; i < sequences.length - 1; i++) {
    if (sequences[i + 1] - sequences[i] > 1) {
      errors.push(`题目序号不连续：第${sequences[i]}题后缺少第${sequences[i] + 1}题`);
    }
  }
  
  return errors;
}

/**
 * 将解析结果转换为系统可用的题目格式
 * @param questions - 解析的题目数据
 * @param typeDistribution - 题型分布数据
 * @returns 系统题目格式数组
 */
export function convertToSystemQuestions(
  questions: ExamPaperQuestion[],
  typeDistribution: QuestionTypeDistribution[]
): Question[] {
  return questions.map((q, index) => {
    const systemType = QUESTION_TYPE_MAPPING[q.questionType] || 'single_choice';
    const systemDifficulty = q.difficulty ? DIFFICULTY_MAPPING[q.difficulty] || 'medium' : 'medium';
    
    const options: any[] = [];
    if (q.optionA) options.push({ id: 'A', text: q.optionA, isCorrect: q.correctAnswer.includes('A') });
    if (q.optionB) options.push({ id: 'B', text: q.optionB, isCorrect: q.correctAnswer.includes('B') });
    if (q.optionC) options.push({ id: 'C', text: q.optionC, isCorrect: q.correctAnswer.includes('C') });
    if (q.optionD) options.push({ id: 'D', text: q.optionD, isCorrect: q.correctAnswer.includes('D') });
    
    return {
      id: `imported_${Date.now()}_${index}`,
      content: q.content,
      type: systemType,
      difficulty: systemDifficulty,
      points: q.points,
      options: options.length > 0 ? options : undefined,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      tags: [q.questionType],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Question;
  });
}

/**
 * 解析试卷Excel文件
 * @param file - Excel文件对象
 * @returns Promise<ExamPaperParseResult> 解析结果
 */
export async function parseExamPaperFile(file: File): Promise<ExamPaperParseResult> {
  const result: ExamPaperParseResult = {
    typeDistribution: [],
    questions: [],
    errors: [],
    warnings: []
  };
  
  try {
    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // 检查工作表
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      result.errors.push('Excel文件中没有找到工作表');
      return result;
    }
    
    // 查找题型分布工作表
    let typeDistSheet = null;
    let questionsSheet = null;
    
    for (const sheetName of sheetNames) {
      if (sheetName.includes('题型') || sheetName.includes('分布')) {
        typeDistSheet = workbook.Sheets[sheetName];
      }
      if (sheetName.includes('题目') || sheetName.includes('试卷')) {
        questionsSheet = workbook.Sheets[sheetName];
      }
    }
    
    // 如果没有找到指定名称的工作表，使用前两个工作表
    if (!typeDistSheet && sheetNames.length >= 1) {
      typeDistSheet = workbook.Sheets[sheetNames[0]];
      result.warnings.push(`未找到"题型分布"工作表，使用第一个工作表"${sheetNames[0]}"`);
    }
    
    if (!questionsSheet && sheetNames.length >= 2) {
      questionsSheet = workbook.Sheets[sheetNames[1]];
      result.warnings.push(`未找到"试卷题目"工作表，使用第二个工作表"${sheetNames[1]}"`);
    }
    
    // 解析题型分布
    if (typeDistSheet) {
      const typeDistResult = parseTypeDistribution(typeDistSheet);
      result.typeDistribution = typeDistResult.data;
      result.errors.push(...typeDistResult.errors);
      
      // 设置试卷ID
      if (typeDistResult.paperId) {
        result.paperId = typeDistResult.paperId;
      } else {
        result.warnings.push('未找到试卷ID，系统将自动生成');
      }
    } else {
      result.errors.push('未找到题型分布工作表');
    }
    
    // 解析试卷题目
    if (questionsSheet) {
      const questionsResult = parseQuestions(questionsSheet);
      result.questions = questionsResult.data;
      result.errors.push(...questionsResult.errors);
      
      // 根据题型分布表修正题目分值
      if (result.typeDistribution.length > 0) {
        result.questions = result.questions.map(question => {
          const typeDistribution = result.typeDistribution.find(dist => dist.questionType === question.questionType);
          if (typeDistribution) {
            // 使用题型分布表中的每题分值
            question.points = typeDistribution.pointsPerQuestion;
          }
          return question;
        });
      }
    } else {
      result.errors.push('未找到试卷题目工作表');
    }
    
    // 验证一致性
    if (result.typeDistribution.length > 0 && result.questions.length > 0) {
      const consistencyErrors = validateConsistency(result.typeDistribution, result.questions);
      result.errors.push(...consistencyErrors);
    }
    
    // 额外的业务逻辑验证
    if (result.questions.length > 0) {
      // 检查试卷总题数是否合理
      if (result.questions.length > 200) {
        result.warnings.push(`试卷题目数量较多（${result.questions.length}题），请确认是否正确`);
      }
      
      // 检查试卷总分值是否合理
      const totalPoints = result.questions.reduce((sum, q) => sum + q.points, 0);
      if (totalPoints > 200) {
        result.warnings.push(`试卷总分值较高（${totalPoints}分），请确认是否正确`);
      }
      
      // 检查是否所有题目都有相同的分值（可能的错误）
      const uniquePoints = [...new Set(result.questions.map(q => q.points))];
      if (uniquePoints.length === 1 && result.questions.length > 10) {
        result.warnings.push(`所有题目分值相同（${uniquePoints[0]}分），请确认是否正确`);
      }
    }
    
    // 设置试卷名称（从文件名提取）
    result.examTitle = file.name.replace(/\.[^/.]+$/, '');
    
    // 验证试卷名称
    if (!result.examTitle || result.examTitle.trim() === '') {
      result.warnings.push('无法从文件名提取试卷名称，请手动设置');
      result.examTitle = '未命名试卷';
    }
    
  } catch (error) {
    result.errors.push(`解析文件时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  return result;
}

/**
 * 生成试卷导入预览数据
 * @param parseResult - 解析结果
 * @returns 预览数据对象
 */
export function generatePreviewData(parseResult: ExamPaperParseResult) {
  const totalQuestions = parseResult.questions.length;
  const totalPoints = parseResult.questions.reduce((sum, q) => sum + q.points, 0);
  const typeStats = parseResult.typeDistribution.map(dist => ({
    type: dist.questionType,
    expected: dist.count,
    actual: parseResult.questions.filter(q => q.questionType === dist.questionType).length,
    points: dist.totalPoints
  }));
  
  return {
    examTitle: parseResult.examTitle,
    paperId: parseResult.paperId,
    totalQuestions,
    totalPoints,
    typeStats,
    hasErrors: parseResult.errors.length > 0,
    hasWarnings: parseResult.warnings.length > 0,
    errors: parseResult.errors,
    warnings: parseResult.warnings
  };
}