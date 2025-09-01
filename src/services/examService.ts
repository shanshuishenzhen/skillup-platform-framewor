import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * 考试状态枚举
 */
export enum ExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

/**
 * 考试难度枚举
 */
export enum ExamDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

/**
 * 题目类型枚举
 */
export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank',
  ESSAY = 'essay'
}

/**
 * 考试尝试状态枚举
 */
export enum AttemptStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  EXPIRED = 'expired'
}

/**
 * 考试接口
 */
export interface Exam {
  id: string;
  title: string;
  description?: string;
  category: string;
  difficulty: ExamDifficulty;
  duration: number; // 分钟
  total_questions: number;
  total_score: number;
  passing_score: number;
  max_attempts: number;
  allow_retake: boolean;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  status: ExamStatus;
  is_public: boolean;
  requires_approval: boolean;
  fee: number;
  currency: string;
  tags: string[];
  skills: string[];
  prerequisites: string[];
  instructions?: string;
  rules: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  // 关联数据
  questions_count?: number;
  registrations_count?: number;
  attempts_count?: number;
  pass_rate?: number;
}

/**
 * 题目选项接口
 */
export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

/**
 * 题目接口
 */
export interface Question {
  id: string;
  exam_id: string;
  type: QuestionType;
  title: string;
  content: string;
  options?: QuestionOption[];
  correct_answer?: string;
  score: number;
  difficulty: ExamDifficulty;
  order_index: number;
  explanation?: string;
  tags: string[];
  skills: string[];
  time_limit?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 考试报名接口
 */
export interface ExamRegistration {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
}

/**
 * 考试尝试接口
 */
export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  attempt_number: number;
  status: AttemptStatus;
  score?: number;
  percentage?: number;
  is_passed?: boolean;
  started_at: string;
  submitted_at?: string;
  completed_at?: string;
  time_spent?: number; // 分钟
  remaining_time?: number; // 分钟
  answers_data?: any;
  violations?: any[];
  ip_address?: string;
  user_agent?: string;
}

/**
 * 用户答案接口
 */
export interface UserAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_options?: string[];
  text_answer?: string;
  is_correct?: boolean;
  score?: number;
  answered_at: string;
}

/**
 * 考试违规记录接口
 */
export interface ExamViolation {
  id: string;
  exam_id: string;
  user_id: string;
  attempt_id: string;
  violation_type: 'tab_switch' | 'time_exceeded' | 'suspicious_behavior' | 'multiple_attempts' | 'copy_paste' | 'right_click';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detected_at: string;
  metadata?: Record<string, any>;
}

/**
 * 防作弊监控状态
 */
export interface AntiCheatMonitor {
  tabSwitchCount: number;
  lastActiveTime: number;
  suspiciousActivities: string[];
  isMonitoring: boolean;
  violations: ExamViolation[];
}

/**
 * 考试统计接口
 */
export interface ExamStatistics {
  total_questions: number;
  total_registrations: number;
  total_attempts: number;
  completed_attempts: number;
  pass_rate: number;
  average_score: number;
  average_time: number;
  difficulty_breakdown: {
    easy: { count: number; avg_score: number };
    medium: { count: number; avg_score: number };
    hard: { count: number; avg_score: number };
  };
  question_analytics: {
    question_id: string;
    title: string;
    correct_rate: number;
    average_time: number;
    difficulty: ExamDifficulty;
  }[];
}

/**
 * 查询参数接口
 */
export interface ExamQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ExamStatus;
  difficulty?: ExamDifficulty;
  created_by?: string;
  sort_by?: 'created_at' | 'title' | 'start_time' | 'difficulty';
  sort_order?: 'asc' | 'desc';
}

/**
 * 考试服务类
 * 处理所有与考试相关的API调用和业务逻辑
 */
export class ExamService {
  /**
   * 获取考试列表
   * @param params 查询参数
   * @returns 考试列表和分页信息
   */
  static async getExams(params: ExamQueryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        difficulty,
        created_by,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = params;

      let query = supabase
        .from('exams')
        .select(`
          *,
          questions:questions(count),
          registrations:exam_registrations(count),
          attempts:exam_attempts(count)
        `);

      // 搜索过滤
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // 状态过滤
      if (status) {
        query = query.eq('status', status);
      }

      // 难度过滤
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      // 创建者过滤
      if (created_by) {
        query = query.eq('created_by', created_by);
      }

      // 排序
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // 分页
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // 计算统计信息
      const examsWithStats = data?.map(exam => ({
        ...exam,
        questions_count: exam.questions?.[0]?.count || 0,
        registrations_count: exam.registrations?.[0]?.count || 0,
        attempts_count: exam.attempts?.[0]?.count || 0,
        pass_rate: 0 // TODO: 计算通过率
      })) || [];

      return {
        data: examsWithStats,
        total: count || 0,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('获取考试列表失败:', error);
      throw new Error('获取考试列表失败');
    }
  }

  /**
   * 根据ID获取考试详情
   * @param examId 考试ID
   * @param includeQuestions 是否包含题目
   * @returns 考试详情
   */
  static async getExamById(examId: string, includeQuestions = false) {
    try {
      const query = supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      const { data: exam, error } = await query;

      if (error) {
        throw error;
      }

      if (!exam) {
        throw new Error('考试不存在');
      }

      // 如果需要包含题目
      if (includeQuestions) {
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', examId)
          .order('order_index');

        if (questionsError) {
          throw questionsError;
        }

        return {
          ...exam,
          questions: questions || []
        };
      }

      return exam;
    } catch (error) {
      console.error('获取考试详情失败:', error);
      throw new Error('获取考试详情失败');
    }
  }

  /**
   * 创建考试
   * @param examData 考试数据
   * @returns 创建的考试
   */
  static async createExam(examData: Omit<Exam, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert([examData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('考试创建成功');
      return data;
    } catch (error) {
      console.error('创建考试失败:', error);
      toast.error('创建考试失败');
      throw new Error('创建考试失败');
    }
  }

  /**
   * 更新考试
   * @param examId 考试ID
   * @param examData 更新的考试数据
   * @returns 更新后的考试
   */
  static async updateExam(examId: string, examData: Partial<Exam>) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({
          ...examData,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('考试更新成功');
      return data;
    } catch (error) {
      console.error('更新考试失败:', error);
      toast.error('更新考试失败');
      throw new Error('更新考试失败');
    }
  }

  /**
   * 删除考试
   * @param examId 考试ID
   */
  static async deleteExam(examId: string) {
    try {
      // 检查是否可以删除
      const canDelete = await this.canDeleteExam(examId);
      if (!canDelete) {
        throw new Error('该考试已有用户参与，无法删除');
      }

      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) {
        throw error;
      }

      toast.success('考试删除成功');
    } catch (error) {
      console.error('删除考试失败:', error);
      toast.error(error instanceof Error ? error.message : '删除考试失败');
      throw error;
    }
  }

  /**
   * 检查考试是否可以删除
   * @param examId 考试ID
   * @returns 是否可以删除
   */
  static async canDeleteExam(examId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', examId);

      if (error) {
        throw error;
      }

      return (count || 0) === 0;
    } catch (error) {
      console.error('检查考试删除权限失败:', error);
      return false;
    }
  }

  /**
   * 批量发布考试
   * @param examIds 考试ID数组
   * @returns 批量操作结果
   */
  static async batchPublishExams(examIds: string[]) {
    try {
      const result = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      // 批量更新考试状态为已发布
      const { data, error } = await supabase
        .from('exams')
        .update({
          status: ExamStatus.PUBLISHED,
          updated_at: new Date().toISOString()
        })
        .in('id', examIds)
        .select('id, title');

      if (error) {
        result.failed = examIds.length;
        result.errors.push(error.message);
      } else {
        result.success = data?.length || 0;
        result.failed = examIds.length - result.success;
      }

      if (result.success > 0) {
        toast.success(`成功发布 ${result.success} 个考试`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} 个考试发布失败`);
      }

      return result;
    } catch (error) {
      console.error('批量发布考试失败:', error);
      toast.error('批量发布考试失败');
      return {
        success: 0,
        failed: examIds.length,
        errors: [error instanceof Error ? error.message : '批量发布考试失败']
      };
    }
  }

  /**
   * 批量取消发布考试
   * @param examIds 考试ID数组
   * @returns 批量操作结果
   */
  static async batchUnpublishExams(examIds: string[]) {
    try {
      const result = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      // 批量更新考试状态为草稿
      const { data, error } = await supabase
        .from('exams')
        .update({
          status: ExamStatus.DRAFT,
          updated_at: new Date().toISOString()
        })
        .in('id', examIds)
        .select('id, title');

      if (error) {
        result.failed = examIds.length;
        result.errors.push(error.message);
      } else {
        result.success = data?.length || 0;
        result.failed = examIds.length - result.success;
      }

      if (result.success > 0) {
        toast.success(`成功取消发布 ${result.success} 个考试`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} 个考试取消发布失败`);
      }

      return result;
    } catch (error) {
      console.error('批量取消发布考试失败:', error);
      toast.error('批量取消发布考试失败');
      return {
        success: 0,
        failed: examIds.length,
        errors: [error instanceof Error ? error.message : '批量取消发布考试失败']
      };
    }
  }

  /**
   * 批量删除考试
   * @param examIds 考试ID数组
   * @returns 批量操作结果
   */
  static async batchDeleteExams(examIds: string[]) {
    try {
      const result = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      // 检查每个考试是否可以删除
      const deletePromises = examIds.map(async (examId) => {
        try {
          const canDelete = await this.canDeleteExam(examId);
          if (!canDelete) {
            throw new Error(`考试 ${examId} 已有用户参与，无法删除`);
          }
          return { examId, canDelete: true };
        } catch (error) {
          return { 
            examId, 
            canDelete: false, 
            error: error instanceof Error ? error.message : '检查删除权限失败' 
          };
        }
      });

      const checkResults = await Promise.all(deletePromises);
      const deletableExamIds = checkResults
        .filter(result => result.canDelete)
        .map(result => result.examId);
      
      const undeletableResults = checkResults.filter(result => !result.canDelete);
      result.failed += undeletableResults.length;
      result.errors.push(...undeletableResults.map(r => r.error || '未知错误'));

      // 批量删除可删除的考试
      if (deletableExamIds.length > 0) {
        const { error } = await supabase
          .from('exams')
          .delete()
          .in('id', deletableExamIds);

        if (error) {
          result.failed += deletableExamIds.length;
          result.errors.push(error.message);
        } else {
          result.success = deletableExamIds.length;
        }
      }

      if (result.success > 0) {
        toast.success(`成功删除 ${result.success} 个考试`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} 个考试删除失败`);
      }

      return result;
    } catch (error) {
      console.error('批量删除考试失败:', error);
      toast.error('批量删除考试失败');
      return {
        success: 0,
        failed: examIds.length,
        errors: [error instanceof Error ? error.message : '批量删除考试失败']
      };
    }
  }

  /**
   * 获取考试题目
   * @param examId 考试ID
   * @param includeAnswers 是否包含答案（管理员查看）
   * @returns 题目列表
   */
  static async getExamQuestions(examId: string, includeAnswers = false) {
    try {
      let selectFields = 'id, exam_id, type, title, content, score, difficulty, order_index, explanation';
      
      if (includeAnswers) {
        selectFields += ', options, correct_answer';
      } else {
        // 对于考生，不返回正确答案
        selectFields += ', options';
      }

      const { data, error } = await supabase
        .from('questions')
        .select(selectFields)
        .eq('exam_id', examId)
        .order('order_index');

      if (error) {
        throw error;
      }

      // 如果不包含答案，移除选项中的正确答案标识
      if (!includeAnswers && data) {
        return data.map(question => ({
          ...question,
          options: question.options?.map((option: any) => ({
            id: option.id,
            text: option.text
          }))
        }));
      }

      return data || [];
    } catch (error) {
      console.error('获取考试题目失败:', error);
      throw new Error('获取考试题目失败');
    }
  }

  /**
   * 检查用户考试资格
   * @param examId 考试ID
   * @param userId 用户ID
   * @returns 资格检查结果
   */
  static async checkExamEligibility(examId: string, userId: string) {
    try {
      // 获取考试信息
      const exam = await this.getExamById(examId);
      
      // 检查考试状态
      if (exam.status !== ExamStatus.ONGOING) {
        return {
          eligible: false,
          reason: '考试未开放'
        };
      }

      // 检查考试时间
      const now = new Date();
      if (exam.start_time && new Date(exam.start_time) > now) {
        return {
          eligible: false,
          reason: '考试尚未开始'
        };
      }

      if (exam.end_time && new Date(exam.end_time) < now) {
        return {
          eligible: false,
          reason: '考试已结束'
        };
      }

      // 检查是否需要报名
      if (exam.requires_approval) {
        const { data: registration, error } = await supabase
          .from('exam_registrations')
          .select('status')
          .eq('exam_id', examId)
          .eq('user_id', userId)
          .single();

        if (error || !registration) {
          return {
            eligible: false,
            reason: '需要先报名参加考试'
          };
        }

        if (registration.status !== 'approved') {
          return {
            eligible: false,
            reason: registration.status === 'pending' ? '报名审核中' : '报名被拒绝'
          };
        }
      }

      // 检查尝试次数
      const { count, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('user_id', userId);

      if (attemptsError) {
        throw attemptsError;
      }

      if ((count || 0) >= exam.max_attempts) {
        return {
          eligible: false,
          reason: '已达到最大尝试次数'
        };
      }

      return {
        eligible: true,
        remaining_attempts: exam.max_attempts - (count || 0)
      };
    } catch (error) {
      console.error('检查考试资格失败:', error);
      throw new Error('检查考试资格失败');
    }
  }

  /**
   * 用户报名参加考试
   * @param examId 考试ID
   * @param userId 用户ID
   * @returns 报名结果
   */
  static async registerForExam(examId: string, userId: string) {
    try {
      // 检查是否已经报名
      const { data: existingRegistration, error: checkError } = await supabase
        .from('exam_registrations')
        .select('id, status')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRegistration) {
        throw new Error('您已经报名过此考试');
      }

      // 创建报名记录
      const { data, error } = await supabase
        .from('exam_registrations')
        .insert([
          {
            exam_id: examId,
            user_id: userId,
            status: 'pending',
            registered_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('报名成功，等待审核');
      return data;
    } catch (error) {
      console.error('报名考试失败:', error);
      toast.error(error instanceof Error ? error.message : '报名考试失败');
      throw error;
    }
  }

  /**
   * 开始考试
   * @param examId 考试ID
   * @param userId 用户ID
   * @returns 考试尝试记录
   */
  static async startExam(examId: string, userId: string) {
    try {
      // 检查资格
      const eligibility = await this.checkExamEligibility(examId, userId);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // 检查是否有进行中的考试
      const { data: activeAttempt, error: activeError } = await supabase
        .from('exam_attempts')
        .select('id')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .eq('status', AttemptStatus.IN_PROGRESS)
        .single();

      if (activeError && activeError.code !== 'PGRST116') {
        throw activeError;
      }

      if (activeAttempt) {
        throw new Error('您有一个正在进行的考试');
      }

      // 创建考试尝试记录
      const { data, error } = await supabase
        .from('exam_attempts')
        .insert([
          {
            exam_id: examId,
            user_id: userId,
            status: AttemptStatus.IN_PROGRESS,
            started_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('开始考试失败:', error);
      toast.error(error instanceof Error ? error.message : '开始考试失败');
      throw error;
    }
  }

  /**
   * 提交答案
   * @param attemptId 考试尝试ID
   * @param questionId 题目ID
   * @param answer 答案
   */
  static async submitAnswer(
    attemptId: string,
    questionId: string,
    answer: { selected_options?: string[]; text_answer?: string }
  ) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .upsert(
          {
            attempt_id: attemptId,
            question_id: questionId,
            selected_options: answer.selected_options,
            text_answer: answer.text_answer,
            answered_at: new Date().toISOString()
          },
          {
            onConflict: 'attempt_id,question_id'
          }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('提交答案失败:', error);
      throw new Error('提交答案失败');
    }
  }

  /**
   * 完成考试
   * @param attemptId 考试尝试ID
   * @returns 考试结果
   */
  static async completeExam(attemptId: string) {
    try {
      // 获取考试尝试信息
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        throw new Error('考试尝试不存在');
      }

      // 计算成绩
      const score = await this.calculateScore(attemptId);
      
      // 更新考试尝试状态
      const { data, error } = await supabase
        .from('exam_attempts')
        .update({
          status: AttemptStatus.COMPLETED,
          completed_at: new Date().toISOString(),
          score: score.total_score,
          percentage: score.percentage,
          is_passed: score.is_passed,
          time_spent: Math.round((new Date().getTime() - new Date(attempt.started_at).getTime()) / 60000)
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 如果通过考试，自动生成证书
      let certificate = null;
      if (score.is_passed) {
        try {
          certificate = await this.generateCertificate(attemptId);
        } catch (certError) {
          console.warn('证书生成失败，但考试已完成:', certError);
          // 证书生成失败不影响考试完成
        }
      }

      toast.success('考试提交成功');
      return {
        ...data,
        certificate
      };
    } catch (error) {
      console.error('完成考试失败:', error);
      toast.error(error instanceof Error ? error.message : '完成考试失败');
      throw error;
    }
  }

  /**
   * 计算考试成绩
   * @param attemptId 考试尝试ID
   * @returns 成绩信息
   */
  static async calculateScore(attemptId: string) {
    try {
      // 获取考试尝试信息
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        throw new Error('考试尝试不存在');
      }

      // 获取考试题目
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', attempt.exam_id)
        .order('order_index');

      if (questionsError) {
        throw new Error('获取题目失败');
      }

      // 获取用户答案
      const { data: userAnswers, error: answersError } = await supabase
        .from('user_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (answersError) {
        throw new Error('获取用户答案失败');
      }

      let totalScore = 0;
      let earnedScore = 0;
      const questionResults: any[] = [];

      // 计算每道题的得分
      for (const question of questions || []) {
        totalScore += question.score;
        const userAnswer = userAnswers?.find(a => a.question_id === question.id);
        
        let questionScore = 0;
        let isCorrect = false;

        if (userAnswer) {
          switch (question.type) {
            case QuestionType.SINGLE_CHOICE:
            case QuestionType.TRUE_FALSE:
              // 单选题和判断题：答案完全匹配
              if (userAnswer.selected_options && userAnswer.selected_options.length === 1) {
                const selectedOption = userAnswer.selected_options[0];
                const correctOption = question.options?.find(opt => opt.is_correct);
                if (correctOption && selectedOption === correctOption.id) {
                  questionScore = question.score;
                  isCorrect = true;
                }
              }
              break;

            case QuestionType.MULTIPLE_CHOICE:
              // 多选题：所有正确答案都选中，且没有选错
              if (userAnswer.selected_options) {
                const correctOptions = question.options?.filter(opt => opt.is_correct).map(opt => opt.id) || [];
                const selectedOptions = userAnswer.selected_options;
                
                if (correctOptions.length > 0 && 
                    selectedOptions.length === correctOptions.length &&
                    correctOptions.every(opt => selectedOptions.includes(opt))) {
                  questionScore = question.score;
                  isCorrect = true;
                }
              }
              break;

            case QuestionType.FILL_BLANK:
              // 填空题：文本答案匹配（忽略大小写和前后空格）
              if (userAnswer.text_answer && question.correct_answer) {
                const userText = userAnswer.text_answer.trim().toLowerCase();
                const correctText = question.correct_answer.trim().toLowerCase();
                if (userText === correctText) {
                  questionScore = question.score;
                  isCorrect = true;
                }
              }
              break;

            case QuestionType.ESSAY:
              // 问答题：需要人工评分，暂时给0分
              questionScore = 0;
              isCorrect = false;
              break;
          }
        }

        earnedScore += questionScore;
        questionResults.push({
          question_id: question.id,
          question_title: question.title,
          question_type: question.type,
          question_score: question.score,
          earned_score: questionScore,
          is_correct: isCorrect,
          user_answer: userAnswer
        });

        // 更新用户答案的得分
        if (userAnswer) {
          await supabase
            .from('user_answers')
            .update({
              is_correct: isCorrect,
              score: questionScore
            })
            .eq('id', userAnswer.id);
        }
      }

      const percentage = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;
      const isPassed = percentage >= (attempt.exams?.passing_score || 60);

      return {
        total_score: earnedScore,
        max_score: totalScore,
        percentage: Math.round(percentage * 100) / 100,
        is_passed: isPassed,
        question_results: questionResults
      };
    } catch (error) {
      console.error('计算成绩失败:', error);
      throw new Error('计算成绩失败');
    }
  }

  /**
   * 生成考试证书
   * @param attemptId 考试尝试ID
   * @returns 证书信息
   */
  static async generateCertificate(attemptId: string) {
    try {
      // 获取考试尝试信息
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*, exams(*), profiles(*)')
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        throw new Error('考试尝试不存在');
      }

      // 检查是否通过考试
      if (!attempt.is_passed) {
        throw new Error('未通过考试，无法生成证书');
      }

      // 检查是否已经生成过证书
      const { data: existingCert, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .eq('exam_id', attempt.exam_id)
        .eq('user_id', attempt.user_id)
        .single();

      if (certError && certError.code !== 'PGRST116') {
        throw certError;
      }

      if (existingCert) {
        return existingCert;
      }

      // 获取证书模板
      const { data: template, error: templateError } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('is_default', true)
        .single();

      if (templateError) {
        throw new Error('获取证书模板失败');
      }

      // 生成证书数据
      const certificateData = {
        exam_id: attempt.exam_id,
        user_id: attempt.user_id,
        attempt_id: attemptId,
        template_id: template.id,
        score: attempt.score,
        percentage: attempt.percentage,
        issued_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年有效期
        certificate_data: {
          exam_title: attempt.exams?.title,
          user_name: attempt.profiles?.full_name || attempt.profiles?.username,
          completion_date: attempt.completed_at,
          score: attempt.score,
          percentage: attempt.percentage,
          skills: attempt.exams?.skills || []
        }
      };

      // 创建证书记录
      const { data: certificate, error: createError } = await supabase
        .from('certificates')
        .insert([certificateData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      toast.success('证书生成成功！');
      return certificate;
    } catch (error) {
      console.error('生成证书失败:', error);
      toast.error(error instanceof Error ? error.message : '生成证书失败');
      throw error;
    }
  }

  /**
   * 获取用户证书列表
   * @param userId 用户ID
   * @returns 证书列表
   */
  static async getUserCertificates(userId: string) {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          exams(title, category, difficulty),
          certificate_templates(name, design_data)
        `)
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取证书列表失败:', error);
      throw new Error('获取证书列表失败');
    }
  }

  /**
   * 验证证书有效性
   * @param certificateNumber 证书编号
   * @returns 证书验证结果
   */
  static async verifyCertificate(certificateNumber: string) {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          exams(title, category),
          profiles(full_name, username)
        `)
        .eq('certificate_number', certificateNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { valid: false, message: '证书不存在' };
        }
        throw error;
      }

      const isExpired = new Date() > new Date(data.valid_until);
      
      return {
        valid: !isExpired,
        message: isExpired ? '证书已过期' : '证书有效',
        certificate: data
      };
    } catch (error) {
      console.error('验证证书失败:', error);
      throw new Error('验证证书失败');
    }
  }

  /**
   * 获取考试统计信息
   * @param examId 考试ID
   * @returns 统计信息
   */
  static async getExamStatistics(examId: string): Promise<ExamStatistics> {
    try {
      // 获取基础统计数据
      const [questionsResult, registrationsResult, attemptsResult] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact' }).eq('exam_id', examId),
        supabase.from('exam_registrations').select('*', { count: 'exact' }).eq('exam_id', examId),
        supabase.from('exam_attempts').select('*').eq('exam_id', examId)
      ]);

      const totalQuestions = questionsResult.count || 0;
      const totalRegistrations = registrationsResult.count || 0;
      const attempts = attemptsResult.data || [];
      const completedAttempts = attempts.filter(a => a.status === AttemptStatus.COMPLETED);
      const passedAttempts = completedAttempts.filter(a => a.is_passed);

      // 计算统计指标
      const passRate = completedAttempts.length > 0 ? (passedAttempts.length / completedAttempts.length) * 100 : 0;
      const averageScore = completedAttempts.length > 0 
        ? completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length 
        : 0;
      const averageTime = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + (a.time_spent || 0), 0) / completedAttempts.length
        : 0;

      // 获取题目难度分布
      const { data: questions } = await supabase
        .from('questions')
        .select('difficulty, score')
        .eq('exam_id', examId);

      const difficultyBreakdown = {
        beginner: { count: 0, avg_score: 0 },
        intermediate: { count: 0, avg_score: 0 },
        advanced: { count: 0, avg_score: 0 }
      };

      questions?.forEach(q => {
        if (difficultyBreakdown[q.difficulty as keyof typeof difficultyBreakdown]) {
          difficultyBreakdown[q.difficulty as keyof typeof difficultyBreakdown].count++;
        }
      });

      return {
        total_questions: totalQuestions,
        total_registrations: totalRegistrations,
        total_attempts: attempts.length,
        completed_attempts: completedAttempts.length,
        pass_rate: Math.round(passRate * 100) / 100,
        average_score: Math.round(averageScore * 100) / 100,
        average_time: Math.round(averageTime * 100) / 100,
        difficulty_breakdown: difficultyBreakdown,
        question_analytics: [] // TODO: 实现题目分析
      };
    } catch (error) {
      console.error('获取考试统计失败:', error);
      throw new Error('获取考试统计失败');
    }
  }

  /**
   * 记录考试违规行为
   * @param violation 违规信息
   * @returns 违规记录
   */
  static async recordViolation(violation: Omit<ExamViolation, 'id' | 'detected_at'>) {
    try {
      const violationData = {
        ...violation,
        detected_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('exam_violations')
        .insert([violationData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 根据违规严重程度决定是否立即终止考试
      if (violation.severity === 'high') {
        await this.terminateExamForViolation(violation.attempt_id, violation.violation_type);
      }

      return data;
    } catch (error) {
      console.error('记录违规行为失败:', error);
      throw new Error('记录违规行为失败');
    }
  }

  /**
   * 因违规终止考试
   * @param attemptId 考试尝试ID
   * @param violationType 违规类型
   */
  static async terminateExamForViolation(attemptId: string, violationType: string) {
    try {
      const { error } = await supabase
        .from('exam_attempts')
        .update({
          status: AttemptStatus.TERMINATED,
          completed_at: new Date().toISOString(),
          termination_reason: `违规行为: ${violationType}`
        })
        .eq('id', attemptId);

      if (error) {
        throw error;
      }

      toast.error('检测到严重违规行为，考试已被终止！');
    } catch (error) {
      console.error('终止考试失败:', error);
    }
  }

  /**
   * 获取考试违规记录
   * @param attemptId 考试尝试ID
   * @returns 违规记录列表
   */
  static async getViolations(attemptId: string) {
    try {
      const { data, error } = await supabase
        .from('exam_violations')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('detected_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取违规记录失败:', error);
      throw new Error('获取违规记录失败');
    }
  }

  /**
   * 检查用户是否有多次考试尝试
   * @param examId 考试ID
   * @param userId 用户ID
   * @returns 是否存在多次尝试
   */
  static async checkMultipleAttempts(examId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .neq('status', AttemptStatus.TERMINATED);

      if (error) {
        throw error;
      }

      const activeAttempts = data?.filter(a => 
        a.status === AttemptStatus.IN_PROGRESS || 
        a.status === AttemptStatus.COMPLETED
      ) || [];

      return activeAttempts.length > 1;
    } catch (error) {
      console.error('检查多次尝试失败:', error);
      return false;
    }
  }

  /**
   * 验证考试时间限制
   * @param attemptId 考试尝试ID
   * @returns 是否超时
   */
  static async validateTimeLimit(attemptId: string) {
    try {
      const { data: attempt, error } = await supabase
        .from('exam_attempts')
        .select('*, exams(time_limit)')
        .eq('id', attemptId)
        .single();

      if (error || !attempt) {
        return false;
      }

      const timeLimit = attempt.exams?.time_limit; // 分钟
      if (!timeLimit) {
        return false; // 无时间限制
      }

      const startTime = new Date(attempt.started_at).getTime();
      const currentTime = Date.now();
      const elapsedMinutes = (currentTime - startTime) / (1000 * 60);

      const isOvertime = elapsedMinutes > timeLimit;
      
      if (isOvertime) {
        // 记录超时违规
        await this.recordViolation({
          exam_id: attempt.exam_id,
          user_id: attempt.user_id,
          attempt_id: attemptId,
          violation_type: 'time_exceeded',
          description: `考试超时 ${Math.round(elapsedMinutes - timeLimit)} 分钟`,
          severity: 'high',
          metadata: {
            timeLimit,
            elapsedMinutes: Math.round(elapsedMinutes)
          }
        });
      }

      return isOvertime;
    } catch (error) {
      console.error('验证时间限制失败:', error);
      return false;
    }
  }

  /**
   * 创建题目
   * @param questionData 题目数据
   * @param createdBy 创建者ID
   * @returns 创建的题目
   */
  static async createQuestion(questionData: any, createdBy: string) {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([
          {
            ...questionData,
            created_by: createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('创建题目失败:', error);
      throw new Error('创建题目失败');
    }
  }

  /**
   * 批量创建题目
   * @param examId 考试ID
   * @param questions 题目数组
   * @param createdBy 创建者ID
   * @returns 批量创建结果
   */
  static async batchCreateQuestions(examId: string, questions: any[], createdBy: string) {
    try {
      const result = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      const questionsToInsert = questions.map((question, index) => ({
        exam_id: examId,
        type: question.type || 'single_choice',
        title: question.title || question.question || `题目 ${index + 1}`,
        content: question.content || question.question || '',
        options: question.options || [],
        correct_answer: question.correct_answer || question.answer,
        score: question.score || question.points || 1,
        difficulty: question.difficulty || 'intermediate',
        order_index: index + 1,
        explanation: question.explanation || '',
        tags: question.tags || [],
        skills: question.skills || [],
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select();

      if (error) {
        result.failed = questions.length;
        result.errors.push(error.message);
      } else {
        result.success = data?.length || 0;
      }

      return result;
    } catch (error) {
      console.error('批量创建题目失败:', error);
      return {
        success: 0,
        failed: questions.length,
        errors: [error instanceof Error ? error.message : '批量创建题目失败']
      };
    }
  }
}

// 导出类和实例
export default ExamService;
export const examService = ExamService;