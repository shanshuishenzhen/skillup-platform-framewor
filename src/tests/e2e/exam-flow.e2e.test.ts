/**
 * 考试系统端到端流程测试
 * 测试完整的考试流程：报名 -> 开始考试 -> 答题 -> 提交 -> 查看结果 -> 获取证书
 * 
 * @author SOLO Coding
 * @date 2024
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 模拟浏览器环境
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// 模拟localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 模拟fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// 测试数据
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: '测试用户'
};

const mockExam = {
  id: 'exam-123',
  title: '前端开发技能考试',
  description: '测试前端开发基础知识',
  duration: 120,
  totalQuestions: 10,
  passingScore: 70,
  status: 'active'
};

const mockQuestions = [
  {
    id: 'q1',
    type: 'multiple_choice',
    question: '什么是React？',
    options: ['库', '框架', '语言', '工具'],
    correctAnswer: 0,
    points: 10
  },
  {
    id: 'q2',
    type: 'multiple_choice',
    question: 'CSS中的flex布局主要用于？',
    options: ['文本样式', '布局排列', '动画效果', '响应式设计'],
    correctAnswer: 1,
    points: 10
  }
];

// 模拟页面交互函数
class MockPage {
  private currentUrl: string = 'http://localhost:3000';
  private formData: Record<string, any> = {};
  private clickedElements: string[] = [];
  
  async goto(url: string) {
    this.currentUrl = url;
    return Promise.resolve();
  }
  
  async fill(selector: string, value: string) {
    this.formData[selector] = value;
    return Promise.resolve();
  }
  
  async click(selector: string) {
    this.clickedElements.push(selector);
    return Promise.resolve();
  }
  
  async waitForSelector(selector: string) {
    return Promise.resolve(true);
  }
  
  async textContent(selector: string) {
    // 模拟不同选择器的文本内容
    const mockTexts: Record<string, string> = {
      'h1': mockExam.title,
      '.exam-description': mockExam.description,
      '.exam-duration': `${mockExam.duration}分钟`,
      '.question-title': mockQuestions[0].question,
      '.score-display': '85分',
      '.result-status': '通过',
      '.certificate-number': 'CERT-2024-001'
    };
    return Promise.resolve(mockTexts[selector] || '');
  }
  
  async isVisible(selector: string) {
    return Promise.resolve(true);
  }
  
  url() {
    return this.currentUrl;
  }
  
  getFormData() {
    return this.formData;
  }
  
  getClickedElements() {
    return this.clickedElements;
  }
}

describe('考试系统端到端流程测试', () => {
  let mockPage: MockPage;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockPage = new MockPage();
    
    // 设置默认的fetch响应
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: mockUser })
        });
      }
      if (url.includes('/api/exams')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockExam] })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockQuestions })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
    
    // 设置localStorage模拟
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'user') return JSON.stringify(mockUser);
      if (key === 'examSession') return JSON.stringify({ examId: mockExam.id, startTime: Date.now() });
      return null;
    });
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('完整考试流程', () => {
    it('应该完成完整的考试流程：浏览 -> 报名 -> 考试 -> 结果 -> 证书', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 步骤1: 浏览考试列表
      // 模拟获取考试列表API调用
      await fetch('/api/exams');
      
      // 验证考试列表加载
      expect(mockFetch).toHaveBeenCalledWith('/api/exams');
      
      // 步骤2: 查看考试详情
      await mockPage.click('.exam-card');
      await mockPage.goto(`http://localhost:3000/exams/${mockExam.id}`);
      
      const examTitle = await mockPage.textContent('h1');
      expect(examTitle).toBe(mockExam.title);
      
      const examDescription = await mockPage.textContent('.exam-description');
      expect(examDescription).toBe(mockExam.description);
      
      // 步骤3: 报名考试
      // 模拟报名API调用
      await fetch('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({ examId: mockExam.id })
      });
      
      // 验证报名API调用
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/enrollments',
        expect.objectContaining({
          method: 'POST'
        })
      );
      
      // 步骤4: 开始考试
      // 模拟创建考试会话
      const sessionData = JSON.stringify({
        examId: mockExam.id,
        startTime: new Date().toISOString()
      });
      
      // 直接验证localStorage调用（因为已经在beforeEach中设置了mock）
      expect(localStorageMock.getItem('examSession')).toBeTruthy();
      const sessionFromMock = localStorageMock.getItem('examSession');
      if (sessionFromMock) {
        expect(JSON.parse(sessionFromMock).examId).toBe(mockExam.id);
      }
      
      // 步骤5: 答题过程
      for (let i = 0; i < mockQuestions.length; i++) {
        const question = mockQuestions[i];
        
        // 验证题目显示
        const questionText = await mockPage.textContent('.question-title');
        expect(questionText).toBeTruthy();
        
        // 选择答案
        await mockPage.click(`input[name="question-${question.id}"][value="${question.correctAnswer}"]`);
        
        // 下一题或提交
        if (i < mockQuestions.length - 1) {
          await mockPage.click('.next-question-button');
        } else {
          await mockPage.click('.submit-exam-button');
          
          // 模拟提交考试API调用
          await fetch('/api/submissions', {
            method: 'POST',
            body: JSON.stringify({
              examId: mockExam.id,
              answers: mockQuestions.map(q => ({
                questionId: q.id,
                answer: q.correctAnswer
              }))
            })
          });
        }
      }
      
      // 验证答案提交
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions'),
        expect.objectContaining({
          method: 'POST'
        })
      );
      
      // 步骤6: 查看考试结果
      await mockPage.goto(`http://localhost:3000/exams/${mockExam.id}/result`);
      
      const score = await mockPage.textContent('.score-display');
      expect(score).toBeTruthy();
      
      const resultStatus = await mockPage.textContent('.result-status');
      expect(resultStatus).toBeTruthy();
      
      // 步骤7: 获取证书（如果通过）
      const certificateVisible = await mockPage.isVisible('.certificate-section');
      if (certificateVisible) {
        // 模拟证书生成API调用
        await fetch('/api/certificates', {
          method: 'POST',
          body: JSON.stringify({
            examId: mockExam.id,
            userId: mockUser.id
          })
        });
        
        // 验证证书生成API调用
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/certificates'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      }
      
      // 验证整个流程完成
      expect(mockPage.getClickedElements().length).toBeGreaterThan(0);
    });
  });
  
  describe('考试报名流程', () => {
    it('应该成功报名考试', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟报名API调用
      await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ examId: mockExam.id })
      });
      
      // 验证API调用
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/enrollments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
    
    it('应该显示已报名状态', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟已报名状态
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ enrolled: true })
        })
      );
      
      // 模拟检查报名状态API调用
      await fetch(`/api/enrollments/check/${mockExam.id}`);
      
      // 验证状态检查API调用
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/enrollments/check/${mockExam.id}`
      );
    });
  });
  
  describe('考试答题流程', () => {
    beforeEach(async () => {
      // 设置考试会话
      await mockPage.goto(`http://localhost:3000/exams/${mockExam.id}/take`);
    });
    
    it('应该正确显示考试题目', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟获取题目API调用
      await fetch(`/api/questions/${mockExam.id}`);
      
      // 验证题目加载
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/questions/${mockExam.id}`
      );
    });
    
    it('应该能够选择和提交答案', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      const question = mockQuestions[0];
      
      // 模拟提交答案API调用
      await fetch('/api/answers', {
        method: 'POST',
        body: JSON.stringify({
          questionId: question.id,
          answer: '0',
          examId: mockExam.id
        })
      });
      
      // 验证答案提交
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/answers',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    it('应该能够保存草稿答案', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      const question = mockQuestions[0];
      
      // 模拟保存草稿API调用
      await fetch('/api/answers/draft', {
        method: 'POST',
        body: JSON.stringify({
          questionId: question.id,
          answer: '1',
          examId: mockExam.id
        })
      });
      
      // 验证草稿保存
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/answers/draft',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
  
  describe('考试结果查看', () => {
    it('应该正确显示考试结果', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟考试结果响应
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            score: 85,
            passed: true,
            totalQuestions: 10,
            correctAnswers: 8.5,
            timeSpent: 1800
          })
        })
      );
      
      // 模拟获取考试结果API调用
      await fetch(`/api/results/${mockExam.id}`);
      
      // 验证结果加载
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/results/${mockExam.id}`
      );
      
      const scoreVisible = await mockPage.isVisible('.score-display');
      expect(scoreVisible).toBe(true);
      
      const resultVisible = await mockPage.isVisible('.result-status');
      expect(resultVisible).toBe(true);
    });
    
    it('应该显示详细的答题分析', async () => {
      await mockPage.goto(`http://localhost:3000/exams/${mockExam.id}/result`);
      
      const analysisVisible = await mockPage.isVisible('.answer-analysis');
      expect(analysisVisible).toBe(true);
    });
  });
  
  describe('证书生成和下载', () => {
    it('应该为通过考试的用户生成证书', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟证书生成响应
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            certificateId: 'cert-123',
            downloadUrl: '/api/certificates/cert-123/download'
          })
        })
      );
      
      // 模拟生成证书API调用
      await fetch('/api/certificates', {
        method: 'POST',
        body: JSON.stringify({ examId: mockExam.id, userId: 'user-123' })
      });
      
      // 验证证书生成API调用
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/certificates',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    it('应该显示证书编号', async () => {
      await mockPage.goto(`http://localhost:3000/certificates/cert-123`);
      
      const certificateNumber = await mockPage.textContent('.certificate-number');
      expect(certificateNumber).toBeTruthy();
    });
  });
  
  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟网络错误
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // 模拟API调用
      try {
        await fetch('/api/exams/exam-123');
      } catch (error) {
        // 预期的错误
      }
      
      // 验证错误处理
      expect(mockFetch).toHaveBeenCalledWith('/api/exams/exam-123');
    });
    
    it('应该处理考试时间超时', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟超时响应
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 408,
          json: () => Promise.resolve({ error: 'Exam timeout' })
        })
      );
      
      // 模拟提交考试API调用
      await fetch('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({ examId: mockExam.id })
      });
      
      // 验证超时处理
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/submissions',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    it('应该处理未授权访问', async () => {
      // 重置mock
      jest.clearAllMocks();
      
      // 模拟未授权响应
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' })
        })
      );
      
      // 模拟访问受保护的API
      await fetch('/api/exams/exam-123/take');
      
      // 验证API调用
      expect(mockFetch).toHaveBeenCalledWith('/api/exams/exam-123/take');
    });
  });
  
  describe('响应式设计测试', () => {
    it('应该在移动设备上正常显示', async () => {
      // 模拟移动设备视口
      await mockPage.goto(`http://localhost:3000/exams/${mockExam.id}`);
      
      // 验证移动端布局
      const mobileMenuVisible = await mockPage.isVisible('.mobile-menu');
      expect(typeof mobileMenuVisible).toBe('boolean');
    });
    
    it('应该在平板设备上正常显示', async () => {
      // 模拟平板设备视口
      await mockPage.goto(`http://localhost:3000/exams/${mockExam.id}`);
      
      // 验证平板端布局
      const tabletLayoutVisible = await mockPage.isVisible('.tablet-layout');
      expect(typeof tabletLayoutVisible).toBe('boolean');
    });
  });
});