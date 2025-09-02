/**
 * 题目相关类型定义
 * 定义考试系统中题目的数据结构和枚举类型
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

/**
 * 题目类型枚举
 * 定义支持的题目类型
 */
export enum QuestionType {
  /** 单选题 */
  SINGLE_CHOICE = 'single_choice',
  /** 多选题 */
  MULTIPLE_CHOICE = 'multiple_choice',
  /** 判断题 */
  TRUE_FALSE = 'true_false',
  /** 填空题 */
  FILL_BLANK = 'fill_blank',
  /** 简答题 */
  SHORT_ANSWER = 'short_answer',
  /** 编程题 */
  CODING = 'coding'
}

/**
 * 题目难度枚举
 * 定义题目的难度级别
 */
export enum QuestionDifficulty {
  /** 简单 */
  EASY = 'easy',
  /** 中等 */
  MEDIUM = 'medium',
  /** 困难 */
  HARD = 'hard'
}

/**
 * 题目状态枚举
 * 定义题目的状态
 */
export enum QuestionStatus {
  /** 草稿 */
  DRAFT = 'draft',
  /** 已发布 */
  PUBLISHED = 'published',
  /** 已归档 */
  ARCHIVED = 'archived'
}

/**
 * 选择题选项接口
 * 定义选择题的选项结构
 */
export interface QuestionOption {
  /** 选项ID */
  id: string;
  /** 选项文本 */
  text: string;
  /** 是否为正确答案 */
  isCorrect: boolean;
  /** 选项解释（可选） */
  explanation?: string;
}

/**
 * 编程题测试用例接口
 * 定义编程题的测试用例结构
 */
export interface CodingTestCase {
  /** 测试用例ID */
  id: string;
  /** 输入数据 */
  input: string;
  /** 期望输出 */
  expectedOutput: string;
  /** 是否为示例用例 */
  isExample: boolean;
  /** 测试用例描述 */
  description?: string;
}

/**
 * 题目基础接口
 * 定义所有题目类型的通用属性
 */
export interface BaseQuestion {
  /** 题目ID */
  id: string;
  /** 题目标题 */
  title: string;
  /** 题目内容/描述 */
  content: string;
  /** 题目类型 */
  type: QuestionType;
  /** 题目难度 */
  difficulty: QuestionDifficulty;
  /** 题目状态 */
  status: QuestionStatus;
  /** 分值 */
  points: number;
  /** 所属分类/标签 */
  category?: string;
  /** 题目标签 */
  tags?: string[];
  /** 创建者ID */
  createdBy: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 题目解析 */
  explanation?: string;
  /** 参考资料链接 */
  references?: string[];
}

/**
 * 选择题接口
 * 继承基础题目接口，添加选择题特有属性
 */
export interface ChoiceQuestion extends BaseQuestion {
  type: QuestionType.SINGLE_CHOICE | QuestionType.MULTIPLE_CHOICE;
  /** 选项列表 */
  options: QuestionOption[];
  /** 是否随机排序选项 */
  shuffleOptions?: boolean;
}

/**
 * 判断题接口
 * 继承基础题目接口，添加判断题特有属性
 */
export interface TrueFalseQuestion extends BaseQuestion {
  type: QuestionType.TRUE_FALSE;
  /** 正确答案 */
  correctAnswer: boolean;
}

/**
 * 填空题接口
 * 继承基础题目接口，添加填空题特有属性
 */
export interface FillBlankQuestion extends BaseQuestion {
  type: QuestionType.FILL_BLANK;
  /** 正确答案列表（支持多个正确答案） */
  correctAnswers: string[];
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 是否允许部分匹配 */
  allowPartialMatch?: boolean;
}

/**
 * 简答题接口
 * 继承基础题目接口，添加简答题特有属性
 */
export interface ShortAnswerQuestion extends BaseQuestion {
  type: QuestionType.SHORT_ANSWER;
  /** 参考答案 */
  referenceAnswer?: string;
  /** 最大字数限制 */
  maxWords?: number;
  /** 评分标准 */
  gradingCriteria?: string[];
}

/**
 * 编程题接口
 * 继承基础题目接口，添加编程题特有属性
 */
export interface CodingQuestion extends BaseQuestion {
  type: QuestionType.CODING;
  /** 编程语言 */
  programmingLanguage: string;
  /** 初始代码模板 */
  codeTemplate?: string;
  /** 测试用例列表 */
  testCases: CodingTestCase[];
  /** 时间限制（毫秒） */
  timeLimit?: number;
  /** 内存限制（MB） */
  memoryLimit?: number;
}

/**
 * 题目联合类型
 * 包含所有题目类型的联合类型
 */
export type Question = 
  | ChoiceQuestion 
  | TrueFalseQuestion 
  | FillBlankQuestion 
  | ShortAnswerQuestion 
  | CodingQuestion;

/**
 * 题目创建请求接口
 * 用于创建新题目的请求数据结构
 */
export interface CreateQuestionRequest {
  /** 题目标题 */
  title: string;
  /** 题目内容 */
  content: string;
  /** 题目类型 */
  type: QuestionType;
  /** 题目难度 */
  difficulty: QuestionDifficulty;
  /** 分值 */
  points: number;
  /** 所属分类 */
  category?: string;
  /** 题目标签 */
  tags?: string[];
  /** 题目解析 */
  explanation?: string;
  /** 参考资料 */
  references?: string[];
  /** 题目特定数据（根据类型不同而不同） */
  questionData: any;
}

/**
 * 题目更新请求接口
 * 用于更新题目的请求数据结构
 */
export interface UpdateQuestionRequest extends Partial<CreateQuestionRequest> {
  /** 题目ID */
  id: string;
}

/**
 * 题目查询参数接口
 * 用于查询题目列表的参数
 */
export interface QuestionQueryParams {
  /** 搜索关键词 */
  search?: string;
  /** 题目类型过滤 */
  type?: QuestionType;
  /** 难度过滤 */
  difficulty?: QuestionDifficulty;
  /** 状态过滤 */
  status?: QuestionStatus;
  /** 分类过滤 */
  category?: string;
  /** 标签过滤 */
  tags?: string[];
  /** 创建者过滤 */
  createdBy?: string;
  /** 排序字段 */
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'difficulty' | 'points';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
}

/**
 * 题目查询响应接口
 * 题目列表查询的响应数据结构
 */
export interface QuestionQueryResponse {
  /** 题目列表 */
  questions: Question[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 题目统计信息接口
 * 题目相关的统计数据
 */
export interface QuestionStats {
  /** 总题目数 */
  totalQuestions: number;
  /** 按类型分组的统计 */
  byType: Record<QuestionType, number>;
  /** 按难度分组的统计 */
  byDifficulty: Record<QuestionDifficulty, number>;
  /** 按状态分组的统计 */
  byStatus: Record<QuestionStatus, number>;
  /** 按分类分组的统计 */
  byCategory: Record<string, number>;
}

/**
 * 题目导入接口
 * 用于批量导入题目的数据结构
 */
export interface QuestionImportData {
  /** 题目列表 */
  questions: CreateQuestionRequest[];
  /** 导入选项 */
  options?: {
    /** 是否覆盖已存在的题目 */
    overwrite?: boolean;
    /** 是否验证数据格式 */
    validate?: boolean;
  };
}

/**
 * 题目导入结果接口
 * 题目导入操作的结果
 */
export interface QuestionImportResult {
  /** 成功导入的数量 */
  successCount: number;
  /** 失败的数量 */
  failureCount: number;
  /** 跳过的数量 */
  skippedCount: number;
  /** 错误信息列表 */
  errors: Array<{
    /** 行号 */
    row: number;
    /** 错误信息 */
    message: string;
  }>;
}

/**
 * 题目答案接口
 * 用于存储用户对题目的答案
 */
export interface QuestionAnswer {
  /** 题目ID */
  questionId: string;
  /** 用户答案 */
  answer: any;
  /** 是否正确 */
  isCorrect?: boolean;
  /** 得分 */
  score?: number;
  /** 答题时间（秒） */
  timeSpent?: number;
  /** 答题时间戳 */
  answeredAt?: string;
}

/**
 * 题目评分结果接口
 * 题目评分的详细结果
 */
export interface QuestionGradingResult {
  /** 题目ID */
  questionId: string;
  /** 用户答案 */
  userAnswer: any;
  /** 正确答案 */
  correctAnswer: any;
  /** 是否正确 */
  isCorrect: boolean;
  /** 得分 */
  score: number;
  /** 满分 */
  maxScore: number;
  /** 评分详情 */
  details?: string;
  /** 反馈信息 */
  feedback?: string;
}