/**
 * AI服务单元测试
 * 
 * 测试AI服务，包括：
 * - AI模型集成和管理
 * - 智能内容推荐
 * - 自动内容生成
 * - 学习路径优化
 * - 智能评估和反馈
 * - 自然语言处理
 * - 机器学习模型训练
 * - 预测分析
 */

import { 
  AIService,
  createAIService,
  getAIService,
  AIModel,
  ContentRecommendation,
  GeneratedContent,
  LearningPathOptimization,
  IntelligentAssessment,
  NLPResult,
  ModelTrainingResult,
  PredictionResult,
  AIInsight,
  ConversationContext,
  KnowledgeExtraction,
  PersonalizationProfile,
  ContentAnalysis,
  LearningAnalytics
} from '../../services/aiService';
import { logger } from '../../utils/logger';
import { cacheService } from '../../services/cacheService';
import { analyticsService } from '../../services/analyticsService';
import { auditService } from '../../services/auditService';
import { envConfig } from '../../config/envConfig';
import axios from 'axios';

// Mock 依赖
jest.mock('../../utils/logger');
jest.mock('../../services/cacheService');
jest.mock('../../services/analyticsService');
jest.mock('../../services/auditService');
jest.mock('../../config/envConfig');
jest.mock('axios');

// 类型定义
interface AIConfig {
  enableAI: boolean;
  models: {
    recommendation: string;
    contentGeneration: string;
    nlp: string;
    assessment: string;
  };
  apiKeys: {
    openai: string;
    anthropic: string;
    google: string;
  };
  endpoints: {
    openai: string;
    anthropic: string;
    google: string;
  };
  limits: {
    requestsPerMinute: number;
    tokensPerRequest: number;
    maxConcurrentRequests: number;
  };
  features: {
    enableRecommendations: boolean;
    enableContentGeneration: boolean;
    enableNLP: boolean;
    enablePredictions: boolean;
    enablePersonalization: boolean;
  };
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latency: number;
  throughput: number;
  errorRate: number;
  confidence: number;
}

interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  validationLoss: number;
  validationAccuracy: number;
  learningRate: number;
  batchSize: number;
  trainingTime: number;
}

// Mock 实例
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn()
};

const mockAnalyticsService = {
  track: jest.fn(),
  increment: jest.fn(),
  histogram: jest.fn(),
  gauge: jest.fn(),
  timer: jest.fn()
};

const mockAuditService = {
  log: jest.fn(),
  logUserActivity: jest.fn()
};

const mockEnvConfig = {
  ai: {
    enableAI: true,
    models: {
      recommendation: 'gpt-4',
      contentGeneration: 'gpt-4',
      nlp: 'text-davinci-003',
      assessment: 'gpt-3.5-turbo'
    },
    apiKeys: {
      openai: 'sk-test-key',
      anthropic: 'ant-test-key',
      google: 'google-test-key'
    },
    endpoints: {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1'
    },
    limits: {
      requestsPerMinute: 60,
      tokensPerRequest: 4000,
      maxConcurrentRequests: 10
    },
    features: {
      enableRecommendations: true,
      enableContentGeneration: true,
      enableNLP: true,
      enablePredictions: true,
      enablePersonalization: true
    }
  }
};

const mockAxios = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn().mockReturnThis(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

// 设置 Mock
const mockLoggerTyped = logger as jest.Mocked<typeof logger>;
const mockCacheServiceTyped = cacheService as jest.Mocked<typeof cacheService>;
const mockAnalyticsServiceTyped = analyticsService as jest.Mocked<typeof analyticsService>;
const mockAuditServiceTyped = auditService as jest.Mocked<typeof auditService>;
const mockEnvConfigTyped = envConfig as jest.Mocked<typeof envConfig>;
const mockAxiosTyped = axios as jest.Mocked<typeof axios>;

// 测试数据
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  preferences: {
    learningStyle: 'visual',
    difficulty: 'intermediate',
    topics: ['javascript', 'react']
  }
};

const testCourse = {
  id: 'course-123',
  title: 'JavaScript Fundamentals',
  description: 'Learn JavaScript basics',
  content: 'JavaScript is a programming language...',
  difficulty: 'beginner',
  tags: ['programming', 'web-development'],
  duration: 3600
};

const testRecommendation: ContentRecommendation = {
  id: 'rec-123',
  type: 'course',
  contentId: 'course-456',
  title: 'Advanced JavaScript',
  description: 'Take your JavaScript skills to the next level',
  reason: 'Based on your progress in JavaScript Fundamentals',
  confidence: 0.85,
  priority: 'high',
  tags: ['javascript', 'advanced'],
  estimatedTime: 7200,
  difficulty: 'advanced',
  prerequisites: ['course-123'],
  learningObjectives: ['Master closures', 'Understand async/await'],
  metadata: {
    algorithm: 'collaborative_filtering',
    version: '1.0',
    generatedAt: new Date()
  }
};

const testGeneratedContent: GeneratedContent = {
  id: 'content-123',
  type: 'lesson',
  title: 'Understanding JavaScript Closures',
  content: 'A closure is a function that has access to variables...',
  format: 'markdown',
  metadata: {
    model: 'gpt-4',
    prompt: 'Generate a lesson about JavaScript closures',
    tokens: 500,
    generatedAt: new Date(),
    quality: 0.9
  },
  structure: {
    introduction: 'What are closures?',
    mainContent: 'Detailed explanation...',
    examples: ['Example 1', 'Example 2'],
    exercises: ['Exercise 1', 'Exercise 2'],
    summary: 'Key takeaways'
  },
  tags: ['javascript', 'closures', 'functions'],
  difficulty: 'intermediate',
  estimatedReadTime: 600
};

const testNLPResult: NLPResult = {
  text: 'I am struggling with JavaScript closures',
  sentiment: {
    score: -0.3,
    label: 'negative',
    confidence: 0.8
  },
  entities: [
    {
      text: 'JavaScript closures',
      label: 'TOPIC',
      start: 20,
      end: 39,
      confidence: 0.95
    }
  ],
  intent: {
    name: 'request_help',
    confidence: 0.9,
    parameters: {
      topic: 'javascript closures',
      difficulty: 'struggling'
    }
  },
  keywords: ['javascript', 'closures', 'struggling'],
  topics: ['programming', 'javascript'],
  language: 'en',
  complexity: 0.6
};

const testAssessment: IntelligentAssessment = {
  id: 'assessment-123',
  userId: 'user-123',
  topic: 'javascript',
  questions: [
    {
      id: 'q1',
      text: 'What is a closure in JavaScript?',
      type: 'multiple_choice',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      difficulty: 'intermediate',
      explanation: 'A closure is...',
      tags: ['closures', 'functions']
    }
  ],
  adaptiveLogic: {
    nextQuestionStrategy: 'difficulty_based',
    difficultyAdjustment: 0.1,
    confidenceThreshold: 0.8
  },
  results: {
    score: 85,
    level: 'intermediate',
    strengths: ['variables', 'functions'],
    weaknesses: ['closures', 'async'],
    recommendations: ['Study closures more', 'Practice async programming']
  },
  metadata: {
    generatedAt: new Date(),
    model: 'gpt-4',
    version: '1.0'
  }
};

describe('AI Service', () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的mock返回值
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);
    mockAnalyticsService.track.mockResolvedValue(true);
    mockAuditService.log.mockResolvedValue(true);
    
    // 设置axios mock
    mockAxios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify(testRecommendation)
          }
        }],
        usage: {
          total_tokens: 500
        }
      }
    });
    
    aiService = createAIService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * 服务初始化测试
   */
  describe('Service Initialization', () => {
    it('应该创建AI服务实例', () => {
      expect(aiService).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'AI service initialized successfully'
      );
    });

    it('应该获取现有的服务实例', () => {
      const service1 = getAIService();
      const service2 = getAIService();
      
      expect(service1).toBe(service2);
    });

    it('应该初始化AI模型', async () => {
      await aiService.initializeModels();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'AI models initialized',
        expect.objectContaining({
          models: expect.any(Object)
        })
      );
    });

    it('应该验证API密钥', async () => {
      mockAxios.get.mockResolvedValue({ status: 200 });
      
      const isValid = await aiService.validateAPIKeys();
      
      expect(isValid).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('models'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });
  });

  /**
   * 内容推荐测试
   */
  describe('Content Recommendations', () => {
    it('应该生成个性化推荐', async () => {
      const userProfile = {
        userId: 'user-123',
        interests: ['javascript', 'react'],
        skillLevel: 'intermediate',
        learningHistory: ['course-123'],
        preferences: {
          contentType: 'video',
          difficulty: 'intermediate'
        }
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify([testRecommendation])
            }
          }]
        }
      });
      
      const recommendations = await aiService.generateRecommendations(userProfile);
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: 'course',
            confidence: expect.any(Number)
          })
        ])
      );
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('chat/completions'),
        expect.objectContaining({
          model: 'gpt-4',
          messages: expect.any(Array)
        })
      );
    });

    it('应该基于协同过滤生成推荐', async () => {
      const userId = 'user-123';
      const similarUsers = ['user-456', 'user-789'];
      
      const recommendations = await aiService.generateCollaborativeRecommendations(
        userId,
        similarUsers
      );
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            confidence: expect.any(Number),
            reason: expect.stringContaining('similar users')
          })
        ])
      );
    });

    it('应该基于内容相似性生成推荐', async () => {
      const contentId = 'course-123';
      const contentFeatures = {
        tags: ['javascript', 'programming'],
        difficulty: 'beginner',
        category: 'web-development'
      };
      
      const recommendations = await aiService.generateContentBasedRecommendations(
        contentId,
        contentFeatures
      );
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            contentId: expect.any(String),
            similarity: expect.any(Number),
            reason: expect.stringContaining('similar content')
          })
        ])
      );
    });

    it('应该混合多种推荐算法', async () => {
      const userId = 'user-123';
      const context = {
        currentCourse: 'course-123',
        sessionTime: 1800,
        deviceType: 'mobile'
      };
      
      const recommendations = await aiService.generateHybridRecommendations(userId, context);
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            algorithm: expect.any(String),
            weight: expect.any(Number),
            finalScore: expect.any(Number)
          })
        ])
      );
    });
  });

  /**
   * 内容生成测试
   */
  describe('Content Generation', () => {
    it('应该生成课程内容', async () => {
      const contentSpec = {
        topic: 'JavaScript Closures',
        difficulty: 'intermediate',
        format: 'lesson',
        length: 'medium',
        includeExamples: true,
        includeExercises: true
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify(testGeneratedContent)
            }
          }],
          usage: { total_tokens: 500 }
        }
      });
      
      const content = await aiService.generateContent(contentSpec);
      
      expect(content).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          content: expect.any(String),
          structure: expect.any(Object),
          metadata: expect.objectContaining({
            model: 'gpt-4',
            tokens: 500
          })
        })
      );
    });

    it('应该生成测验题目', async () => {
      const quizSpec = {
        topic: 'JavaScript Arrays',
        difficulty: 'beginner',
        questionCount: 5,
        questionTypes: ['multiple_choice', 'true_false'],
        includeExplanations: true
      };
      
      const questions = await aiService.generateQuizQuestions(quizSpec);
      
      expect(questions).toHaveLength(5);
      expect(questions[0]).toEqual(
        expect.objectContaining({
          text: expect.any(String),
          type: expect.stringMatching(/multiple_choice|true_false/),
          options: expect.any(Array),
          correctAnswer: expect.any(String),
          explanation: expect.any(String)
        })
      );
    });

    it('应该生成学习路径', async () => {
      const pathSpec = {
        targetSkill: 'Full Stack Development',
        currentLevel: 'beginner',
        timeAvailable: 40, // hours per week
        preferences: {
          learningStyle: 'hands-on',
          contentTypes: ['video', 'interactive']
        }
      };
      
      const learningPath = await aiService.generateLearningPath(pathSpec);
      
      expect(learningPath).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          totalDuration: expect.any(Number),
          modules: expect.arrayContaining([
            expect.objectContaining({
              title: expect.any(String),
              order: expect.any(Number),
              estimatedHours: expect.any(Number)
            })
          ])
        })
      );
    });

    it('应该生成个性化练习', async () => {
      const exerciseSpec = {
        userId: 'user-123',
        topic: 'JavaScript Functions',
        weakAreas: ['closures', 'scope'],
        difficulty: 'intermediate',
        exerciseType: 'coding'
      };
      
      const exercises = await aiService.generatePersonalizedExercises(exerciseSpec);
      
      expect(exercises).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            description: expect.any(String),
            difficulty: 'intermediate',
            focusArea: expect.stringMatching(/closures|scope/),
            solution: expect.any(String)
          })
        ])
      );
    });
  });

  /**
   * 自然语言处理测试
   */
  describe('Natural Language Processing', () => {
    it('应该分析文本情感', async () => {
      const text = 'I love this course! It\'s very helpful.';
      
      mockAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                sentiment: {
                  score: 0.8,
                  label: 'positive',
                  confidence: 0.9
                }
              })
            }
          }]
        }
      });
      
      const sentiment = await aiService.analyzeSentiment(text);
      
      expect(sentiment).toEqual(
        expect.objectContaining({
          score: expect.any(Number),
          label: 'positive',
          confidence: expect.any(Number)
        })
      );
    });

    it('应该提取命名实体', async () => {
      const text = 'I want to learn React and Node.js for web development';
      
      const entities = await aiService.extractEntities(text);
      
      expect(entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'React',
            label: 'TECHNOLOGY',
            confidence: expect.any(Number)
          }),
          expect.objectContaining({
            text: 'Node.js',
            label: 'TECHNOLOGY',
            confidence: expect.any(Number)
          })
        ])
      );
    });

    it('应该识别用户意图', async () => {
      const text = 'Can you recommend a course for beginners in Python?';
      
      const intent = await aiService.recognizeIntent(text);
      
      expect(intent).toEqual(
        expect.objectContaining({
          name: 'request_recommendation',
          confidence: expect.any(Number),
          parameters: expect.objectContaining({
            topic: 'Python',
            level: 'beginners'
          })
        })
      );
    });

    it('应该进行文本摘要', async () => {
      const longText = 'This is a very long text about JavaScript...';
      
      mockAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'JavaScript is a programming language used for web development.'
            }
          }]
        }
      });
      
      const summary = await aiService.summarizeText(longText, { maxLength: 100 });
      
      expect(summary).toEqual(
        expect.objectContaining({
          summary: expect.any(String),
          originalLength: longText.length,
          summaryLength: expect.any(Number),
          compressionRatio: expect.any(Number)
        })
      );
    });

    it('应该翻译文本', async () => {
      const text = 'Hello, how are you?';
      const targetLanguage = 'zh';
      
      const translation = await aiService.translateText(text, targetLanguage);
      
      expect(translation).toEqual(
        expect.objectContaining({
          originalText: text,
          translatedText: expect.any(String),
          sourceLanguage: 'en',
          targetLanguage: 'zh',
          confidence: expect.any(Number)
        })
      );
    });
  });

  /**
   * 智能评估测试
   */
  describe('Intelligent Assessment', () => {
    it('应该生成自适应测试', async () => {
      const assessmentSpec = {
        userId: 'user-123',
        topic: 'JavaScript',
        initialDifficulty: 'intermediate',
        questionCount: 10,
        adaptiveStrategy: 'irt' // Item Response Theory
      };
      
      const assessment = await aiService.generateAdaptiveAssessment(assessmentSpec);
      
      expect(assessment).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          questions: expect.any(Array),
          adaptiveLogic: expect.objectContaining({
            nextQuestionStrategy: expect.any(String),
            difficultyAdjustment: expect.any(Number)
          })
        })
      );
    });

    it('应该评估学习者能力', async () => {
      const responses = [
        { questionId: 'q1', answer: 'A', correct: true, timeSpent: 30 },
        { questionId: 'q2', answer: 'B', correct: false, timeSpent: 45 },
        { questionId: 'q3', answer: 'C', correct: true, timeSpent: 25 }
      ];
      
      const ability = await aiService.assessLearnerAbility('user-123', responses);
      
      expect(ability).toEqual(
        expect.objectContaining({
          overallScore: expect.any(Number),
          abilityLevel: expect.any(String),
          confidenceInterval: expect.any(Array),
          skillBreakdown: expect.any(Object),
          recommendations: expect.any(Array)
        })
      );
    });

    it('应该提供智能反馈', async () => {
      const submissionData = {
        userId: 'user-123',
        exerciseId: 'exercise-123',
        code: 'function add(a, b) { return a + b; }',
        expectedOutput: 'function that adds two numbers',
        actualOutput: 'working function'
      };
      
      const feedback = await aiService.generateIntelligentFeedback(submissionData);
      
      expect(feedback).toEqual(
        expect.objectContaining({
          score: expect.any(Number),
          feedback: expect.any(String),
          suggestions: expect.any(Array),
          strengths: expect.any(Array),
          areasForImprovement: expect.any(Array),
          nextSteps: expect.any(Array)
        })
      );
    });

    it('应该检测学习困难', async () => {
      const learningData = {
        userId: 'user-123',
        recentScores: [45, 50, 48, 52, 49],
        timeSpent: [3600, 4200, 3900, 4500, 4100],
        attempts: [3, 4, 3, 5, 4],
        topic: 'JavaScript Closures'
      };
      
      const difficulties = await aiService.detectLearningDifficulties(learningData);
      
      expect(difficulties).toEqual(
        expect.objectContaining({
          hasDifficulty: expect.any(Boolean),
          difficultyLevel: expect.any(String),
          identifiedIssues: expect.any(Array),
          recommendations: expect.any(Array),
          interventions: expect.any(Array)
        })
      );
    });
  });

  /**
   * 学习分析测试
   */
  describe('Learning Analytics', () => {
    it('应该分析学习模式', async () => {
      const userId = 'user-123';
      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      
      const patterns = await aiService.analyzeLearningPatterns(userId, timeRange);
      
      expect(patterns).toEqual(
        expect.objectContaining({
          studyHabits: expect.any(Object),
          peakPerformanceTimes: expect.any(Array),
          learningVelocity: expect.any(Number),
          retentionRate: expect.any(Number),
          engagementScore: expect.any(Number),
          preferredContentTypes: expect.any(Array)
        })
      );
    });

    it('应该预测学习成果', async () => {
      const predictionData = {
        userId: 'user-123',
        courseId: 'course-123',
        currentProgress: 0.6,
        historicalPerformance: {
          averageScore: 78,
          completionRate: 0.85,
          studyConsistency: 0.7
        }
      };
      
      const prediction = await aiService.predictLearningOutcome(predictionData);
      
      expect(prediction).toEqual(
        expect.objectContaining({
          predictedScore: expect.any(Number),
          completionProbability: expect.any(Number),
          estimatedCompletionTime: expect.any(Number),
          riskFactors: expect.any(Array),
          recommendations: expect.any(Array),
          confidence: expect.any(Number)
        })
      );
    });

    it('应该识别学习风格', async () => {
      const behaviorData = {
        userId: 'user-123',
        contentInteractions: {
          video: 120, // minutes
          text: 80,
          interactive: 200,
          audio: 30
        },
        learningPace: 'moderate',
        preferredDifficulty: 'challenging',
        socialLearning: 0.3
      };
      
      const learningStyle = await aiService.identifyLearningStyle(behaviorData);
      
      expect(learningStyle).toEqual(
        expect.objectContaining({
          primaryStyle: expect.any(String),
          secondaryStyle: expect.any(String),
          characteristics: expect.any(Array),
          recommendations: expect.any(Array),
          confidence: expect.any(Number)
        })
      );
    });

    it('应该生成学习洞察', async () => {
      const userId = 'user-123';
      
      const insights = await aiService.generateLearningInsights(userId);
      
      expect(insights).toEqual(
        expect.objectContaining({
          keyFindings: expect.any(Array),
          strengths: expect.any(Array),
          improvementAreas: expect.any(Array),
          trends: expect.any(Array),
          actionableRecommendations: expect.any(Array),
          personalizedTips: expect.any(Array)
        })
      );
    });
  });

  /**
   * 对话系统测试
   */
  describe('Conversational AI', () => {
    it('应该处理学习相关对话', async () => {
      const conversationData = {
        userId: 'user-123',
        message: 'I\'m having trouble understanding JavaScript closures',
        context: {
          currentCourse: 'course-123',
          currentLesson: 'lesson-456',
          previousMessages: []
        }
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: 'I understand you\'re having trouble with closures. Let me help explain...'
            }
          }]
        }
      });
      
      const response = await aiService.handleConversation(conversationData);
      
      expect(response).toEqual(
        expect.objectContaining({
          message: expect.any(String),
          intent: expect.any(Object),
          suggestions: expect.any(Array),
          resources: expect.any(Array),
          followUpQuestions: expect.any(Array)
        })
      );
    });

    it('应该提供智能学习助手', async () => {
      const query = {
        userId: 'user-123',
        question: 'What\'s the difference between let and var in JavaScript?',
        context: 'learning'
      };
      
      const answer = await aiService.provideLearningAssistance(query);
      
      expect(answer).toEqual(
        expect.objectContaining({
          answer: expect.any(String),
          explanation: expect.any(String),
          examples: expect.any(Array),
          relatedTopics: expect.any(Array),
          additionalResources: expect.any(Array)
        })
      );
    });

    it('应该生成学习计划建议', async () => {
      const planRequest = {
        userId: 'user-123',
        goals: ['Learn React', 'Build a portfolio'],
        timeAvailable: 10, // hours per week
        currentSkills: ['HTML', 'CSS', 'Basic JavaScript'],
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };
      
      const plan = await aiService.generateStudyPlanSuggestions(planRequest);
      
      expect(plan).toEqual(
        expect.objectContaining({
          recommendedPath: expect.any(Array),
          weeklySchedule: expect.any(Object),
          milestones: expect.any(Array),
          estimatedCompletion: expect.any(Date),
          alternatives: expect.any(Array)
        })
      );
    });
  });

  /**
   * 模型训练和优化测试
   */
  describe('Model Training and Optimization', () => {
    it('应该训练推荐模型', async () => {
      const trainingData = {
        userInteractions: [
          { userId: 'user-1', contentId: 'course-1', rating: 5 },
          { userId: 'user-1', contentId: 'course-2', rating: 3 }
        ],
        contentFeatures: {
          'course-1': { difficulty: 'beginner', tags: ['javascript'] },
          'course-2': { difficulty: 'advanced', tags: ['react'] }
        }
      };
      
      const trainingResult = await aiService.trainRecommendationModel(trainingData);
      
      expect(trainingResult).toEqual(
        expect.objectContaining({
          modelId: expect.any(String),
          accuracy: expect.any(Number),
          loss: expect.any(Number),
          epochs: expect.any(Number),
          trainingTime: expect.any(Number)
        })
      );
    });

    it('应该评估模型性能', async () => {
      const modelId = 'model-123';
      const testData = {
        inputs: [/* test inputs */],
        expectedOutputs: [/* expected outputs */]
      };
      
      const performance = await aiService.evaluateModelPerformance(modelId, testData);
      
      expect(performance).toEqual(
        expect.objectContaining({
          accuracy: expect.any(Number),
          precision: expect.any(Number),
          recall: expect.any(Number),
          f1Score: expect.any(Number),
          confusionMatrix: expect.any(Array)
        })
      );
    });

    it('应该优化模型超参数', async () => {
      const optimizationConfig = {
        modelType: 'recommendation',
        hyperparameters: {
          learningRate: [0.001, 0.01, 0.1],
          batchSize: [32, 64, 128],
          hiddenLayers: [2, 3, 4]
        },
        optimizationStrategy: 'grid_search'
      };
      
      const optimizedParams = await aiService.optimizeHyperparameters(optimizationConfig);
      
      expect(optimizedParams).toEqual(
        expect.objectContaining({
          bestParams: expect.any(Object),
          bestScore: expect.any(Number),
          searchResults: expect.any(Array)
        })
      );
    });
  });

  /**
   * 错误处理测试
   */
  describe('Error Handling', () => {
    it('应该处理API限流错误', async () => {
      mockAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      });
      
      const result = await aiService.generateRecommendations({
        userId: 'user-123',
        interests: ['javascript']
      });
      
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AI API rate limit exceeded, using fallback',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('应该处理无效输入', async () => {
      interface InvalidRecommendationInput {
        userId: string;
        interests: null;
      }
      
      const invalidInput: InvalidRecommendationInput = {
        userId: '', // 空字符串
        interests: null // null值
      };
      
      const result = await aiService.generateRecommendations(invalidInput as { userId: string; interests: string[] });
      
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid input for AI recommendation',
        expect.objectContaining({
          input: expect.any(Object)
        })
      );
    });

    it('应该处理模型不可用错误', async () => {
      mockAxios.post.mockRejectedValue(new Error('Model not available'));
      
      const result = await aiService.generateContent({
        topic: 'JavaScript',
        format: 'lesson'
      });
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'AI content generation failed',
        expect.objectContaining({
          error: 'Model not available'
        })
      );
    });

    it('应该处理超时错误', async () => {
      mockAxios.post.mockRejectedValue(new Error('timeout'));
      
      const result = await aiService.analyzeSentiment('test text');
      
      expect(result).toEqual({
        score: 0,
        label: 'neutral',
        confidence: 0
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AI sentiment analysis timeout, using default',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });

  /**
   * 性能测试
   */
  describe('Performance Tests', () => {
    it('应该高效处理批量推荐请求', async () => {
      const userProfiles = Array.from({ length: 50 }, (_, i) => ({
        userId: `user-${i}`,
        interests: ['javascript'],
        skillLevel: 'beginner'
      }));
      
      const startTime = Date.now();
      const results = await aiService.batchGenerateRecommendations(userProfiles);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(5000); // 5秒内完成50个推荐
      expect(results).toHaveLength(50);
      expect(mockAnalyticsService.histogram).toHaveBeenCalledWith(
        'ai.batch_recommendations.duration',
        executionTime
      );
    });

    it('应该有效利用缓存', async () => {
      const userProfile = {
        userId: 'user-123',
        interests: ['javascript']
      };
      
      // 第一次调用
      await aiService.generateRecommendations(userProfile);
      
      // 第二次调用应该使用缓存
      mockCacheService.get.mockResolvedValue([testRecommendation]);
      
      await aiService.generateRecommendations(userProfile);
      
      expect(mockAxios.post).toHaveBeenCalledTimes(1); // 只调用一次API
      expect(mockCacheService.get).toHaveBeenCalledTimes(2); // 两次都检查缓存
    });

    it('应该优化内存使用', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB文本
      
      const summary = await aiService.summarizeText(largeContent, { maxLength: 100 });
      
      expect(summary.summaryLength).toBeLessThanOrEqual(100);
      expect(summary.compressionRatio).toBeGreaterThan(100); // 压缩比大于100:1
    });
  });

  /**
   * 边界情况测试
   */
  describe('Edge Cases', () => {
    it('应该处理空文本输入', async () => {
      const result = await aiService.analyzeSentiment('');
      
      expect(result).toEqual({
        score: 0,
        label: 'neutral',
        confidence: 0
      });
    });

    it('应该处理非常长的文本', async () => {
      const longText = 'word '.repeat(10000); // 50KB文本
      
      const result = await aiService.summarizeText(longText);
      
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeLessThan(longText.length);
    });

    it('应该处理特殊字符', async () => {
      const specialText = '🚀 JavaScript is awesome! 💻 #coding @developer';
      
      const entities = await aiService.extractEntities(specialText);
      
      expect(entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: 'JavaScript',
            label: expect.any(String)
          })
        ])
      );
    });

    it('应该处理多语言文本', async () => {
      const multilingualText = 'Hello 你好 Bonjour こんにちは';
      
      const result = await aiService.detectLanguage(multilingualText);
      
      expect(result).toEqual(
        expect.objectContaining({
          primaryLanguage: expect.any(String),
          languages: expect.any(Array),
          confidence: expect.any(Number)
        })
      );
    });
  });
});