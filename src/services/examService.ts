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
      let query = supabase
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

      toast.success('考试提交成功');
      return data;
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
      // 获取考试信息和用户答案
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exams(*),
          user_answers(*),
          questions:exams(questions(*))
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError || !attempt) {
        throw new Error('考试尝试不存在');
      }

      // TODO: 实现具体的评分逻辑
      // 这里需要根据题目类型和答案进行评分
      
      const totalScore = 100; // 示例
      const earnedScore = 78; // 示例
      const percentage = (earnedScore / totalScore) * 100;
      const isPassed = percentage >= (attempt.exams?.passing_score || 60);

      return {
        total_score: earnedScore,
        percentage,
        is_passed: isPassed
      };
    } catch (error) {
      console.error('计算成绩失败:', error);
      throw new Error('计算成绩失败');
    }
  }

  /**
   * 获取考试统计信息
   * @param examId 考试ID
   * @returns 统计信息
   */
  static async getExamStatistics(examId: string): Promise<ExamStatistics> {
    try {
      // TODO: 实现统计信息查询
      // 这里需要查询各种统计数据
      
      return {
        total_questions: 0,
        total_registrations: 0,
        total_attempts: 0,
        completed_attempts: 0,
        pass_rate: 0,
        average_score: 0,
        average_time: 0,
        difficulty_breakdown: {
          beginner: { count: 0, avg_score: 0 },
          intermediate: { count: 0, avg_score: 0 },
          advanced: { count: 0, avg_score: 0 }
        },
        question_analytics: []
      };
    } catch (error) {
      console.error('获取考试统计失败:', error);
      throw new Error('获取考试统计失败');
    }
  }
}

export default ExamService;