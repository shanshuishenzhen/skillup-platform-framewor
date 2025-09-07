/**
 * 成绩管理系统类型定义
 * 定义成绩相关的所有接口、枚举和类型
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

// ============================================================================
// 枚举定义
// ============================================================================

/**
 * 成绩状态枚举
 * 定义成绩的各种状态
 */
export enum GradeStatus {
  /** 待评分 - 考试已提交但未评分 */
  PENDING = 'pending',
  /** 已评分 - 考试已完成评分 */
  GRADED = 'graded',
  /** 需要复评 - 成绩需要重新评分 */
  NEEDS_REVIEW = 'needs_review',
  /** 已发布 - 成绩已发布给学员 */
  PUBLISHED = 'published',
  /** 已归档 - 成绩已归档 */
  ARCHIVED = 'archived'
}

/**
 * 成绩等级枚举
 * 定义成绩的等级分类
 */
export enum GradeLevel {
  /** 优秀 - 90分以上 */
  EXCELLENT = 'excellent',
  /** 良好 - 80-89分 */
  GOOD = 'good',
  /** 中等 - 70-79分 */
  AVERAGE = 'average',
  /** 及格 - 60-69分 */
  PASS = 'pass',
  /** 不及格 - 60分以下 */
  FAIL = 'fail'
}

/**
 * 统计时间范围枚举
 * 定义统计分析的时间范围
 */
export enum StatsPeriod {
  /** 今日 */
  TODAY = 'today',
  /** 本周 */
  THIS_WEEK = 'this_week',
  /** 本月 */
  THIS_MONTH = 'this_month',
  /** 本季度 */
  THIS_QUARTER = 'this_quarter',
  /** 本年 */
  THIS_YEAR = 'this_year',
  /** 自定义 */
  CUSTOM = 'custom'
}

// ============================================================================
// 基础接口定义
// ============================================================================

/**
 * 成绩基础信息接口
 * 定义成绩的核心属性
 */
export interface BaseGrade {
  /** 成绩记录ID */
  id: string;
  /** 考试ID */
  exam_id: string;
  /** 用户ID */
  user_id: string;
  /** 提交记录ID */
  submission_id: string;
  /** 得分 */
  score: number;
  /** 最高分 */
  max_score: number;
  /** 得分百分比 */
  percentage: number;
  /** 成绩等级 */
  grade_level: GradeLevel;
  /** 是否通过 */
  passed: boolean;
  /** 成绩状态 */
  status: GradeStatus;
  /** 评分时间 */
  graded_at?: string;
  /** 发布时间 */
  published_at?: string;
  /** 评分者ID */
  graded_by?: string;
  /** 评分备注 */
  grading_notes?: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/**
 * 完整成绩接口
 * 继承基础成绩信息，添加关联数据
 */
export interface Grade extends BaseGrade {
  /** 考试信息 */
  exam?: {
    id: string;
    title: string;
    difficulty: string;
    category?: string;
  };
  /** 用户信息 */
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  /** 题目结果详情 */
  question_results?: QuestionResult[];
  /** 排名信息 */
  rank?: number;
  /** 用时（分钟） */
  time_spent?: number;
}

/**
 * 题目结果接口
 * 定义单个题目的答题结果
 */
export interface QuestionResult {
  /** 题目ID */
  question_id: string;
  /** 题目类型 */
  question_type: string;
  /** 用户答案 */
  user_answer: any;
  /** 正确答案 */
  correct_answer: any;
  /** 是否正确 */
  is_correct: boolean;
  /** 得分 */
  score: number;
  /** 最高分 */
  max_score: number;
  /** 答题时间 */
  answered_at: string;
  /** 用时（秒） */
  time_spent: number;
}

// ============================================================================
// 统计分析接口
// ============================================================================

/**
 * 成绩统计信息接口
 * 定义成绩的统计数据
 */
export interface GradeStats {
  /** 总参与人数 */
  total_participants: number;
  /** 通过人数 */
  passed_count: number;
  /** 通过率（百分比） */
  pass_rate: number;
  /** 平均分 */
  average_score: number;
  /** 最高分 */
  highest_score: number;
  /** 最低分 */
  lowest_score: number;
  /** 中位数 */
  median_score: number;
  /** 标准差 */
  standard_deviation: number;
  /** 分数分布 */
  score_distribution: ScoreDistribution[];
  /** 等级分布 */
  grade_distribution: Record<GradeLevel, number>;
}

/**
 * 分数分布接口
 * 定义分数区间的分布情况
 */
export interface ScoreDistribution {
  /** 分数区间（如："90-100"） */
  range: string;
  /** 人数 */
  count: number;
  /** 百分比 */
  percentage: number;
}

/**
 * 考试分析数据接口
 * 定义考试的详细分析信息
 */
export interface ExamAnalysis {
  /** 考试ID */
  exam_id: string;
  /** 考试标题 */
  exam_title: string;
  /** 基础统计 */
  basic_stats: GradeStats;
  /** 题目分析 */
  question_analysis: QuestionAnalysis[];
  /** 时间分析 */
  time_analysis: TimeAnalysis;
  /** 难度分析 */
  difficulty_analysis: DifficultyAnalysis;
  /** 趋势分析 */
  trend_analysis?: TrendAnalysis;
}

/**
 * 题目分析接口
 * 定义单个题目的分析数据
 */
export interface QuestionAnalysis {
  /** 题目ID */
  question_id: string;
  /** 题目内容 */
  question_content: string;
  /** 题目类型 */
  question_type: string;
  /** 正确人数 */
  correct_count: number;
  /** 总答题人数 */
  total_count: number;
  /** 正确率 */
  correct_rate: number;
  /** 平均得分 */
  average_score: number;
  /** 难度系数 */
  difficulty_coefficient: number;
  /** 区分度 */
  discrimination_index: number;
  /** 选项分析（选择题） */
  option_analysis?: OptionAnalysis[];
}

/**
 * 选项分析接口
 * 定义选择题选项的分析数据
 */
export interface OptionAnalysis {
  /** 选项标识 */
  option_id: string;
  /** 选项内容 */
  option_content: string;
  /** 选择人数 */
  selected_count: number;
  /** 选择率 */
  selection_rate: number;
  /** 是否正确选项 */
  is_correct: boolean;
}

/**
 * 时间分析接口
 * 定义考试时间相关的分析数据
 */
export interface TimeAnalysis {
  /** 平均用时（分钟） */
  average_time: number;
  /** 最短用时（分钟） */
  min_time: number;
  /** 最长用时（分钟） */
  max_time: number;
  /** 时间分布 */
  time_distribution: TimeDistribution[];
  /** 时间与成绩相关性 */
  time_score_correlation: number;
}

/**
 * 时间分布接口
 * 定义用时区间的分布情况
 */
export interface TimeDistribution {
  /** 时间区间（如："0-30分钟"） */
  range: string;
  /** 人数 */
  count: number;
  /** 百分比 */
  percentage: number;
  /** 该区间平均分 */
  average_score: number;
}

/**
 * 难度分析接口
 * 定义考试难度相关的分析数据
 */
export interface DifficultyAnalysis {
  /** 整体难度系数 */
  overall_difficulty: number;
  /** 各难度题目统计 */
  difficulty_stats: Record<string, {
    count: number;
    average_score: number;
    pass_rate: number;
  }>;
  /** 难度建议 */
  difficulty_suggestions: string[];
}

/**
 * 趋势分析接口
 * 定义成绩趋势相关的分析数据
 */
export interface TrendAnalysis {
  /** 时间序列数据 */
  time_series: TrendPoint[];
  /** 趋势方向 */
  trend_direction: 'up' | 'down' | 'stable';
  /** 趋势强度 */
  trend_strength: number;
  /** 预测数据 */
  predictions?: TrendPoint[];
}

/**
 * 趋势点接口
 * 定义趋势分析中的数据点
 */
export interface TrendPoint {
  /** 时间 */
  date: string;
  /** 平均分 */
  average_score: number;
  /** 通过率 */
  pass_rate: number;
  /** 参与人数 */
  participant_count: number;
}

// ============================================================================
// 请求和响应接口
// ============================================================================

/**
 * 成绩查询参数接口
 * 定义查询成绩列表时的过滤和排序参数
 */
export interface GradeQueryParams {
  /** 考试ID过滤 */
  exam_id?: string;
  /** 用户ID过滤 */
  user_id?: string;
  /** 成绩状态过滤 */
  status?: GradeStatus;
  /** 成绩等级过滤 */
  grade_level?: GradeLevel;
  /** 是否通过过滤 */
  passed?: boolean;
  /** 最低分过滤 */
  min_score?: number;
  /** 最高分过滤 */
  max_score?: number;
  /** 开始时间过滤 */
  start_date?: string;
  /** 结束时间过滤 */
  end_date?: string;
  /** 搜索关键词 */
  search?: string;
  /** 排序字段 */
  sort_by?: string;
  /** 排序顺序 */
  sort_order?: 'asc' | 'desc';
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
}

/**
 * 成绩查询响应接口
 * 定义查询成绩列表的返回数据结构
 */
export interface GradeQueryResponse {
  /** 成绩列表 */
  grades: Grade[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  total_pages: number;
  /** 统计信息 */
  stats?: GradeStats;
}

/**
 * 成绩更新请求接口
 * 定义更新成绩时的数据结构
 */
export interface UpdateGradeRequest {
  /** 成绩ID */
  id: string;
  /** 新分数 */
  score?: number;
  /** 成绩状态 */
  status?: GradeStatus;
  /** 评分备注 */
  grading_notes?: string;
  /** 是否发布 */
  publish?: boolean;
}

/**
 * 批量更新成绩请求接口
 * 定义批量更新成绩时的数据结构
 */
export interface BatchUpdateGradeRequest {
  /** 成绩ID列表 */
  grade_ids: string[];
  /** 更新数据 */
  updates: Partial<UpdateGradeRequest>;
}

/**
 * 成绩导出请求接口
 * 定义导出成绩时的参数
 */
export interface ExportGradeRequest {
  /** 查询参数 */
  query_params: GradeQueryParams;
  /** 导出格式 */
  format: 'excel' | 'csv' | 'pdf';
  /** 包含的字段 */
  fields?: string[];
  /** 是否包含详细信息 */
  include_details?: boolean;
}

/**
 * 成绩报告请求接口
 * 定义生成成绩报告时的参数
 */
export interface GradeReportRequest {
  /** 考试ID */
  exam_id: string;
  /** 报告类型 */
  report_type: 'summary' | 'detailed' | 'analysis';
  /** 统计时间范围 */
  period?: StatsPeriod;
  /** 自定义开始时间 */
  start_date?: string;
  /** 自定义结束时间 */
  end_date?: string;
  /** 是否包含图表 */
  include_charts?: boolean;
}

// ============================================================================
// 导出所有类型
// ============================================================================

export type {
  BaseGrade,
  Grade,
  QuestionResult,
  GradeStats,
  ScoreDistribution,
  ExamAnalysis,
  QuestionAnalysis,
  OptionAnalysis,
  TimeAnalysis,
  TimeDistribution,
  DifficultyAnalysis,
  TrendAnalysis,
  TrendPoint,
  GradeQueryParams,
  GradeQueryResponse,
  UpdateGradeRequest,
  BatchUpdateGradeRequest,
  ExportGradeRequest,
  GradeReportRequest
};

// 默认导出主要的成绩接口
export default Grade;