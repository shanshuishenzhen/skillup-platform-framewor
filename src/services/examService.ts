/**
 * 考试服务类
 * 提供考试管理的核心业务逻辑，包括考试创建、管理、参与、评分等功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { supabase } from '@/lib/supabase';
import { questionService } from './questionService';
import {
  ExamStatus,
  ExamDifficulty,
  type Exam,
  type CreateExamRequest,
  type UpdateExamRequest,
  type ExamQueryParams,
  type ExamQueryResponse,
  type ExamStats,
  type ExamParticipation,
  type ExamSubmission,
  type ExamResult,
  type ExamGradingResult,
  type ExamAnalytics
} from '@/types/exam';
import type { QuestionGradingResult } from '@/types/question';

/**
 * 考试服务类
 * 封装所有与考试相关的数据库操作和业务逻辑
 */
export class ExamService {
  /**
   * 获取考试列表
   * 支持搜索、过滤、排序和分页功能
   * 
   * @param params - 查询参数
   * @returns Promise<ExamQueryResponse> 考试列表响应
   * 
   * @example
   * ```typescript
   * const result = await examService.getExams({
   *   search: 'JavaScript',
   *   status: ExamStatus.PUBLISHED,
   *   difficulty: ExamDifficulty.MEDIUM,
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async getExams(params: ExamQueryParams = {}): Promise<ExamQueryResponse> {
    try {
      const {
        search,
        status = ExamStatus.PUBLISHED,
        difficulty,
        category,
        tags,
        createdBy,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = params;

      let query = supabase
        .from('exams')
        .select('*', { count: 'exact' });

      // 应用过滤条件
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }

      // 应用排序 - 字段名映射
      const fieldMapping: Record<string, string> = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'totalQuestions': 'total_questions',
        'passingScore': 'passing_score',
        'maxAttempts': 'max_attempts',
        'durationMinutes': 'duration_minutes'
      };
      
      const dbField = fieldMapping[sortBy] || sortBy;
      const ascending = sortOrder === 'asc';
      query = query.order(dbField, { ascending });

      // 应用分页
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`获取考试列表失败: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        exams: data || [],
        total: count || 0,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('ExamService.getExams error:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取考试详情
   * 
   * @param id - 考试ID
   * @returns Promise<Exam | null> 考试详情或null
   * 
   * @example
   * ```typescript
   * const exam = await examService.getExamById('123');
   * if (exam) {
   *   console.log('考试标题:', exam.title);
   * }
   * ```
   */
  async getExamById(id: string): Promise<Exam | null> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 考试不存在
        }
        throw new Error(`获取考试详情失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamService.getExamById error:', error);
      throw error;
    }
  }

  /**
   * 创建新考试
   * 
   * @param examData - 考试创建数据
   * @param userId - 创建者用户ID
   * @returns Promise<Exam> 创建的考试
   * 
   * @example
   * ```typescript
   * const newExam = await examService.createExam({
   *   title: 'JavaScript基础考试',
   *   description: '测试JavaScript基础知识',
   *   difficulty: ExamDifficulty.MEDIUM,
   *   duration: 60,
   *   totalQuestions: 20,
   *   passingScore: 70,
   *   questionIds: ['q1', 'q2', 'q3']
   * }, 'user123');
   * ```
   */
  async createExam(examData: CreateExamRequest & { paperId?: string }, userId: string): Promise<Exam> {
    try {
      const now = new Date().toISOString();
      
      const examToCreate = {
        title: examData.title,
        description: examData.description,
        difficulty: examData.difficulty,
        status: ExamStatus.DRAFT,
        duration: examData.duration,
        total_questions: examData.totalQuestions,
        passing_score: examData.passingScore,
        total_score: examData.totalScore || 100,
        max_attempts: examData.maxAttempts || 1,
        category: examData.category,
        tags: examData.tags || [],
        instructions: examData.instructions,
        question_ids: examData.questionIds || [],
        paper_id: examData.paperId || null,
        settings: examData.settings || {},
        created_by: userId,
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('exams')
        .insert([examToCreate])
        .select()
        .single();

      if (error) {
        throw new Error(`创建考试失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamService.createExam error:', error);
      throw error;
    }
  }

  /**
   * 更新考试
   * 
   * @param examData - 考试更新数据
   * @returns Promise<Exam> 更新后的考试
   * 
   * @example
   * ```typescript
   * const updatedExam = await examService.updateExam({
   *   id: '123',
   *   title: '更新后的考试标题',
   *   duration: 90
   * });
   * ```
   */
  async updateExam(examData: UpdateExamRequest): Promise<Exam> {
    try {
      const { id, ...updateData } = examData;
      
      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('exams')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`更新考试失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamService.updateExam error:', error);
      throw error;
    }
  }

  /**
   * 删除考试
   * 
   * @param id - 考试ID
   * @returns Promise<boolean> 删除是否成功
   * 
   * @example
   * ```typescript
   * const success = await examService.deleteExam('123');
   * if (success) {
   *   console.log('考试删除成功');
   * }
   * ```
   */
  async deleteExam(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`删除考试失败: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ExamService.deleteExam error:', error);
      throw error;
    }
  }

  /**
   * 发布考试
   * 将考试状态从草稿改为已发布
   * 
   * @param id - 考试ID
   * @returns Promise<Exam> 发布后的考试
   * 
   * @example
   * ```typescript
   * const publishedExam = await examService.publishExam('123');
   * ```
   */
  async publishExam(id: string): Promise<Exam> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({ 
          status: ExamStatus.PUBLISHED,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`发布考试失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamService.publishExam error:', error);
      throw error;
    }
  }

  /**
   * 归档考试
   * 将考试状态改为已归档
   * 
   * @param id - 考试ID
   * @returns Promise<Exam> 归档后的考试
   * 
   * @example
   * ```typescript
   * const archivedExam = await examService.archiveExam('123');
   * ```
   */
  async archiveExam(id: string): Promise<Exam> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({ 
          status: ExamStatus.ARCHIVED,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`归档考试失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamService.archiveExam error:', error);
      throw error;
    }
  }

  /**
   * 更新考试状态
   * 
   * @param id - 考试ID
   * @param status - 新状态
   * @returns Promise<Exam> 更新后的考试
   * 
   * @example
   * ```typescript
   * const updatedExam = await examService.updateExamStatus('123', ExamStatus.PUBLISHED);
   * ```
   */
  async updateExamStatus(id: string, status: ExamStatus): Promise<Exam> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`更新考试状态失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamService.updateExamStatus error:', error);
      throw error;
    }
  }

  /**
   * 用户报名参加考试
   * 
   * @param examId - 考试ID
   * @param userId - 用户ID
   * @returns Promise<ExamParticipation> 参与记录
   * 
   * @example
   * ```typescript
   * const participation = await examService.enrollExam('exam123', 'user456');
   * console.log('报名成功，参与ID:', participation.id);
   * ```
   */
  async enrollExam(examId: string, userId: string): Promise<ExamParticipation> {
    try {
      // 检查是否已经报名
      const { data: existing } = await supabase
        .from('exam_participations')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        throw new Error('您已经报名了这个考试');
      }

      // 检查考试是否可以报名
      const exam = await this.getExamById(examId);
      if (!exam) {
        throw new Error('考试不存在');
      }

      if (exam.status !== ExamStatus.PUBLISHED) {
        throw new Error('考试未发布，无法报名');
      }

      // 创建参与记录
      const now = new Date().toISOString();
      const participationData = {
        exam_id: examId,
        user_id: userId,
        enrolled_at: now,
        attempts_used: 0,
        status: 'enrolled'
      };

      const { data, error } = await supabase
        .from('exam_participations')
        .insert([participationData])
        .select()
        .single();

      if (error) {
        throw new Error(`报名失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamService.enrollExam error:', error);
      throw error;
    }
  }

  /**
   * 获取考试进行数据
   * 
   * @param examId - 考试ID
   * @returns Promise<{questions: any[], attempt: any}> 考试数据
   * 
   * @example
   * ```typescript
   * const examData = await examService.getExamForTaking('exam123');
   * console.log('题目数量:', examData.questions.length);
   * ```
   */
  async getExamForTaking(examId: string): Promise<{
    questions: any[];
    attempt: any;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      // 获取用户的考试记录
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .single();

      if (attemptError || !attempt) {
        throw new Error('未找到进行中的考试记录');
      }

      // 获取考试题目
      const { data: questions, error: questionsError } = await supabase
        .from('exam_questions')
        .select(`
          *,
          question_options(*)
        `)
        .eq('exam_id', examId)
        .order('order_index');

      if (questionsError) {
        throw new Error('获取考试题目失败');
      }

      // 获取已保存的答案
      const { data: savedAnswers } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('attempt_id', attempt.id);

      // 格式化答案数据
      const answers = savedAnswers?.map(answer => ({
        questionId: answer.question_id,
        answer: answer.answer_content
      })) || [];

      return {
        questions: questions || [],
        attempt: {
          ...attempt,
          answers,
          flaggedQuestions: attempt.flagged_questions || []
        }
      };
    } catch (error: any) {
      console.error('获取考试数据失败:', error);
      throw new Error(error.message || '获取考试数据失败');
    }
  }

  /**
   * 保存答案
   * 
   * @param data - 答案数据
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * await examService.saveAnswers({
   *   attemptId: 'attempt123',
   *   answers: [{ questionId: 'q1', answer: ['A'] }],
   *   flaggedQuestions: ['q2'],
   *   currentQuestionIndex: 1
   * });
   * ```
   */
  async saveAnswers(data: {
    attemptId: string;
    answers: Array<{ questionId: string; answer: string[] }>;
    flaggedQuestions: string[];
    currentQuestionIndex: number;
  }): Promise<void> {
    try {
      // 更新考试记录
      const { error: updateError } = await supabase
        .from('exam_attempts')
        .update({
          current_question_index: data.currentQuestionIndex,
          flagged_questions: data.flaggedQuestions,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.attemptId);

      if (updateError) {
        throw new Error('更新考试记录失败');
      }

      // 保存答案
      for (const answer of data.answers) {
        const { error: answerError } = await supabase
          .from('exam_answers')
          .upsert({
            attempt_id: data.attemptId,
            question_id: answer.questionId,
            answer_content: answer.answer,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'attempt_id,question_id'
          });

        if (answerError) {
          console.error('保存答案失败:', answerError);
        }
      }
    } catch (error: any) {
      console.error('保存答案失败:', error);
      throw new Error(error.message || '保存答案失败');
    }
  }

  /**
   * 提交考试
   * 
   * @param data - 提交数据
   * @returns Promise<{submissionId: string}> 提交结果
   * 
   * @example
   * ```typescript
   * const result = await examService.submitExam({
   *   attemptId: 'attempt123',
   *   answers: [{ questionId: 'q1', answer: ['A'] }],
   *   flaggedQuestions: [],
   *   violations: [],
   *   timeSpent: 1800
   * });
   * ```
   */
  async submitExam(data: {
    attemptId: string;
    answers: Array<{ questionId: string; answer: string[] }>;
    flaggedQuestions: string[];
    violations: string[];
    timeSpent: number;
    isAutoSubmit?: boolean;
  }): Promise<{ submissionId: string }> {
    try {
      // 先保存最终答案
      await this.saveAnswers({
        attemptId: data.attemptId,
        answers: data.answers,
        flaggedQuestions: data.flaggedQuestions,
        currentQuestionIndex: 0
      });

      // 更新考试记录状态
      const { data: submission, error: submitError } = await supabase
        .from('exam_attempts')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          time_spent: data.timeSpent,
          violations: data.violations,
          is_auto_submit: data.isAutoSubmit || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.attemptId)
        .select('id')
        .single();

      if (submitError) {
        throw new Error('提交考试失败');
      }

      return { submissionId: submission.id };
    } catch (error: any) {
      console.error('提交考试失败:', error);
      throw new Error(error.message || '提交考试失败');
    }
  }

  /**
   * 取消报名
   * 
   * @param examId - 考试ID
   * @param userId - 用户ID
   * @returns Promise<boolean> 取消是否成功
   * 
   * @example
   * ```typescript
   * const success = await examService.cancelEnrollment('exam123', 'user456');
   * if (success) {
   *   console.log('取消报名成功');
   * }
   * ```
   */
  async cancelEnrollment(examId: string, userId: string): Promise<boolean> {
    try {
      // 检查参与记录
      const { data: participation } = await supabase
        .from('exam_participations')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .single();

      if (!participation) {
        throw new Error('您尚未报名此考试');
      }

      // 检查是否已经开始考试
      const { data: submissions } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId);

      if (submissions && submissions.length > 0) {
        throw new Error('考试已开始，无法取消报名');
      }

      // 删除参与记录
      const { error } = await supabase
        .from('exam_participations')
        .delete()
        .eq('id', participation.id);

      if (error) {
        throw new Error(`取消报名失败: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ExamService.cancelEnrollment error:', error);
      throw error;
    }
  }

  /**
   * 开始考试
   * 
   * @param examId - 考试ID
   * @param userId - 用户ID
   * @returns Promise<ExamSubmission> 考试提交记录
   * 
   * @example
   * ```typescript
   * const submission = await examService.startExam('exam123', 'user456');
   * console.log('考试开始，提交ID:', submission.id);
   * ```
   */
  async startExam(examId: string, userId: string): Promise<ExamSubmission> {
    try {
      // 检查参与记录
      const { data: participation } = await supabase
        .from('exam_participations')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .single();

      if (!participation) {
        throw new Error('您尚未报名此考试');
      }

      // 检查考试信息
      const exam = await this.getExamById(examId);
      if (!exam) {
        throw new Error('考试不存在');
      }

      // 检查尝试次数
      if (participation.attempts_used >= exam.max_attempts) {
        throw new Error('已达到最大尝试次数');
      }

      // 检查是否有未完成的考试
      const { data: existingSubmission } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .single();

      if (existingSubmission) {
        return existingSubmission; // 返回现有的进行中考试
      }

      // 创建新的考试提交记录
      const now = new Date().toISOString();
      const endTime = new Date(Date.now() + exam.duration * 60 * 1000).toISOString();
      
      const submissionData = {
        exam_id: examId,
        user_id: userId,
        started_at: now,
        end_time: endTime,
        status: 'in_progress',
        answers: {},
        attempt_number: participation.attempts_used + 1
      };

      const { data, error } = await supabase
        .from('exam_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        throw new Error(`开始考试失败: ${error.message}`);
      }

      // 更新参与记录的尝试次数
      await supabase
        .from('exam_participations')
        .update({ attempts_used: participation.attempts_used + 1 })
        .eq('id', participation.id);

      return data;
    } catch (error) {
      console.error('ExamService.startExam error:', error);
      throw error;
    }
  }

  /**
   * 保存考试答案
   * 
   * @param submissionId - 提交ID
   * @param questionId - 题目ID
   * @param answer - 答案
   * @returns Promise<boolean> 保存是否成功
   * 
   * @example
   * ```typescript
   * const success = await examService.saveAnswer('sub123', 'q456', 'A');
   * if (success) {
   *   console.log('答案保存成功');
   * }
   * ```
   */
  async saveAnswer(submissionId: string, questionId: string, answer: any): Promise<boolean> {
    try {
      // 获取当前提交记录
      const { data: submission, error: fetchError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        throw new Error('考试提交记录不存在');
      }

      if (submission.status !== 'in_progress') {
        throw new Error('考试已结束，无法保存答案');
      }

      // 检查是否超时
      const now = new Date();
      const endTime = new Date(submission.end_time);
      if (now > endTime) {
        throw new Error('考试时间已结束');
      }

      // 更新答案
      const updatedAnswers = {
        ...submission.answers,
        [questionId]: {
          answer,
          answeredAt: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('exam_submissions')
        .update({ 
          answers: updatedAnswers,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) {
        throw new Error(`保存答案失败: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ExamService.saveAnswer error:', error);
      throw error;
    }
  }

  /**
   * 提交考试
   * 
   * @param submissionId - 提交ID
   * @returns Promise<ExamResult> 考试结果
   * 
   * @example
   * ```typescript
   * const result = await examService.submitExam('sub123');
   * console.log('考试得分:', result.score);
   * console.log('是否通过:', result.passed);
   * ```
   */
  async submitExam(submissionId: string): Promise<ExamResult> {
    try {
      // 获取提交记录
      const { data: submission, error: fetchError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        throw new Error('考试提交记录不存在');
      }

      if (submission.status !== 'in_progress') {
        throw new Error('考试已提交或已结束');
      }

      // 获取考试信息
      const exam = await this.getExamById(submission.exam_id);
      if (!exam) {
        throw new Error('考试不存在');
      }

      // 评分
      const gradingResult = await this.gradeExam(submission, exam);

      // 更新提交记录
      const now = new Date().toISOString();
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('exam_submissions')
        .update({
          status: 'completed',
          submitted_at: now,
          score: gradingResult.totalScore,
          max_score: gradingResult.maxScore,
          passed: gradingResult.passed,
          grading_details: gradingResult.details
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`提交考试失败: ${updateError.message}`);
      }

      // 创建考试结果记录
      const resultData = {
        exam_id: submission.exam_id,
        user_id: submission.user_id,
        submission_id: submissionId,
        score: gradingResult.totalScore,
        max_score: gradingResult.maxScore,
        percentage: Math.round((gradingResult.totalScore / gradingResult.maxScore) * 100),
        passed: gradingResult.passed,
        completed_at: now,
        time_spent: this.calculateTimeSpent(submission.started_at, now),
        question_results: gradingResult.questionResults
      };

      const { data: result, error: resultError } = await supabase
        .from('exam_results')
        .insert([resultData])
        .select()
        .single();

      if (resultError) {
        throw new Error(`创建考试结果失败: ${resultError.message}`);
      }

      return result;
    } catch (error) {
      console.error('ExamService.submitExam error:', error);
      throw error;
    }
  }

  /**
   * 考试评分
   * 
   * @param submission - 考试提交记录
   * @param exam - 考试信息
   * @returns Promise<ExamGradingResult> 评分结果
   * 
   * @example
   * ```typescript
   * const gradingResult = await examService.gradeExam(submission, exam);
   * console.log('总分:', gradingResult.totalScore);
   * ```
   */
  private async gradeExam(submission: ExamSubmission, exam: Exam): Promise<ExamGradingResult> {
    try {
      const questionResults: QuestionGradingResult[] = [];
      let totalScore = 0;
      let maxScore = 0;

      // 遍历考试题目进行评分
      for (const questionId of exam.question_ids) {
        const userAnswer = submission.answers[questionId]?.answer;
        
        try {
          const gradingResult = await questionService.gradeAnswer(questionId, userAnswer);
          questionResults.push(gradingResult);
          totalScore += gradingResult.score;
          maxScore += gradingResult.maxScore;
        } catch (error) {
          console.error(`评分题目 ${questionId} 失败:`, error);
          // 如果单个题目评分失败，记录错误但继续评分其他题目
          const errorResult: QuestionGradingResult = {
            questionId,
            userAnswer,
            correctAnswer: null,
            isCorrect: false,
            score: 0,
            maxScore: 0,
            details: `评分失败: ${error instanceof Error ? error.message : '未知错误'}`,
            feedback: '该题目评分出现错误，请联系管理员'
          };
          questionResults.push(errorResult);
        }
      }

      const passed = maxScore > 0 ? (totalScore / maxScore) * 100 >= exam.passing_score : false;

      return {
        totalScore,
        maxScore,
        passed,
        questionResults,
        details: {
          correctCount: questionResults.filter(r => r.isCorrect).length,
          totalQuestions: questionResults.length,
          accuracy: questionResults.length > 0 ? 
            (questionResults.filter(r => r.isCorrect).length / questionResults.length) * 100 : 0
        }
      };
    } catch (error) {
      console.error('ExamService.gradeExam error:', error);
      throw error;
    }
  }

  /**
   * 计算考试用时
   * 
   * @param startTime - 开始时间
   * @param endTime - 结束时间
   * @returns number 用时（分钟）
   * 
   * @example
   * ```typescript
   * const timeSpent = examService.calculateTimeSpent('2023-01-01T10:00:00Z', '2023-01-01T11:30:00Z');
   * console.log('用时:', timeSpent, '分钟'); // 输出: 用时: 90 分钟
   * ```
   */
  private calculateTimeSpent(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60)); // 转换为分钟
  }

  /**
   * 获取用户的考试结果
   * 
   * @param examId - 考试ID
   * @param userId - 用户ID
   * @returns Promise<ExamResult[]> 考试结果列表
   * 
   * @example
   * ```typescript
   * const results = await examService.getUserExamResults('exam123', 'user456');
   * console.log('考试次数:', results.length);
   * ```
   */
  async getUserExamResults(examId: string, userId: string): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) {
        throw new Error(`获取考试结果失败: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('ExamService.getUserExamResults error:', error);
      throw error;
    }
  }

  /**
   * 获取考试统计信息
   * 
   * @param examId - 考试ID（可选，不传则获取全部考试统计）
   * @returns Promise<ExamStats> 考试统计数据
   * 
   * @example
   * ```typescript
   * const stats = await examService.getExamStats('exam123');
   * console.log('参与人数:', stats.participantCount);
   * console.log('平均分:', stats.averageScore);
   * ```
   */
  async getExamStats(examId?: string): Promise<ExamStats> {
    try {
      let query = supabase.from('exam_results').select('*');
      
      if (examId) {
        query = query.eq('exam_id', examId);
      }

      const { data: results, error } = await query;

      if (error) {
        throw new Error(`获取考试统计失败: ${error.message}`);
      }

      const participantCount = results?.length || 0;
      const passedCount = results?.filter(r => r.passed).length || 0;
      const totalScore = results?.reduce((sum, r) => sum + r.score, 0) || 0;
      const averageScore = participantCount > 0 ? totalScore / participantCount : 0;
      const passRate = participantCount > 0 ? (passedCount / participantCount) * 100 : 0;
      
      // 分数分布
      const scoreRanges = {
        '0-59': 0,
        '60-69': 0,
        '70-79': 0,
        '80-89': 0,
        '90-100': 0
      };

      results?.forEach(result => {
        const percentage = result.percentage;
        if (percentage < 60) scoreRanges['0-59']++;
        else if (percentage < 70) scoreRanges['60-69']++;
        else if (percentage < 80) scoreRanges['70-79']++;
        else if (percentage < 90) scoreRanges['80-89']++;
        else scoreRanges['90-100']++;
      });

      return {
        participantCount,
        passedCount,
        passRate,
        averageScore,
        highestScore: results?.reduce((max, r) => Math.max(max, r.score), 0) || 0,
        lowestScore: results?.reduce((min, r) => Math.min(min, r.score), Infinity) || 0,
        scoreDistribution: scoreRanges
      };
    } catch (error) {
      console.error('ExamService.getExamStats error:', error);
      throw error;
    }
  }

  /**
   * 获取考试分析数据
   * 
   * @param examId - 考试ID
   * @returns Promise<ExamAnalytics> 考试分析数据
   * 
   * @example
   * ```typescript
   * const analytics = await examService.getExamAnalytics('exam123');
   * console.log('题目分析:', analytics.questionAnalysis);
   * ```
   */
  async getExamAnalytics(examId: string): Promise<ExamAnalytics> {
    try {
      // 获取考试结果
      const { data: results, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', examId);

      if (error) {
        throw new Error(`获取考试分析数据失败: ${error.message}`);
      }

      // 获取考试信息
      const exam = await this.getExamById(examId);
      if (!exam) {
        throw new Error('考试不存在');
      }

      // 分析每个题目的正确率
      const questionAnalysis: Record<string, {
        correctCount: number;
        totalCount: number;
        correctRate: number;
        averageScore: number;
      }> = {};

      exam.question_ids.forEach(questionId => {
        questionAnalysis[questionId] = {
          correctCount: 0,
          totalCount: 0,
          correctRate: 0,
          averageScore: 0
        };
      });

      // 统计题目数据
      results?.forEach(result => {
        if (result.question_results) {
          result.question_results.forEach((qr: QuestionGradingResult) => {
            const analysis = questionAnalysis[qr.questionId];
            if (analysis) {
              analysis.totalCount++;
              if (qr.isCorrect) {
                analysis.correctCount++;
              }
            }
          });
        }
      });

      // 计算正确率
      Object.keys(questionAnalysis).forEach(questionId => {
        const analysis = questionAnalysis[questionId];
        if (analysis.totalCount > 0) {
          analysis.correctRate = (analysis.correctCount / analysis.totalCount) * 100;
        }
      });

      // 时间分析
      const timeSpentData = results?.map(r => r.time_spent || 0) || [];
      const averageTimeSpent = timeSpentData.length > 0 ? 
        timeSpentData.reduce((sum, time) => sum + time, 0) / timeSpentData.length : 0;

      return {
        examId,
        questionAnalysis,
        timeAnalysis: {
          averageTimeSpent,
          minTimeSpent: Math.min(...timeSpentData) || 0,
          maxTimeSpent: Math.max(...timeSpentData) || 0
        },
        difficultyAnalysis: {
          // 这里可以根据题目难度进行更详细的分析
        }
      };
    } catch (error) {
      console.error('ExamService.getExamAnalytics error:', error);
      throw error;
    }
  }

  /**
   * 检查考试资格
   * 
   * @param examId - 考试ID
   * @param userId - 用户ID（可选，默认使用当前用户）
   * @returns Promise<ExamEligibility> 资格检查结果
   * 
   * @example
   * ```typescript
   * const eligibility = await examService.checkExamEligibility('exam123');
   * console.log('是否可以参加:', eligibility.can_take);
   * console.log('剩余尝试次数:', eligibility.attempts_remaining);
   * ```
   */
  async checkExamEligibility(examId: string, userId?: string): Promise<ExamEligibility> {
    try {
      // 获取考试信息
      const exam = await this.getExamById(examId);
      if (!exam) {
        throw new Error('考试不存在');
      }

      // 如果没有提供用户ID，尝试从当前会话获取
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return {
            can_take: false,
            is_registered: false,
            attempts_remaining: 0,
            reason: '请先登录'
          };
        }
        userId = user.id;
      }

      // 检查参与记录
      const { data: participation } = await supabase
        .from('exam_participations')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .single();

      const isRegistered = !!participation;
      const attemptsUsed = participation?.attempts_used || 0;
      const attemptsRemaining = exam.max_attempts - attemptsUsed;

      // 检查考试状态
      if (exam.status !== ExamStatus.PUBLISHED && exam.status !== ExamStatus.ONGOING) {
        return {
          can_take: false,
          is_registered: isRegistered,
          attempts_remaining: attemptsRemaining,
          reason: '考试未发布或已结束'
        };
      }

      // 检查时间
      const now = new Date();
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);
      
      if (now < startTime) {
        return {
          can_take: false,
          is_registered: isRegistered,
          attempts_remaining: attemptsRemaining,
          reason: '考试尚未开始'
        };
      }
      
      if (now > endTime) {
        return {
          can_take: false,
          is_registered: isRegistered,
          attempts_remaining: attemptsRemaining,
          reason: '考试已结束'
        };
      }

      // 检查报名截止时间
      if (exam.registration_deadline && now > new Date(exam.registration_deadline)) {
        return {
          can_take: false,
          is_registered: isRegistered,
          attempts_remaining: attemptsRemaining,
          reason: '报名已截止'
        };
      }

      // 检查尝试次数
      if (attemptsRemaining <= 0) {
        return {
          can_take: false,
          is_registered: isRegistered,
          attempts_remaining: 0,
          reason: '已达到最大尝试次数'
        };
      }

      // 检查是否需要审批
      if (exam.requires_approval && participation?.status !== 'approved') {
        return {
          can_take: false,
          is_registered: isRegistered,
          attempts_remaining: attemptsRemaining,
          reason: '等待管理员审批'
        };
      }

      return {
        can_take: true,
        is_registered: isRegistered,
        attempts_remaining: attemptsRemaining
      };
    } catch (error) {
      console.error('ExamService.checkExamEligibility error:', error);
      throw error;
    }
  }

  /**
   * 用户报名考试（简化版本，用于前端调用）
   * 
   * @param examId - 考试ID
   * @param userId - 用户ID（可选，默认使用当前用户）
   * @returns Promise<ExamParticipation> 参与记录
   * 
   * @example
   * ```typescript
   * const participation = await examService.registerForExam('exam123');
   * console.log('报名成功，参与ID:', participation.id);
   * ```
   */
  async registerForExam(examId: string, userId?: string): Promise<ExamParticipation> {
    try {
      // 如果没有提供用户ID，从当前会话获取
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('请先登录');
        }
        userId = user.id;
      }

      return await this.enrollExam(examId, userId);
    } catch (error) {
      console.error('ExamService.registerForExam error:', error);
      throw error;
    }
  }

  /**
   * 取消报名
   * 
   * @param examId - 考试ID
   * @param userId - 用户ID（可选，默认使用当前用户）
   * @returns Promise<boolean> 取消是否成功
   * 
   * @example
   * ```typescript
   * const success = await examService.cancelEnrollment('exam123');
   * if (success) {
   *   console.log('取消报名成功');
   * }
   * ```
   */
  async cancelEnrollment(examId: string, userId?: string): Promise<boolean> {
    try {
      // 如果没有提供用户ID，从当前会话获取
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('请先登录');
        }
        userId = user.id;
      }

      // 检查是否已经开始考试
      const { data: submissions } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .eq('status', 'in_progress');

      if (submissions && submissions.length > 0) {
        throw new Error('考试已开始，无法取消报名');
      }

      // 删除参与记录
      const { error } = await supabase
        .from('exam_participations')
        .delete()
        .eq('exam_id', examId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`取消报名失败: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ExamService.cancelEnrollment error:', error);
      throw error;
    }
  }

  /**
   * 获取考试题目（不包含答案）
   * 
   * @param examId - 考试ID
   * @param includeAnswers - 是否包含答案（默认false）
   * @returns Promise<Question[]> 题目列表
   * 
   * @example
   * ```typescript
   * const questions = await examService.getExamQuestions('exam123', false);
   * console.log('题目数量:', questions.length);
   * ```
   */
  async getExamQuestions(examId: string, includeAnswers: boolean = false): Promise<Question[]> {
    try {
      const exam = await this.getExamById(examId);
      if (!exam) {
        throw new Error('考试不存在');
      }

      if (!exam.question_ids || exam.question_ids.length === 0) {
        return [];
      }

      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .in('id', exam.question_ids)
        .order('created_at');

      if (error) {
        throw new Error(`获取考试题目失败: ${error.message}`);
      }

      // 如果不包含答案，移除答案信息
      if (!includeAnswers) {
        return questions.map(q => ({
          ...q,
          correct_answer: undefined,
          explanation: undefined
        }));
      }

      return questions;
    } catch (error) {
      console.error('ExamService.getExamQuestions error:', error);
      throw error;
    }
  }

  /**
   * 搜索考试
   * 
   * @param searchTerm - 搜索关键词
   * @param options - 搜索选项
   * @returns Promise<Exam[]> 搜索结果
   * 
   * @example
   * ```typescript
   * const results = await examService.searchExams('数学', { limit: 10 });
   * console.log('搜索结果:', results);
   * ```
   */
  async searchExams(searchTerm: string = '', options: {
    category?: string;
    status?: ExamStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<Exam[]> {
    try {
      const {
        category,
        status = ExamStatus.PUBLISHED,
        limit = 20,
        offset = 0
      } = options;

      let query = supabase
        .from('exams')
        .select('*')
        .eq('status', status)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // 如果有搜索关键词，添加搜索条件
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // 如果有分类筛选
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`搜索考试失败: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('ExamService.searchExams error:', error);
      throw error;
    }
  }

  /**
   * 获取考试分类列表
   * 
   * @returns Promise<string[]> 分类列表
   * 
   * @example
   * ```typescript
   * const categories = await examService.getCategories();
   * console.log('可用分类:', categories);
   * ```
   */
  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('category')
        .not('category', 'is', null)
        .eq('status', ExamStatus.PUBLISHED);

      if (error) {
        throw new Error(`获取分类列表失败: ${error.message}`);
      }

      // 去重并排序
      const categories = [...new Set(data.map(item => item.category))]
        .filter(Boolean)
        .sort();

      return categories;
    } catch (error) {
      console.error('ExamService.getCategories error:', error);
      throw error;
    }
  }
}

// 导出服务实例
export const examService = new ExamService();
export default examService;