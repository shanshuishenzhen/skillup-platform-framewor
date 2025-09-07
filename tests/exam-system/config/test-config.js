/**
 * 在线考试管理系统测试配置文件
 * 包含测试环境配置、API端点、测试数据等
 */

module.exports = {
  // 测试环境配置
  environment: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retryAttempts: 3
  },

  // API端点配置
  endpoints: {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh'
    },
    admin: {
      dashboard: '/api/admin/dashboard',
      users: '/api/admin/users',
      exams: '/api/admin/exams',
      statistics: '/api/admin/statistics'
    },
    exams: {
      list: '/api/exams',
      create: '/api/exams',
      detail: '/api/exams',
      submit: '/api/exams/submit',
      results: '/api/exams/results'
    },
    students: {
      profile: '/api/students/profile',
      exams: '/api/students/exams',
      results: '/api/students/results'
    }
  },

  // 测试用户数据
  testUsers: {
    admin: {
      phone: '13823738278',
      password: '123456',
      role: 'admin'
    },
    student1: {
      phone: '13800138001',
      password: 'student123',
      name: '测试学生1',
      role: 'student'
    },
    student2: {
      phone: '13800138002',
      password: 'student123',
      name: '测试学生2',
      role: 'student'
    }
  },

  // 测试考试数据
  testExams: {
    exam1: {
      title: '测试考试1 - 基础知识',
      description: '这是一个用于测试的基础知识考试',
      duration: 60, // 分钟
      totalScore: 100,
      questions: [
        {
          type: 'single',
          question: '以下哪个是JavaScript的数据类型？',
          options: ['String', 'Integer', 'Float', 'Character'],
          correctAnswer: 0,
          score: 25
        },
        {
          type: 'multiple',
          question: '以下哪些是前端框架？',
          options: ['React', 'Vue', 'Angular', 'Express'],
          correctAnswers: [0, 1, 2],
          score: 25
        },
        {
          type: 'judge',
          question: 'HTML是一种编程语言',
          correctAnswer: false,
          score: 25
        },
        {
          type: 'essay',
          question: '请简述MVC架构模式的优点',
          score: 25
        }
      ]
    }
  },

  // 测试报告配置
  reporting: {
    outputDir: './test-reports',
    formats: ['json', 'html'],
    includeScreenshots: true,
    detailedLogs: true
  },

  // 数据库配置（用于测试数据清理）
  database: {
    cleanup: {
      enabled: true,
      preserveAdminData: true,
      testDataPrefix: 'test_'
    }
  }
};