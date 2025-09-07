/**
 * 题目服务单元测试
 * 测试题目管理相关的核心功能
 */

// 模拟Supabase客户端
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

import { questionService } from '@/services/questionService';
import { QuestionType } from '@/types/question';
import { supabase } from '@/lib/supabase';

const mockSupabaseClient = supabase as jest.Mocked<typeof supabase>;

// 测试工具函数
const createMockQuestion = (overrides = {}) => ({
  id: 'question-123',
  exam_id: 'exam-123',
  type: 'multiple_choice' as QuestionType,
  content: '这是一个测试题目？',
  options: ['选项A', '选项B', '选项C', '选项D'],
  correct_answer: 'A',
  points: 10,
  explanation: '这是解释',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

const createMockQuery = (data, error) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data, error }),
  then: jest.fn().mockResolvedValue({ data, error })
});

describe('题目服务测试', () => {
  // 测试数据
  const mockQuestion = createMockQuestion();
  const mockQuestions = [
    mockQuestion,
    createMockQuestion({
      id: 'question-456',
      type: 'single_choice',
      title: '单选题测试'
    })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 题目查询功能测试
   */
  describe('题目查询功能', () => {
    /**
     * 测试获取考试的题目列表
     */
    it('应该能够获取题目列表', async () => {
      const mockQuery = createMockQuery(mockQuestions, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.getQuestionsByExamId('exam-123');

      expect(result).toEqual(mockQuestions);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('questions');
      expect(mockQuery.eq).toHaveBeenCalledWith('exam_id', 'exam-123');
      expect(mockQuery.order).toHaveBeenCalledWith('order', { ascending: true });
    });

    /**
     * 测试根据ID获取题目详情
     */
    it('应该能够根据ID获取题目详情', async () => {
      const mockQuery = createMockQuery(mockQuestion, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.getQuestionById('question-123');

      expect(result).toEqual(mockQuestion);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'question-123');
    });

    /**
     * 测试题目不存在的情况
     */
    it('当题目不存在时应该返回null', async () => {
      const mockQuery = createMockQuery(null, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.getQuestionById('nonexistent');

      expect(result).toBeNull();
    });

    /**
     * 测试根据题目类型过滤
     */
    it('应该能够根据题目类型过滤', async () => {
      const singleChoiceQuestions = mockQuestions.filter(q => q.type === 'single_choice');
      const mockQuery = createMockQuery(singleChoiceQuestions, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.getQuestionsByExamId('exam-123', {
        type: QuestionType.SINGLE_CHOICE
      });

      expect(result).toEqual(singleChoiceQuestions);
      expect(mockQuery.eq).toHaveBeenCalledWith('type', QuestionType.SINGLE_CHOICE);
    });
  });

  /**
   * 题目创建功能测试
   */
  describe('题目创建功能', () => {
    /**
     * 测试创建新题目
     */
    it('应该能够创建新题目', async () => {
      const newQuestionData = {
        exam_id: 'exam-123',
        type: QuestionType.MULTIPLE_CHOICE,
        title: '新题目',
        content: '这是一个新题目',
        options: ['选项A', '选项B', '选项C', '选项D'],
        correct_answer: 'A',
        score: 10
      };

      const createdQuestion = createMockQuestion({
        id: 'question-new',
        ...newQuestionData,
        order: 1
      });

      const mockQuery = createMockQuery(createdQuestion, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.createQuestion(newQuestionData);

      expect(result).toEqual(createdQuestion);
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...newQuestionData,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      }));
    });

    /**
     * 测试批量创建题目
     */
    it('应该能够批量创建题目', async () => {
      const questionsData = [
        {
          exam_id: 'exam-123',
          type: QuestionType.SINGLE_CHOICE,
          title: '题目1',
          content: '这是题目1',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          score: 5
        },
        {
          exam_id: 'exam-123',
          type: QuestionType.MULTIPLE_CHOICE,
          title: '题目2',
          content: '这是题目2',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'AB',
          score: 10
        }
      ];

      const createdQuestions = questionsData.map((data, index) => 
        createMockQuestion({
          id: `question-${index + 1}`,
          ...data,
          order: index + 1
        })
      );

      const mockQuery = createMockQuery(createdQuestions, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.createQuestions(questionsData);

      expect(result).toEqual(createdQuestions);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining(
          questionsData.map(data => expect.objectContaining(data))
        )
      );
    });

    /**
     * 测试创建题目时的验证
     */
    it('创建题目时应该验证必填字段', async () => {
      const invalidQuestionData = {
        exam_id: 'exam-123',
        type: QuestionType.MULTIPLE_CHOICE,
        title: '', // 空标题
        content: '题目内容',
        options: ['A', 'B'],
        correct_answer: 'A',
        score: 10
      };

      const mockQuery = createMockQuery(
        null,
        { message: '题目标题不能为空' }
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await expect(questionService.createQuestion(invalidQuestionData))
        .rejects.toThrow('创建题目失败: 题目标题不能为空');
    });
  });

  /**
   * 题目更新功能测试
   */
  describe('题目更新功能', () => {
    /**
     * 测试更新题目信息
     */
    it('应该能够更新题目信息', async () => {
      const updateData = {
        title: '更新后的题目标题',
        content: '更新后的题目内容',
        score: 15
      };

      const updatedQuestion = createMockQuestion({
        ...mockQuestion,
        ...updateData
      });

      const mockQuery = createMockQuery(updatedQuestion, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.updateQuestion('question-123', updateData);

      expect(result).toEqual(updatedQuestion);
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
        ...updateData,
        updated_at: expect.any(String)
      }));
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'question-123');
    });

    /**
     * 测试更新题目顺序
     */
    it('应该能够更新题目顺序', async () => {
      const orderUpdates = [
        { id: 'question-1', order: 2 },
        { id: 'question-2', order: 1 }
      ];

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await questionService.updateQuestionsOrder(orderUpdates);

      expect(mockQuery.update).toHaveBeenCalledTimes(2);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'question-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'question-2');
    });
  });

  /**
   * 题目删除功能测试
   */
  describe('题目删除功能', () => {
    /**
     * 测试删除题目
     */
    it('应该能够删除题目', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await questionService.deleteQuestion('question-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('questions');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'question-123');
    });

    /**
     * 测试批量删除题目
     */
    it('应该能够批量删除题目', async () => {
      const questionIds = ['question-1', 'question-2', 'question-3'];

      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await questionService.deleteQuestions(questionIds);

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.in).toHaveBeenCalledWith('id', questionIds);
    });

    /**
     * 测试删除考试的所有题目
     */
    it('应该能够删除考试的所有题目', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await questionService.deleteQuestionsByExamId('exam-123');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('exam_id', 'exam-123');
    });
  });

  /**
   * 题目统计功能测试
   */
  describe('题目统计功能', () => {
    /**
     * 测试获取考试题目统计
     */
    it('应该能够获取考试题目统计', async () => {
      const mockStats = {
        total: 10,
        by_type: {
          single_choice: 5,
          multiple_choice: 3,
          true_false: 2
        },
        total_score: 100
      };

      const mockQuery = createMockQuery(mockStats, null);
      mockSupabaseClient.rpc = jest.fn().mockResolvedValue({
        data: mockStats,
        error: null
      });

      const result = await questionService.getQuestionStats('exam-123');

      expect(result).toEqual(mockStats);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_question_stats', {
        exam_id: 'exam-123'
      });
    });
  });

  /**
   * 错误处理测试
   */
  describe('错误处理', () => {
    /**
     * 测试数据库错误处理
     */
    it('应该正确处理数据库错误', async () => {
      const mockQuery = createMockQuery(
        null,
        { message: '数据库连接失败' }
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await expect(questionService.getQuestionById('question-123'))
        .rejects.toThrow('获取题目详情失败: 数据库连接失败');
    });

    /**
     * 测试题目不存在错误
     */
    it('应该正确处理题目不存在的错误', async () => {
      const mockQuery = createMockQuery(
        null,
        { message: '题目不存在' }
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await expect(questionService.updateQuestion('nonexistent', { title: '新标题' }))
        .rejects.toThrow('更新题目失败: 题目不存在');
    });
  });

  /**
   * 边界情况测试
   */
  describe('边界情况测试', () => {
    /**
     * 测试空题目列表
     */
    it('应该正确处理空题目列表', async () => {
      const mockQuery = createMockQuery([], null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const result = await questionService.getQuestionsByExamId('exam-empty');

      expect(result).toEqual([]);
    });

    /**
     * 测试题目选项验证
     */
    it('应该验证选择题的选项数量', async () => {
      const invalidQuestionData = {
        exam_id: 'exam-123',
        type: QuestionType.SINGLE_CHOICE,
        title: '选择题',
        content: '这是一个选择题',
        options: ['A'], // 选项太少
        correct_answer: 'A',
        score: 10
      };

      const mockQuery = createMockQuery(
        null,
        { message: '选择题至少需要2个选项' }
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await expect(questionService.createQuestion(invalidQuestionData))
        .rejects.toThrow('创建题目失败: 选择题至少需要2个选项');
    });

    /**
     * 测试分数验证
     */
    it('应该验证题目分数为正数', async () => {
      const invalidQuestionData = {
        exam_id: 'exam-123',
        type: QuestionType.SINGLE_CHOICE,
        title: '选择题',
        content: '这是一个选择题',
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        score: -5 // 负分数
      };

      const mockQuery = createMockQuery(
        null,
        { message: '题目分数必须为正数' }
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      await expect(questionService.createQuestion(invalidQuestionData))
        .rejects.toThrow('创建题目失败: 题目分数必须为正数');
    });
  });
});