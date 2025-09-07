/**
 * 考试流程端到端测试
 * 模拟用户完整的考试操作流程：登录 -> 分配试卷 -> 考试 -> 成绩查看
 */

import request from 'supertest';
import { app } from '../../../api/app';
import { mockSupabaseClient } from '../../setup';

// 模拟Supabase客户端
jest.mock('../../../lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

describe('考试流程端到端测试', () => {
  // 测试数据
  const mockTeacher = global.testUtils.createMockUser({ 
    id: 'teacher-1',
    role: 'teacher',
    name: '张老师',
    email: 'teacher@example.com'
  });
  
  const mockStudent = global.testUtils.createMockUser({ 
    id: 'student-1',
    role: 'student',
    name: '李同学',
    email: 'student@example.com'
  });

  const mockExam = global.testUtils.createMockExam({
    id: 'exam-1',
    title: '数学期中考试',
    description: '七年级数学期中考试',
    duration: 90,
    total_score: 100,
    status: 'published',
    created_by: mockTeacher.id
  });

  const mockQuestions = [
    global.testUtils.createMockQuestion({
      id: 'q1',
      exam_id: mockExam.id,
      title: '计算题：2 + 3 = ?',
      type: 'single_choice',
      score: 10,
      options: [
        { id: 'a', text: '4', is_correct: false },
        { id: 'b', text: '5', is_correct: true },
        { id: 'c', text: '6', is_correct: false }
      ]
    }),
    global.testUtils.createMockQuestion({
      id: 'q2',
      exam_id: mockExam.id,
      title: '简答题：请解释勾股定理',
      type: 'essay',
      score: 20
    })
  ];

  let teacherToken: string;
  let studentToken: string;
  let examAssignmentId: string;
  let examSubmissionId: string;

  beforeEach(() => {
    global.testUtils.resetAllMocks();
    teacherToken = 'teacher-token';
    studentToken = 'student-token';
  });

  /**
   * 完整考试流程测试
   */
  describe('完整考试流程', () => {
    /**
     * 步骤1：教师登录
     */
    it('步骤1：教师应该能够成功登录', async () => {
      // 模拟教师登录
      mockSupabaseClient.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: {
          user: mockTeacher,
          session: { access_token: teacherToken }
        },
        error: null
      });

      const mockQuery = global.testUtils.createMockQuery(mockTeacher, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockTeacher.email,
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('teacher');
      expect(response.body.data.token).toBe(teacherToken);
    });

    /**
     * 步骤2：教师创建考试
     */
    it('步骤2：教师应该能够创建考试', async () => {
      // 模拟教师认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockTeacher },
        error: null
      });

      // 模拟创建考试
      const mockQuery = global.testUtils.createMockQuery(mockExam, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const examData = {
        title: mockExam.title,
        description: mockExam.description,
        duration: mockExam.duration,
        total_score: mockExam.total_score
      };

      const response = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(examData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(examData.title);
      expect(response.body.data.created_by).toBe(mockTeacher.id);
    });

    /**
     * 步骤3：教师添加考试题目
     */
    it('步骤3：教师应该能够添加考试题目', async () => {
      // 模拟教师认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockTeacher },
        error: null
      });

      // 为每个题目创建单独的测试
      for (const question of mockQuestions) {
        const mockQuery = global.testUtils.createMockQuery(question, null);
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        const questionData = {
          exam_id: question.exam_id,
          title: question.title,
          type: question.type,
          score: question.score,
          options: question.options
        };

        const response = await request(app)
          .post('/api/questions')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(questionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(question.title);
      }
    });

    /**
     * 步骤4：教师发布考试
     */
    it('步骤4：教师应该能够发布考试', async () => {
      // 模拟教师认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockTeacher },
        error: null
      });

      const publishedExam = {
        ...mockExam,
        status: 'published'
      };

      const mockQuery = global.testUtils.createMockQuery(publishedExam, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post(`/api/exams/${mockExam.id}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
    });

    /**
     * 步骤5：教师分配考试给学生
     */
    it('步骤5：教师应该能够分配考试给学生', async () => {
      // 模拟教师认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockTeacher },
        error: null
      });

      examAssignmentId = 'assignment-1';
      const mockAssignment = {
        id: examAssignmentId,
        exam_id: mockExam.id,
        student_id: mockStudent.id,
        assigned_by: mockTeacher.id,
        assigned_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
        status: 'assigned'
      };

      const mockQuery = global.testUtils.createMockQuery(mockAssignment, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const assignmentData = {
        exam_id: mockExam.id,
        student_ids: [mockStudent.id],
        due_date: mockAssignment.due_date
      };

      const response = await request(app)
        .post('/api/exam-assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(assignmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exam_id).toBe(mockExam.id);
    });

    /**
     * 步骤6：学生登录
     */
    it('步骤6：学生应该能够成功登录', async () => {
      // 模拟学生登录
      mockSupabaseClient.auth.signInWithPassword = jest.fn().mockResolvedValue({
        data: {
          user: mockStudent,
          session: { access_token: studentToken }
        },
        error: null
      });

      const mockQuery = global.testUtils.createMockQuery(mockStudent, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockStudent.email,
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('student');
      expect(response.body.data.token).toBe(studentToken);
    });

    /**
     * 步骤7：学生查看分配的考试
     */
    it('步骤7：学生应该能够查看分配的考试', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      const mockAssignments = [{
        id: examAssignmentId,
        exam_id: mockExam.id,
        student_id: mockStudent.id,
        status: 'assigned',
        exam: mockExam
      }];

      const mockQuery = global.testUtils.createMockQuery(
        { assignments: mockAssignments, total: 1 },
        null
      );
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get('/api/my-exams')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignments).toHaveLength(1);
      expect(response.body.data.assignments[0].exam.title).toBe(mockExam.title);
    });

    /**
     * 步骤8：学生开始考试
     */
    it('步骤8：学生应该能够开始考试', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      examSubmissionId = 'submission-1';
      const mockSubmission = {
        id: examSubmissionId,
        exam_id: mockExam.id,
        student_id: mockStudent.id,
        started_at: new Date().toISOString(),
        status: 'in_progress'
      };

      // 模拟获取考试详情和题目
      const examWithQuestions = {
        ...mockExam,
        questions: mockQuestions
      };

      const mockQuery = global.testUtils.createMockQuery(examWithQuestions, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      // 模拟创建考试提交记录
      const submissionQuery = global.testUtils.createMockQuery(mockSubmission, null);
      mockSupabaseClient.from = jest.fn().mockReturnValueOnce(submissionQuery);

      const response = await request(app)
        .post(`/api/exams/${mockExam.id}/start`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exam.title).toBe(mockExam.title);
      expect(response.body.data.submission.status).toBe('in_progress');
    });

    /**
     * 步骤9：学生提交答案
     */
    it('步骤9：学生应该能够提交答案', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      const answers = [
        {
          question_id: 'q1',
          answer: 'b', // 正确答案
          answer_text: '5'
        },
        {
          question_id: 'q2',
          answer_text: '勾股定理是直角三角形中，直角边的平方和等于斜边的平方。'
        }
      ];

      // 模拟保存答案
      const mockQuery = global.testUtils.createMockQuery(null, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      for (const answer of answers) {
        const response = await request(app)
          .post(`/api/submissions/${examSubmissionId}/answers`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(answer)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    /**
     * 步骤10：学生提交考试
     */
    it('步骤10：学生应该能够提交考试', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      const completedSubmission = {
        id: examSubmissionId,
        exam_id: mockExam.id,
        student_id: mockStudent.id,
        started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1小时前开始
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        score: 30, // 自动评分结果
        total_score: 30
      };

      const mockQuery = global.testUtils.createMockQuery(completedSubmission, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post(`/api/submissions/${examSubmissionId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.score).toBe(30);
    });

    /**
     * 步骤11：学生查看考试结果
     */
    it('步骤11：学生应该能够查看考试结果', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      const submissionWithDetails = {
        id: examSubmissionId,
        exam_id: mockExam.id,
        student_id: mockStudent.id,
        status: 'graded',
        score: 25, // 教师评分后的最终成绩
        total_score: 30,
        feedback: '选择题全对，简答题需要更详细的解释。',
        exam: mockExam,
        answers: [
          {
            question_id: 'q1',
            answer: 'b',
            is_correct: true,
            score: 10,
            question: mockQuestions[0]
          },
          {
            question_id: 'q2',
            answer_text: '勾股定理是直角三角形中，直角边的平方和等于斜边的平方。',
            score: 15,
            feedback: '回答正确但不够详细',
            question: mockQuestions[1]
          }
        ]
      };

      const mockQuery = global.testUtils.createMockQuery(submissionWithDetails, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get(`/api/submissions/${examSubmissionId}/result`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(25);
      expect(response.body.data.total_score).toBe(30);
      expect(response.body.data.feedback).toContain('选择题全对');
      expect(response.body.data.answers).toHaveLength(2);
    });

    /**
     * 步骤12：教师查看学生成绩
     */
    it('步骤12：教师应该能够查看学生成绩', async () => {
      // 模拟教师认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockTeacher },
        error: null
      });

      const examResults = {
        exam: mockExam,
        submissions: [
          {
            id: examSubmissionId,
            student_id: mockStudent.id,
            student_name: mockStudent.name,
            score: 25,
            total_score: 30,
            status: 'graded',
            submitted_at: new Date().toISOString()
          }
        ],
        statistics: {
          total_students: 1,
          submitted_count: 1,
          average_score: 25,
          highest_score: 25,
          lowest_score: 25
        }
      };

      const mockQuery = global.testUtils.createMockQuery(examResults, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .get(`/api/exams/${mockExam.id}/results`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submissions).toHaveLength(1);
      expect(response.body.data.statistics.average_score).toBe(25);
      expect(response.body.data.submissions[0].student_name).toBe(mockStudent.name);
    });
  });

  /**
   * 异常情况测试
   */
  describe('异常情况处理', () => {
    /**
     * 测试考试时间限制
     */
    it('应该正确处理考试时间超时', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      // 模拟超时的考试提交
      const timeoutSubmission = {
        id: 'timeout-submission',
        exam_id: mockExam.id,
        student_id: mockStudent.id,
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前开始
        status: 'timeout',
        auto_submitted: true
      };

      const mockQuery = global.testUtils.createMockQuery(timeoutSubmission, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post('/api/submissions/timeout-submission/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('timeout');
      expect(response.body.data.auto_submitted).toBe(true);
    });

    /**
     * 测试重复开始考试
     */
    it('应该防止重复开始同一考试', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      // 模拟已存在的考试提交
      const existingSubmission = {
        id: 'existing-submission',
        exam_id: mockExam.id,
        student_id: mockStudent.id,
        status: 'in_progress'
      };

      const mockQuery = global.testUtils.createMockQuery(existingSubmission, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post(`/api/exams/${mockExam.id}/start`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('已经开始了这个考试');
    });

    /**
     * 测试未分配考试的访问
     */
    it('应该防止访问未分配的考试', async () => {
      // 模拟学生认证
      mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: mockStudent },
        error: null
      });

      // 模拟没有分配记录
      const mockQuery = global.testUtils.createMockQuery(null, null);
      mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app)
        .post('/api/exams/unassigned-exam/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('没有权限访问此考试');
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    /**
     * 测试大量学生同时考试
     */
    it('应该能够处理大量学生同时考试', async () => {
      const studentCount = 50;
      const students = Array(studentCount).fill(null).map((_, index) => 
        global.testUtils.createMockUser({
          id: `student-${index}`,
          role: 'student',
          email: `student${index}@example.com`
        })
      );

      // 模拟所有学生同时开始考试
      const startRequests = students.map((student, index) => {
        // 为每个学生模拟认证
        mockSupabaseClient.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: student },
          error: null
        });

        const mockSubmission = {
          id: `submission-${index}`,
          exam_id: mockExam.id,
          student_id: student.id,
          status: 'in_progress'
        };

        const mockQuery = global.testUtils.createMockQuery(mockSubmission, null);
        mockSupabaseClient.from = jest.fn().mockReturnValue(mockQuery);

        return request(app)
          .post(`/api/exams/${mockExam.id}/start`)
          .set('Authorization', `Bearer student-token-${index}`);
      });

      const startTime = Date.now();
      const responses = await Promise.all(startRequests);
      const endTime = Date.now();

      // 验证所有请求都成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // 验证性能要求（应该在10秒内完成）
      expect(endTime - startTime).toBeLessThan(10000);
    }, 15000);
  });
});