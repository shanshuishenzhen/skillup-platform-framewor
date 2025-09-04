/**
 * 考试系统类型定义
 * 定义考试相关的所有接口、枚举和类型
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

// ============================================================================
// 枚举定义
// ============================================================================

/**
 * 考试状态枚举
 * 定义考试的各种状态
 */
export enum ExamStatus {
  /** 草稿状态 - 考试正在创建中，未发布 */
  DRAFT = 'draft',
  /** 已发布 - 考试已发布，用户可以报名和参加 */
  PUBLISHED = 'published',
  /** 进行中 - 考试正在进行中 */
  IN_PROGRESS = 'in_progress',
  /** 已结束 - 考试已结束，不再接受新的参与 */
  ENDED = 'ended',
  /** 已归档 - 考试已归档，仅供查看历史记录 */
  ARCHIVED = 'archived',
  /** 已取消 - 考试被取消 */
  CANCELLED = 'cancelled'
}

/**
 * 考试难度枚举
 * 定义考试的难度级别
 */
export enum ExamDifficulty {
  /** 初级 - 适合初学者 */
  BEGINNER = 'beginner',
  /** 中级 - 适合有一定基础的学习者 */
  INTERMEDIATE = 'intermediate',
  /** 高级 - 适合有丰富经验的学习者 */
  ADVANCED = 'advanced',
  /** 专家级 - 适合专业人士 */
  EXPERT = 'expert'
}

/**
 * 考试参与状态枚举
 * 定义用户参与考试的状态
 */
export enum ParticipationStatus {
  /** 已报名 - 用户已报名但未开始考试 */
  ENROLLED = 'enrolled',
  /** 进行中 - 用户正在参加考试 */
  IN_PROGRESS = 'in_progress',
  /** 已完成 - 用户已完成考试 */
  COMPLETED = 'completed',
  /** 已放弃 - 用户放弃了考试 */
  ABANDONED = 'abandoned',
  /** 超时 - 考试时间到期 */
  TIMEOUT = 'timeout'
}

/**
 * 考试提交状态枚举
 * 定义考试提交的状态
 */
export enum SubmissionStatus {
  /** 进行中 - 考试正在进行 */
  IN_PROGRESS = 'in_progress',
  /** 已提交 - 考试已提交 */
  SUBMITTED = 'submitted',
  /** 已完成 - 考试已完成并评分 */
  COMPLETED = 'completed',
  /** 已超时 - 考试时间到期自动提交 */
  TIMEOUT = 'timeout'
}

// ============================================================================
// 基础接口定义
// ============================================================================

/**
 * 考试基础信息接口
 * 定义考试的核心属性
 */
export interface BaseExam {
  /** 考试唯一标识符 */
  id: string;
  /** 考试标题 */
  title: string;
  /** 考试描述 */
  description: string;
  /** 考试难度 */
  difficulty: ExamDifficulty;
  /** 考试状态 */
  status: ExamStatus;
  /** 考试时长（分钟） */
  duration: number;
  /** 题目总数 */
  total_questions: number;
  /** 及格分数 */
  passing_score: number;
  /** 最大尝试次数 */
  max_attempts: number;
  /** 考试分类 */
  category?: string;
  /** 考试标签 */
  tags: string[];
  /** 考试说明 */
  instructions?: string;
  /** 题目ID列表 */
  question_ids: string[];
  /** 考试设置 */
  settings: ExamSettings;
  /** 创建者ID */
  created_by: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
  /** 开始时间（可选，用于定时考试） */
  start_time?: string;
  /** 结束时间（可选，用于定时考试） */
  end_time?: string;
}

/**
 * 考试设置接口
 * 定义考试的各种配置选项
 */
export interface ExamSettings {
  /** 是否允许查看答案 */
  allowReviewAnswers?: boolean;
  /** 是否显示正确答案 */
  showCorrectAnswers?: boolean;
  /** 是否显示分数 */
  showScore?: boolean;
  /** 是否随机题目顺序 */
  randomizeQuestions?: boolean;
  /** 是否随机选项顺序 */
  randomizeOptions?: boolean;
  /** 是否启用防作弊 */
  enableAntiCheat?: boolean;
  /** 是否允许暂停 */
  allowPause?: boolean;
  /** 是否自动提交 */
  autoSubmit?: boolean;
  /** 每页题目数量 */
  questionsPerPage?: number;
  /** 是否显示进度条 */
  showProgress?: boolean;
  /** 是否显示剩余时间 */
  showTimeRemaining?: boolean;
  /** 提交前确认 */
  confirmBeforeSubmit?: boolean;
}

/**
 * 完整考试接口
 * 继承基础考试信息，添加额外的计算属性
 */
export interface Exam extends BaseExam {
  /** 参与人数（计算属性） */
  participant_count?: number;
  /** 平均分（计算属性） */
  average_score?: number;
  /** 通过率（计算属性） */
  pass_rate?: number;
}

// ============================================================================
// 请求和响应接口
// ============================================================================

/**
 * 创建考试请求接口
 * 定义创建考试时需要的数据
 */
export interface CreateExamRequest {
  /** 考试标题 */
  title: string;
  /** 考试描述 */
  description: string;
  /** 考试难度 */
  difficulty: ExamDifficulty;
  /** 考试时长（分钟） */
  duration: number;
  /** 题目总数 */
  totalQuestions: number;
  /** 及格分数 */
  passingScore: number;
  /** 最大尝试次数（可选，默认为1） */
  maxAttempts?: number;
  /** 考试分类（可选） */
  category?: string;
  /** 考试标签（可选） */
  tags?: string[];
  /** 考试说明（可选） */
  instructions?: string;
  /** 题目ID列表（可选） */
  questionIds?: string[];
  /** 考试设置（可选） */
  settings?: ExamSettings;
  /** 开始时间（可选） */
  startTime?: string;
  /** 结束时间（可选） */
  endTime?: string;
}

/**
 * 更新考试请求接口
 * 定义更新考试时可以修改的数据
 */
export interface UpdateExamRequest {
  /** 考试ID */
  id: string;
  /** 考试标题（可选） */
  title?: string;
  /** 考试描述（可选） */
  description?: string;
  /** 考试难度（可选） */
  difficulty?: ExamDifficulty;
  /** 考试状态（可选） */
  status?: ExamStatus;
  /** 考试时长（可选） */
  duration?: number;
  /** 题目总数（可选） */
  totalQuestions?: number;
  /** 及格分数（可选） */
  passingScore?: number;
  /** 最大尝试次数（可选） */
  maxAttempts?: number;
  /** 考试分类（可选） */
  category?: string;
  /** 考试标签（可选） */
  tags?: string[];
  /** 考试说明（可选） */
  instructions?: string;
  /** 题目ID列表（可选） */
  questionIds?: string[];
  /** 考试设置（可选） */
  settings?: ExamSettings;
  /** 开始时间（可选） */
  startTime?: string;
  /** 结束时间（可选） */
  endTime?: string;
}

/**
 * 考试查询参数接口
 * 定义查询考试列表时的过滤和排序参数
 */
export interface ExamQueryParams {
  /** 搜索关键词（可选） */
  search?: string;
  /** 考试状态过滤（可选） */
  status?: ExamStatus;
  /** 考试难度过滤（可选） */
  difficulty?: ExamDifficulty;
  /** 考试分类过滤（可选） */
  category?: string;
  /** 标签过滤（可选） */
  tags?: string[];
  /** 创建者过滤（可选） */
  createdBy?: string;
  /** 排序字段（可选，默认为createdAt） */
  sortBy?: string;
  /** 排序顺序（可选，默认为desc） */
  sortOrder?: 'asc' | 'desc';
  /** 页码（可选，默认为1） */
  page?: number;
  /** 每页数量（可选，默认为20） */
  limit?: number;
}

/**
 * 考试查询响应接口
 * 定义查询考试列表的返回数据结构
 */
export interface ExamQueryResponse {
  /** 考试列表 */
  exams: Exam[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

// ============================================================================
// 考试参与相关接口
// ============================================================================

/**
 * 考试资格检查结果接口
 * 定义用户是否有资格参加考试的检查结果
 */
export interface ExamEligibility {
  /** 是否可以参加考试 */
  can_take: boolean;
  /** 是否已报名 */
  is_registered: boolean;
  /** 剩余尝试次数 */
  attempts_remaining: number;
  /** 不能参加的原因（当can_take为false时） */
  reason?: string;
}

/**
 * 考试参与记录接口
 * 定义用户参与考试的记录
 */
export interface ExamParticipation {
  /** 参与记录ID */
  id: string;
  /** 考试ID */
  exam_id: string;
  /** 用户ID */
  user_id: string;
  /** 报名时间 */
  enrolled_at: string;
  /** 已使用的尝试次数 */
  attempts_used: number;
  /** 参与状态 */
  status: ParticipationStatus;
  /** 最后活动时间 */
  last_activity?: string;
  /** 备注信息 */
  notes?: string;
}

/**
 * 考试提交记录接口
 * 定义用户考试提交的详细信息
 */
export interface ExamSubmission {
  /** 提交记录ID */
  id: string;
  /** 考试ID */
  exam_id: string;
  /** 用户ID */
  user_id: string;
  /** 开始时间 */
  started_at: string;
  /** 结束时间 */
  end_time: string;
  /** 提交时间 */
  submitted_at?: string;
  /** 提交状态 */
  status: SubmissionStatus;
  /** 用户答案 */
  answers: Record<string, {
    /** 答案内容 */
    answer: any;
    /** 答题时间 */
    answeredAt: string;
  }>;
  /** 得分 */
  score?: number;
  /** 最高分 */
  max_score?: number;
  /** 是否通过 */
  passed?: boolean;
  /** 尝试次数 */
  attempt_number: number;
  /** 评分详情 */
  grading_details?: any;
  /** 更新时间 */
  updated_at?: string;
}

/**
 * 考试结果接口
 * 定义考试完成后的结果信息
 */
export interface ExamResult {
  /** 结果记录ID */
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
  /** 是否通过 */
  passed: boolean;
  /** 完成时间 */
  completed_at: string;
  /** 用时（分钟） */
  time_spent: number;
  /** 题目结果详情 */
  question_results: any[];
  /** 排名（可选） */
  rank?: number;
  /** 证书ID（可选） */
  certificate_id?: string;
}

// ============================================================================
// 统计和分析接口
// ============================================================================

/**
 * 考试统计信息接口
 * 定义考试的统计数据
 */
export interface ExamStats {
  /** 参与人数 */
  participantCount: number;
  /** 通过人数 */
  passedCount: number;
  /** 通过率（百分比） */
  passRate: number;
  /** 平均分 */
  averageScore: number;
  /** 最高分 */
  highestScore: number;
  /** 最低分 */
  lowestScore: number;
  /** 分数分布 */
  scoreDistribution: Record<string, number>;
}

/**
 * 考试分析数据接口
 * 定义考试的详细分析信息
 */
export interface ExamAnalytics {
  /** 考试ID */
  examId: string;
  /** 题目分析 */
  questionAnalysis: Record<string, {
    /** 正确人数 */
    correctCount: number;
    /** 总人数 */
    totalCount: number;
    /** 正确率 */
    correctRate: number;
    /** 平均分 */
    averageScore: number;
  }>;
  /** 时间分析 */
  timeAnalysis: {
    /** 平均用时 */
    averageTimeSpent: number;
    /** 最短用时 */
    minTimeSpent: number;
    /** 最长用时 */
    maxTimeSpent: number;
  };
  /** 难度分析 */
  difficultyAnalysis: Record<string, any>;
}

/**
 * 考试评分结果接口
 * 定义考试评分的详细结果
 */
export interface ExamGradingResult {
  /** 总得分 */
  totalScore: number;
  /** 最高分 */
  maxScore: number;
  /** 是否通过 */
  passed: boolean;
  /** 题目结果列表 */
  questionResults: any[];
  /** 评分详情 */
  details: {
    /** 正确题目数 */
    correctCount: number;
    /** 总题目数 */
    totalQuestions: number;
    /** 正确率 */
    accuracy: number;
  };
}

// ============================================================================
// 防作弊相关接口
// ============================================================================

/**
 * 防作弊监控记录接口
 * 定义防作弊系统的监控数据
 */
export interface AntiCheatRecord {
  /** 记录ID */
  id: string;
  /** 考试提交ID */
  submission_id: string;
  /** 用户ID */
  user_id: string;
  /** 违规类型 */
  violation_type: string;
  /** 违规描述 */
  description: string;
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 检测时间 */
  detected_at: string;
  /** 相关数据 */
  metadata?: Record<string, any>;
  /** 处理状态 */
  status: 'pending' | 'reviewed' | 'resolved' | 'ignored';
  /** 处理备注 */
  notes?: string;
}

/**
 * 防作弊设置接口
 * 定义防作弊系统的配置选项
 */
export interface AntiCheatSettings {
  /** 是否启用全屏检测 */
  enableFullscreenDetection?: boolean;
  /** 是否启用标签页切换检测 */
  enableTabSwitchDetection?: boolean;
  /** 是否启用复制粘贴检测 */
  enableCopyPasteDetection?: boolean;
  /** 是否启用右键菜单禁用 */
  disableRightClick?: boolean;
  /** 是否启用开发者工具检测 */
  enableDevToolsDetection?: boolean;
  /** 是否启用摄像头监控 */
  enableCameraMonitoring?: boolean;
  /** 是否启用屏幕录制检测 */
  enableScreenRecordingDetection?: boolean;
  /** 违规次数阈值 */
  violationThreshold?: number;
  /** 自动提交违规考试 */
  autoSubmitOnViolation?: boolean;
}

// ============================================================================
// 导出所有类型
// ============================================================================

export type {
  BaseExam,
  Exam,
  ExamSettings,
  CreateExamRequest,
  UpdateExamRequest,
  ExamQueryParams,
  ExamQueryResponse,
  ExamParticipation,
  ExamSubmission,
  ExamResult,
  ExamStats,
  ExamAnalytics,
  ExamGradingResult,
  AntiCheatRecord,
  AntiCheatSettings
};

// 默认导出主要的考试接口
export default Exam;