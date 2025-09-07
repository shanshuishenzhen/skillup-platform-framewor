// 考试服务完整单元测试
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

import { ExamService } from '../../../services/examService';
import { supabase } from '../../../lib/supabase';

// 类型断言
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// 测试辅助函数
const createMockExam = (overrides = {}) => ({
  id: '1',
  title: '测试考试',
  description: '这是一个测试考试',
  duration: 60,
  total_questions: 10,
  passing_score: 60,
  status: 'active',
  created_by: 'teacher1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockExamSession = (overrides = {}) => ({
  id: '1',
  exam_id: '1',
  user_id: 'student1',
  start_time: new Date().toISOString(),
  end_time: null,
  status: 'in_progress',
  score: null,
  answers: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockQuestion = (overrides = {}) => ({
  id: '1',
  content: '这是一个测试题目？',
  type: 'single_choice',
  options: ['选项A', '选项B', '选项C', '选项D'],
  correct_answer: 'A',
  explanation: '正确答案是A',
  difficulty: 'medium',
  subject: '数学',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockQuery = (data: any, error: any = null) => ({
  data,
  error,
  count: data ? data.length : 0,
});

describe('考试服务完整测试', () => {
  let examService: ExamService;

  beforeEach(() => {
    examService = new ExamService();
    jest.clearAllMocks();
  });

  describe('getExams - 获取考试列表', () => {
    it('应该成功获取考试列表', async () => {
      const mockExams = [createMockExam(), createMockExam({ id: '2', title: '期末考试' })];
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery(mockExams));

      const result = await examService.getExams({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('exams');
    });

    it('应该支持状态筛选', async () => {
      const mockExams = [createMockExam({ status: 'active' })];
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery(mockExams));
      mockQuery.eq.mockReturnThis();

      await examService.getExams({ status: 'active' });

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('应该支持分页', async () => {
      const mockExams = [createMockExam()];
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery(mockExams));
      mockQuery.range.mockReturnThis();

      await examService.getExams({ page: 1, limit: 10 });

      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });

    it('应该处理数据库错误', async () => {
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery(null, { message: '数据库错误' }));

      const result = await examService.getExams({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('数据库错误');
    });
  });

  describe('createExam - 创建考试', () => {
    it('应该成功创建考试', async () => {
      const newExam = {
        title: '新考试',
        description: '新考试描述',
        duration: 90,
        total_questions: 20,
        passing_score: 70,
        created_by: 'teacher1',
      };
      const mockCreatedExam = createMockExam(newExam);
      const mockQuery = mockSupabaseClient.from();
      
      mockQuery.insert.mockResolvedValue(createMockQuery([mockCreatedExam]));

      const result = await examService.createExam(newExam);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedExam);
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining(newExam));
    });

    it('应该验证必填字段', async () => {
      const invalidExam = {
        title: '',
        duration: 0,
        total_questions: 0,
        passing_score: -1,
        created_by: '',
      };

      const result = await examService.createExam(invalidExam);

      expect(result.success).toBe(false);
      expect(result.error).toContain('验证失败');
    });

    it('应该处理数据库插入错误', async () => {
      const newExam = {
        title: '新考试',
        description: '新考试描述',
        duration: 90,
        total_questions: 20,
        passing_score: 70,
        created_by: 'teacher1',
      };
      
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery(null, { message: '插入失败' }));

      const result = await examService.createExam(newExam);

      expect(result.success).toBe(false);
      expect(result.error).toBe('插入失败');
    });
  });

  describe('startExam - 开始考试', () => {
    it('应该成功开始考试', async () => {
      const mockExam = createMockExam();
      const mockSession = createMockExamSession();
      const mockQuestions = [createMockQuestion(), createMockQuestion({ id: '2' })];
      
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockExam])); // 获取考试
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([])); // 检查是否已有会话
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery(mockQuestions)); // 获取题目
      mockSupabaseClient.from().insert.mockResolvedValue(createMockQuery([mockSession])); // 创建会话

      const result = await examService.startExam('1', 'student1');

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
      expect(result.data.questions).toEqual(mockQuestions.map(q => ({ ...q, correct_answer: undefined })));
    });

    it('应该拒绝重复开始考试', async () => {
      const mockExam = createMockExam();
      const existingSession = createMockExamSession();
      
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockExam])); // 获取考试
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([existingSession])); // 已有会话

      const result = await examService.startExam('1', 'student1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('您已经开始了这个考试');
    });

    it('应该拒绝开始不存在的考试', async () => {
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery([])); // 考试不存在

      const result = await examService.startExam('999', 'user1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('考试不存在');
    });

    it('应该拒绝开始非活跃状态的考试', async () => {
      const mockExam = createMockExam({ status: 'draft' });
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery([mockExam]));

      const result = await examService.startExam('1', 'user1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('考试未开放');
    });
  });

  describe('submitAnswer - 提交答案', () => {
    it('应该成功提交答案', async () => {
      const mockSession = createMockExamSession();
      const updatedSession = { ...mockSession, answers: { '1': 'A' } };
      
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([mockSession]));
      mockSupabaseClient.from().update.mockResolvedValue(createMockQuery([updatedSession]));

      const result = await examService.submitAnswer('1', '1', 'A');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedSession);
    });

    it('应该拒绝已结束的考试会话', async () => {
      const endedSession = createMockExamSession({ status: 'completed' });
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([endedSession]));

      const result = await examService.submitAnswer('1', '1', 'A');

      expect(result.success).toBe(false);
      expect(result.error).toBe('考试已结束');
    });

    it('应该拒绝不存在的考试会话', async () => {
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([]));

      const result = await examService.submitAnswer('999', '1', 'A');

      expect(result.success).toBe(false);
      expect(result.error).toBe('考试会话不存在');
    });
  });

  describe('finishExam - 完成考试', () => {
    it('应该成功完成考试并计算分数', async () => {
      const mockSession = createMockExamSession({ answers: { '1': 'A', '2': 'B' } });
      const mockQuestions = [
        createMockQuestion({ id: '1', correct_answer: 'A' }),
        createMockQuestion({ id: '2', correct_answer: 'B' })
      ];
      const completedSession = { ...mockSession, status: 'completed', score: 100, end_time: new Date().toISOString() };
      
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockSession]));
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery(mockQuestions));
      mockSupabaseClient.from().update.mockResolvedValue(createMockQuery([completedSession]));

      const result = await examService.finishExam('1');

      expect(result.success).toBe(true);
      expect(result.data.score).toBe(100);
      expect(result.data.status).toBe('completed');
    });

    it('应该正确计算部分正确的分数', async () => {
      const mockSession = createMockExamSession({ answers: { '1': 'A', '2': 'C' } });
      const mockQuestions = [
        createMockQuestion({ id: '1', correct_answer: 'A' }),
        createMockQuestion({ id: '2', correct_answer: 'B' })
      ];
      const completedSession = { ...mockSession, status: 'completed', score: 50, end_time: new Date().toISOString() };
      
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockSession]));
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery(mockQuestions));
      mockSupabaseClient.from().update.mockResolvedValue(createMockQuery([completedSession]));

      const result = await examService.finishExam('1');

      expect(result.success).toBe(true);
      expect(result.data.score).toBe(50);
    });

    it('应该拒绝已完成的考试', async () => {
      const completedSession = createMockExamSession({ status: 'completed' });
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([completedSession]));

      const result = await examService.finishExam('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('考试已完成');
    });
  });

  describe('getExamResults - 获取考试结果', () => {
    it('应该成功获取考试结果', async () => {
      const mockSession = createMockExamSession({ status: 'completed', score: 85 });
      const mockExam = createMockExam();
      
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockSession]));
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockExam]));

      const result = await examService.getExamResults('1');

      expect(result.success).toBe(true);
      expect(result.data.session).toEqual(mockSession);
      expect(result.data.exam).toEqual(mockExam);
      expect(result.data.passed).toBe(true); // 85 > 60 (passing_score)
    });

    it('应该正确判断未通过的考试', async () => {
      const mockSession = createMockExamSession({ status: 'completed', score: 45 });
      const mockExam = createMockExam({ passing_score: 60 });
      
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockSession]));
      mockSupabaseClient.from().select.mockResolvedValueOnce(createMockQuery([mockExam]));

      const result = await examService.getExamResults('1');

      expect(result.success).toBe(true);
      expect(result.data.passed).toBe(false); // 45 < 60
    });

    it('应该拒绝未完成的考试', async () => {
      const incompleteSession = createMockExamSession({ status: 'in_progress' });
      mockSupabaseClient.from().select.mockResolvedValue(createMockQuery([incompleteSession]));

      const result = await examService.getExamResults('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('考试尚未完成');
    });
  });

  describe('getExamStatistics - 获取考试统计', () => {
    it('应该成功获取考试统计信息', async () => {
      const mockStats = {
        total_participants: 50,
        completed_count: 45,
        average_score: 78.5,
        pass_rate: 0.8,
        highest_score: 95,
        lowest_score: 45
      };
      
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery([mockStats]));

      const result = await examService.getExamStatistics('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });

    it('应该处理统计查询错误', async () => {
      const mockQuery = mockSupabaseClient.from();
      mockQuery.select.mockResolvedValue(createMockQuery(null, { message: '统计查询失败' }));

      const result = await examService.getExamStatistics('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('统计查询失败');
    });
  });
});