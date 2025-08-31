/**
 * 考试系统类型定义
 * 定义考试、题目、答题记录、证书等核心数据类型
 */

// 基础类型
export type ExamStatus = 'draft' | 'published' | 'ongoing' | 'finished' | 'cancelled';
export type ExamDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
export type AttemptStatus = 'not_started' | 'in_progress' | 'paused' | 'submitted' | 'completed' | 'expired';
export type CertificateStatus = 'pending' | 'issued' | 'revoked';

// 考试基础信息
export interface Exam {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: ExamDifficulty;
  duration: number; // 分钟
  totalQuestions: number;
  totalScore: number;
  passingScore: number;
  maxAttempts: number;
  allowRetake: boolean;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  registrationDeadline: string; // ISO 8601
  status: ExamStatus;
  isPublic: boolean;
  requiresApproval: boolean;
  fee: number;
  currency: string;
  tags: string[];
  skills: string[];
  prerequisites: string[];
  instructions: string;
  rules: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 题目选项
export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

// 题目信息
export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  title: string;
  content: string;
  options?: QuestionOption[];
  correctAnswer: string | string[]; // 单选为string，多选为string[]
  explanation?: string;
  score: number;
  difficulty: ExamDifficulty;
  category: string;
  tags: string[];
  order: number;
  timeLimit?: number; // 单题时间限制（秒）
  attachments?: string[]; // 附件URL
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 用户答案
export interface UserAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  score?: number;
  timeSpent: number; // 秒
  submittedAt: string;
}

// 考试尝试记录
export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startTime: string;
  endTime?: string;
  submitTime?: string;
  timeSpent: number; // 秒
  totalScore: number;
  maxScore: number;
  passingScore: number;
  isPassed: boolean;
  answers: UserAnswer[];
  currentQuestionIndex: number;
  flaggedQuestions: string[]; // 标记的题目ID
  violations: ExamViolation[]; // 违规记录
  metadata: {
    userAgent: string;
    ipAddress: string;
    screenResolution: string;
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 违规记录
export interface ExamViolation {
  id: string;
  type: 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'fullscreen_exit' | 'suspicious_activity';
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  evidence?: string; // 证据数据
}

// 考试报名记录
export interface ExamRegistration {
  id: string;
  examId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  notes?: string;
}

// 证书信息
export interface Certificate {
  id: string;
  examId: string;
  userId: string;
  attemptId: string;
  certificateNumber: string;
  status: CertificateStatus;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
  templateId: string;
  metadata: {
    examTitle: string;
    userName: string;
    userEmail: string;
    score: number;
    passingScore: number;
    completionDate: string;
    skills: string[];
    validityPeriod?: number; // 月
  };
  downloadUrl?: string;
  verificationUrl: string;
  createdAt: string;
  updatedAt: string;
}

// 证书模板
export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  templateUrl: string;
  previewUrl: string;
  fields: CertificateField[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 证书字段
export interface CertificateField {
  name: string;
  type: 'text' | 'date' | 'number' | 'image';
  x: number; // 位置坐标
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
}

// 考试统计
export interface ExamStatistics {
  examId: string;
  totalRegistrations: number;
  totalAttempts: number;
  completedAttempts: number;
  passedAttempts: number;
  averageScore: number;
  averageTimeSpent: number;
  passRate: number;
  completionRate: number;
  difficultyDistribution: Record<ExamDifficulty, number>;
  scoreDistribution: {
    range: string;
    count: number;
  }[];
  questionStatistics: QuestionStatistics[];
  violationCount: number;
  certificatesIssued: number;
  updatedAt: string;
}

// 题目统计
export interface QuestionStatistics {
  questionId: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  averageTimeSpent: number;
  optionStatistics?: {
    optionId: string;
    selectedCount: number;
    percentage: number;
  }[];
}

// API请求类型
export interface CreateExamRequest {
  title: string;
  description: string;
  category: string;
  difficulty: ExamDifficulty;
  duration: number;
  totalQuestions: number;
  passingScore: number;
  maxAttempts: number;
  allowRetake: boolean;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  isPublic: boolean;
  requiresApproval: boolean;
  fee: number;
  currency: string;
  tags: string[];
  skills: string[];
  prerequisites: string[];
  instructions: string;
  rules: string[];
}

export interface UpdateExamRequest extends Partial<CreateExamRequest> {
  status?: ExamStatus;
}

export interface CreateQuestionRequest {
  examId: string;
  type: QuestionType;
  title: string;
  content: string;
  options?: Omit<QuestionOption, 'id'>[];
  correctAnswer: string | string[];
  explanation?: string;
  score: number;
  difficulty: ExamDifficulty;
  category: string;
  tags: string[];
  timeLimit?: number;
  attachments?: string[];
}

export interface UpdateQuestionRequest extends Partial<CreateQuestionRequest> {
  order?: number;
}

export interface StartExamRequest {
  examId: string;
}

export interface SubmitAnswerRequest {
  questionId: string;
  answer: string | string[];
  timeSpent: number;
}

export interface SubmitExamRequest {
  attemptId: string;
  answers: UserAnswer[];
}

// API响应类型
export interface ExamListResponse {
  exams: Exam[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ExamDetailResponse extends Exam {
  questions?: Question[];
  statistics?: ExamStatistics;
  userRegistration?: ExamRegistration;
  userAttempts?: ExamAttempt[];
}

export interface ExamAttemptResponse {
  attempt: ExamAttempt;
  questions: Omit<Question, 'correctAnswer' | 'explanation'>[];
  timeRemaining: number;
}

export interface ExamResultResponse {
  attempt: ExamAttempt;
  questions: Question[];
  certificate?: Certificate;
  statistics: {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    timeSpent: number;
    rank?: number;
    percentile?: number;
  };
}

// 查询参数类型
export interface ExamQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: ExamDifficulty;
  status?: ExamStatus;
  search?: string;
  tags?: string[];
  sortBy?: 'title' | 'createdAt' | 'startTime' | 'difficulty' | 'registrations';
  sortOrder?: 'asc' | 'desc';
  includeExpired?: boolean;
}

export interface QuestionQueryParams {
  examId?: string;
  type?: QuestionType;
  difficulty?: ExamDifficulty;
  category?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'order' | 'createdAt' | 'difficulty' | 'score';
  sortOrder?: 'asc' | 'desc';
}

// 错误类型
export interface ExamError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// 考试权限检查结果
export interface ExamEligibility {
  eligible: boolean;
  reason?: string;
  requirements?: string[];
  canRegister: boolean;
  canStart: boolean;
  remainingAttempts: number;
  nextAvailableTime?: string;
}
