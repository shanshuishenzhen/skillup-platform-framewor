/**
 * 题目验证工具函数
 * 提供题目数据验证功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { 
  Question, 
  QuestionType, 
  QuestionDifficulty, 
  QuestionValidationResult,
  CreateQuestionRequest
} from '@/types/question';

/**
 * 验证题目基本信息
 * 
 * @param question - 题目数据
 * @returns 验证结果
 */
export function validateQuestionBasics(
  question: Partial<Question> | CreateQuestionRequest
): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证必填字段
  if (!question.type) {
    errors.push('题目类型不能为空');
  } else if (!isValidQuestionType(question.type)) {
    errors.push('无效的题目类型');
  }

  if (!question.title?.trim()) {
    errors.push('题目标题不能为空');
  } else if (question.title.length > 200) {
    warnings.push('题目标题过长，建议控制在200字符以内');
  }

  if (!question.content?.trim()) {
    errors.push('题目内容不能为空');
  } else if (question.content.length > 2000) {
    warnings.push('题目内容过长，建议控制在2000字符以内');
  }

  if (!question.difficulty) {
    errors.push('题目难度不能为空');
  } else if (!isValidQuestionDifficulty(question.difficulty)) {
    errors.push('无效的题目难度');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证选择题
 * 
 * @param question - 题目数据
 * @returns 验证结果
 */
export function validateChoiceQuestion(
  question: Partial<Question> | CreateQuestionRequest
): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!question.options || !Array.isArray(question.options)) {
    errors.push('选择题必须提供选项');
    return { isValid: false, errors, warnings };
  }

  if (question.options.length < 2) {
    errors.push('选择题必须提供至少2个选项');
  }

  if (question.options.length > 6) {
    warnings.push('选项过多可能影响用户体验，建议控制在6个以内');
  }

  // 验证选项内容
  question.options.forEach((option, index) => {
    if (!option.content?.trim()) {
      errors.push(`选项${index + 1}内容不能为空`);
    }
    if (!option.id?.trim()) {
      errors.push(`选项${index + 1}必须有唯一标识`);
    }
  });

  // 验证正确答案
  const correctOptions = question.options.filter(opt => opt.isCorrect);
  if (correctOptions.length === 0) {
    errors.push('选择题必须至少有一个正确答案');
  }

  if (question.type === 'single_choice' && correctOptions.length > 1) {
    errors.push('单选题只能有一个正确答案');
  }

  // 检查选项ID重复
  const optionIds = question.options.map(opt => opt.id);
  const uniqueIds = new Set(optionIds);
  if (optionIds.length !== uniqueIds.size) {
    errors.push('选项ID不能重复');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证判断题
 * 
 * @param question - 题目数据
 * @returns 验证结果
 */
export function validateTrueFalseQuestion(
  question: Partial<Question> | CreateQuestionRequest
): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!question.correctAnswer) {
    errors.push('判断题必须提供正确答案');
  } else if (!['true', 'false'].includes(question.correctAnswer)) {
    errors.push('判断题答案必须是true或false');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证填空题
 * 
 * @param question - 题目数据
 * @returns 验证结果
 */
export function validateFillBlankQuestion(
  question: Partial<Question> | CreateQuestionRequest
): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!question.correctAnswer?.trim()) {
    errors.push('填空题必须提供正确答案');
  }

  // 检查题目内容是否包含填空标记
  if (question.content && !question.content.includes('___') && !question.content.includes('____')) {
    warnings.push('建议在题目内容中使用下划线(___或____)标记填空位置');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证简答题
 * 
 * @param question - 题目数据
 * @returns 验证结果
 */
export function validateShortAnswerQuestion(
  question: Partial<Question> | CreateQuestionRequest
): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!question.correctAnswer?.trim()) {
    errors.push('简答题必须提供参考答案');
  } else if (question.correctAnswer.length < 10) {
    warnings.push('参考答案过短，建议提供更详细的答案');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证编程题
 * 
 * @param question - 题目数据
 * @returns 验证结果
 */
export function validateCodingQuestion(
  question: Partial<Question> | CreateQuestionRequest
): QuestionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!question.testCases || !Array.isArray(question.testCases)) {
    errors.push('编程题必须提供测试用例');
    return { isValid: false, errors, warnings };
  }

  if (question.testCases.length === 0) {
    errors.push('编程题必须至少提供一个测试用例');
  }

  // 验证测试用例
  question.testCases.forEach((testCase, index) => {
    if (!testCase.input && testCase.input !== '') {
      errors.push(`测试用例${index + 1}必须提供输入`);
    }
    if (!testCase.expectedOutput && testCase.expectedOutput !== '') {
      errors.push(`测试用例${index + 1}必须提供期望输出`);
    }
  });

  if (!question.codeTemplate) {
    warnings.push('建议提供代码模板以提升用户体验');
  }

  if (!question.language) {
    warnings.push('建议指定编程语言');
  }

  if (question.timeLimit && (question.timeLimit < 1000 || question.timeLimit > 30000)) {
    warnings.push('时间限制建议设置在1-30秒之间');
  }

  if (question.memoryLimit && (question.memoryLimit < 64 || question.memoryLimit > 512)) {
    warnings.push('内存限制建议设置在64-512MB之间');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证完整题目
 * 
 * @param question - 题目数据
 * @returns 验证结果
 */
export function validateQuestion(
  question: Partial<Question> | CreateQuestionRequest
): QuestionValidationResult {
  // 基本验证
  const basicResult = validateQuestionBasics(question);
  if (!basicResult.isValid) {
    return basicResult;
  }

  // 根据题目类型进行特定验证
  let typeResult: QuestionValidationResult = { isValid: true, errors: [], warnings: [] };

  switch (question.type) {
    case 'single_choice':
    case 'multiple_choice':
      typeResult = validateChoiceQuestion(question);
      break;
    case 'true_false':
      typeResult = validateTrueFalseQuestion(question);
      break;
    case 'fill_blank':
      typeResult = validateFillBlankQuestion(question);
      break;
    case 'short_answer':
      typeResult = validateShortAnswerQuestion(question);
      break;
    case 'coding':
      typeResult = validateCodingQuestion(question);
      break;
    default:
      typeResult.errors.push('不支持的题目类型');
      break;
  }

  // 合并验证结果
  return {
    isValid: basicResult.isValid && typeResult.isValid,
    errors: [...basicResult.errors, ...typeResult.errors],
    warnings: [...basicResult.warnings, ...typeResult.warnings]
  };
}

/**
 * 批量验证题目
 * 
 * @param questions - 题目列表
 * @returns 验证结果列表
 */
export function validateQuestions(
  questions: (Partial<Question> | CreateQuestionRequest)[]
): QuestionValidationResult[] {
  return questions.map((question, index) => {
    const result = validateQuestion(question);
    return {
      ...result,
      questionIndex: index + 1
    };
  });
}

/**
 * 检查题目类型是否有效
 * 
 * @param type - 题目类型
 * @returns 是否有效
 */
export function isValidQuestionType(type: string): type is QuestionType {
  return ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'coding'].includes(type);
}

/**
 * 检查题目难度是否有效
 * 
 * @param difficulty - 题目难度
 * @returns 是否有效
 */
export function isValidQuestionDifficulty(difficulty: string): difficulty is QuestionDifficulty {
  return ['beginner', 'intermediate', 'advanced', 'expert'].includes(difficulty);
}

/**
 * 获取题目验证摘要
 * 
 * @param results - 验证结果列表
 * @returns 验证摘要
 */
export function getValidationSummary(results: QuestionValidationResult[]) {
  const totalQuestions = results.length;
  const validQuestions = results.filter(r => r.isValid).length;
  const invalidQuestions = totalQuestions - validQuestions;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    totalQuestions,
    validQuestions,
    invalidQuestions,
    totalErrors,
    totalWarnings,
    validationRate: totalQuestions > 0 ? (validQuestions / totalQuestions) * 100 : 0
  };
}