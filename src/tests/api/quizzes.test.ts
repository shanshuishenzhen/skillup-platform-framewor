/**
 * 测验API路由集成测试
 * 测试测验的创建、获取、提交、评分等功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/quizzes/route';
import { GET as GetQuizById, PUT as UpdateQuiz, DELETE as DeleteQuiz } from '@/app/api/quizzes/[id]/route';
import { POST as SubmitQuiz } from '@/app/api/quizzes/[id]/submit/route';
import { GET as GetQuizResults } from '@/app/api/quizzes/[id]/results/route';
import { POST as GenerateQuiz } from '@/app/api/quizzes/generate/route';
import { testUtils } from '../setup';

// 模拟依赖
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            range: jest.fn()
          }))
        }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => ({
          range: jest.fn()
        }))
      })),
      limit: jest.fn(() => ({
        range: jest.fn()
      })),
      range: jest.fn()
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  })),
  rpc: jest.fn()
};

const mockSecurity = {
  validateApiKey: jest.fn(),
  checkRateLimit: jest.fn(),
  validatePermissions: jest.fn(),
  verifyToken: jest.fn()
};

const mockApiMonitor = {
  startCall: jest.fn(() => 'call-id-123'),
  endCall: jest.fn(),
  recordError: jest.fn()
};

const mockAiService = {
  generateQuiz: jest.fn(),
  evaluateAnswer: jest.fn(),
  generateFeedback: jest.fn(),
  adaptDifficulty: jest.fn()
};

jest.mock('@/utils/supabase', () => ({
  createClient: () => mockSupabase
}));

jest.mock('@/middleware/security', () => ({
  security: mockSecurity
}));

jest.mock('@/utils/apiMonitor', () => ({
  apiMonitor: mockApiMonitor
}));

jest.mock('@/services/aiService', () => ({
  aiService: mockAiService
}));

describe('测验API路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的成功响应
    mockSecurity.validateApiKey.mockResolvedValue({ valid: true, keyId: 'test-key' });
    mockSecurity.checkRateLimit.mockResolvedValue({ allowed: true });
    mockSecurity.validatePermissions.mockResolvedValue({ allowed: true });
    mockSecurity.verifyToken.mockResolvedValue({ valid: true, userId: 'user-123' });
  });

  describe('GET /api/quizzes', () => {
    it('应该成功获取测验列表', async () => {
      const mockQuizzes = [
        {
          id: 'quiz-1',
          title: 'JavaScript基础测验',
          description: '测试JavaScript基础知识',
          course_id: 'course-1',
          lesson_id: 'lesson-1',
          difficulty: 'beginner',
          time_limit: 1800, // 30分钟
          total_questions: 10,
          passing_score: 70,
          is_active: true,
          created_by: 'instructor-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'quiz-2',
          title: 'React组件测验',
          description: '测试React组件开发',
          course_id: 'course-1',
          lesson_id: 'lesson-2',
          difficulty: 'intermediate',
          time_limit: 2700, // 45分钟
          total_questions: 15,
          passing_score: 75,
          is_active: true,
          created_by: 'instructor-1',
          created_at: '2024-01-15T11:00:00Z',
          updated_at: '2024-01-15T11:00:00Z'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockQuizzes,
        error: null,
        count: 2
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quizzes).toHaveLength(2);
      expect(data.data.quizzes[0].title).toBe('JavaScript基础测验');
      expect(data.data.pagination.total).toBe(2);
      expect(mockApiMonitor.startCall).toHaveBeenCalledWith('GET', '/api/quizzes');
      expect(mockApiMonitor.endCall).toHaveBeenCalledWith('call-id-123', 200);
    });

    it('应该支持按课程筛选测验', async () => {
      const mockCourseQuizzes = [
        {
          id: 'quiz-course-1',
          title: '课程1测验',
          course_id: 'course-1',
          difficulty: 'beginner'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockCourseQuizzes,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes?course_id=course-1');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.quizzes).toHaveLength(1);
      expect(data.data.quizzes[0].course_id).toBe('course-1');
    });

    it('应该支持按难度筛选测验', async () => {
      const mockBeginnerQuizzes = [
        {
          id: 'quiz-beginner-1',
          title: '初级测验',
          difficulty: 'beginner',
          total_questions: 5
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockBeginnerQuizzes,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().eq().order().limit().range.mockResolvedValue(mockSupabaseResponse);
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes?difficulty=beginner');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.quizzes).toHaveLength(1);
      expect(data.data.quizzes[0].difficulty).toBe('beginner');
    });

    it('应该支持搜索测验', async () => {
      const mockSearchResults = [
        {
          id: 'quiz-search-1',
          title: 'JavaScript高级特性',
          description: '深入学习JavaScript高级特性',
          difficulty: 'advanced'
        }
      ];
      
      const mockSupabaseResponse = {
        data: mockSearchResults,
        error: null,
        count: 1
      };
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue(mockSearchResults);
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes?search=JavaScript');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.data.quizzes).toHaveLength(1);
      expect(data.data.quizzes[0].title).toContain('JavaScript');
    });
  });

  describe('POST /api/quizzes', () => {
    it('应该成功创建测验', async () => {
      const newQuiz = {
        title: '新测验',
        description: '测验描述',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        difficulty: 'intermediate',
        time_limit: 2400,
        passing_score: 80,
        questions: [
          {
            type: 'multiple_choice',
            question: '什么是JavaScript？',
            options: [
              { text: '编程语言', is_correct: true },
              { text: '标记语言', is_correct: false },
              { text: '样式语言', is_correct: false },
              { text: '数据库', is_correct: false }
            ],
            explanation: 'JavaScript是一种编程语言',
            points: 10
          },
          {
            type: 'true_false',
            question: 'JavaScript是静态类型语言',
            correct_answer: false,
            explanation: 'JavaScript是动态类型语言',
            points: 5
          }
        ]
      };
      
      const mockCreatedQuiz = {
        id: 'new-quiz-123',
        ...newQuiz,
        total_questions: 2,
        is_active: true,
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedQuiz,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes', newQuiz);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.quiz.id).toBe('new-quiz-123');
      expect(data.data.quiz.title).toBe('新测验');
      expect(data.data.quiz.total_questions).toBe(2);
    });

    it('应该验证必需字段', async () => {
      const invalidQuiz = {
        title: '测验标题',
        // 缺少 course_id, questions 等必需字段
      };
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes', invalidQuiz);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required field');
    });

    it('应该验证问题格式', async () => {
      const invalidQuiz = {
        title: '测验标题',
        course_id: 'course-1',
        questions: [
          {
            type: 'multiple_choice',
            question: '问题',
            options: [
              { text: '选项1' }, // 缺少 is_correct
              { text: '选项2' }
            ]
          }
        ]
      };
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes', invalidQuiz);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid question format');
    });

    it('应该验证创建权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Insufficient permissions to create quiz' 
      });
      
      const newQuiz = {
        title: '测验标题',
        course_id: 'course-1',
        questions: []
      };
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes', newQuiz);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient permissions to create quiz');
    });

    it('应该处理重复标题', async () => {
      const duplicateQuiz = {
        title: '重复标题',
        course_id: 'course-1',
        questions: []
      };
      
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: duplicateError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes', duplicateQuiz);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Quiz with this title already exists in the course');
    });
  });

  describe('GET /api/quizzes/[id]', () => {
    it('应该成功获取测验详情', async () => {
      const mockQuiz = {
        id: 'quiz-detail-123',
        title: '详细测验',
        description: '测验详细描述',
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        difficulty: 'intermediate',
        time_limit: 1800,
        total_questions: 5,
        passing_score: 75,
        is_active: true,
        created_by: 'instructor-1',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        questions: [
          {
            id: 'question-1',
            type: 'multiple_choice',
            question: '什么是React？',
            options: [
              { id: 'option-1', text: 'JavaScript库', is_correct: true },
              { id: 'option-2', text: '数据库', is_correct: false },
              { id: 'option-3', text: '服务器', is_correct: false },
              { id: 'option-4', text: '操作系统', is_correct: false }
            ],
            explanation: 'React是一个用于构建用户界面的JavaScript库',
            points: 20,
            order: 1
          }
        ],
        // 关联数据
        course: {
          id: 'course-1',
          title: '前端开发',
          description: '前端开发课程'
        },
        lesson: {
          id: 'lesson-1',
          title: 'React基础',
          description: 'React基础知识'
        }
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockQuiz,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes/quiz-detail-123');
      const response = await GetQuizById(request, { params: { id: 'quiz-detail-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quiz.id).toBe('quiz-detail-123');
      expect(data.data.quiz.questions).toHaveLength(1);
      expect(data.data.quiz.course.title).toBe('前端开发');
    });

    it('应该支持学生视图（隐藏答案）', async () => {
      const mockQuiz = {
        id: 'quiz-student-123',
        title: '学生测验',
        questions: [
          {
            id: 'question-1',
            type: 'multiple_choice',
            question: '问题1',
            options: [
              { id: 'option-1', text: '选项1', is_correct: true },
              { id: 'option-2', text: '选项2', is_correct: false }
            ],
            explanation: '解释',
            points: 10
          }
        ]
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockQuiz,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes/quiz-student-123?view=student');
      const response = await GetQuizById(request, { params: { id: 'quiz-student-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quiz.questions[0].options[0].is_correct).toBeUndefined();
      expect(data.data.quiz.questions[0].explanation).toBeUndefined();
    });

    it('应该处理测验不存在', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes/non-existent');
      const response = await GetQuizById(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Quiz not found');
    });
  });

  describe('PUT /api/quizzes/[id]', () => {
    it('应该成功更新测验', async () => {
      const updateData = {
        title: '更新的测验标题',
        description: '更新的描述',
        time_limit: 2700,
        passing_score: 85
      };
      
      const mockUpdatedQuiz = {
        id: 'quiz-update-123',
        title: '更新的测验标题',
        description: '更新的描述',
        course_id: 'course-1',
        time_limit: 2700,
        passing_score: 85,
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedQuiz,
        error: null
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/quizzes/quiz-update-123', updateData);
      const response = await UpdateQuiz(request, { params: { id: 'quiz-update-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quiz.title).toBe('更新的测验标题');
      expect(data.data.quiz.time_limit).toBe(2700);
    });

    it('应该验证更新权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot update this quiz' 
      });
      
      const updateData = {
        title: '新标题'
      };
      
      const request = testUtils.createMockRequest('PUT', '/api/quizzes/quiz-123', updateData);
      const response = await UpdateQuiz(request, { params: { id: 'quiz-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot update this quiz');
    });

    it('应该处理测验不存在', async () => {
      const updateData = {
        title: '新标题'
      };
      
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'The result contains 0 rows' }
      });
      
      const request = testUtils.createMockRequest('PUT', '/api/quizzes/non-existent', updateData);
      const response = await UpdateQuiz(request, { params: { id: 'non-existent' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Quiz not found');
    });
  });

  describe('DELETE /api/quizzes/[id]', () => {
    it('应该成功删除测验', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: null
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/quizzes/quiz-delete-123');
      const response = await DeleteQuiz(request, { params: { id: 'quiz-delete-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Quiz deleted successfully');
    });

    it('应该验证删除权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot delete this quiz' 
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/quizzes/quiz-123');
      const response = await DeleteQuiz(request, { params: { id: 'quiz-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete this quiz');
    });

    it('应该处理有关联数据的测验', async () => {
      const constraintError = {
        code: '23503',
        message: 'foreign key constraint violation'
      };
      
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: null,
        error: constraintError
      });
      
      const request = testUtils.createMockRequest('DELETE', '/api/quizzes/quiz-with-submissions');
      const response = await DeleteQuiz(request, { params: { id: 'quiz-with-submissions' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot delete quiz with existing submissions');
    });
  });

  describe('POST /api/quizzes/[id]/submit', () => {
    it('应该成功提交测验答案', async () => {
      const submission = {
        answers: [
          {
            question_id: 'question-1',
            selected_options: ['option-1'],
            answer_text: null
          },
          {
            question_id: 'question-2',
            selected_options: null,
            answer_text: 'JavaScript是一种编程语言'
          }
        ],
        time_spent: 1200 // 20分钟
      };
      
      const mockQuiz = {
        id: 'quiz-submit-123',
        questions: [
          {
            id: 'question-1',
            type: 'multiple_choice',
            options: [
              { id: 'option-1', is_correct: true },
              { id: 'option-2', is_correct: false }
            ],
            points: 10
          },
          {
            id: 'question-2',
            type: 'short_answer',
            points: 15
          }
        ],
        passing_score: 70
      };
      
      const mockSubmissionResult = {
        id: 'submission-123',
        quiz_id: 'quiz-submit-123',
        user_id: 'user-123',
        answers: submission.answers,
        score: 85,
        total_points: 25,
        earned_points: 21.25,
        passed: true,
        time_spent: 1200,
        submitted_at: new Date().toISOString(),
        feedback: {
          overall: '表现优秀！',
          question_feedback: [
            {
              question_id: 'question-1',
              is_correct: true,
              points_earned: 10,
              feedback: '回答正确'
            },
            {
              question_id: 'question-2',
              is_correct: true,
              points_earned: 11.25,
              feedback: 'AI评分：回答准确，表达清晰'
            }
          ]
        }
      };
      
      // 模拟获取测验信息
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockQuiz,
        error: null
      });
      
      // 模拟AI评分
      mockAiService.evaluateAnswer.mockResolvedValue({
        score: 0.75, // 75%
        feedback: 'AI评分：回答准确，表达清晰'
      });
      
      // 模拟保存提交结果
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockSubmissionResult,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/quiz-submit-123/submit', submission);
      const response = await SubmitQuiz(request, { params: { id: 'quiz-submit-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.submission.score).toBe(85);
      expect(data.data.submission.passed).toBe(true);
      expect(data.data.submission.feedback.overall).toBe('表现优秀！');
      expect(mockAiService.evaluateAnswer).toHaveBeenCalled();
    });

    it('应该处理超时提交', async () => {
      const submission = {
        answers: [],
        time_spent: 2000 // 超过时间限制
      };
      
      const mockQuiz = {
        id: 'quiz-timeout-123',
        time_limit: 1800, // 30分钟限制
        questions: []
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockQuiz,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/quiz-timeout-123/submit', submission);
      const response = await SubmitQuiz(request, { params: { id: 'quiz-timeout-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Submission time exceeded quiz time limit');
    });

    it('应该处理重复提交', async () => {
      const submission = {
        answers: [],
        time_spent: 1200
      };
      
      const duplicateError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'quiz-123', time_limit: 1800, questions: [] },
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: duplicateError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/quiz-123/submit', submission);
      const response = await SubmitQuiz(request, { params: { id: 'quiz-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Quiz already submitted');
    });

    it('应该验证答案格式', async () => {
      const invalidSubmission = {
        answers: [
          {
            question_id: 'question-1',
            // 缺少答案数据
          }
        ],
        time_spent: 1200
      };
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/quiz-123/submit', invalidSubmission);
      const response = await SubmitQuiz(request, { params: { id: 'quiz-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid answer format');
    });
  });

  describe('GET /api/quizzes/[id]/results', () => {
    it('应该成功获取测验结果', async () => {
      const mockResults = {
        quiz_id: 'quiz-results-123',
        quiz_title: '测验结果',
        submissions: [
          {
            id: 'submission-1',
            user_id: 'user-123',
            user_name: '用户1',
            score: 85,
            passed: true,
            time_spent: 1200,
            submitted_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 'submission-2',
            user_id: 'user-456',
            user_name: '用户2',
            score: 65,
            passed: false,
            time_spent: 1800,
            submitted_at: '2024-01-15T11:00:00Z'
          }
        ],
        statistics: {
          total_submissions: 2,
          average_score: 75,
          pass_rate: 0.5,
          average_time: 1500,
          score_distribution: {
            '0-20': 0,
            '21-40': 0,
            '41-60': 0,
            '61-80': 1,
            '81-100': 1
          }
        }
      };
      
      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes/quiz-results-123/results');
      const response = await GetQuizResults(request, { params: { id: 'quiz-results-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results.submissions).toHaveLength(2);
      expect(data.data.results.statistics.average_score).toBe(75);
      expect(data.data.results.statistics.pass_rate).toBe(0.5);
    });

    it('应该验证查看权限', async () => {
      mockSecurity.validatePermissions.mockResolvedValue({ 
        allowed: false, 
        error: 'Cannot view quiz results' 
      });
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes/quiz-123/results');
      const response = await GetQuizResults(request, { params: { id: 'quiz-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cannot view quiz results');
    });
  });

  describe('POST /api/quizzes/generate', () => {
    it('应该成功生成AI测验', async () => {
      const generateRequest = {
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        topic: 'JavaScript基础',
        difficulty: 'beginner',
        question_count: 5,
        question_types: ['multiple_choice', 'true_false']
      };
      
      const mockGeneratedQuiz = {
        title: 'JavaScript基础测验',
        description: 'AI生成的JavaScript基础知识测验',
        difficulty: 'beginner',
        time_limit: 900, // 15分钟
        passing_score: 70,
        questions: [
          {
            type: 'multiple_choice',
            question: '什么是变量？',
            options: [
              { text: '存储数据的容器', is_correct: true },
              { text: '一种函数', is_correct: false },
              { text: '一种循环', is_correct: false },
              { text: '一种条件', is_correct: false }
            ],
            explanation: '变量是用来存储数据的容器',
            points: 20
          },
          {
            type: 'true_false',
            question: 'JavaScript是区分大小写的语言',
            correct_answer: true,
            explanation: 'JavaScript确实是区分大小写的语言',
            points: 20
          }
        ]
      };
      
      const mockCreatedQuiz = {
        id: 'ai-generated-quiz-123',
        ...mockGeneratedQuiz,
        course_id: 'course-1',
        lesson_id: 'lesson-1',
        total_questions: 2,
        is_active: true,
        created_by: 'user-123',
        created_at: new Date().toISOString()
      };
      
      mockAiService.generateQuiz.mockResolvedValue({
        success: true,
        quiz: mockGeneratedQuiz
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockCreatedQuiz,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/generate', generateRequest);
      const response = await GenerateQuiz(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.quiz.id).toBe('ai-generated-quiz-123');
      expect(data.data.quiz.questions).toHaveLength(2);
      expect(mockAiService.generateQuiz).toHaveBeenCalledWith(generateRequest);
    });

    it('应该处理AI生成失败', async () => {
      const generateRequest = {
        course_id: 'course-1',
        topic: 'JavaScript',
        difficulty: 'beginner',
        question_count: 5
      };
      
      const aiError = new Error('AI service unavailable');
      mockAiService.generateQuiz.mockRejectedValue(aiError);
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/generate', generateRequest);
      const response = await GenerateQuiz(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to generate quiz');
    });

    it('应该验证生成参数', async () => {
      const invalidRequest = {
        course_id: 'course-1',
        question_count: 0 // 无效数量
      };
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/generate', invalidRequest);
      const response = await GenerateQuiz(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid question count');
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理数据库连接错误', async () => {
      const connectionError = new Error('Database connection failed');
      mockSupabase.from().select().order().limit().range.mockRejectedValue(connectionError);
      
      const request = testUtils.createMockRequest('GET', '/api/quizzes');
      const response = await GET(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
      expect(mockApiMonitor.recordError).toHaveBeenCalledWith('call-id-123', connectionError);
    });

    it('应该处理AI服务超时', async () => {
      const submission = {
        answers: [
          {
            question_id: 'question-1',
            answer_text: '答案'
          }
        ],
        time_spent: 1200
      };
      
      const mockQuiz = {
        id: 'quiz-123',
        time_limit: 1800,
        questions: [
          {
            id: 'question-1',
            type: 'short_answer',
            points: 10
          }
        ]
      };
      
      const timeoutError = new Error('AI evaluation timeout');
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockQuiz,
        error: null
      });
      
      mockAiService.evaluateAnswer.mockRejectedValue(timeoutError);
      
      // 应该使用默认评分
      const mockSubmissionResult = {
        id: 'submission-123',
        score: 50, // 默认评分
        feedback: {
          overall: '评分服务暂时不可用，使用默认评分'
        }
      };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockSubmissionResult,
        error: null
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/quiz-123/submit', submission);
      const response = await SubmitQuiz(request, { params: { id: 'quiz-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.submission.score).toBe(50);
      expect(data.warnings).toContain('AI evaluation unavailable, using default scoring');
    });

    it('应该处理无效的测验数据', async () => {
      const invalidQuiz = {
        title: '', // 空标题
        course_id: 'course-1',
        questions: [
          {
            type: 'invalid_type', // 无效类型
            question: '问题'
          }
        ]
      };
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes', invalidQuiz);
      const response = await POST(request);
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid quiz data');
    });

    it('应该处理并发提交冲突', async () => {
      const submission = {
        answers: [],
        time_spent: 1200
      };
      
      const conflictError = {
        code: '40001',
        message: 'serialization_failure'
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'quiz-123', time_limit: 1800, questions: [] },
        error: null
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: conflictError
      });
      
      const request = testUtils.createMockRequest('POST', '/api/quizzes/quiz-123/submit', submission);
      const response = await SubmitQuiz(request, { params: { id: 'quiz-123' } });
      const data = await testUtils.parseResponse(response);
      
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Submission conflict, please retry');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量测验查询', async () => {
      const largeQuizList = Array.from({ length: 100 }, (_, i) => ({
        id: `quiz-${i}`,
        title: `测验 ${i}`,
        course_id: `course-${i % 5}`,
        difficulty: ['beginner', 'intermediate', 'advanced'][i % 3],
        total_questions: Math.floor(Math.random() * 20) + 5
      }));
      
      mockSupabase.from().select().order().limit().range.mockResolvedValue({
        data: largeQuizList,
        error: null,
        count: 100
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('GET', '/api/quizzes?limit=100');
      const response = await GET(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该高效处理复杂测验提交', async () => {
      const complexSubmission = {
        answers: Array.from({ length: 50 }, (_, i) => ({
          question_id: `question-${i}`,
          selected_options: [`option-${i}-1`],
          answer_text: `答案 ${i}`
        })),
        time_spent: 3600
      };
      
      const mockQuiz = {
        id: 'complex-quiz-123',
        time_limit: 3600,
        questions: Array.from({ length: 50 }, (_, i) => ({
          id: `question-${i}`,
          type: 'multiple_choice',
          points: 2
        }))
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockQuiz,
        error: null
      });
      
      mockAiService.evaluateAnswer.mockResolvedValue({
        score: 0.8,
        feedback: '回答正确'
      });
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'complex-submission-123',
          score: 80,
          passed: true
        },
        error: null
      });
      
      const startTime = Date.now();
      const request = testUtils.createMockRequest('POST', '/api/quizzes/complex-quiz-123/submit', complexSubmission);
      const response = await SubmitQuiz(request, { params: { id: 'complex-quiz-123' } });
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该高效处理并发测验访问', async () => {
      const mockQuiz = {
        id: 'concurrent-quiz-123',
        title: '并发测验',
        questions: []
      };
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockQuiz,
        error: null
      });
      
      const promises = Array.from({ length: 20 }, () => {
        const request = testUtils.createMockRequest('GET', '/api/quizzes/concurrent-quiz-123');
        return GetQuizById(request, { params: { id: 'concurrent-quiz-123' } });
      });
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(responses).toHaveLength(20);
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // 应该在3秒内完成
    });
  });
});