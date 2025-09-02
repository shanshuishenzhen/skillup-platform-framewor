/**
 * 题目服务类
 * 提供题目管理的核心业务逻辑，包括CRUD操作、查询、统计等功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { supabase } from '@/lib/supabase';
import {
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  type Question,
  type CreateQuestionRequest,
  type UpdateQuestionRequest,
  type QuestionQueryParams,
  type QuestionQueryResponse,
  type QuestionStats,
  type QuestionImportData,
  type QuestionImportResult,
  type QuestionAnswer,
  type QuestionGradingResult
} from '@/types/question';

/**
 * 题目服务类
 * 封装所有与题目相关的数据库操作和业务逻辑
 */
export class QuestionService {
  /**
   * 获取题目列表
   * 支持搜索、过滤、排序和分页功能
   * 
   * @param params - 查询参数
   * @returns Promise<QuestionQueryResponse> 题目列表响应
   * 
   * @example
   * ```typescript
   * const result = await questionService.getQuestions({
   *   search: '算法',
   *   type: QuestionType.SINGLE_CHOICE,
   *   difficulty: QuestionDifficulty.MEDIUM,
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async getQuestions(params: QuestionQueryParams = {}): Promise<QuestionQueryResponse> {
    try {
      const {
        search,
        type,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = params;

      let query = supabase
        .from('questions')
        .select('*', { count: 'exact' });

      // 应用过滤条件
      if (search) {
        query = query.ilike('question_text', `%${search}%`);
      }

      if (type) {
        query = query.eq('question_type', type);
      }

      // 应用排序
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // 应用分页
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`获取题目列表失败: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      // 转换数据库字段到前端期望的格式
      const questions = (data || []).map(item => ({
        id: item.id,
        title: item.question_text || '未命名题目',
        content: item.question_text,
        type: item.question_type,
        difficulty: 'medium' as QuestionDifficulty,
        status: QuestionStatus.PUBLISHED,
        points: item.score || 1,
        category: '',
        tags: [],
        createdBy: '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        explanation: item.explanation,
        questionData: {
          options: item.options || [],
          correctAnswers: item.correct_answers || []
        }
      }));

      return {
        questions,
        total: count || 0,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('QuestionService.getQuestions error:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取题目详情
   * 
   * @param id - 题目ID
   * @returns Promise<Question | null> 题目详情或null
   * 
   * @example
   * ```typescript
   * const question = await questionService.getQuestionById('123');
   * if (question) {
   *   console.log('题目标题:', question.title);
   * }
   * ```
   */
  async getQuestionById(id: string): Promise<Question | null> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 题目不存在
        }
        throw new Error(`获取题目详情失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('QuestionService.getQuestionById error:', error);
      throw error;
    }
  }

  /**
   * 创建新题目
   * 
   * @param questionData - 题目创建数据
   * @param userId - 创建者用户ID
   * @returns Promise<Question> 创建的题目
   * 
   * @example
   * ```typescript
   * const newQuestion = await questionService.createQuestion({
   *   title: '什么是算法复杂度？',
   *   content: '请选择正确的算法复杂度定义',
   *   type: QuestionType.SINGLE_CHOICE,
   *   difficulty: QuestionDifficulty.MEDIUM,
   *   points: 10,
   *   questionData: {
   *     options: [
   *       { id: '1', text: '选项A', isCorrect: true },
   *       { id: '2', text: '选项B', isCorrect: false }
   *     ]
   *   }
   * }, 'user123');
   * ```
   */
  async createQuestion(questionData: CreateQuestionRequest, userId: string): Promise<Question> {
    try {
      const now = new Date().toISOString();
      
      const questionToCreate = {
        title: questionData.title,
        content: questionData.content,
        type: questionData.type,
        difficulty: questionData.difficulty,
        status: QuestionStatus.DRAFT,
        points: questionData.points,
        category: questionData.category,
        tags: questionData.tags || [],
        explanation: questionData.explanation,
        references: questionData.references || [],
        question_data: questionData.questionData,
        created_by: userId,
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('questions')
        .insert([questionToCreate])
        .select()
        .single();

      if (error) {
        throw new Error(`创建题目失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('QuestionService.createQuestion error:', error);
      throw error;
    }
  }

  /**
   * 更新题目
   * 
   * @param questionData - 题目更新数据
   * @returns Promise<Question> 更新后的题目
   * 
   * @example
   * ```typescript
   * const updatedQuestion = await questionService.updateQuestion({
   *   id: '123',
   *   title: '更新后的题目标题',
   *   difficulty: QuestionDifficulty.HARD
   * });
   * ```
   */
  async updateQuestion(questionData: UpdateQuestionRequest): Promise<Question> {
    try {
      const { id, ...updateData } = questionData;
      
      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('questions')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`更新题目失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('QuestionService.updateQuestion error:', error);
      throw error;
    }
  }

  /**
   * 删除题目
   * 
   * @param id - 题目ID
   * @returns Promise<boolean> 删除是否成功
   * 
   * @example
   * ```typescript
   * const success = await questionService.deleteQuestion('123');
   * if (success) {
   *   console.log('题目删除成功');
   * }
   * ```
   */
  async deleteQuestion(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`删除题目失败: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('QuestionService.deleteQuestion error:', error);
      throw error;
    }
  }

  /**
   * 发布题目
   * 将题目状态从草稿改为已发布
   * 
   * @param id - 题目ID
   * @returns Promise<Question> 发布后的题目
   * 
   * @example
   * ```typescript
   * const publishedQuestion = await questionService.publishQuestion('123');
   * ```
   */
  async publishQuestion(id: string): Promise<Question> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update({ 
          status: QuestionStatus.PUBLISHED,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`发布题目失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('QuestionService.publishQuestion error:', error);
      throw error;
    }
  }

  /**
   * 归档题目
   * 将题目状态改为已归档
   * 
   * @param id - 题目ID
   * @returns Promise<Question> 归档后的题目
   * 
   * @example
   * ```typescript
   * const archivedQuestion = await questionService.archiveQuestion('123');
   * ```
   */
  async archiveQuestion(id: string): Promise<Question> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update({ 
          status: QuestionStatus.ARCHIVED,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`归档题目失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('QuestionService.archiveQuestion error:', error);
      throw error;
    }
  }

  /**
   * 获取题目统计信息
   * 
   * @returns Promise<QuestionStats> 题目统计数据
   * 
   * @example
   * ```typescript
   * const stats = await questionService.getQuestionStats();
   * console.log('总题目数:', stats.totalQuestions);
   * console.log('单选题数量:', stats.byType[QuestionType.SINGLE_CHOICE]);
   * ```
   */
  async getQuestionStats(): Promise<QuestionStats> {
    try {
      // 获取总数
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      // 按类型统计
      const { data: typeStats } = await supabase
        .from('questions')
        .select('type')
        .eq('status', QuestionStatus.PUBLISHED);

      // 按难度统计
      const { data: difficultyStats } = await supabase
        .from('questions')
        .select('difficulty')
        .eq('status', QuestionStatus.PUBLISHED);

      // 按状态统计
      const { data: statusStats } = await supabase
        .from('questions')
        .select('status');

      // 按分类统计
      const { data: categoryStats } = await supabase
        .from('questions')
        .select('category')
        .eq('status', QuestionStatus.PUBLISHED)
        .not('category', 'is', null);

      // 处理统计数据
      const byType = {} as Record<QuestionType, number>;
      const byDifficulty = {} as Record<QuestionDifficulty, number>;
      const byStatus = {} as Record<QuestionStatus, number>;
      const byCategory = {} as Record<string, number>;

      // 初始化计数器
      Object.values(QuestionType).forEach(type => { byType[type] = 0; });
      Object.values(QuestionDifficulty).forEach(difficulty => { byDifficulty[difficulty] = 0; });
      Object.values(QuestionStatus).forEach(status => { byStatus[status] = 0; });

      // 统计类型
      typeStats?.forEach(item => {
        if (item.type) byType[item.type as QuestionType]++;
      });

      // 统计难度
      difficultyStats?.forEach(item => {
        if (item.difficulty) byDifficulty[item.difficulty as QuestionDifficulty]++;
      });

      // 统计状态
      statusStats?.forEach(item => {
        if (item.status) byStatus[item.status as QuestionStatus]++;
      });

      // 统计分类
      categoryStats?.forEach(item => {
        if (item.category) {
          byCategory[item.category] = (byCategory[item.category] || 0) + 1;
        }
      });

      return {
        totalQuestions: totalQuestions || 0,
        byType,
        byDifficulty,
        byStatus,
        byCategory
      };
    } catch (error) {
      console.error('QuestionService.getQuestionStats error:', error);
      throw error;
    }
  }

  /**
   * 批量导入题目
   * 
   * @param importData - 导入数据
   * @param userId - 导入者用户ID
   * @returns Promise<QuestionImportResult> 导入结果
   * 
   * @example
   * ```typescript
   * const result = await questionService.importQuestions({
   *   questions: [questionData1, questionData2],
   *   options: { validate: true }
   * }, 'user123');
   * console.log('成功导入:', result.successCount);
   * ```
   */
  async importQuestions(importData: QuestionImportData, userId: string): Promise<QuestionImportResult> {
    const result: QuestionImportResult = {
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errors: []
    };

    try {
      for (let i = 0; i < importData.questions.length; i++) {
        const questionData = importData.questions[i];
        
        try {
          // 验证数据格式
          if (importData.options?.validate) {
            if (!questionData.title || !questionData.content || !questionData.type) {
              result.errors.push({
                row: i + 1,
                message: '缺少必需字段: title, content, type'
              });
              result.failureCount++;
              continue;
            }
          }

          // 检查是否已存在
          if (!importData.options?.overwrite) {
            const existing = await supabase
              .from('questions')
              .select('id')
              .eq('title', questionData.title)
              .single();

            if (existing.data) {
              result.skippedCount++;
              continue;
            }
          }

          // 创建题目
          await this.createQuestion(questionData, userId);
          result.successCount++;
        } catch (error) {
          result.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : '未知错误'
          });
          result.failureCount++;
        }
      }

      return result;
    } catch (error) {
      console.error('QuestionService.importQuestions error:', error);
      throw error;
    }
  }

  /**
   * 评分题目答案
   * 
   * @param questionId - 题目ID
   * @param userAnswer - 用户答案
   * @returns Promise<QuestionGradingResult> 评分结果
   * 
   * @example
   * ```typescript
   * const result = await questionService.gradeAnswer('123', 'A');
   * console.log('是否正确:', result.isCorrect);
   * console.log('得分:', result.score);
   * ```
   */
  async gradeAnswer(questionId: string, userAnswer: any): Promise<QuestionGradingResult> {
    try {
      const question = await this.getQuestionById(questionId);
      
      if (!question) {
        throw new Error('题目不存在');
      }

      let isCorrect = false;
      let score = 0;
      let correctAnswer: any;
      let details = '';
      let feedback = '';

      // 根据题目类型进行评分
      switch (question.type) {
        case QuestionType.SINGLE_CHOICE:
        case QuestionType.MULTIPLE_CHOICE:
          const questionData = question.question_data as any;
          correctAnswer = questionData.options
            .filter((opt: any) => opt.isCorrect)
            .map((opt: any) => opt.id);
          
          if (question.type === QuestionType.SINGLE_CHOICE) {
            isCorrect = correctAnswer.length > 0 && correctAnswer[0] === userAnswer;
          } else {
            // 多选题需要完全匹配
            const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            isCorrect = correctAnswer.length === userAnswerArray.length &&
              correctAnswer.every((ans: string) => userAnswerArray.includes(ans));
          }
          break;

        case QuestionType.TRUE_FALSE:
          correctAnswer = question.question_data.correctAnswer;
          isCorrect = correctAnswer === userAnswer;
          break;

        case QuestionType.FILL_BLANK:
          correctAnswer = question.question_data.correctAnswers;
          const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
          isCorrect = correctAnswer.every((ans: string, index: number) => 
            userAnswerArray[index]?.toLowerCase().trim() === ans.toLowerCase().trim()
          );
          break;

        case QuestionType.SHORT_ANSWER:
        case QuestionType.CODING:
          // 主观题需要人工评分，这里只返回基本信息
          correctAnswer = question.question_data.sampleAnswer || '';
          isCorrect = false; // 需要人工评分
          details = '此题需要人工评分';
          break;

        default:
          throw new Error(`不支持的题目类型: ${question.type}`);
      }

      // 计算得分
      if (isCorrect) {
        score = question.points || 1;
      }

      // 获取反馈信息
      if (question.question_data.explanation) {
        feedback = question.question_data.explanation;
      }

      return {
        isCorrect,
        score,
        maxScore: question.points || 1,
        correctAnswer,
        userAnswer,
        details,
        feedback
      };
    } catch (error) {
      console.error('QuestionService.gradeAnswer error:', error);
      throw error;
    }
  }
}

// 创建并导出默认实例
export const questionService = new QuestionService();

// 导出类供其他地方使用
export default QuestionService;