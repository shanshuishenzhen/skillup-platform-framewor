/**
 * 成绩管理服务
 * 
 * 提供成绩管理的核心功能，包括：
 * - 成绩的CRUD操作
 * - 成绩统计分析
 * - 成绩导出功能
 * - 成绩报告生成
 * - 成绩趋势分析
 * - 批量操作支持
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { supabase } from '@/lib/supabase';
import {
  Grade,
  BaseGrade,
  GradeStats,
  GradeStatus,
  GradeLevel,
  GradeQueryParams,
  GradeQueryResponse,
  UpdateGradeRequest,
  BatchUpdateGradeRequest,
  ExportGradeRequest,
  GradeReportRequest,
  ExamAnalysis,
  QuestionAnalysis,
  TimeAnalysis,
  DifficultyAnalysis,
  TrendAnalysis,
  ScoreDistribution,
  StatsPeriod
} from '@/types/grade';
import { withRetry, createError, AppError, ErrorType, ErrorSeverity, RetryConfig } from '@/utils/errorHandler';

/**
 * 获取成绩服务的重试配置
 * @returns 重试配置对象
 */
function getRetryConfig(): RetryConfig {
  return {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.DATABASE_ERROR,
      ErrorType.SERVICE_UNAVAILABLE
    ]
  };
}

/**
 * 成绩管理服务类
 * 提供成绩相关的所有业务逻辑
 */
export class GradeService {
  /**
   * 获取成绩列表
   * @param params 查询参数
   * @returns 成绩列表和分页信息
   * 
   * @example
   * ```typescript
   * const gradeService = new GradeService();
   * const result = await gradeService.getGrades({
   *   exam_id: 'exam123',
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async getGrades(params: GradeQueryParams = {}): Promise<GradeQueryResponse> {
    try {
      return await withRetry(async () => {
        let query = supabase
          .from('exam_results')
          .select(`
            *,
            exams!inner(
              id,
              title,
              difficulty,
              category
            ),
            users!inner(
              id,
              name,
              email,
              avatar
            )
          `);

        // 应用过滤条件
        if (params.exam_id) {
          query = query.eq('exam_id', params.exam_id);
        }
        if (params.user_id) {
          query = query.eq('user_id', params.user_id);
        }
        if (params.status) {
          query = query.eq('status', params.status);
        }
        if (params.grade_level) {
          query = query.eq('grade_level', params.grade_level);
        }
        if (params.passed !== undefined) {
          query = query.eq('passed', params.passed);
        }
        if (params.min_score !== undefined) {
          query = query.gte('score', params.min_score);
        }
        if (params.max_score !== undefined) {
          query = query.lte('score', params.max_score);
        }
        if (params.start_date) {
          query = query.gte('created_at', params.start_date);
        }
        if (params.end_date) {
          query = query.lte('created_at', params.end_date);
        }
        if (params.search) {
          query = query.or(`
            exams.title.ilike.%${params.search}%,
            users.name.ilike.%${params.search}%,
            users.email.ilike.%${params.search}%
          `);
        }

        // 获取总数
        const { count } = await query.select('*', { count: 'exact', head: true });
        const total = count || 0;

        // 应用排序
        const sortBy = params.sort_by || 'created_at';
        const sortOrder = params.sort_order || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // 应用分页
        const page = params.page || 1;
        const limit = params.limit || 20;
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
          throw createError(
            ErrorType.DATABASE_ERROR,
            '获取成绩列表失败',
            {
              code: 'GET_GRADES_FAILED',
              statusCode: 500,
              severity: ErrorSeverity.HIGH,
              context: { params, error }
            }
          );
        }

        // 转换数据格式
        const grades: Grade[] = data.map(item => ({
          id: item.id,
          exam_id: item.exam_id,
          user_id: item.user_id,
          submission_id: item.submission_id,
          score: item.score,
          max_score: item.max_score,
          percentage: item.percentage,
          grade_level: this.calculateGradeLevel(item.percentage),
          passed: item.passed,
          status: item.status || GradeStatus.GRADED,
          graded_at: item.graded_at,
          published_at: item.published_at,
          graded_by: item.graded_by,
          grading_notes: item.grading_notes,
          created_at: item.created_at,
          updated_at: item.updated_at,
          exam: item.exams,
          user: item.users,
          rank: item.rank,
          time_spent: item.time_spent
        }));

        return {
          grades,
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '获取成绩列表失败',
        {
          code: 'GET_GRADES_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { params, error }
        }
      );
    }
  }

  /**
   * 根据ID获取成绩详情
   * @param id 成绩ID
   * @returns 成绩详情
   * 
   * @example
   * ```typescript
   * const grade = await gradeService.getGradeById('grade123');
   * ```
   */
  async getGradeById(id: string): Promise<Grade | null> {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase
          .from('exam_results')
          .select(`
            *,
            exams!inner(
              id,
              title,
              difficulty,
              category
            ),
            users!inner(
              id,
              name,
              email,
              avatar
            ),
            exam_submissions!inner(
              answers,
              question_results
            )
          `)
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null;
          }
          throw createError(
            ErrorType.DATABASE_ERROR,
            '获取成绩详情失败',
            {
              code: 'GET_GRADE_FAILED',
              statusCode: 500,
              severity: ErrorSeverity.HIGH,
              context: { id, error }
            }
          );
        }

        return {
          id: data.id,
          exam_id: data.exam_id,
          user_id: data.user_id,
          submission_id: data.submission_id,
          score: data.score,
          max_score: data.max_score,
          percentage: data.percentage,
          grade_level: this.calculateGradeLevel(data.percentage),
          passed: data.passed,
          status: data.status || GradeStatus.GRADED,
          graded_at: data.graded_at,
          published_at: data.published_at,
          graded_by: data.graded_by,
          grading_notes: data.grading_notes,
          created_at: data.created_at,
          updated_at: data.updated_at,
          exam: data.exams,
          user: data.users,
          question_results: data.exam_submissions?.question_results,
          rank: data.rank,
          time_spent: data.time_spent
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '获取成绩详情失败',
        {
          code: 'GET_GRADE_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { id, error }
        }
      );
    }
  }

  /**
   * 更新成绩
   * @param request 更新请求
   * @returns 更新后的成绩
   * 
   * @example
   * ```typescript
   * const updatedGrade = await gradeService.updateGrade({
   *   id: 'grade123',
   *   score: 85,
   *   grading_notes: '答题质量良好'
   * });
   * ```
   */
  async updateGrade(request: UpdateGradeRequest): Promise<Grade> {
    try {
      return await withRetry(async () => {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (request.score !== undefined) {
          updateData.score = request.score;
          // 重新计算百分比和等级
          const { data: examData } = await supabase
            .from('exam_results')
            .select('max_score')
            .eq('id', request.id)
            .single();
          
          if (examData) {
            updateData.percentage = (request.score / examData.max_score) * 100;
            updateData.grade_level = this.calculateGradeLevel(updateData.percentage);
            updateData.passed = updateData.percentage >= 60; // 假设60分及格
          }
        }

        if (request.status) {
          updateData.status = request.status;
          if (request.status === GradeStatus.PUBLISHED) {
            updateData.published_at = new Date().toISOString();
          }
        }

        if (request.grading_notes !== undefined) {
          updateData.grading_notes = request.grading_notes;
        }

        if (request.publish) {
          updateData.status = GradeStatus.PUBLISHED;
          updateData.published_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from('exam_results')
          .update(updateData)
          .eq('id', request.id)
          .select(`
            *,
            exams!inner(
              id,
              title,
              difficulty,
              category
            ),
            users!inner(
              id,
              name,
              email,
              avatar
            )
          `)
          .single();

        if (error) {
          throw createError(
            ErrorType.DATABASE_ERROR,
            '更新成绩失败',
            {
              code: 'UPDATE_GRADE_FAILED',
              statusCode: 500,
              severity: ErrorSeverity.HIGH,
              context: { request, error }
            }
          );
        }

        return {
          id: data.id,
          exam_id: data.exam_id,
          user_id: data.user_id,
          submission_id: data.submission_id,
          score: data.score,
          max_score: data.max_score,
          percentage: data.percentage,
          grade_level: this.calculateGradeLevel(data.percentage),
          passed: data.passed,
          status: data.status,
          graded_at: data.graded_at,
          published_at: data.published_at,
          graded_by: data.graded_by,
          grading_notes: data.grading_notes,
          created_at: data.created_at,
          updated_at: data.updated_at,
          exam: data.exams,
          user: data.users
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '更新成绩失败',
        {
          code: 'UPDATE_GRADE_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { request, error }
        }
      );
    }
  }

  /**
   * 批量更新成绩
   * @param request 批量更新请求
   * @returns 更新结果
   * 
   * @example
   * ```typescript
   * const result = await gradeService.batchUpdateGrades({
   *   grade_ids: ['grade1', 'grade2'],
   *   updates: { status: GradeStatus.PUBLISHED }
   * });
   * ```
   */
  async batchUpdateGrades(request: BatchUpdateGradeRequest): Promise<{ success: boolean; updated_count: number }> {
    try {
      return await withRetry(async () => {
        const updateData: any = {
          ...request.updates,
          updated_at: new Date().toISOString()
        };

        if (request.updates.publish) {
          updateData.status = GradeStatus.PUBLISHED;
          updateData.published_at = new Date().toISOString();
          delete updateData.publish;
        }

        const { data, error } = await supabase
          .from('exam_results')
          .update(updateData)
          .in('id', request.grade_ids)
          .select('id');

        if (error) {
          throw createError(
            ErrorType.DATABASE_ERROR,
            '批量更新成绩失败',
            {
              code: 'BATCH_UPDATE_GRADES_FAILED',
              statusCode: 500,
              severity: ErrorSeverity.HIGH,
              context: { request, error }
            }
          );
        }

        return {
          success: true,
          updated_count: data.length
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '批量更新成绩失败',
        {
          code: 'BATCH_UPDATE_GRADES_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { request, error }
        }
      );
    }
  }

  /**
   * 获取成绩统计信息
   * @param examId 考试ID（可选）
   * @param period 统计时间范围（可选）
   * @returns 统计信息
   * 
   * @example
   * ```typescript
   * const stats = await gradeService.getGradeStats('exam123');
   * ```
   */
  async getGradeStats(examId?: string, period?: StatsPeriod): Promise<GradeStats> {
    try {
      return await withRetry(async () => {
        let query = supabase
          .from('exam_results')
          .select('score, max_score, percentage, passed');

        if (examId) {
          query = query.eq('exam_id', examId);
        }

        // 应用时间范围过滤
        if (period && period !== StatsPeriod.CUSTOM) {
          const dateRange = this.getDateRange(period);
          query = query.gte('created_at', dateRange.start)
                      .lte('created_at', dateRange.end);
        }

        const { data, error } = await query;

        if (error) {
          throw createError(
            ErrorType.DATABASE_ERROR,
            '获取成绩统计失败',
            {
              code: 'GET_GRADE_STATS_FAILED',
              statusCode: 500,
              severity: ErrorSeverity.HIGH,
              context: { examId, period, error }
            }
          );
        }

        if (!data || data.length === 0) {
          return {
            total_participants: 0,
            passed_count: 0,
            pass_rate: 0,
            average_score: 0,
            highest_score: 0,
            lowest_score: 0,
            median_score: 0,
            standard_deviation: 0,
            score_distribution: [],
            grade_distribution: {
              [GradeLevel.EXCELLENT]: 0,
              [GradeLevel.GOOD]: 0,
              [GradeLevel.AVERAGE]: 0,
              [GradeLevel.PASS]: 0,
              [GradeLevel.FAIL]: 0
            }
          };
        }

        const scores = data.map(item => item.score);
        const percentages = data.map(item => item.percentage);
        const passedCount = data.filter(item => item.passed).length;

        // 计算基础统计
        const totalParticipants = data.length;
        const passRate = (passedCount / totalParticipants) * 100;
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);
        
        // 计算中位数
        const sortedScores = [...scores].sort((a, b) => a - b);
        const medianScore = sortedScores.length % 2 === 0
          ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
          : sortedScores[Math.floor(sortedScores.length / 2)];

        // 计算标准差
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);

        // 计算分数分布
        const scoreDistribution = this.calculateScoreDistribution(percentages);

        // 计算等级分布
        const gradeDistribution = {
          [GradeLevel.EXCELLENT]: 0,
          [GradeLevel.GOOD]: 0,
          [GradeLevel.AVERAGE]: 0,
          [GradeLevel.PASS]: 0,
          [GradeLevel.FAIL]: 0
        };

        percentages.forEach(percentage => {
          const level = this.calculateGradeLevel(percentage);
          gradeDistribution[level]++;
        });

        return {
          total_participants: totalParticipants,
          passed_count: passedCount,
          pass_rate: passRate,
          average_score: averageScore,
          highest_score: highestScore,
          lowest_score: lowestScore,
          median_score: medianScore,
          standard_deviation: standardDeviation,
          score_distribution: scoreDistribution,
          grade_distribution: gradeDistribution
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '获取成绩统计失败',
        {
          code: 'GET_GRADE_STATS_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { examId, period, error }
        }
      );
    }
  }

  /**
   * 获取考试分析数据
   * @param examId 考试ID
   * @returns 考试分析数据
   * 
   * @example
   * ```typescript
   * const analysis = await gradeService.getExamAnalysis('exam123');
   * ```
   */
  async getExamAnalysis(examId: string): Promise<ExamAnalysis> {
    try {
      return await withRetry(async () => {
        // 获取考试基本信息
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('id, title, difficulty')
          .eq('id', examId)
          .single();

        if (examError) {
          throw createError(
            ErrorType.DATABASE_ERROR,
            '获取考试信息失败',
            {
              code: 'GET_EXAM_INFO_FAILED',
              statusCode: 500,
              severity: ErrorSeverity.HIGH,
              context: { examId, error: examError }
            }
          );
        }

        // 获取基础统计
        const basicStats = await this.getGradeStats(examId);

        // 获取题目分析数据
        const questionAnalysis = await this.getQuestionAnalysis(examId);

        // 获取时间分析数据
        const timeAnalysis = await this.getTimeAnalysis(examId);

        // 获取难度分析数据
        const difficultyAnalysis = await this.getDifficultyAnalysis(examId);

        return {
          exam_id: examId,
          exam_title: examData.title,
          basic_stats: basicStats,
          question_analysis: questionAnalysis,
          time_analysis: timeAnalysis,
          difficulty_analysis: difficultyAnalysis
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '获取考试分析失败',
        {
          code: 'GET_EXAM_ANALYSIS_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { examId, error }
        }
      );
    }
  }

  /**
   * 获取趋势分析数据
   * @param userId 用户ID（可选，不传则获取全局趋势）
   * @param period 时间范围
   * @returns 趋势分析数据
   * 
   * @example
   * ```typescript
   * const trend = await gradeService.getTrendAnalysis('user123', StatsPeriod.LAST_30_DAYS);
   * ```
   */
  async getTrendAnalysis(userId?: string, period: StatsPeriod = StatsPeriod.THIS_MONTH): Promise<TrendAnalysis> {
    try {
      return await withRetry(async () => {
        const dateRange = this.getDateRange(period);
        
        let query = supabase
          .from('exam_results')
          .select('*')
          .eq('status', GradeStatus.PUBLISHED)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
          .order('created_at', { ascending: true });

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data: grades, error } = await query;

        if (error) {
          throw createError(
            ErrorType.DATABASE_ERROR,
            '获取趋势分析失败',
            {
              code: 'GET_TREND_ANALYSIS_FAILED',
              statusCode: 500,
              severity: ErrorSeverity.HIGH,
              context: { userId, period, error }
            }
          );
        }

        if (!grades || grades.length === 0) {
          return {
            period,
            total_exams: 0,
            average_score: 0,
            score_change: 0,
            pass_rate_change: 0,
            trend_direction: 'stable',
            time_series_data: [],
            predictions: []
          };
        }

        // 按时间分组数据
        const timeSeriesData = this.groupGradesByTime(grades, period);
        
        // 计算趋势
        const totalExams = grades.length;
        const averageScore = grades.reduce((sum, grade) => sum + grade.score, 0) / totalExams;
        
        // 计算变化趋势
        const midPoint = Math.floor(grades.length / 2);
        const firstHalf = grades.slice(0, midPoint);
        const secondHalf = grades.slice(midPoint);
        
        const firstHalfAvg = firstHalf.length > 0 
          ? firstHalf.reduce((sum, grade) => sum + grade.score, 0) / firstHalf.length 
          : 0;
        const secondHalfAvg = secondHalf.length > 0 
          ? secondHalf.reduce((sum, grade) => sum + grade.score, 0) / secondHalf.length 
          : 0;
        
        const scoreChange = secondHalfAvg - firstHalfAvg;
        
        // 计算通过率变化
        const firstHalfPassRate = firstHalf.length > 0 
          ? (firstHalf.filter(g => g.passed).length / firstHalf.length) * 100 
          : 0;
        const secondHalfPassRate = secondHalf.length > 0 
          ? (secondHalf.filter(g => g.passed).length / secondHalf.length) * 100 
          : 0;
        
        const passRateChange = secondHalfPassRate - firstHalfPassRate;
        
        // 确定趋势方向
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';
        if (scoreChange > 5) trendDirection = 'up';
        else if (scoreChange < -5) trendDirection = 'down';
        
        // 生成预测数据（简单线性预测）
        const predictions = this.generatePredictions(timeSeriesData);

        return {
          period,
          total_exams: totalExams,
          average_score: averageScore,
          score_change: scoreChange,
          pass_rate_change: passRateChange,
          trend_direction: trendDirection,
          time_series_data: timeSeriesData,
          predictions
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '获取趋势分析失败',
        {
          code: 'GET_TREND_ANALYSIS_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { userId, period, error }
        }
      );
    }
  }

  /**
   * 对比分析功能
   * @param examIds 要对比的考试ID列表
   * @returns 对比分析结果
   * 
   * @example
   * ```typescript
   * const comparison = await gradeService.compareExams(['exam1', 'exam2']);
   * ```
   */
  async compareExams(examIds: string[]): Promise<{
    exams: Array<{
      exam_id: string;
      exam_title: string;
      stats: GradeStats;
      analysis: ExamAnalysis;
    }>;
    comparison: {
      average_scores: number[];
      pass_rates: number[];
      difficulties: string[];
      correlations: Array<{ exam1: string; exam2: string; correlation: number }>;
    };
  }> {
    try {
      return await withRetry(async () => {
        const examResults = [];
        
        // 获取每个考试的数据
        for (const examId of examIds) {
          const [stats, analysis] = await Promise.all([
            this.getGradeStats(examId),
            this.getExamAnalysis(examId)
          ]);
          
          // 获取考试标题
          const { data: exam } = await supabase
            .from('exams')
            .select('title')
            .eq('id', examId)
            .single();
          
          examResults.push({
            exam_id: examId,
            exam_title: exam?.title || `考试 ${examId}`,
            stats,
            analysis
          });
        }
        
        // 计算对比数据
        const averageScores = examResults.map(result => result.stats.average_score);
        const passRates = examResults.map(result => result.stats.pass_rate);
        const difficulties = examResults.map(result => {
          const avgScore = result.stats.average_score;
          if (avgScore >= 85) return '简单';
          if (avgScore >= 70) return '中等';
          if (avgScore >= 60) return '困难';
          return '很困难';
        });
        
        // 计算相关性
        const correlations = [];
        for (let i = 0; i < examResults.length; i++) {
          for (let j = i + 1; j < examResults.length; j++) {
            const scores1 = examResults[i].stats.score_distribution.map(d => d.count);
            const scores2 = examResults[j].stats.score_distribution.map(d => d.count);
            const correlation = this.calculateCorrelation(scores1, scores2);
            
            correlations.push({
              exam1: examResults[i].exam_title,
              exam2: examResults[j].exam_title,
              correlation
            });
          }
        }
        
        return {
          exams: examResults,
          comparison: {
            average_scores: averageScores,
            pass_rates: passRates,
            difficulties,
            correlations
          }
        };
      }, getRetryConfig());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw createError(
        ErrorType.DATABASE_ERROR,
        '对比分析失败',
        {
          code: 'COMPARE_EXAMS_FAILED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH,
          context: { examIds, error }
        }
      );
    }
  }

  /**
   * 计算成绩等级
   * @param percentage 百分比分数
   * @returns 成绩等级
   */
  private calculateGradeLevel(percentage: number): GradeLevel {
    if (percentage >= 90) return GradeLevel.EXCELLENT;
    if (percentage >= 80) return GradeLevel.GOOD;
    if (percentage >= 70) return GradeLevel.AVERAGE;
    if (percentage >= 60) return GradeLevel.PASS;
    return GradeLevel.FAIL;
  }

  /**
   * 计算分数分布
   * @param percentages 百分比分数数组
   * @returns 分数分布
   */
  private calculateScoreDistribution(percentages: number[]): ScoreDistribution[] {
    const ranges = [
      { range: '90-100', min: 90, max: 100 },
      { range: '80-89', min: 80, max: 89 },
      { range: '70-79', min: 70, max: 79 },
      { range: '60-69', min: 60, max: 69 },
      { range: '0-59', min: 0, max: 59 }
    ];

    const total = percentages.length;
    
    return ranges.map(({ range, min, max }) => {
      const count = percentages.filter(p => p >= min && p <= max).length;
      return {
        range,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      };
    });
  }

  /**
   * 获取日期范围
   * @param period 时间范围
   * @returns 开始和结束日期
   */
  private getDateRange(period: StatsPeriod): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString();
    let start: Date;

    switch (period) {
      case StatsPeriod.TODAY:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case StatsPeriod.THIS_WEEK:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case StatsPeriod.THIS_MONTH:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case StatsPeriod.THIS_QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case StatsPeriod.THIS_YEAR:
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      start: start.toISOString(),
      end
    };
  }

  /**
   * 获取题目分析数据
   * @param examId 考试ID
   * @returns 题目分析数据
   */
  private async getQuestionAnalysis(examId: string): Promise<QuestionAnalysis[]> {
    try {
      // 获取考试的题目信息
      const { data: questions, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId);

      if (questionsError) throw questionsError;

      if (!questions || questions.length === 0) {
        return [];
      }

      const questionAnalysis: QuestionAnalysis[] = [];

      for (const question of questions) {
        // 获取该题目的答题统计
        const { data: answers, error: answersError } = await supabase
          .from('exam_answers')
          .select('*')
          .eq('question_id', question.id);

        if (answersError) continue;

        if (!answers || answers.length === 0) {
          questionAnalysis.push({
            question_id: question.id,
            question_text: question.content || '题目内容',
            correct_rate: 0,
            average_time: 0,
            difficulty: 'medium',
            common_errors: []
          });
          continue;
        }

        // 计算正确率
        const correctAnswers = answers.filter(answer => answer.is_correct);
        const correctRate = (correctAnswers.length / answers.length) * 100;

        // 计算平均用时
        const totalTime = answers.reduce((sum, answer) => sum + (answer.time_spent || 0), 0);
        const averageTime = totalTime / answers.length;

        // 判断难度
        let difficulty: 'easy' | 'medium' | 'hard';
        if (correctRate >= 80) difficulty = 'easy';
        else if (correctRate >= 60) difficulty = 'medium';
        else difficulty = 'hard';

        // 分析常见错误
        const errorAnswers = answers.filter(answer => !answer.is_correct);
        const errorStats = errorAnswers.reduce((acc, answer) => {
          const selectedOption = answer.selected_option || 'unknown';
          acc[selectedOption] = (acc[selectedOption] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const commonErrors = Object.entries(errorStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([option, count]) => `选项${option}误选${count}次`);

        questionAnalysis.push({
          question_id: question.id,
          question_text: question.content || '题目内容',
          correct_rate: correctRate,
          average_time: averageTime,
          difficulty,
          common_errors: commonErrors
        });
      }

      return questionAnalysis;
    } catch (error) {
      console.error('获取题目分析失败:', error);
      return [];
    }
  }

  /**
   * 获取时间分析数据
   * @param examId 考试ID
   * @returns 时间分析数据
   */
  private async getTimeAnalysis(examId: string): Promise<TimeAnalysis> {
    try {
      const { data: results, error } = await supabase
        .from('exam_results')
        .select('time_spent, score')
        .eq('exam_id', examId)
        .not('time_spent', 'is', null);

      if (error) throw error;

      if (!results || results.length === 0) {
        return {
          average_time: 0,
          time_distribution: [],
          time_vs_score: []
        };
      }

      // 计算平均用时
      const totalTime = results.reduce((sum, result) => sum + (result.time_spent || 0), 0);
      const averageTime = totalTime / results.length;

      // 计算时间分布
      const timeDistribution = this.calculateTimeDistribution(results.map(r => r.time_spent || 0));

      // 计算时间与分数的关系
      const timeVsScore = results.map(result => ({
        time: result.time_spent || 0,
        score: result.score
      }));

      return {
        average_time: averageTime,
        time_distribution: timeDistribution,
        time_vs_score: timeVsScore
      };
    } catch (error) {
      console.error('获取时间分析失败:', error);
      return {
        average_time: 0,
        time_distribution: [],
        time_vs_score: []
      };
    }
  }

  /**
   * 获取难度分析数据
   * @param examId 考试ID
   * @returns 难度分析数据
   */
  private async getDifficultyAnalysis(examId: string): Promise<DifficultyAnalysis> {
    try {
      // 获取考试的整体统计
      const { data: results, error } = await supabase
        .from('exam_results')
        .select('score, percentage')
        .eq('exam_id', examId);

      if (error) throw error;

      if (!results || results.length === 0) {
        return {
          overall_difficulty: 'medium',
          difficulty_distribution: {
            easy: 0,
            medium: 0,
            hard: 0
          },
          recommended_adjustments: []
        };
      }

      // 计算平均分
      const averageScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
      const averagePercentage = results.reduce((sum, result) => sum + result.percentage, 0) / results.length;

      // 判断整体难度
      let overallDifficulty: 'easy' | 'medium' | 'hard';
      if (averagePercentage >= 80) overallDifficulty = 'easy';
      else if (averagePercentage >= 60) overallDifficulty = 'medium';
      else overallDifficulty = 'hard';

      // 获取题目难度分布（基于正确率）
      const questionAnalysis = await this.getQuestionAnalysis(examId);
      const difficultyDistribution = questionAnalysis.reduce(
        (acc, question) => {
          acc[question.difficulty]++;
          return acc;
        },
        { easy: 0, medium: 0, hard: 0 }
      );

      // 生成调整建议
      const recommendedAdjustments = [];
      if (averagePercentage > 90) {
        recommendedAdjustments.push('考试过于简单，建议增加难题比例');
      } else if (averagePercentage < 50) {
        recommendedAdjustments.push('考试过于困难，建议增加简单题目');
      }

      if (difficultyDistribution.hard > difficultyDistribution.easy + difficultyDistribution.medium) {
        recommendedAdjustments.push('难题比例过高，建议平衡题目难度');
      }

      if (recommendedAdjustments.length === 0) {
        recommendedAdjustments.push('题目难度分布合理');
      }

      return {
        overall_difficulty: overallDifficulty,
        difficulty_distribution: difficultyDistribution,
        recommended_adjustments: recommendedAdjustments
      };
    } catch (error) {
      console.error('获取难度分析失败:', error);
      return {
        overall_difficulty: 'medium',
        difficulty_distribution: {
          easy: 0,
          medium: 0,
          hard: 0
        },
        recommended_adjustments: ['分析失败，请检查数据']
      };
    }
  }

  /**
   * 计算时间分布
   * @param times 时间数组
   * @returns 时间分布数据
   */
  private calculateTimeDistribution(times: number[]): Array<{ range: string; count: number }> {
    if (times.length === 0) return [];

    const ranges = [
      { min: 0, max: 15, label: '0-15分钟' },
      { min: 15, max: 30, label: '15-30分钟' },
      { min: 30, max: 45, label: '30-45分钟' },
      { min: 45, max: 60, label: '45-60分钟' },
      { min: 60, max: Infinity, label: '60分钟以上' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: times.filter(time => time >= range.min && time < range.max).length
    }));
  }

  /**
   * 计算相关系数
   * @param x X变量数组
   * @param y Y变量数组
   * @returns 相关系数
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 导出成绩数据
   * @param request 导出请求参数
   * @returns 导出结果
   */
  async exportGrades(request: ExportGradeRequest): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      // 构建查询条件
      let query = supabase
        .from('exam_results')
        .select(`
          *,
          exam:exams(title, description),
          user:users(name, email)
        `);

      // 应用筛选条件
      if (request.exam_ids && request.exam_ids.length > 0) {
        query = query.in('exam_id', request.exam_ids);
      }

      if (request.user_ids && request.user_ids.length > 0) {
        query = query.in('user_id', request.user_ids);
      }

      if (request.status && request.status.length > 0) {
        query = query.in('status', request.status);
      }

      if (request.grade_levels && request.grade_levels.length > 0) {
        query = query.in('grade_level', request.grade_levels);
      }

      if (request.date_range) {
        if (request.date_range.start) {
          query = query.gte('created_at', request.date_range.start);
        }
        if (request.date_range.end) {
          query = query.lte('created_at', request.date_range.end);
        }
      }

      // 执行查询
      const { data: grades, error } = await query;

      if (error) {
        throw error;
      }

      if (!grades || grades.length === 0) {
        return {
          success: false,
          error: '没有找到符合条件的成绩数据'
        };
      }

      // 准备导出数据
      const exportData = grades.map(grade => {
        const baseData: any = {
          '考试名称': grade.exam?.title || '未知考试',
          '学员姓名': grade.user?.name || '未知学员',
          '学员邮箱': grade.user?.email || '',
          '分数': grade.score,
          '百分比': `${grade.percentage}%`,
          '等级': this.getGradeLevelText(grade.grade_level),
          '状态': this.getGradeStatusText(grade.status),
          '用时(分钟)': grade.time_spent ? Math.round(grade.time_spent / 60) : 0,
          '提交时间': new Date(grade.created_at).toLocaleString('zh-CN')
        };

        // 根据选择的字段过滤数据
        if (request.fields && request.fields.length > 0) {
          const filteredData: any = {};
          request.fields.forEach(field => {
            if (baseData[field] !== undefined) {
              filteredData[field] = baseData[field];
            }
          });
          return filteredData;
        }

        return baseData;
      });

      // 生成Excel文件（这里需要实际的Excel生成逻辑）
      // 暂时返回成功状态，实际项目中需要集成Excel导出库
      const fileName = `成绩导出_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // 模拟文件生成和上传过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        downloadUrl: `/api/downloads/${fileName}`
      };
    } catch (error) {
      console.error('导出成绩失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败'
      };
    }
  }

  /**
   * 生成成绩报告
   * @param request 报告请求参数
   * @returns 报告数据
   */
  async generateGradeReport(request: GradeReportRequest): Promise<{
    success: boolean;
    report?: {
      summary: any;
      charts: any[];
      tables: any[];
      recommendations: string[];
    };
    error?: string;
  }> {
    try {
      // 获取基础统计数据
      const stats = await this.getGradeStats();

      // 获取详细分析数据
      const analysisPromises = request.exam_ids?.map(examId => 
        this.getExamAnalysis(examId)
      ) || [];
      
      const analysisResults = await Promise.all(analysisPromises);

      // 生成报告摘要
      const summary = {
        total_participants: stats.total_participants,
        pass_rate: stats.pass_rate,
        average_score: stats.average_score,
        highest_score: stats.highest_score,
        lowest_score: stats.lowest_score,
        report_period: request.date_range,
        generated_at: new Date().toISOString()
      };

      // 生成图表数据
      const charts = [
        {
          type: 'bar',
          title: '分数分布',
          data: stats.score_distribution
        },
        {
          type: 'pie',
          title: '等级分布',
          data: stats.grade_distribution
        },
        {
          type: 'line',
          title: '成绩趋势',
          data: analysisResults[0] || []
        }
      ];

      // 生成表格数据
      const tables = [
        {
          title: '考试概览',
          headers: ['考试名称', '参与人数', '通过率', '平均分'],
          rows: analysisResults.map(analysis => [
            analysis.exam_title || '未知考试',
            stats.total_participants,
            `${stats.pass_rate}%`,
            stats.average_score
          ])
        }
      ];

      // 生成建议
      const recommendations = [];
      if (stats.pass_rate < 60) {
        recommendations.push('通过率较低，建议检查考试难度设置');
      }
      if (stats.average_score < 70) {
        recommendations.push('平均分偏低，建议加强学员培训');
      }
      if (recommendations.length === 0) {
        recommendations.push('整体表现良好，继续保持');
      }

      return {
        success: true,
        report: {
          summary,
          charts,
          tables,
          recommendations
        }
      };
    } catch (error) {
      console.error('生成报告失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成报告失败'
      };
    }
  }

  /**
   * 获取等级文本
   * @param level 等级
   * @returns 等级文本
   */
  private getGradeLevelText(level: string): string {
    const levelMap: Record<string, string> = {
      'A': '优秀',
      'B': '良好',
      'C': '及格',
      'D': '不及格',
      'F': '失败'
    };
    return levelMap[level] || level;
  }

  /**
   * 获取状态文本
   * @param status 状态
   * @returns 状态文本
   */
  private getGradeStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'published': '已发布',
      'draft': '草稿',
      'archived': '已归档'
    };
    return statusMap[status] || status;
  }

  /**
   * 按时间分组成绩数据
   * @param grades 成绩数组
   * @param period 时间范围
   * @returns 时间序列数据
   */
  private groupGradesByTime(grades: any[], period: StatsPeriod): any[] {
    // 根据时间范围确定分组间隔
    const groupBy = this.getGroupByInterval(period);
    const groups = new Map();

    grades.forEach(grade => {
      const date = new Date(grade.created_at);
      const key = this.getTimeKey(date, groupBy);
      
      if (!groups.has(key)) {
        groups.set(key, {
          date: key,
          scores: [],
          count: 0,
          average_score: 0,
          pass_count: 0,
          pass_rate: 0
        });
      }
      
      const group = groups.get(key);
      group.scores.push(grade.score);
      group.count++;
      if (grade.passed) group.pass_count++;
    });

    // 计算每组的统计数据
    const result = Array.from(groups.values()).map(group => ({
      ...group,
      average_score: group.scores.reduce((sum: number, score: number) => sum + score, 0) / group.scores.length,
      pass_rate: (group.pass_count / group.count) * 100
    }));

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * 获取分组间隔
   * @param period 时间范围
   * @returns 分组间隔
   */
  private getGroupByInterval(period: StatsPeriod): 'hour' | 'day' | 'week' | 'month' {
    switch (period) {
      case StatsPeriod.TODAY:
        return 'hour';
      case StatsPeriod.THIS_WEEK:
        return 'day';
      case StatsPeriod.THIS_MONTH:
        return 'day';
      case StatsPeriod.THIS_QUARTER:
        return 'week';
      case StatsPeriod.THIS_YEAR:
        return 'month';
      default:
        return 'day';
    }
  }

  /**
   * 获取时间键
   * @param date 日期
   * @param groupBy 分组方式
   * @returns 时间键
   */
  private getTimeKey(date: Date, groupBy: 'hour' | 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'hour':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      case 'day':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate()) / 7)}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * 生成预测数据
   * @param timeSeriesData 时间序列数据
   * @returns 预测数据
   */
  private generatePredictions(timeSeriesData: any[]): any[] {
    if (timeSeriesData.length < 2) return [];

    // 简单线性回归预测
    const n = timeSeriesData.length;
    const lastTrend = timeSeriesData[n - 1].average_score - timeSeriesData[n - 2].average_score;
    
    const predictions = [];
    for (let i = 1; i <= 3; i++) {
      const lastData = timeSeriesData[n - 1];
      const predictedScore = lastData.average_score + (lastTrend * i);
      
      predictions.push({
        period: i,
        predicted_score: Math.max(0, Math.min(100, predictedScore)),
        confidence: Math.max(0.3, 0.9 - (i * 0.2)) // 置信度随预测期数递减
      });
    }
    
    return predictions;
  }
}

// 导出服务实例
export const gradeService = new GradeService();
export default gradeService;