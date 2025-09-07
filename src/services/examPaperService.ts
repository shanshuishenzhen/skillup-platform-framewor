/**
 * 试卷服务类
 * 提供试卷管理的核心业务逻辑，包括试卷创建、查询、更新等功能
 * 
 * @author SOLO Coding
 * @version 1.0.0
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ExamPaper = Database['public']['Tables']['exam_papers']['Row'];
type ExamPaperInsert = Database['public']['Tables']['exam_papers']['Insert'];
type ExamPaperUpdate = Database['public']['Tables']['exam_papers']['Update'];

/**
 * 创建试卷请求接口
 */
export interface CreateExamPaperRequest {
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  totalQuestions: number;
  totalScore: number;
  questionIds?: string[];
  questionsData?: any[];
  tags?: string[];
  settings?: Record<string, any>;
  paperCode?: string; // 试卷编码（来自模板的试卷ID）
}

/**
 * 试卷查询参数接口
 */
export interface ExamPaperQueryParams {
  search?: string;
  category?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 试卷查询响应接口
 */
export interface ExamPaperQueryResponse {
  papers: ExamPaper[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 试卷服务类
 * 封装所有与试卷相关的数据库操作和业务逻辑
 */
export class ExamPaperService {
  /**
   * 获取试卷列表
   * 支持搜索、过滤、排序和分页功能
   * 
   * @param params - 查询参数
   * @returns Promise<ExamPaperQueryResponse> 试卷列表响应
   * 
   * @example
   * ```typescript
   * const result = await examPaperService.getExamPapers({
   *   search: 'JavaScript',
   *   category: '前端开发',
   *   difficulty: 'intermediate',
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async getExamPapers(params: ExamPaperQueryParams = {}): Promise<ExamPaperQueryResponse> {
    try {
      const {
        search,
        category,
        difficulty,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = params;

      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (category) queryParams.append('category', category);
      if (difficulty) queryParams.append('difficulty', difficulty);
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortOrder', sortOrder);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      // 调用API接口
      const response = await fetch(`/api/admin/exam-papers?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '获取试卷列表失败' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || {
        papers: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    } catch (error) {
      console.error('ExamPaperService.getExamPapers error:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取试卷详情
   * 
   * @param id - 试卷ID
   * @returns Promise<ExamPaper | null> 试卷详情或null
   * 
   * @example
   * ```typescript
   * const paper = await examPaperService.getExamPaperById('123');
   * if (paper) {
   *   console.log('试卷标题:', paper.title);
   * }
   * ```
   */
  async getExamPaperById(id: string): Promise<ExamPaper | null> {
    try {
      const { data, error } = await supabase
        .from('exam_papers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 试卷不存在
        }
        throw new Error(`获取试卷详情失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamPaperService.getExamPaperById error:', error);
      throw error;
    }
  }

  /**
   * 创建新试卷
   * 
   * @param paperData - 试卷创建数据
   * @param userId - 创建者用户ID
   * @returns Promise<ExamPaper> 创建的试卷
   * 
   * @example
   * ```typescript
   * const newPaper = await examPaperService.createExamPaper({
   *   title: 'JavaScript基础试卷',
   *   description: '测试JavaScript基础知识',
   *   category: '前端开发',
   *   difficulty: 'intermediate',
   *   totalQuestions: 20,
   *   totalScore: 100,
   *   questionsData: questions,
   *   paperCode: 'EXAM_001'
   * }, 'user123');
   * ```
   */
  async createExamPaper(paperData: CreateExamPaperRequest, userId: string): Promise<ExamPaper> {
    try {
      const now = new Date().toISOString();
      
      const paperToCreate: ExamPaperInsert = {
        title: paperData.title,
        description: paperData.description,
        category: paperData.category,
        difficulty: paperData.difficulty,
        total_questions: paperData.totalQuestions,
        total_score: paperData.totalScore,
        question_ids: paperData.questionIds || [],
        questions_data: paperData.questionsData || [],
        tags: paperData.tags || [],
        settings: paperData.settings || {},
        paper_code: paperData.paperCode, // 添加试卷编码字段
        created_by: userId,
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('exam_papers')
        .insert([paperToCreate])
        .select()
        .single();

      if (error) {
        throw new Error(`创建试卷失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamPaperService.createExamPaper error:', error);
      throw error;
    }
  }

  /**
   * 更新试卷
   * 
   * @param id - 试卷ID
   * @param updateData - 更新数据
   * @returns Promise<ExamPaper> 更新后的试卷
   * 
   * @example
   * ```typescript
   * const updatedPaper = await examPaperService.updateExamPaper('123', {
   *   title: '更新后的试卷标题',
   *   totalQuestions: 25
   * });
   * ```
   */
  async updateExamPaper(id: string, updateData: Partial<CreateExamPaperRequest>): Promise<ExamPaper> {
    try {
      const dataToUpdate: ExamPaperUpdate = {
        ...updateData,
        total_questions: updateData.totalQuestions,
        total_score: updateData.totalScore,
        question_ids: updateData.questionIds,
        questions_data: updateData.questionsData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('exam_papers')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`更新试卷失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamPaperService.updateExamPaper error:', error);
      throw error;
    }
  }

  /**
   * 删除试卷
   * 
   * @param id - 试卷ID
   * @returns Promise<boolean> 删除是否成功
   * 
   * @example
   * ```typescript
   * const success = await examPaperService.deleteExamPaper('123');
   * if (success) {
   *   console.log('试卷删除成功');
   * }
   * ```
   */
  async deleteExamPaper(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exam_papers')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`删除试卷失败: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('ExamPaperService.deleteExamPaper error:', error);
      throw error;
    }
  }

  /**
   * 根据试卷编码查询试卷
   * 
   * @param paperCode - 试卷编码（来自模板的试卷ID）
   * @returns Promise<ExamPaper | null> 试卷详情或null
   * 
   * @example
   * ```typescript
   * const paper = await examPaperService.findByPaperCode('EXAM_001');
   * if (paper) {
   *   console.log('找到重复的试卷编码:', paper.paper_code);
   * }
   * ```
   */
  async findByPaperCode(paperCode: string): Promise<ExamPaper | null> {
    try {
      const { data, error } = await supabase
        .from('exam_papers')
        .select('*')
        .eq('paper_code', paperCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 试卷编码不存在
        }
        throw new Error(`查询试卷编码失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('ExamPaperService.findByPaperCode error:', error);
      throw error;
    }
  }

  /**
   * 根据分类获取试卷
   * 
   * @param category - 试卷分类
   * @returns Promise<ExamPaper[]> 试卷列表
   * 
   * @example
   * ```typescript
   * const papers = await examPaperService.getExamPapersByCategory('前端开发');
   * ```
   */
  async getExamPapersByCategory(category: string): Promise<ExamPaper[]> {
    try {
      const { data, error } = await supabase
        .from('exam_papers')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`获取分类试卷失败: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('ExamPaperService.getExamPapersByCategory error:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const examPaperService = new ExamPaperService();