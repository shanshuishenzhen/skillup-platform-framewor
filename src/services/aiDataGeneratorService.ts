// /src/services/aiDataGeneratorService.ts

import OpenAI from 'openai';
import {
  ErrorType,
  ErrorSeverity,
  AppError,
  withRetry,
  createError,
  RetryConfig
} from '../utils/errorHandler';

/**
 * AI数据生成服务配置接口
 */
export interface AIDataGeneratorConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  model?: string;
}

/**
 * 虚拟课程数据接口
 */
export interface VirtualCourse {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    avatar: string;
    bio: string;
    rating: number;
  };
  price: number;
  originalPrice?: number;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  rating: number;
  studentsCount: number;
  lessonsCount: number;
  thumbnail: string;
  features: string[];
  curriculum: {
    title: string;
    duration: string;
    lessons: string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 虚拟用户数据接口
 */
export interface VirtualUser {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  bio: string;
  location: string;
  joinDate: string;
  coursesCompleted: number;
  totalStudyTime: number;
  achievements: string[];
  skills: string[];
  rating?: number;
  reviewsCount?: number;
}

/**
 * 虚拟新闻数据接口
 */
export interface VirtualNews {
  id: string;
  title: string;
  content: string;
  summary: string;
  author: {
    name: string;
    avatar: string;
    title: string;
  };
  publishedAt: string;
  category: string;
  tags: string[];
  thumbnail: string;
  readTime: number;
  views: number;
  likes: number;
  comments: number;
  featured: boolean;
  status: 'published' | 'draft' | 'archived';
}

/**
 * 虚拟培训项目数据接口
 */
export interface VirtualTraining {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'offline' | 'hybrid';
  duration: string;
  startDate: string;
  endDate: string;
  location?: string;
  instructor: {
    name: string;
    avatar: string;
    title: string;
    company: string;
  };
  price: number;
  capacity: number;
  enrolled: number;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  features: string[];
  requirements: string[];
  outcomes: string[];
  schedule: {
    date: string;
    time: string;
    topic: string;
  }[];
}

/**
 * 虚拟品牌数据接口
 */
export interface VirtualBrand {
  id: string;
  name: string;
  logo: string;
  description: string;
  industry: string;
  website: string;
  foundedYear: number;
  employees: string;
  location: string;
  partnership: {
    type: 'strategic' | 'technology' | 'training' | 'certification';
    since: string;
    description: string;
  };
  achievements: string[];
  services: string[];
}

/**
 * 虚拟委员会成员数据接口
 */
export interface VirtualCommitteeMember {
  id: string;
  name: string;
  avatar: string;
  title: string;
  company: string;
  role: string;
  bio: string;
  expertise: string[];
  experience: number;
  education: string[];
  achievements: string[];
  contact: {
    email: string;
    linkedin?: string;
    twitter?: string;
  };
}

/**
 * 虚拟活动数据接口
 */
export interface VirtualEvent {
  id: string;
  title: string;
  description: string;
  type: 'conference' | 'workshop' | 'seminar' | 'networking' | 'webinar';
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: {
    type: 'online' | 'offline' | 'hybrid';
    venue?: string;
    address?: string;
    city: string;
  };
  organizer: {
    name: string;
    logo: string;
    contact: string;
  };
  speakers: {
    name: string;
    avatar: string;
    title: string;
    company: string;
    topic: string;
  }[];
  agenda: {
    time: string;
    title: string;
    speaker?: string;
    duration: number;
  }[];
  price: number;
  capacity: number;
  registered: number;
  category: string;
  tags: string[];
  thumbnail: string;
  features: string[];
  requirements: string[];
}

/**
 * AI数据生成服务类
 * @class AIDataGeneratorService
 */
class AIDataGeneratorService {
  private openai: OpenAI | null = null;
  private config: AIDataGeneratorConfig;
  private isInitialized = false;
  private dataCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL,
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    };
  }

  /**
   * 初始化OpenAI客户端
   * @private
   */
  private initialize(): void {
    if (this.isInitialized) return;

    if (!this.config.apiKey) {
      console.warn('OpenAI API密钥未配置，将使用预设的虚拟数据');
      this.isInitialized = true;
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      });
      this.isInitialized = true;
    } catch (error) {
      console.warn('OpenAI客户端初始化失败，将使用预设的虚拟数据:', error);
      this.isInitialized = true;
    }
  }

  /**
   * 获取缓存数据
   * @private
   * @param key 缓存键
   * @returns 缓存的数据或null
   */
  private getCachedData<T>(key: string): T | null {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.dataCache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.dataCache.get(key) || null;
  }

  /**
   * 设置缓存数据
   * @private
   * @param key 缓存键
   * @param data 要缓存的数据
   */
  private setCachedData<T>(key: string, data: T): void {
    this.dataCache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  /**
   * 生成随机ID
   * @private
   * @returns 随机ID字符串
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * 生成随机日期
   * @private
   * @param daysAgo 多少天前（负数表示未来）
   * @returns ISO日期字符串
   */
  private generateRandomDate(daysAgo: number = 30): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date.toISOString();
  }

  /**
   * 生成图片URL
   * @private
   * @param prompt 图片描述
   * @param size 图片尺寸
   * @returns 图片URL
   */
  private generateImageUrl(prompt: string, size: string = 'square'): string {
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodedPrompt}&image_size=${size}`;
  }

  /**
   * 使用AI生成数据
   * @private
   * @param prompt AI提示词
   * @param fallbackData 降级数据
   * @returns 生成的数据
   */
  private async generateWithAI<T>(prompt: string, fallbackData: T): Promise<T> {
    if (!this.openai) {
      return fallbackData;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的虚拟数据生成助手。请生成真实感强、符合中文语境的虚拟数据。所有生成的内容都应该是虚拟的，不包含真实的个人或机构信息。请以JSON格式返回数据。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.8
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
          }
          return JSON.parse(content);
        } catch (parseError) {
          console.warn('AI响应解析失败，使用降级数据:', parseError);
        }
      }
    } catch (error) {
      console.warn('AI数据生成失败，使用降级数据:', error);
    }

    return fallbackData;
  }

  /**
   * 生成虚拟课程数据
   * @param count 生成数量
   * @param category 课程分类
   * @returns Promise<VirtualCourse[]> 虚拟课程数组
   */
  async generateCourses(count: number = 6, category?: string): Promise<VirtualCourse[]> {
    this.initialize();
    
    const cacheKey = `courses_${count}_${category || 'all'}`;
    const cached = this.getCachedData<VirtualCourse[]>(cacheKey);
    if (cached) return cached;

    const categories = ['前端开发', '后端开发', '数据科学', '人工智能', '产品设计', '项目管理', '数字营销', '云计算'];
    const levels = ['beginner', 'intermediate', 'advanced'] as const;
    
    const courses: VirtualCourse[] = [];
    
    for (let i = 0; i < count; i++) {
      const courseCategory = category || categories[Math.floor(Math.random() * categories.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      
      const fallbackCourse: VirtualCourse = {
        id: this.generateId(),
        title: `${courseCategory}实战训练营`,
        description: `深入学习${courseCategory}的核心技能，通过实际项目提升专业能力。`,
        instructor: {
          name: `${['张', '李', '王', '刘', '陈'][Math.floor(Math.random() * 5)]}${['明', '华', '强', '伟', '敏'][Math.floor(Math.random() * 5)]}`,
          avatar: this.generateImageUrl('professional instructor portrait', 'square'),
          bio: `资深${courseCategory}专家，拥有10年以上行业经验。`,
          rating: 4.5 + Math.random() * 0.5
        },
        price: Math.floor(Math.random() * 500) + 100,
        originalPrice: Math.floor(Math.random() * 200) + 600,
        duration: `${Math.floor(Math.random() * 8) + 4}周`,
        level,
        category: courseCategory,
        tags: [courseCategory, '实战', '项目'],
        rating: 4.0 + Math.random() * 1.0,
        studentsCount: Math.floor(Math.random() * 5000) + 100,
        lessonsCount: Math.floor(Math.random() * 30) + 10,
        thumbnail: this.generateImageUrl(`${courseCategory} course thumbnail`, 'landscape_16_9'),
        features: ['实战项目', '1对1指导', '就业推荐', '终身学习'],
        curriculum: [
          {
            title: '基础入门',
            duration: '2周',
            lessons: ['环境搭建', '基础概念', '核心原理']
          },
          {
            title: '进阶实践',
            duration: '4周',
            lessons: ['实战项目', '最佳实践', '性能优化']
          },
          {
            title: '高级应用',
            duration: '2周',
            lessons: ['架构设计', '团队协作', '项目部署']
          }
        ],
        createdAt: this.generateRandomDate(90),
        updatedAt: this.generateRandomDate(30)
      };

      if (this.openai) {
        const prompt = `生成一个关于"${courseCategory}"的在线课程信息，难度级别为"${level}"。
        
        要求：
        1. 课程标题要吸引人且专业
        2. 详细的课程描述
        3. 虚拟讲师信息（中文姓名、简介、评分）
        4. 合理的价格设置
        5. 课程大纲（3-5个模块，每个模块包含具体课程）
        6. 相关标签和特色
        7. 所有内容必须是虚拟的，不能包含真实信息
        
        请严格按照以下JSON格式返回：
        {
          "title": "课程标题",
          "description": "课程描述",
          "instructor": {
            "name": "讲师姓名",
            "bio": "讲师简介",
            "rating": 4.8
          },
          "price": 299,
          "originalPrice": 599,
          "duration": "8周",
          "tags": ["标签1", "标签2"],
          "features": ["特色1", "特色2"],
          "curriculum": [
            {
              "title": "模块标题",
              "duration": "2周",
              "lessons": ["课程1", "课程2"]
            }
          ]
        }`;
        
        const aiCourse = await this.generateWithAI(prompt, fallbackCourse);
        courses.push({
          ...fallbackCourse,
          ...aiCourse,
          id: fallbackCourse.id,
          level,
          category: courseCategory,
          instructor: {
            ...fallbackCourse.instructor,
            ...aiCourse.instructor,
            avatar: fallbackCourse.instructor.avatar
          },
          thumbnail: fallbackCourse.thumbnail,
          createdAt: fallbackCourse.createdAt,
          updatedAt: fallbackCourse.updatedAt
        });
      } else {
        courses.push(fallbackCourse);
      }
    }

    this.setCachedData(cacheKey, courses);
    return courses;
  }

  /**
   * 生成虚拟用户数据
   * @param count 生成数量
   * @param role 用户角色
   * @returns Promise<VirtualUser[]> 虚拟用户数组
   */
  async generateUsers(count: number = 10, role?: 'student' | 'instructor' | 'admin'): Promise<VirtualUser[]> {
    this.initialize();
    
    const cacheKey = `users_${count}_${role || 'all'}`;
    const cached = this.getCachedData<VirtualUser[]>(cacheKey);
    if (cached) return cached;

    const roles = ['student', 'instructor', 'admin'] as const;
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'];
    const skills = ['JavaScript', 'Python', 'React', 'Vue', 'Node.js', 'Java', 'Go', 'Docker', 'Kubernetes', 'AWS'];
    
    const users: VirtualUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const userRole = role || roles[Math.floor(Math.random() * roles.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      
      const fallbackUser: VirtualUser = {
        id: this.generateId(),
        name: `${['张', '李', '王', '刘', '陈', '杨', '赵', '黄'][Math.floor(Math.random() * 8)]}${['明', '华', '强', '伟', '敏', '丽', '娟', '芳'][Math.floor(Math.random() * 8)]}`,
        avatar: this.generateImageUrl('professional person portrait', 'square'),
        email: `user${i + 1}@example.com`,
        role: userRole,
        bio: userRole === 'instructor' ? '经验丰富的技术专家，致力于分享知识和培养人才。' : '热爱学习的技术爱好者，不断提升自己的专业技能。',
        location: city,
        joinDate: this.generateRandomDate(365),
        coursesCompleted: Math.floor(Math.random() * 20) + 1,
        totalStudyTime: Math.floor(Math.random() * 500) + 50,
        achievements: ['学习达人', '积极参与者'],
        skills: skills.slice(0, Math.floor(Math.random() * 5) + 2),
        rating: userRole === 'instructor' ? 4.0 + Math.random() * 1.0 : undefined,
        reviewsCount: userRole === 'instructor' ? Math.floor(Math.random() * 100) + 10 : undefined
      };

      users.push(fallbackUser);
    }

    this.setCachedData(cacheKey, users);
    return users;
  }

  /**
   * 生成虚拟新闻数据
   * @param count 生成数量
   * @param category 新闻分类
   * @returns Promise<VirtualNews[]> 虚拟新闻数组
   */
  async generateNews(count: number = 8, category?: string): Promise<VirtualNews[]> {
    this.initialize();
    
    const cacheKey = `news_${count}_${category || 'all'}`;
    const cached = this.getCachedData<VirtualNews[]>(cacheKey);
    if (cached) return cached;

    const categories = ['技术前沿', '行业动态', '教育资讯', '职场发展', '创业创新', '数字化转型'];
    
    const news: VirtualNews[] = [];
    
    for (let i = 0; i < count; i++) {
      const newsCategory = category || categories[Math.floor(Math.random() * categories.length)];
      
      const fallbackNews: VirtualNews = {
        id: this.generateId(),
        title: `${newsCategory}：最新发展趋势与机遇分析`,
        summary: `深入分析${newsCategory}领域的最新发展动态，为从业者提供有价值的洞察和建议。`,
        content: `本文将详细探讨${newsCategory}领域的最新发展趋势，分析当前市场机遇与挑战，为相关从业者提供专业的指导建议。`,
        author: {
          name: `${['张', '李', '王', '刘'][Math.floor(Math.random() * 4)]}${['编辑', '记者', '分析师'][Math.floor(Math.random() * 3)]}`,
          avatar: this.generateImageUrl('professional journalist portrait', 'square'),
          title: '资深编辑'
        },
        category: newsCategory,
        tags: [newsCategory, '趋势分析', '行业洞察'],
        thumbnail: this.generateImageUrl(`${newsCategory} news thumbnail`, 'landscape_16_9'),
        publishDate: this.generateRandomDate(30),
        readTime: Math.floor(Math.random() * 10) + 3,
        views: Math.floor(Math.random() * 10000) + 100,
        likes: Math.floor(Math.random() * 500) + 10,
        featured: Math.random() > 0.7
      };

      news.push(fallbackNews);
    }

    this.setCachedData(cacheKey, news);
    return news;
  }

  /**
   * 生成虚拟培训项目数据
   * @param count 生成数量
   * @param type 培训类型
   * @returns Promise<VirtualTraining[]> 虚拟培训项目数组
   */
  async generateTrainings(count: number = 6, type?: 'online' | 'offline' | 'hybrid'): Promise<VirtualTraining[]> {
    this.initialize();
    
    const cacheKey = `trainings_${count}_${type || 'all'}`;
    const cached = this.getCachedData<VirtualTraining[]>(cacheKey);
    if (cached) return cached;

    const types = ['online', 'offline', 'hybrid'] as const;
    const categories = ['技能提升', '管理培训', '技术认证', '职业发展', '团队建设', '创新思维'];
    const levels = ['beginner', 'intermediate', 'advanced'] as const;
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都'];
    
    const trainings: VirtualTraining[] = [];
    
    for (let i = 0; i < count; i++) {
      const trainingType = type || types[Math.floor(Math.random() * types.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60) + 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 1);
      
      const fallbackTraining: VirtualTraining = {
        id: this.generateId(),
        title: `${category}专业培训班`,
        description: `专业的${category}培训课程，帮助学员快速提升相关技能和能力。`,
        type: trainingType,
        duration: `${Math.floor(Math.random() * 5) + 1}天`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        location: trainingType !== 'online' ? `${city}市培训中心` : undefined,
        instructor: {
          name: `${['张', '李', '王', '刘', '陈'][Math.floor(Math.random() * 5)]}${['老师', '专家', '导师'][Math.floor(Math.random() * 3)]}`,
          avatar: this.generateImageUrl('professional trainer portrait', 'square'),
          title: '资深培训师',
          company: '专业培训机构'
        },
        price: Math.floor(Math.random() * 3000) + 500,
        capacity: Math.floor(Math.random() * 50) + 20,
        enrolled: Math.floor(Math.random() * 30) + 5,
        category,
        level,
        features: ['专业认证', '实战演练', '小班教学', '课后辅导'],
        requirements: ['相关工作经验', '基础理论知识'],
        outcomes: ['技能提升', '获得认证', '职业发展'],
        schedule: [
          {
            date: startDate.toISOString().split('T')[0],
            time: '09:00-17:00',
            topic: '基础理论与实践'
          },
          {
            date: endDate.toISOString().split('T')[0],
            time: '09:00-17:00',
            topic: '综合应用与考核'
          }
        ]
      };

      trainings.push(fallbackTraining);
    }

    this.setCachedData(cacheKey, trainings);
    return trainings;
  }

  /**
   * 生成虚拟品牌数据
   * @param count 生成数量
   * @param industry 行业类型
   * @returns Promise<VirtualBrand[]> 虚拟品牌数组
   */
  async generateBrands(count: number = 8, industry?: string): Promise<VirtualBrand[]> {
    this.initialize();
    
    const cacheKey = `brands_${count}_${industry || 'all'}`;
    const cached = this.getCachedData<VirtualBrand[]>(cacheKey);
    if (cached) return cached;

    const industries = ['科技', '教育', '金融', '医疗', '制造', '零售', '咨询', '媒体'];
    const partnershipTypes = ['strategic', 'technology', 'training', 'certification'] as const;
    const employeeRanges = ['50-100人', '100-500人', '500-1000人', '1000-5000人', '5000+人'];
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安'];
    
    const brands: VirtualBrand[] = [];
    
    for (let i = 0; i < count; i++) {
      const brandIndustry = industry || industries[Math.floor(Math.random() * industries.length)];
      const partnershipType = partnershipTypes[Math.floor(Math.random() * partnershipTypes.length)];
      const employees = employeeRanges[Math.floor(Math.random() * employeeRanges.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      
      const fallbackBrand: VirtualBrand = {
        id: this.generateId(),
        name: `${brandIndustry}创新科技有限公司`,
        logo: this.generateImageUrl(`${brandIndustry} company logo`, 'square'),
        description: `专注于${brandIndustry}领域的创新解决方案提供商，致力于推动行业数字化转型。`,
        industry: brandIndustry,
        website: 'https://www.example.com',
        foundedYear: 2010 + Math.floor(Math.random() * 14),
        employees,
        location: city,
        partnership: {
          type: partnershipType,
          since: `${2018 + Math.floor(Math.random() * 6)}年`,
          description: '长期战略合作伙伴，共同推进人才培养和技术创新。'
        },
        achievements: ['行业领先企业', '技术创新奖', '最佳雇主奖'],
        services: ['技术咨询', '解决方案', '培训服务', '技术支持']
      };

      brands.push(fallbackBrand);
    }

    this.setCachedData(cacheKey, brands);
    return brands;
  }

  /**
   * 生成虚拟委员会成员数据
   * @param count 生成数量
   * @returns Promise<VirtualCommitteeMember[]> 虚拟委员会成员数组
   */
  async generateCommitteeMembers(count: number = 12): Promise<VirtualCommitteeMember[]> {
    this.initialize();
    
    const cacheKey = `committee_members_${count}`;
    const cached = this.getCachedData<VirtualCommitteeMember[]>(cacheKey);
    if (cached) return cached;

    const titles = ['首席技术官', '技术总监', '产品总监', '研发总监', '架构师', '高级工程师'];
    const companies = ['科技创新公司', '数字化解决方案', '智能科技集团', '云计算服务商', '人工智能公司'];
    const roles = ['技术委员', '产品委员', '教育委员', '标准委员', '创新委员'];
    const expertise = ['人工智能', '云计算', '大数据', '区块链', '物联网', '网络安全', '移动开发', '前端技术'];
    const education = ['计算机科学硕士', '软件工程博士', '信息技术学士', '数据科学硕士'];
    
    const members: VirtualCommitteeMember[] = [];
    
    for (let i = 0; i < count; i++) {
      const title = titles[Math.floor(Math.random() * titles.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      const role = roles[Math.floor(Math.random() * roles.length)];
      const memberExpertise = expertise.slice(0, Math.floor(Math.random() * 3) + 2);
      const memberEducation = education.slice(0, Math.floor(Math.random() * 2) + 1);
      
      const fallbackMember: VirtualCommitteeMember = {
        id: this.generateId(),
        name: `${['张', '李', '王', '刘', '陈', '杨', '赵', '黄'][Math.floor(Math.random() * 8)]}${['明', '华', '强', '伟', '敏', '丽', '娟', '芳'][Math.floor(Math.random() * 8)]}`,
        avatar: this.generateImageUrl('professional executive portrait', 'square'),
        title,
        company,
        role,
        bio: `拥有丰富的技术管理经验，在${memberExpertise[0]}领域有深入研究和实践。`,
        expertise: memberExpertise,
        experience: Math.floor(Math.random() * 15) + 5,
        education: memberEducation,
        achievements: ['技术创新奖', '行业领袖奖', '优秀管理者'],
        contact: {
          email: `member${i + 1}@example.com`,
          linkedin: `https://linkedin.com/in/member${i + 1}`,
          twitter: `@member${i + 1}`
        }
      };

      members.push(fallbackMember);
    }

    this.setCachedData(cacheKey, members);
    return members;
  }

  /**
   * 生成虚拟活动数据
   * @param count 生成数量
   * @param type 活动类型
   * @returns Promise<VirtualEvent[]> 虚拟活动数组
   */
  async generateEvents(count: number = 6, type?: 'conference' | 'workshop' | 'seminar' | 'networking' | 'webinar'): Promise<VirtualEvent[]> {
    this.initialize();
    
    const cacheKey = `events_${count}_${type || 'all'}`;
    const cached = this.getCachedData<VirtualEvent[]>(cacheKey);
    if (cached) return cached;

    const types = ['conference', 'workshop', 'seminar', 'networking', 'webinar'] as const;
    const categories = ['技术大会', '产品发布', '行业峰会', '创新论坛', '培训研讨', '网络交流'];
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都'];
    const venues = ['国际会议中心', '科技园会议厅', '创新中心', '大学礼堂', '酒店会议室'];
    
    const events: VirtualEvent[] = [];
    
    for (let i = 0; i < count; i++) {
      const eventType = type || types[Math.floor(Math.random() * types.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const venue = venues[Math.floor(Math.random() * venues.length)];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90) + 7);
      const endDate = new Date(startDate);
      if (eventType === 'conference') {
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1);
      }
      
      const fallbackEvent: VirtualEvent = {
        id: this.generateId(),
        title: `2024年${category}`,
        description: `汇聚行业精英，分享最新技术趋势和实践经验的专业${category}。`,
        type: eventType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        location: {
          type: eventType === 'webinar' ? 'online' : Math.random() > 0.3 ? 'offline' : 'hybrid',
          venue: eventType !== 'webinar' ? venue : undefined,
          address: eventType !== 'webinar' ? `${city}市科技园区` : undefined,
          city
        },
        organizer: {
          name: '专业会议组织',
          logo: this.generateImageUrl('conference organizer logo', 'square'),
          contact: 'contact@example.com'
        },
        speakers: [
          {
            name: `${['张', '李', '王'][Math.floor(Math.random() * 3)]}${['专家', '博士', '总监'][Math.floor(Math.random() * 3)]}`,
            avatar: this.generateImageUrl('professional speaker portrait', 'square'),
            title: '技术专家',
            company: '知名科技公司',
            topic: '技术创新与发展趋势'
          }
        ],
        agenda: [
          {
            time: '09:00',
            title: '开幕致辞',
            duration: 30
          },
          {
            time: '09:30',
            title: '主题演讲',
            speaker: '行业专家',
            duration: 60
          },
          {
            time: '10:30',
            title: '技术分享',
            speaker: '技术总监',
            duration: 90
          }
        ],
        price: eventType === 'webinar' ? 0 : Math.floor(Math.random() * 500) + 100,
        capacity: Math.floor(Math.random() * 500) + 100,
        registered: Math.floor(Math.random() * 200) + 50,
        category,
        tags: [category, '技术', '交流', '学习'],
        thumbnail: this.generateImageUrl(`${category} event banner`, 'landscape_16_9'),
        features: ['专家演讲', '技术分享', '网络交流', '资料下载'],
        requirements: ['相关行业背景', '基础技术知识']
      };

      events.push(fallbackEvent);
    }

    this.setCachedData(cacheKey, events);
    return events;
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.dataCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * 检查服务状态
   * @returns Promise<boolean> 服务是否可用
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      this.initialize();
      return this.isInitialized;
    } catch (error) {
      console.error('AI数据生成服务健康检查失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const aiDataGeneratorService = new AIDataGeneratorService();

// 导出服务实例和类型
export { aiDataGeneratorService, AIDataGeneratorService };
export type {
  VirtualCourse,
  VirtualUser,
  VirtualNews,
  VirtualTraining,
  VirtualBrand,
  VirtualCommitteeMember,
  VirtualEvent,
  AIDataGeneratorConfig
};