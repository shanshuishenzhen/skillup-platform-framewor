// 题目服务完整单元测试
import { jest } from '@jest/globals';

// Mock Supabase 客户端
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  })),
};

jest.mock('../../../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

import * as questionService from '../../../services/questionService';
import { supabase } from '../../../lib/supabase';
import { QuestionType } from '../../../types/question';

// 类型断言
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// 测试辅助函数
const createMockQuestion = (overrides = {}) => ({
  id: '1',
  content: '这是一个测试题目？',
  type: 'single_choice' as QuestionType,
  options: ['选项A', '选项B', '选项C', '选项D'],
  correct_answer: 'A',
  explanation: '正确答案是A，因为...',
  difficulty: 'medium',
  subject: '数学',
  tags: ['基础', '计算'],
  created_by: 'teacher1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockQuery = (data: any, error: any = null) => ({
  data,
  error,
  count: data ? data.length : 0,
});

describe('题目服务完整测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuestions - 获取题目列表', () => {
    it('应该成功获取题目列表', async () => {
      const mockQuestions = [createMockQuestion(), createMockQuestion({ id: '2', content: '题目2' })];
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery(mockQuestions));

      const result = await questionService.getQuestions({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('questions');
    });

    it('应该支持题目类型筛选', async () => {
      const mockQuestions = [createMockQuestion({ type: 'multiple_choice' })];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().eq.mockReturnThis();

      await questionService.getQuestions({ type: 'multiple_choice' });

      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('type', 'multiple_choice');
    });

    it('应该支持难度筛选', async () => {
      const mockQuestions = [createMockQuestion({ difficulty: 'hard' })];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().eq.mockReturnThis();

      await questionService.getQuestions({ difficulty: 'hard' });

      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('difficulty', 'hard');
    });

    it('应该支持学科筛选', async () => {
      const mockQuestions = [createMockQuestion({ subject: '物理' })];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().eq.mockReturnThis();

      await questionService.getQuestions({ subject: '物理' });

      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('subject', '物理');
    });

    it('应该支持内容搜索', async () => {
      const mockQuestions = [createMockQuestion({ content: '包含关键词的题目' })];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().ilike.mockReturnThis();

      await questionService.getQuestions({ search: '关键词' });

      expect(mockSupabaseClient.from().ilike).toHaveBeenCalledWith('content', '%关键词%');
    });

    it('应该支持分页', async () => {
      const mockQuestions = [createMockQuestion()];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().range.mockReturnThis();

      await questionService.getQuestions({ page: 2, limit: 20 });

      expect(mockSupabaseClient.from().range).toHaveBeenCalledWith(20, 39);
    });

    it('应该支持排序', async () => {
      const mockQuestions = [createMockQuestion()];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().order.mockReturnThis();

      await questionService.getQuestions({ sortBy: 'created_at', sortOrder: 'desc' });

      expect(mockSupabaseClient.from().order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('应该处理数据库错误', async () => {
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(null, { message: '数据库错误' }));

      const result = await questionService.getQuestions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('数据库错误');
    });
  });

  describe('createQuestion - 创建题目', () => {
    it('应该成功创建单选题', async () => {
      const newQuestion = {
        content: '新的单选题？',
        type: 'single_choice' as QuestionType,
        options: ['选项1', '选项2', '选项3', '选项4'],
        correct_answer: '选项1',
        explanation: '解释说明',
        difficulty: 'easy',
        subject: '语文',
        tags: ['基础'],
        created_by: 'teacher1',
      };
      const mockCreatedQuestion = createMockQuestion(newQuestion);
      
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery([mockCreatedQuestion]));

      const result = await questionService.createQuestion(newQuestion);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedQuestion);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(expect.objectContaining(newQuestion));
    });

    it('应该成功创建多选题', async () => {
      const newQuestion = {
        content: '新的多选题？',
        type: 'multiple_choice' as QuestionType,
        options: ['选项1', '选项2', '选项3', '选项4'],
        correct_answer: ['选项1', '选项3'],
        explanation: '正确答案是选项1和选项3',
        difficulty: 'medium',
        subject: '数学',
        tags: ['综合'],
        created_by: 'teacher1',
      };
      const mockCreatedQuestion = createMockQuestion(newQuestion);
      
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery([mockCreatedQuestion]));

      const result = await questionService.createQuestion(newQuestion);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedQuestion);
    });

    it('应该成功创建判断题', async () => {
      const newQuestion = {
        content: '地球是圆的。',
        type: 'true_false' as QuestionType,
        options: ['正确', '错误'],
        correct_answer: '正确',
        explanation: '地球确实是球形的',
        difficulty: 'easy',
        subject: '地理',
        tags: ['常识'],
        created_by: 'teacher1',
      };
      const mockCreatedQuestion = createMockQuestion(newQuestion);
      
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery([mockCreatedQuestion]));

      const result = await questionService.createQuestion(newQuestion);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedQuestion);
    });

    it('应该成功创建填空题', async () => {
      const newQuestion = {
        content: '中国的首都是____。',
        type: 'fill_blank' as QuestionType,
        options: [],
        correct_answer: '北京',
        explanation: '中国的首都是北京',
        difficulty: 'easy',
        subject: '地理',
        tags: ['基础知识'],
        created_by: 'teacher1',
      };
      const mockCreatedQuestion = createMockQuestion(newQuestion);
      
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery([mockCreatedQuestion]));

      const result = await questionService.createQuestion(newQuestion);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedQuestion);
    });

    it('应该验证必填字段', async () => {
      const invalidQuestion = {
        content: '',
        type: 'single_choice' as QuestionType,
        options: [],
        correct_answer: '',
        difficulty: '',
        subject: '',
        created_by: '',
      };

      const result = await questionService.createQuestion(invalidQuestion);

      expect(result.success).toBe(false);
      expect(result.error).toContain('验证失败');
    });

    it('应该验证单选题选项数量', async () => {
      const invalidQuestion = {
        content: '题目内容？',
        type: 'single_choice' as QuestionType,
        options: ['只有一个选项'],
        correct_answer: '只有一个选项',
        difficulty: 'easy',
        subject: '数学',
        created_by: 'teacher1',
      };

      const result = await questionService.createQuestion(invalidQuestion);

      expect(result.success).toBe(false);
      expect(result.error).toContain('单选题至少需要2个选项');
    });

    it('应该验证正确答案在选项中', async () => {
      const invalidQuestion = {
        content: '题目内容？',
        type: 'single_choice' as QuestionType,
        options: ['选项1', '选项2'],
        correct_answer: '不存在的选项',
        difficulty: 'easy',
        subject: '数学',
        created_by: 'teacher1',
      };

      const result = await questionService.createQuestion(invalidQuestion);

      expect(result.success).toBe(false);
      expect(result.error).toContain('正确答案必须在选项中');
    });

    it('应该处理数据库插入错误', async () => {
      const newQuestion = {
        content: '新题目？',
        type: 'single_choice' as QuestionType,
        options: ['选项1', '选项2'],
        correct_answer: '选项1',
        difficulty: 'easy',
        subject: '数学',
        created_by: 'teacher1',
      };
      
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery(null, { message: '插入失败' }));

      const result = await questionService.createQuestion(newQuestion);

      expect(result.success).toBe(false);
      expect(result.error).toBe('插入失败');
    });
  });

  describe('updateQuestion - 更新题目', () => {
    it('应该成功更新题目', async () => {
      const updatedQuestion = createMockQuestion({ content: '更新后的题目？' });
      mockSupabaseClient.from().update.mockResolvedValue(createMockQuery([updatedQuestion]));

      const result = await questionService.updateQuestion('1', { content: '更新后的题目？' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedQuestion);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({ content: '更新后的题目？' });
    });

    it('应该验证更新数据', async () => {
      const result = await questionService.updateQuestion('1', { 
        type: 'single_choice' as QuestionType,
        options: ['只有一个选项'],
        correct_answer: '不存在的选项'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('验证失败');
    });

    it('应该处理题目不存在的情况', async () => {
      mockSupabaseClient.from().update.mockResolvedValue(createMockQuery([]));

      const result = await questionService.updateQuestion('999', { content: '不存在的题目' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('题目不存在');
    });
  });

  describe('deleteQuestion - 删除题目', () => {
    it('应该成功删除题目', async () => {
      mockSupabaseClient.from().delete.mockResolvedValue(createMockQuery([{ id: '1' }]));

      const result = await questionService.deleteQuestion('1');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', '1');
    });

    it('应该处理删除不存在题目的情况', async () => {
      mockSupabaseClient.from().delete.mockResolvedValue(createMockQuery([]));

      const result = await questionService.deleteQuestion('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('题目不存在');
    });
  });

  describe('getQuestionById - 根据ID获取题目', () => {
    it('应该成功获取题目', async () => {
      const mockQuestion = createMockQuestion();
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([mockQuestion]));

      const result = await questionService.getQuestionById('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQuestion);
    });

    it('应该处理题目不存在的情况', async () => {
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([]));

      const result = await questionService.getQuestionById('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('题目不存在');
    });
  });

  describe('getQuestionsByExam - 根据考试获取题目', () => {
    it('应该成功获取考试题目', async () => {
      const mockQuestions = [
        createMockQuestion(),
        createMockQuestion({ id: '2', content: '第二题？' })
      ];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));

      const result = await questionService.getQuestionsByExam('exam1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQuestions);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('exam_questions');
    });

    it('应该支持随机排序', async () => {
      const mockQuestions = [createMockQuestion()];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().order.mockReturnThis();

      await questionService.getQuestionsByExam('exam1', { randomize: true });

      expect(mockSupabaseClient.from().order).toHaveBeenCalledWith('random()');
    });

    it('应该支持限制题目数量', async () => {
      const mockQuestions = [createMockQuestion()];
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(mockQuestions));
      mockSupabaseClient.from().limit.mockReturnThis();

      await questionService.getQuestionsByExam('exam1', { limit: 10 });

      expect(mockSupabaseClient.from().limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getQuestionStatistics - 获取题目统计', () => {
    it('应该成功获取题目统计信息', async () => {
      const mockStats = {
        total_questions: 100,
        by_type: {
          single_choice: 60,
          multiple_choice: 25,
          true_false: 10,
          fill_blank: 5
        },
        by_difficulty: {
          easy: 40,
          medium: 45,
          hard: 15
        },
        by_subject: {
          '数学': 30,
          '语文': 25,
          '英语': 20,
          '物理': 15,
          '化学': 10
        }
      };
      
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([mockStats]));

      const result = await questionService.getQuestionStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });

    it('应该处理统计查询错误', async () => {
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery(null, { message: '统计查询失败' }));

      const result = await questionService.getQuestionStatistics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('统计查询失败');
    });
  });

  describe('bulkImportQuestions - 批量导入题目', () => {
    it('应该成功批量导入题目', async () => {
      const questions = [
        {
          content: '题目1？',
          type: 'single_choice' as QuestionType,
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          difficulty: 'easy',
          subject: '数学',
          created_by: 'teacher1',
        },
        {
          content: '题目2？',
          type: 'multiple_choice' as QuestionType,
          options: ['A', 'B', 'C', 'D'],
          correct_answer: ['A', 'B'],
          difficulty: 'medium',
          subject: '数学',
          created_by: 'teacher1',
        }
      ];
      const mockImportedQuestions = questions.map((q, i) => createMockQuestion({ ...q, id: String(i + 1) }));
      
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery(mockImportedQuestions));

      const result = await questionService.bulkImportQuestions(questions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockImportedQuestions);
      expect(result.imported_count).toBe(2);
    });

    it('应该处理部分导入失败的情况', async () => {
      const questions = [
        {
          content: '有效题目？',
          type: 'single_choice' as QuestionType,
          options: ['A', 'B'],
          correct_answer: 'A',
          difficulty: 'easy',
          subject: '数学',
          created_by: 'teacher1',
        },
        {
          content: '',  // 无效题目
          type: 'single_choice' as QuestionType,
          options: [],
          correct_answer: '',
          difficulty: '',
          subject: '',
          created_by: '',
        }
      ];

      const result = await questionService.bulkImportQuestions(questions);

      expect(result.success).toBe(true);
      expect(result.imported_count).toBe(1);
      expect(result.failed_count).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});