// /src/services/aiService.js

/**
 * DeepSeek API 客户端实现
 * @class DeepSeekAPI
 */
class DeepSeekAPI {
  /**
   * 构造函数
   * @param {Object} config 配置对象
   * @param {string} config.apiKey API密钥
   * @param {string} [config.baseURL] 基础URL
   * @param {number} [config.timeout] 超时时间
   * @param {number} [config.maxRetries] 最大重试次数
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.deepseek.com';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  chat = {
    completions: {
      /**
       * 创建聊天完成
       * @param {Object} params 参数对象
       * @param {string} params.model 模型名称
       * @param {Array} params.messages 消息数组
       * @param {number} [params.temperature] 温度参数
       * @param {number} [params.max_tokens] 最大令牌数
       * @param {boolean} [params.stream] 是否流式输出
       * @returns {Promise<Object>} API响应
       */
      create: async (params) => {
        const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(params)
        });

        if (!response.ok) {
          throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      }
    }
  };
}
import {
  ErrorType,
  ErrorSeverity,
  AppError,
  withRetry,
  createError,
  RetryConfig
} from '../utils/errorHandler';

/**
 * AI服务配置对象结构
 * @typedef {Object} AIServiceConfig
 * @property {string} apiKey API密钥
 * @property {string} [baseURL] 基础URL
 * @property {number} [timeout] 超时时间
 * @property {number} [maxRetries] 最大重试次数
 * @property {string} [model] 模型名称
 */

/**
 * 课程数据对象结构
 * @typedef {Object} CourseData
 * @property {string} title 课程标题
 * @property {string} description 课程描述
 * @property {Object} instructor 讲师信息
 * @property {string} instructor.name 讲师姓名
 * @property {string} instructor.bio 讲师简介
 * @property {string[]} chapters 章节列表
 * @property {'beginner'|'intermediate'|'advanced'} difficulty 难度级别
 * @property {number} duration 预估学习时长（分钟）
 * @property {string[]} tags 标签列表
 */

/**
 * AI服务错误类（保持向后兼容）
 * @deprecated 请使用 AppError 和 ErrorType.AI_SERVICE_ERROR
 */
export class AIServiceError extends AppError {
  constructor(
    message,
    code,
    statusCode
  ) {
    super(ErrorType.AI_SERVICE_ERROR, message, {
      code,
      statusCode: statusCode || 500,
      severity: ErrorSeverity.HIGH,
      retryable: true
    });
    this.name = 'AIServiceError';
  }
}

/**
 * AI服务类 - 提供DeepSeek API集成功能
 * @class AIService
 */
class AIService {
  /**
   * 构造函数
   */
  constructor() {
    this.deepseek = null;
    this.isInitialized = false;
    this.config = {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL,
      timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '3')
    };
  }

  /**
   * 初始化DeepSeek客户端
   * @private
   * @throws {AIServiceError} 当API密钥未配置时抛出错误
   */
  initialize() {
    if (this.isInitialized) return;

    if (!this.config.apiKey) {
      throw new AIServiceError(
        'DeepSeek API密钥未配置，请在环境变量中设置DEEPSEEK_API_KEY',
        'MISSING_API_KEY'
      );
    }

    try {
      this.deepseek = new DeepSeekAPI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      });
      this.isInitialized = true;
    } catch (error) {
      throw new AIServiceError(
        `DeepSeek客户端初始化失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * 获取AI服务重试配置
   * @returns {Object} 重试配置
   */
  getRetryConfig() {
    return {
      maxAttempts: this.config.maxRetries || 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT_ERROR,
        ErrorType.RATE_LIMIT_ERROR,
        ErrorType.SERVICE_UNAVAILABLE,
        ErrorType.AI_SERVICE_ERROR
      ]
    };
  }

  /**
   * 格式化AI响应文本为结构化课程数据
   * @private
   * @param {string} rawText AI返回的原始文本
   * @param {string} industry 行业类型
   * @returns {CourseData} 格式化后的课程数据
   */
  formatCourseData(rawText, industry) {
    try {
      // 尝试解析JSON格式的响应
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const courseData = JSON.parse(jsonMatch[1]);
        return this.validateCourseData(courseData);
      }

      // 解析文本格式的响应
      const lines = rawText.trim().split('\n').filter(line => line.trim());
      const title = this.extractField(lines, ['标题', 'title', '课程名称']) || `${industry}专业课程`;
      const description = this.extractField(lines, ['描述', 'description', '课程描述']) || `一门关于${industry}的综合性课程`;
      const instructorName = this.extractField(lines, ['讲师', 'instructor', '讲师姓名']) || 'AI讲师';
      const instructorBio = this.extractField(lines, ['简介', 'bio', '讲师简介']) || '经验丰富的专业讲师';
      const difficulty = this.extractField(lines, ['难度', 'difficulty', '课程难度']) || 'intermediate';
      const duration = this.extractField(lines, ['时长', 'duration', '课程时长']) || '8周';

      // 提取章节
      const chapters = lines
        .filter(line => /^\d+[.、]/.test(line.trim()))
        .map(line => line.replace(/^\d+[.、]\s*/, '').trim())
        .filter(chapter => chapter.length > 0);

      // 提取标签
      const tagsLine = this.extractField(lines, ['标签', 'tags', '关键词']);
      const tags = tagsLine ? tagsLine.split(/[,，、]/).map(tag => tag.trim()).filter(tag => tag) : [industry];

      return this.validateCourseData({
        title,
        description,
        instructor: {
          name: instructorName,
          bio: instructorBio
        },
        chapters: chapters.length > 0 ? chapters : [`${industry}基础概念`, `${industry}实践应用`, `${industry}高级技巧`],
        difficulty,
        duration,
        tags
      });
    } catch (error) {
      console.warn('解析AI响应失败，使用默认格式:', error);
      return this.getDefaultCourseData(industry);
    }
  }

  /**
   * 提取字段值的辅助方法
   * @private
   * @param {string[]} lines - 文本行数组
   * @param {string[]} fieldNames - 字段名称数组
   * @returns {string|null} 提取的字段值
   */
  extractField(lines, fieldNames) {
    for (const fieldName of fieldNames) {
      const line = lines.find(line => 
        line.toLowerCase().includes(fieldName.toLowerCase()) && 
        (line.includes('：') || line.includes(':'))
      );
      if (line) {
        const value = line.split(/[：:]/)[1]?.trim();
        if (value) return value;
      }
    }
    return null;
  }

  /**
   * 验证课程数据的完整性
   * @private
   * @param {Object} data 待验证的课程数据
   * @returns {CourseData} 验证后的课程数据
   */
  validateCourseData(data) {
    // 解析 duration 字段，支持字符串转数字
    let duration = 480; // 默认8小时（480分钟）
    if (typeof data.duration === 'number') {
      duration = data.duration;
    } else if (typeof data.duration === 'string') {
      // 尝试从字符串中提取数字（如 "8周" -> 480分钟，"2小时" -> 120分钟）
      const weekMatch = data.duration.match(/(\d+)周/);
      const hourMatch = data.duration.match(/(\d+)小时/);
      const minuteMatch = data.duration.match(/(\d+)分钟/);
      
      if (weekMatch) {
        duration = parseInt(weekMatch[1]) * 60; // 每周按60分钟计算
      } else if (hourMatch) {
        duration = parseInt(hourMatch[1]) * 60;
      } else if (minuteMatch) {
        duration = parseInt(minuteMatch[1]);
      }
    }

    return {
      title: data.title || '未命名课程',
      description: data.description || '课程描述',
      instructor: {
        name: data.instructor?.name || 'AI讲师',
        bio: data.instructor?.bio || '经验丰富的专业讲师'
      },
      chapters: Array.isArray(data.chapters) ? data.chapters : ['基础概念', '实践应用', '高级技巧'],
      difficulty: ['beginner', 'intermediate', 'advanced'].includes(data.difficulty) ? data.difficulty : 'intermediate',
      duration,
      tags: Array.isArray(data.tags) ? data.tags : []
    };
  }

  /**
   * 获取默认课程数据
   * @private
   * @param {string} industry 行业类型
   * @returns {CourseData} 默认课程数据
   */
  getDefaultCourseData(industry) {
    return {
      title: `${industry}专业课程`,
      description: `一门关于${industry}的综合性课程，涵盖基础理论和实践应用。`,
      instructor: {
        name: 'AI讲师',
        bio: '经验丰富的专业讲师，致力于提供高质量的教学内容。'
      },
      chapters: [
        `${industry}基础概念与原理`,
        `${industry}实践应用与案例`,
        `${industry}高级技巧与发展趋势`
      ],
      difficulty: 'intermediate',
      duration: 480, // 8小时（480分钟）
      tags: [industry, '专业课程', '实践应用']
    };
  }

  /**
   * 生成课程内容
   * @param {string} industry 行业类型
   * @param {'beginner'|'intermediate'|'advanced'} [difficulty='intermediate'] 课程难度
   * @param {string} [customRequirements] 自定义要求
   * @returns {Promise<CourseData>} 生成的课程数据
   * @throws {AIServiceError} 当生成失败时抛出错误
   */
  async generateCourse(
    industry, 
    difficulty = 'intermediate',
    customRequirements
  ) {
    this.initialize();

    if (!this.deepseek) {
      throw createError(
        ErrorType.AI_SERVICE_ERROR,
        'DeepSeek客户端未初始化',
        {
          code: 'CLIENT_NOT_INITIALIZED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH
        }
      );
    }

    const difficultyMap = {
      beginner: '初级',
      intermediate: '中级', 
      advanced: '高级'
    };

    const prompt = `请为${industry}行业生成一个${difficultyMap[difficulty]}课程。

要求：
1. 课程标题要具体且吸引人
2. 包含详细的课程描述
3. 设计5-8个章节，每个章节要有明确的学习目标
4. 提供讲师信息（姓名和简介）
5. 估算课程时长
6. 添加相关标签
${customRequirements ? `\n额外要求：${customRequirements}` : ''}

请以JSON格式返回，包含以下字段：
\`\`\`json
{
  "title": "课程标题",
  "description": "课程描述",
  "instructor": {
    "name": "讲师姓名",
    "bio": "讲师简介"
  },
  "chapters": ["章节1", "章节2", ...],
  "difficulty": "${difficulty}",
  "duration": "课程时长",
  "tags": ["标签1", "标签2", ...]
}
\`\`\``;

    return withRetry(async () => {
      const response = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的课程设计师，擅长为不同行业设计高质量的在线课程。请根据用户要求生成结构化的课程内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw createError(
          ErrorType.AI_SERVICE_ERROR,
          'AI响应为空',
          {
            code: 'EMPTY_RESPONSE',
            statusCode: 500,
            severity: ErrorSeverity.HIGH
          }
        );
      }

      return this.formatCourseData(content, industry);
    }, this.getRetryConfig());
  }

  /**
   * 优化课程内容
   * @param {CourseData} courseData 原始课程数据
   * @param {'engagement'|'clarity'|'structure'|'comprehensive'} [optimizationType='comprehensive'] 优化类型
   * @returns {Promise<CourseData>} 优化后的课程数据
   * @throws {AIServiceError} 当优化失败时抛出错误
   */
  async optimizeContent(
    courseData,
    optimizationType = 'comprehensive'
  ) {
    this.initialize();

    if (!this.deepseek) {
      throw createError(
        ErrorType.AI_SERVICE_ERROR,
        'DeepSeek客户端未初始化',
        {
          code: 'CLIENT_NOT_INITIALIZED',
          statusCode: 500,
          severity: ErrorSeverity.HIGH
        }
      );
    }

    const optimizationPrompts = {
      engagement: '提高课程的吸引力和互动性',
      clarity: '提高课程内容的清晰度和易理解性',
      structure: '优化课程结构和逻辑顺序',
      comprehensive: '全面优化课程内容、结构和表达方式'
    };

    const prompt = `请优化以下课程内容，重点${optimizationPrompts[optimizationType]}：

原始课程：
${JSON.stringify(courseData, null, 2)}

优化要求：
1. 保持课程的核心主题不变
2. ${optimizationPrompts[optimizationType]}
3. 确保内容的专业性和实用性
4. 优化章节标题和描述
5. 改进讲师介绍

请以相同的JSON格式返回优化后的课程内容。`;

    return withRetry(async () => {
      const response = await this.deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的课程优化专家，擅长改进课程内容的质量和效果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.5
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw createError(
          ErrorType.AI_SERVICE_ERROR,
          'AI响应为空',
          {
            code: 'EMPTY_RESPONSE',
            statusCode: 500,
            severity: ErrorSeverity.HIGH
          }
        );
      }

      return this.formatCourseData(content, courseData.tags?.[0] || '通用');
    }, this.getRetryConfig());
  }

  /**
   * 检查服务状态
   * @returns {Promise<boolean>} 服务是否可用
   */
  async checkServiceHealth() {
    try {
      this.initialize();
      return this.isInitialized && !!this.deepseek;
    } catch (error) {
      console.error('AI服务健康检查失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const aiService = new AIService();

/**
 * 生成课程内容（向后兼容的函数）
 * @param {string} industry 行业类型
 * @param {'beginner'|'intermediate'|'advanced'} [difficulty='intermediate'] 课程难度
 * @param {string} [customRequirements] 自定义要求
 * @returns {Promise<CourseData>} 生成的课程数据
 * @deprecated 请使用 aiService.generateCourse() 方法
 */
export async function generateFakeCourse(
  industry,
  difficulty = 'intermediate',
  customRequirements
) {
  try {
    return await aiService.generateCourse(industry, difficulty, customRequirements);
  } catch (error) {
    console.warn('AI课程生成失败，使用默认数据:', error);
    // 降级到默认数据
    return {
      title: `${industry}的数字化转型策略`,
      description: `一门关于${industry}数字化转型的综合性课程，涵盖核心技术、数据驱动决策和业务流程自动化。`,
      instructor: {
        name: '李明',
        bio: '超过10年经验的数字化转型专家，曾为多家企业提供数字化咨询服务。'
      },
      chapters: [
        '数字化核心技术概述',
        '数据驱动决策方法',
        '业务流程自动化实践',
        '数字化转型案例分析',
        '未来发展趋势展望'
      ],
      difficulty,
      duration: 480, // 8周课程，按每周1小时计算
      tags: [industry, '数字化转型', '企业管理']
    };
  }
}

// 导出AI服务实例
export { aiService, AIService };
