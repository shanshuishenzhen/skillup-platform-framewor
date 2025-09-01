/**
 * Excel模板生成工具
 * 统一管理各种数据导入的Excel模板
 */

export interface ExcelColumn {
  key: string;
  title: string;
  width?: number;
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'email' | 'phone' | 'select';
  options?: string[]; // 用于下拉选择
  example?: string;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ExcelTemplate {
  name: string;
  filename: string;
  description: string;
  version: string;
  columns: ExcelColumn[];
  sampleData?: Record<string, any>[];
  instructions?: string[];
  notes?: string[];
}

/**
 * 用户导入模板
 */
export const USER_IMPORT_TEMPLATE: ExcelTemplate = {
  name: '用户批量导入模板',
  filename: 'user_import_template.xlsx',
  description: '用于批量导入用户信息的Excel模板',
  version: '1.0',
  columns: [
    {
      key: 'employee_id',
      title: '工号',
      width: 15,
      required: true,
      type: 'text',
      example: 'EMP001',
      description: '员工唯一标识，不能重复',
      validation: {
        pattern: '^[A-Z]{3}[0-9]{3,6}$',
        message: '格式：3个大写字母+3-6位数字，如EMP001'
      }
    },
    {
      key: 'name',
      title: '姓名',
      width: 12,
      required: true,
      type: 'text',
      example: '张三',
      description: '用户真实姓名',
      validation: {
        min: 2,
        max: 20,
        message: '姓名长度2-20个字符'
      }
    },
    {
      key: 'email',
      title: '邮箱',
      width: 25,
      required: true,
      type: 'email',
      example: 'zhangsan@company.com',
      description: '用户邮箱地址，用于登录',
      validation: {
        pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
        message: '请输入有效的邮箱地址'
      }
    },
    {
      key: 'phone',
      title: '手机号',
      width: 15,
      required: false,
      type: 'phone',
      example: '13800138000',
      description: '11位手机号码',
      validation: {
        pattern: '^1[3-9]\\d{9}$',
        message: '请输入有效的11位手机号'
      }
    },
    {
      key: 'department',
      title: '部门',
      width: 15,
      required: false,
      type: 'text',
      example: '技术部',
      description: '所属部门名称'
    },
    {
      key: 'position',
      title: '职位',
      width: 15,
      required: false,
      type: 'text',
      example: '软件工程师',
      description: '职位名称'
    },
    {
      key: 'role',
      title: '角色',
      width: 12,
      required: true,
      type: 'select',
      options: ['student', 'teacher', 'admin'],
      example: 'student',
      description: '用户角色：student(学员)、teacher(教师)、admin(管理员)'
    },
    {
      key: 'learning_level',
      title: '学习等级',
      width: 12,
      required: false,
      type: 'select',
      options: ['beginner', 'intermediate', 'advanced', 'expert'],
      example: 'intermediate',
      description: '学习等级：beginner(初级)、intermediate(中级)、advanced(高级)、expert(专家)'
    },
    {
      key: 'status',
      title: '状态',
      width: 10,
      required: false,
      type: 'select',
      options: ['active', 'inactive'],
      example: 'active',
      description: '账户状态：active(激活)、inactive(未激活)'
    }
  ],
  sampleData: [
    {
      employee_id: 'EMP001',
      name: '张三',
      email: 'zhangsan@company.com',
      phone: '13800138001',
      department: '技术部',
      position: '软件工程师',
      role: 'student',
      learning_level: 'intermediate',
      status: 'active'
    },
    {
      employee_id: 'EMP002',
      name: '李四',
      email: 'lisi@company.com',
      phone: '13800138002',
      department: '产品部',
      position: '产品经理',
      role: 'teacher',
      learning_level: 'advanced',
      status: 'active'
    },
    {
      employee_id: 'EMP003',
      name: '王五',
      email: 'wangwu@company.com',
      phone: '13800138003',
      department: '人事部',
      position: '人事专员',
      role: 'admin',
      learning_level: 'beginner',
      status: 'active'
    }
  ],
  instructions: [
    '1. 请严格按照模板格式填写数据，不要修改表头',
    '2. 红色标记的列为必填项，不能为空',
    '3. 工号必须唯一，不能重复',
    '4. 邮箱地址将作为登录账号，请确保准确性',
    '5. 角色和状态请从下拉列表中选择，不要手动输入',
    '6. 导入前请删除示例数据行',
    '7. 单次导入建议不超过1000条记录'
  ],
  notes: [
    '• 模板版本：v1.0',
    '• 支持格式：.xlsx',
    '• 最大行数：10000行',
    '• 如有问题请联系系统管理员'
  ]
};

/**
 * 考试导入模板
 */
export const EXAM_IMPORT_TEMPLATE: ExcelTemplate = {
  name: '考试批量导入模板',
  filename: 'exam_import_template.xlsx',
  description: '用于批量导入考试信息的Excel模板',
  version: '1.0',
  columns: [
    {
      key: 'exam_id',
      title: '考试ID',
      width: 15,
      required: true,
      type: 'text',
      example: 'EXAM001',
      description: '考试唯一标识'
    },
    {
      key: 'title',
      title: '考试标题',
      width: 25,
      required: true,
      type: 'text',
      example: 'JavaScript基础测试',
      description: '考试名称'
    },
    {
      key: 'category',
      title: '考试类别',
      width: 15,
      required: true,
      type: 'select',
      options: ['前端开发', '后端开发', '数据科学', 'UI/UX设计', '项目管理'],
      example: '前端开发',
      description: '考试所属类别'
    },
    {
      key: 'difficulty',
      title: '难度等级',
      width: 12,
      required: true,
      type: 'select',
      options: ['beginner', 'intermediate', 'advanced'],
      example: 'intermediate',
      description: '考试难度：beginner(初级)、intermediate(中级)、advanced(高级)'
    },
    {
      key: 'duration',
      title: '考试时长(分钟)',
      width: 15,
      required: true,
      type: 'number',
      example: '120',
      description: '考试时长，单位：分钟',
      validation: {
        min: 10,
        max: 480,
        message: '考试时长范围：10-480分钟'
      }
    },
    {
      key: 'total_score',
      title: '总分',
      width: 10,
      required: true,
      type: 'number',
      example: '100',
      description: '考试总分',
      validation: {
        min: 10,
        max: 1000,
        message: '总分范围：10-1000分'
      }
    },
    {
      key: 'passing_score',
      title: '及格分',
      width: 10,
      required: true,
      type: 'number',
      example: '60',
      description: '及格分数线',
      validation: {
        min: 1,
        message: '及格分不能小于1分'
      }
    },
    {
      key: 'description',
      title: '考试描述',
      width: 30,
      required: false,
      type: 'text',
      example: '测试JavaScript基础知识掌握情况',
      description: '考试详细描述'
    }
  ],
  sampleData: [
    {
      exam_id: 'EXAM001',
      title: 'JavaScript基础测试',
      category: '前端开发',
      difficulty: 'intermediate',
      duration: 120,
      total_score: 100,
      passing_score: 60,
      description: '测试JavaScript基础语法和常用API'
    },
    {
      exam_id: 'EXAM002',
      title: 'React高级开发',
      category: '前端开发',
      difficulty: 'advanced',
      duration: 150,
      total_score: 120,
      passing_score: 72,
      description: '测试React高级特性和最佳实践'
    }
  ],
  instructions: [
    '1. 考试ID必须唯一，建议使用EXAM+数字格式',
    '2. 及格分不能大于总分',
    '3. 考试时长建议根据题目数量合理设置',
    '4. 难度等级请从下拉列表选择',
    '5. 导入后需要单独添加考试题目'
  ]
};

/**
 * 试卷导入模板
 */
export const EXAM_PAPER_IMPORT_TEMPLATE: ExcelTemplate = {
  name: '试卷批量导入模板',
  filename: 'exam_paper_import_template.xlsx',
  description: '用于批量导入试卷题目和题型分布的Excel模板',
  version: '1.0',
  columns: [
    // 题型分布工作表字段
    {
      key: 'question_type',
      title: '题型',
      width: 15,
      required: true,
      type: 'select',
      options: ['单选题', '多选题', '判断题', '填空题', '简答题', '论述题'],
      example: '单选题',
      description: '题目类型'
    },
    {
      key: 'question_count',
      title: '题目数量',
      width: 12,
      required: true,
      type: 'number',
      example: '10',
      description: '该题型的题目数量',
      validation: {
        min: 1,
        max: 100,
        message: '题目数量范围：1-100题'
      }
    },
    {
      key: 'points_per_question',
      title: '每题分值',
      width: 12,
      required: true,
      type: 'number',
      example: '5',
      description: '该题型每题的分值',
      validation: {
        min: 0.5,
        max: 50,
        message: '分值范围：0.5-50分'
      }
    }
  ],
  sampleData: [
    {
      question_type: '单选题',
      question_count: 10,
      points_per_question: 5
    },
    {
      question_type: '多选题',
      question_count: 5,
      points_per_question: 8
    },
    {
      question_type: '判断题',
      question_count: 5,
      points_per_question: 2
    }
  ],
  instructions: [
    '1. 本模板包含两个工作表："题型分布"和"试卷题目"',
    '2. "题型分布"工作表定义各题型的数量和分值',
    '3. "试卷题目"工作表包含具体的题目内容',
    '4. 题型分布中的题目数量必须与试卷题目中的实际数量一致',
    '5. 选择题必须提供选项A、B、C、D',
    '6. 正确答案格式：单选题填写选项字母(如A)，多选题用逗号分隔(如A,C)',
    '7. 导入前请删除示例数据'
  ],
  notes: [
    '• 支持题型：单选题、多选题、判断题、填空题、简答题、论述题',
    '• 单次导入建议不超过200道题目',
    '• 题目内容支持富文本格式',
    '• 如有问题请联系系统管理员'
  ]
};

/**
 * 学习资源导入模板
 */
export const RESOURCE_IMPORT_TEMPLATE: ExcelTemplate = {
  name: '学习资源批量导入模板',
  filename: 'resource_import_template.xlsx',
  description: '用于批量导入学习资源信息的Excel模板',
  version: '1.0',
  columns: [
    {
      key: 'resource_id',
      title: '资源ID',
      width: 15,
      required: true,
      type: 'text',
      example: 'RES001',
      description: '资源唯一标识'
    },
    {
      key: 'title',
      title: '资源标题',
      width: 25,
      required: true,
      type: 'text',
      example: 'JavaScript入门教程',
      description: '资源名称'
    },
    {
      key: 'type',
      title: '资源类型',
      width: 12,
      required: true,
      type: 'select',
      options: ['video', 'document', 'audio', 'image', 'link'],
      example: 'video',
      description: '资源类型：video(视频)、document(文档)、audio(音频)、image(图片)、link(链接)'
    },
    {
      key: 'category',
      title: '分类',
      width: 15,
      required: true,
      type: 'text',
      example: '前端开发',
      description: '资源分类'
    },
    {
      key: 'file_path',
      title: '文件路径',
      width: 30,
      required: true,
      type: 'text',
      example: '/uploads/videos/js-tutorial.mp4',
      description: '文件存储路径或URL'
    },
    {
      key: 'description',
      title: '描述',
      width: 30,
      required: false,
      type: 'text',
      example: '适合初学者的JavaScript基础教程',
      description: '资源详细描述'
    },
    {
      key: 'tags',
      title: '标签',
      width: 20,
      required: false,
      type: 'text',
      example: 'JavaScript,基础,教程',
      description: '资源标签，用逗号分隔'
    }
  ],
  instructions: [
    '1. 资源ID必须唯一',
    '2. 文件路径必须是有效的服务器路径或URL',
    '3. 标签用英文逗号分隔',
    '4. 导入前请确保文件已上传到服务器'
  ]
};

/**
 * 获取所有可用的模板
 */
export const getAllTemplates = (): ExcelTemplate[] => {
  return [
    USER_IMPORT_TEMPLATE,
    EXAM_IMPORT_TEMPLATE,
    EXAM_PAPER_IMPORT_TEMPLATE,
    RESOURCE_IMPORT_TEMPLATE
  ];
};

/**
 * 根据类型获取模板
 */
export const getTemplateByType = (type: string): ExcelTemplate | null => {
  const templates = {
    'users': USER_IMPORT_TEMPLATE,
    'exams': EXAM_IMPORT_TEMPLATE,
    'exam-papers': EXAM_PAPER_IMPORT_TEMPLATE,
    'resources': RESOURCE_IMPORT_TEMPLATE
  };
  
  return templates[type as keyof typeof templates] || null;
};

/**
 * 生成试卷导入Excel数据结构
 */
export const generateExamPaperExcelData = () => {
  return {
    filename: 'exam_paper_template.xlsx',
    sheets: [
      {
        name: '题型分布',
        headers: ['题型', '题目数量', '每题分值'],
        data: [
          ['单选题', 10, 5],
          ['多选题', 5, 8],
          ['判断题', 5, 2]
        ],
        columnWidths: [15, 12, 12]
      },
      {
        name: '试卷题目',
        headers: ['题目序号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '解析', '难度', '知识点'],
        data: [
          [1, '单选题', 'JavaScript中用于声明变量的关键字是？', 'var', 'let', 'const', '以上都是', 'D', 'var、let、const都可以用来声明变量', 'easy', 'JavaScript基础'],
          [2, '多选题', '以下哪些是JavaScript的数据类型？', 'string', 'number', 'boolean', 'object', 'A,B,C,D', 'JavaScript的基本数据类型包括这些', 'medium', 'JavaScript基础'],
          [3, '判断题', 'JavaScript是一种编译型语言。', '', '', '', '', 'false', 'JavaScript是解释型语言，不是编译型语言', 'easy', 'JavaScript基础']
        ],
        columnWidths: [10, 12, 30, 15, 15, 15, 15, 12, 30, 10, 15]
      },
      {
        name: '导入说明',
        headers: ['说明事项'],
        data: [
          ['1. 本模板包含两个工作表："题型分布"和"试卷题目"'],
          ['2. "题型分布"工作表定义各题型的数量和分值'],
          ['3. "试卷题目"工作表包含具体的题目内容'],
          ['4. 题型分布中的题目数量必须与试卷题目中的实际数量一致'],
          ['5. 选择题必须提供选项A、B、C、D'],
          ['6. 正确答案格式：单选题填写选项字母(如A)，多选题用逗号分隔(如A,C)'],
          ['7. 导入前请删除示例数据'],
          [''],
          ['注意事项:'],
          ['• 支持题型：单选题、多选题、判断题、填空题、简答题、论述题'],
          ['• 单次导入建议不超过200道题目'],
          ['• 题目内容支持富文本格式'],
          ['• 如有问题请联系系统管理员']
        ]
      }
    ]
  };
};

/**
 * 生成Excel数据结构
 */
export const generateExcelData = (template: ExcelTemplate) => {
  // 如果是试卷导入模板，使用专门的生成函数
  if (template === EXAM_PAPER_IMPORT_TEMPLATE) {
    return generateExamPaperExcelData();
  }
  
  return {
    filename: template.filename,
    sheets: [
      {
        name: '数据表',
        headers: template.columns.map(col => col.title),
        data: template.sampleData || [],
        columnWidths: template.columns.map(col => col.width || 15)
      },
      {
        name: '字段说明',
        headers: ['字段名', '是否必填', '数据类型', '示例', '说明'],
        data: template.columns.map(col => [
          col.title,
          col.required ? '是' : '否',
          col.type || 'text',
          col.example || '',
          col.description || ''
        ])
      },
      {
        name: '导入说明',
        headers: ['说明事项'],
        data: [
          ...template.instructions?.map(instruction => [instruction]) || [],
          [''],
          ['注意事项:'],
          ...template.notes?.map(note => [note]) || []
        ]
      }
    ]
  };
};
