/**
 * AI服务单元测试
 * 测试OpenAI API集成、课程生成、内容优化等功能
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  AIService,
  generateCourse,
  optimizeContent,
  generateQuiz,
  analyzeUserProgress,
  AIServiceConfig
} from '@/services/aiService';
import { testUtils } from '../setup';

// 模拟OpenAI客户端
const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn()
    }
  },
  embeddings: {
    create: jest.fn()
  }
};

// 模拟环境配置
const mockEnvConfig = {
  getOpenAI: jest.fn(() => ({
    client: mockOpenAIClient,
    apiKey: 'test-openai-key'
  }))
};

jest.mock('@/utils/envConfig', () => ({
  getEnvConfig: () => mockEnvConfig
}));

// 模拟错误处理器
const mockErrorHandler = {
  withRetry: jest.fn(),
  createError: jest.fn(),
  logError: jest.fn()
};

jest.mock('@/utils/errorHandler', () => ({
  errorHandler: mockErrorHandler
}));

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
    
    // 设置默认的成功响应
    mockErrorHandler.withRetry.mockImplementation(async (fn) => await fn());
  });

  describe('generateCourse', () => {
    it('应该生成完整的课程内容', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'JavaScript基础教程',
              description: '学习JavaScript编程语言的基础知识',
              difficulty: 'beginner',
              estimatedDuration: 120,
              modules: [
                {
                  title: '变量和数据类型',
                  content: '学习JavaScript中的变量声明和基本数据类型',
                  duration: 30,
                  exercises: [
                    {
                      question: '声明一个字符串变量',
                      answer: 'let name = "Hello";',
                      explanation: '使用let关键字声明变量'
                    }
                  ]
                }
              ],
              prerequisites: ['HTML基础', 'CSS基础'],
              learningObjectives: ['掌握JavaScript语法', '理解变量概念']
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const courseRequest = {
        topic: 'JavaScript基础',
        difficulty: 'beginner' as const,
        duration: 120,
        learningObjectives: ['掌握JavaScript语法']
      };
      
      const result = await aiService.generateCourse(courseRequest);
      
      expect(result.title).toBe('JavaScript基础教程');
      expect(result.difficulty).toBe('beginner');
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].exercises).toHaveLength(1);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('课程生成专家')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('JavaScript基础')
            })
          ])
        })
      );
    });

    it('应该处理不同难度级别的课程生成', async () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
      
      for (const difficulty of difficulties) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                title: `${difficulty} Course`,
                difficulty,
                modules: []
              })
            }
          }]
        };
        
        mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
        
        const result = await aiService.generateCourse({
          topic: 'Test Topic',
          difficulty,
          duration: 60
        });
        
        expect(result.difficulty).toBe(difficulty);
      }
    });

    it('应该处理OpenAI API错误', async () => {
      const apiError = new Error('OpenAI API rate limit exceeded');
      mockOpenAIClient.chat.completions.create.mockRejectedValue(apiError);
      
      mockErrorHandler.withRetry.mockRejectedValue(apiError);
      
      await expect(aiService.generateCourse({
        topic: 'Test Topic',
        difficulty: 'beginner',
        duration: 60
      })).rejects.toThrow('OpenAI API rate limit exceeded');
      
      expect(mockErrorHandler.withRetry).toHaveBeenCalled();
    });

    it('应该处理无效的JSON响应', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON content'
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      await expect(aiService.generateCourse({
        topic: 'Test Topic',
        difficulty: 'beginner',
        duration: 60
      })).rejects.toThrow();
    });

    it('应该验证课程请求参数', async () => {
      const invalidRequests = [
        { topic: '', difficulty: 'beginner', duration: 60 }, // 空主题
        { topic: 'Test', difficulty: 'invalid', duration: 60 }, // 无效难度
        { topic: 'Test', difficulty: 'beginner', duration: -1 }, // 负时长
        { topic: 'Test', difficulty: 'beginner', duration: 0 } // 零时长
      ];
      
      for (const request of invalidRequests) {
        await expect(aiService.generateCourse(request as any)).rejects.toThrow();
      }
    });

    it('应该支持自定义学习目标', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Custom Course',
              learningObjectives: ['目标1', '目标2'],
              modules: []
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await aiService.generateCourse({
        topic: 'Test Topic',
        difficulty: 'beginner',
        duration: 60,
        learningObjectives: ['目标1', '目标2']
      });
      
      expect(result.learningObjectives).toEqual(['目标1', '目标2']);
    });
  });

  describe('optimizeContent', () => {
    it('应该优化课程内容', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimizedContent: '优化后的课程内容，更加清晰易懂',
              improvements: [
                '简化了复杂概念的解释',
                '添加了更多实例',
                '改进了内容结构'
              ],
              readabilityScore: 85,
              suggestions: [
                '可以添加更多图表说明',
                '建议增加互动练习'
              ]
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const optimizationRequest = {
        content: '原始课程内容',
        targetAudience: 'beginners',
        optimizationGoals: ['clarity', 'engagement']
      };
      
      const result = await aiService.optimizeContent(optimizationRequest);
      
      expect(result.optimizedContent).toBe('优化后的课程内容，更加清晰易懂');
      expect(result.improvements).toHaveLength(3);
      expect(result.readabilityScore).toBe(85);
      expect(result.suggestions).toHaveLength(2);
    });

    it('应该处理不同的优化目标', async () => {
      const optimizationGoals = [
        ['clarity'],
        ['engagement'],
        ['accessibility'],
        ['clarity', 'engagement'],
        ['clarity', 'engagement', 'accessibility']
      ];
      
      for (const goals of optimizationGoals) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                optimizedContent: 'Optimized content',
                improvements: [],
                readabilityScore: 80
              })
            }
          }]
        };
        
        mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
        
        const result = await aiService.optimizeContent({
          content: 'Test content',
          targetAudience: 'general',
          optimizationGoals: goals
        });
        
        expect(result.optimizedContent).toBe('Optimized content');
        expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.stringContaining(goals.join(', '))
              })
            ])
          })
        );
      }
    });

    it('应该处理长内容的优化', async () => {
      const longContent = 'A'.repeat(10000); // 10KB内容
      
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimizedContent: 'Optimized long content',
              improvements: ['Reduced verbosity'],
              readabilityScore: 90
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await aiService.optimizeContent({
        content: longContent,
        targetAudience: 'general',
        optimizationGoals: ['clarity']
      });
      
      expect(result.optimizedContent).toBe('Optimized long content');
    });
  });

  describe('generateQuiz', () => {
    it('应该生成课程测验', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'JavaScript基础测验',
              questions: [
                {
                  id: 'q1',
                  type: 'multiple-choice',
                  question: 'JavaScript中用于声明变量的关键字是？',
                  options: ['var', 'let', 'const', '以上都是'],
                  correctAnswer: 3,
                  explanation: 'var、let、const都可以用来声明变量',
                  difficulty: 'easy',
                  points: 10
                },
                {
                  id: 'q2',
                  type: 'true-false',
                  question: 'JavaScript是强类型语言',
                  correctAnswer: false,
                  explanation: 'JavaScript是弱类型语言',
                  difficulty: 'medium',
                  points: 15
                }
              ],
              totalPoints: 25,
              timeLimit: 300,
              passingScore: 70
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const quizRequest = {
        courseContent: 'JavaScript变量和数据类型课程内容',
        questionCount: 2,
        difficulty: 'mixed',
        questionTypes: ['multiple-choice', 'true-false']
      };
      
      const result = await aiService.generateQuiz(quizRequest);
      
      expect(result.title).toBe('JavaScript基础测验');
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].type).toBe('multiple-choice');
      expect(result.questions[1].type).toBe('true-false');
      expect(result.totalPoints).toBe(25);
    });

    it('应该生成不同类型的问题', async () => {
      const questionTypes = [
        'multiple-choice',
        'true-false',
        'short-answer',
        'essay',
        'code-completion'
      ];
      
      for (const type of questionTypes) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Test Quiz',
                questions: [{
                  id: 'q1',
                  type,
                  question: 'Test question',
                  correctAnswer: 'Test answer',
                  points: 10
                }],
                totalPoints: 10
              })
            }
          }]
        };
        
        mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
        
        const result = await aiService.generateQuiz({
          courseContent: 'Test content',
          questionCount: 1,
          questionTypes: [type]
        });
        
        expect(result.questions[0].type).toBe(type);
      }
    });

    it('应该处理不同难度级别的测验', async () => {
      const difficulties = ['easy', 'medium', 'hard', 'mixed'];
      
      for (const difficulty of difficulties) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Test Quiz',
                questions: [{
                  id: 'q1',
                  type: 'multiple-choice',
                  question: 'Test question',
                  difficulty: difficulty === 'mixed' ? 'medium' : difficulty,
                  points: 10
                }],
                totalPoints: 10
              })
            }
          }]
        };
        
        mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
        
        const result = await aiService.generateQuiz({
          courseContent: 'Test content',
          questionCount: 1,
          difficulty
        });
        
        expect(result.questions).toHaveLength(1);
      }
    });
  });

  describe('analyzeUserProgress', () => {
    it('应该分析用户学习进度', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              overallProgress: 75,
              strengths: ['理解概念快', '练习完成度高'],
              weaknesses: ['需要更多实践', '某些概念理解不够深入'],
              recommendations: [
                '建议多做编程练习',
                '复习数据类型相关内容',
                '参加在线讨论'
              ],
              nextSteps: [
                '学习函数和作用域',
                '练习DOM操作'
              ],
              estimatedCompletionTime: 30,
              difficultyAdjustment: 'maintain',
              learningStyle: 'visual',
              engagementLevel: 'high'
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const progressData = {
        userId: 'user-123',
        courseId: 'course-456',
        completedModules: ['module-1', 'module-2'],
        quizScores: [85, 90, 70],
        timeSpent: 180, // 分钟
        lastActivity: new Date(),
        learningPath: 'frontend-development'
      };
      
      const result = await aiService.analyzeUserProgress(progressData);
      
      expect(result.overallProgress).toBe(75);
      expect(result.strengths).toHaveLength(2);
      expect(result.weaknesses).toHaveLength(2);
      expect(result.recommendations).toHaveLength(3);
      expect(result.nextSteps).toHaveLength(2);
      expect(result.difficultyAdjustment).toBe('maintain');
    });

    it('应该处理不同的学习路径', async () => {
      const learningPaths = [
        'frontend-development',
        'backend-development',
        'data-science',
        'mobile-development',
        'devops'
      ];
      
      for (const path of learningPaths) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                overallProgress: 50,
                learningPath: path,
                recommendations: [`针对${path}的建议`]
              })
            }
          }]
        };
        
        mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
        
        const result = await aiService.analyzeUserProgress({
          userId: 'user-123',
          courseId: 'course-456',
          completedModules: [],
          quizScores: [],
          timeSpent: 60,
          lastActivity: new Date(),
          learningPath: path
        });
        
        expect(result.recommendations).toContain(`针对${path}的建议`);
      }
    });

    it('应该根据测验分数调整难度建议', async () => {
      const testCases = [
        { scores: [95, 98, 92], expectedAdjustment: 'increase' },
        { scores: [45, 50, 40], expectedAdjustment: 'decrease' },
        { scores: [70, 75, 80], expectedAdjustment: 'maintain' }
      ];
      
      for (const testCase of testCases) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                overallProgress: 60,
                difficultyAdjustment: testCase.expectedAdjustment
              })
            }
          }]
        };
        
        mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
        
        const result = await aiService.analyzeUserProgress({
          userId: 'user-123',
          courseId: 'course-456',
          completedModules: [],
          quizScores: testCase.scores,
          timeSpent: 120,
          lastActivity: new Date(),
          learningPath: 'frontend-development'
        });
        
        expect(result.difficultyAdjustment).toBe(testCase.expectedAdjustment);
      }
    });
  });

  describe('AIServiceConfig', () => {
    it('应该使用默认配置', () => {
      const config = new AIServiceConfig();
      
      expect(config.model).toBe('gpt-4');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4000);
      expect(config.retryAttempts).toBe(3);
      expect(config.timeout).toBe(30000);
    });

    it('应该允许自定义配置', () => {
      const customConfig = new AIServiceConfig({
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 2000,
        retryAttempts: 5,
        timeout: 60000
      });
      
      expect(customConfig.model).toBe('gpt-3.5-turbo');
      expect(customConfig.temperature).toBe(0.5);
      expect(customConfig.maxTokens).toBe(2000);
      expect(customConfig.retryAttempts).toBe(5);
      expect(customConfig.timeout).toBe(60000);
    });

    it('应该验证配置参数', () => {
      expect(() => {
        new AIServiceConfig({
          temperature: 2.5 // 超出范围
        });
      }).toThrow('Temperature must be between 0 and 2');
      
      expect(() => {
        new AIServiceConfig({
          maxTokens: -1 // 负值
        });
      }).toThrow('Max tokens must be positive');
      
      expect(() => {
        new AIServiceConfig({
          retryAttempts: 0 // 零重试
        });
      }).toThrow('Retry attempts must be positive');
    });
  });

  describe('便捷函数', () => {
    it('generateCourse函数应该正常工作', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Course',
              modules: []
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await generateCourse({
        topic: 'Test Topic',
        difficulty: 'beginner',
        duration: 60
      });
      
      expect(result.title).toBe('Test Course');
    });

    it('optimizeContent函数应该正常工作', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimizedContent: 'Optimized content',
              improvements: []
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await optimizeContent({
        content: 'Original content',
        targetAudience: 'general',
        optimizationGoals: ['clarity']
      });
      
      expect(result.optimizedContent).toBe('Optimized content');
    });

    it('generateQuiz函数应该正常工作', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Quiz',
              questions: [],
              totalPoints: 0
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await generateQuiz({
        courseContent: 'Test content',
        questionCount: 5
      });
      
      expect(result.title).toBe('Test Quiz');
    });

    it('analyzeUserProgress函数应该正常工作', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              overallProgress: 80,
              strengths: [],
              weaknesses: [],
              recommendations: []
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await analyzeUserProgress({
        userId: 'user-123',
        courseId: 'course-456',
        completedModules: [],
        quizScores: [],
        timeSpent: 60,
        lastActivity: new Date(),
        learningPath: 'frontend-development'
      });
      
      expect(result.overallProgress).toBe(80);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理网络超时', async () => {
      const timeoutError = new Error('Request timeout');
      mockOpenAIClient.chat.completions.create.mockRejectedValue(timeoutError);
      mockErrorHandler.withRetry.mockRejectedValue(timeoutError);
      
      await expect(aiService.generateCourse({
        topic: 'Test Topic',
        difficulty: 'beginner',
        duration: 60
      })).rejects.toThrow('Request timeout');
    });

    it('应该处理API配额耗尽', async () => {
      const quotaError = new Error('API quota exceeded');
      mockOpenAIClient.chat.completions.create.mockRejectedValue(quotaError);
      mockErrorHandler.withRetry.mockRejectedValue(quotaError);
      
      await expect(aiService.generateCourse({
        topic: 'Test Topic',
        difficulty: 'beginner',
        duration: 60
      })).rejects.toThrow('API quota exceeded');
    });

    it('应该处理空响应', async () => {
      const mockResponse = {
        choices: []
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      await expect(aiService.generateCourse({
        topic: 'Test Topic',
        difficulty: 'beginner',
        duration: 60
      })).rejects.toThrow('No response from AI service');
    });

    it('应该处理极长的输入', async () => {
      const longTopic = 'A'.repeat(10000);
      
      await expect(aiService.generateCourse({
        topic: longTopic,
        difficulty: 'beginner',
        duration: 60
      })).rejects.toThrow('Topic too long');
    });

    it('应该处理并发请求', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Concurrent Course',
              modules: []
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        aiService.generateCourse({
          topic: `Topic ${i}`,
          difficulty: 'beginner',
          duration: 60
        })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.title === 'Concurrent Course')).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内生成课程', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Performance Test Course',
              modules: Array.from({ length: 10 }, (_, i) => ({
                title: `Module ${i + 1}`,
                content: 'Module content',
                duration: 30
              }))
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      const result = await aiService.generateCourse({
        topic: 'Performance Test',
        difficulty: 'beginner',
        duration: 300
      });
      const endTime = Date.now();
      
      expect(result.modules).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该高效处理批量内容优化', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimizedContent: 'Optimized batch content',
              improvements: ['Batch optimization']
            })
          }
        }]
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) => 
        aiService.optimizeContent({
          content: `Content ${i}`,
          targetAudience: 'general',
          optimizationGoals: ['clarity']
        })
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(10000); // 应该在10秒内完成
    });
  });
});