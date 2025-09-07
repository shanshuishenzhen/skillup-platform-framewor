/**
 * 全局字典映射表
 * 包含所有字段的中英文对照、枚举值映射等
 */

// 字段名称映射表（英文 -> 中文）
export const FIELD_DISPLAY_NAMES = {
  // 基本信息字段
  name: '姓名',
  full_name: '姓名', // 兼容性映射，统一使用name字段
  username: '用户名',
  email: '邮箱',
  phone: '手机号',
  id_card: '身份证号码',
  employee_id: '员工编号',
  department: '部门',
  position: '职位',
  organization: '组织机构',
  avatar_url: '头像',
  
  // 学习相关字段
  learning_level: '学习等级',
  learning_hours: '学习时长',
  learning_progress: '学习进度',
  
  // 学习进度详细字段映射
  user_id: '用户ID',
  course_id: '课程ID',
  lesson_id: '课时ID',
  current_time_seconds: '当前播放时间',
  progress_percentage: '完成百分比',
  is_completed: '是否已完成',
  last_updated_at: '最后更新时间',
  
  // 前端camelCase字段映射
  userId: '用户ID',
  courseId: '课程ID',
  lessonId: '课时ID',
  currentTime: '当前播放时间',
  progressPercentage: '完成百分比',
  isCompleted: '是否已完成',
  lastUpdatedAt: '最后更新时间',
  
  // 课程进度字段
  totalLessons: '总课时数',
  completedLessons: '已完成课时数',
  courseProgressPercentage: '课程完成百分比',
  totalWatchTime: '总学习时长',
  lastStudyTime: '最后学习时间',
  
  // 学习统计字段
  totalStudyTime: '总学习时长',
  completedCourses: '已完成课程数',
  inProgressCourses: '正在学习课程数',
  weeklyStudyTime: '本周学习时长',
  streakDays: '连续学习天数',
  
  // 考试相关字段
  exam_permissions: '考试权限',
  exam_history: '考试历史',
  certification_status: '认证状态',
  
  // 系统字段
  role: '角色',
  password: '密码',
  status: '状态',
  user_type: '用户类型',
  is_verified: '已验证',
  face_verified: '人脸验证',
  import_source: '导入来源',
  import_date: '导入日期',
  import_batch_id: '导入批次ID',
  sync_status: '同步状态',
  last_sync_time: '最后同步时间',
  password_hash: '密码哈希',
  created_at: '创建时间',
  updated_at: '更新时间',

  // 学习时间相关
  last_learning_time: '最后学习时间',
  certification_date: '认证日期',

  // 验证码相关字段
  smsCode: '短信验证码',
  verificationCode: '验证码',
  code: '验证码',

  // API字段兼容性映射已在上方定义

  // 项目相关字段
  project_id: '项目ID',
  project_name: '项目名称',
  project_status: '项目状态',
  project_priority: '项目优先级',

  // 任务相关字段
  task_id: '任务ID',
  task_name: '任务名称',
  task_status: '任务状态',
  assignee_id: '分配者ID',

  // 文件相关字段
  file_id: '文件ID',
  file_name: '文件名称',
  file_size: '文件大小',
  file_type: '文件类型',
  uploaded_by: '上传者',
  uploaded_at: '上传时间'
} as const;

// 中文字段名映射到英文字段名（包含带星号的必填字段）
export const CHINESE_TO_ENGLISH_FIELDS = {
  '姓名': 'name',
  '姓名*': 'name',
  '全名': 'name', // 兼容性映射
  '用户名': 'username',
  '用户名*': 'username',
  '邮箱': 'email',
  '电子邮箱': 'email',
  '邮件地址': 'email',
  '手机号': 'phone',
  '手机号*': 'phone',
  '手机号码': 'phone',
  '手机号码*': 'phone',
  '电话号码': 'phone',
  '联系电话': 'phone',
  '身份证号码': 'id_card',
  '身份证号码*': 'id_card',
  '身份证号': 'id_card',
  '员工编号': 'employee_id',
  '员工ID': 'employee_id',
  '工号': 'employee_id',
  '部门': 'department',
  '所属部门': 'department',
  '职位': 'position',
  '岗位': 'position',
  '职务': 'position',
  '组织机构': 'organization',
  '机构': 'organization',
  '组织': 'organization',
  '学习等级': 'learning_level',
  '学习时长': 'learning_hours',
  '学习进度': 'learning_progress',
  
  // 学习进度详细字段映射
  '用户ID': 'userId',
  '课程ID': 'courseId',
  '课时ID': 'lessonId',
  '当前播放时间': 'currentTime',
  '完成百分比': 'progressPercentage',
  '是否已完成': 'isCompleted',
  '最后更新时间': 'lastUpdatedAt',
  
  // 课程进度字段
  '总课时数': 'totalLessons',
  '已完成课时数': 'completedLessons',
  '课程完成百分比': 'courseProgressPercentage',
  '总学习时长': 'totalWatchTime',
  '最后学习时间': 'lastStudyTime',
  
  // 学习统计字段
  '总学习时长': 'totalStudyTime',
  '已完成课程数': 'completedCourses',
  '正在学习课程数': 'inProgressCourses',
  '本周学习时长': 'weeklyStudyTime',
  '连续学习天数': 'streakDays',
  '考试权限': 'exam_permissions',
  '考试历史': 'exam_history',
  '认证状态': 'certification_status',
  '角色': 'role',
  '角色*': 'role',
  '用户角色': 'role',
  '密码': 'password',
  '密码*': 'password',
  '登录密码': 'password',
  '状态': 'status',
  '用户状态': 'status',
  '账户状态': 'status',
  // 验证码相关字段
  '验证码': 'verificationCode',
  '短信验证码': 'smsCode',
  '手机验证码': 'smsCode',
  // 头像相关
  '头像': 'avatar_url',
  '头像地址': 'avatar_url',
  '用户头像': 'avatar_url'
} as const;

// 学习等级映射
export const LEARNING_LEVEL_DISPLAY_NAMES = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
} as const;

// 认证状态映射
export const CERTIFICATION_STATUS_DISPLAY_NAMES = {
  none: '无认证',
  in_progress: '认证中',
  certified: '已认证',
  expired: '已过期'
} as const;

// 用户状态映射
export const USER_STATUS_DISPLAY_NAMES = {
  active: '激活',
  inactive: '未激活',
  suspended: '已暂停'
} as const;

// 角色中英文映射表
export const ROLE_CHINESE_TO_ENGLISH = {
  '学员': 'student',
  '考生': 'student',
  '教师': 'teacher',
  '管理员': 'admin',
  '专家': 'expert',
  '评分员': 'examiner',
  '考评员': 'examiner',
  '内部监督员': 'internal_supervisor',
  '内部督导员': 'internal_supervisor',
  '访客': 'guest'
} as const;

// 角色英中文映射表
export const ROLE_ENGLISH_TO_CHINESE = {
  student: '学员',
  teacher: '教师',
  admin: '管理员',
  expert: '专家',
  examiner: '考评员',
  internal_supervisor: '内部督导员',
  guest: '访客'
} as const;

// 考试权限映射
export const EXAM_PERMISSION_DISPLAY_NAMES = {
  basic_exams: '基础考试',
  skill_exam: '技能考试',
  management_exam: '管理考试',
  finance_exam: '财务考试',
  tech_exam: '技术考试'
} as const;

// 导入模板必填字段定义
export const REQUIRED_FIELDS = [
  'name',      // 姓名
  'phone',     // 手机号
  'id_card',   // 身份证号码
  'role',      // 角色
  'password'   // 密码
] as const;

// 导入模板可选字段定义
export const OPTIONAL_FIELDS = [
  'email',              // 邮箱
  'employee_id',        // 员工编号
  'department',         // 部门
  'position',           // 职位
  'organization',       // 组织机构
  'learning_level',     // 学习等级
  'learning_hours',     // 学习时长
  'exam_permissions',   // 考试权限
  'certification_status', // 认证状态
  'status'              // 状态
] as const;

// 字段验证规则
export const FIELD_VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: null,
    description: '用户姓名，1-50个字符'
  },
  phone: {
    required: true,
    minLength: 11,
    maxLength: 11,
    pattern: /^1[3-9]\d{9}$/,
    description: '手机号码，必须为11位数字，以1开头'
  },
  id_card: {
    required: true,
    minLength: 15,
    maxLength: 18,
    pattern: /^[1-9]\d{13}[0-9Xx]$|^[1-9]\d{16}[0-9Xx]$/,
    description: '身份证号码，15位或18位，最后一位可以是数字或X'
  },
  email: {
    required: false,
    minLength: 5,
    maxLength: 100,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: '邮箱地址，可选字段'
  },
  password: {
    required: true,
    minLength: 6,
    maxLength: 50,
    pattern: null,
    description: '密码，至少6位字符'
  },
  role: {
    required: true,
    enum: ['admin', 'expert', 'teacher', 'student', 'examiner', 'internal_supervisor', 'guest'],
    description: '用户角色，必须为枚举值之一'
  }
} as const;

/**
 * 获取字段的中文显示名称
 * @param fieldName 英文字段名
 * @returns 中文显示名称
 */
export function getFieldDisplayName(fieldName: string): string {
  return FIELD_DISPLAY_NAMES[fieldName as keyof typeof FIELD_DISPLAY_NAMES] || fieldName;
}

/**
 * 获取中文字段名对应的英文字段名
 * @param chineseFieldName 中文字段名
 * @returns 英文字段名
 */
export function getEnglishFieldName(chineseFieldName: string): string {
  return CHINESE_TO_ENGLISH_FIELDS[chineseFieldName as keyof typeof CHINESE_TO_ENGLISH_FIELDS] || chineseFieldName;
}

/**
 * 获取学习等级的中文显示名称
 * @param level 学习等级英文值
 * @returns 中文显示名称
 */
export function getLearningLevelDisplayName(level: string): string {
  return LEARNING_LEVEL_DISPLAY_NAMES[level as keyof typeof LEARNING_LEVEL_DISPLAY_NAMES] || level;
}

/**
 * 获取认证状态的中文显示名称
 * @param status 认证状态英文值
 * @returns 中文显示名称
 */
export function getCertificationStatusDisplayName(status: string): string {
  return CERTIFICATION_STATUS_DISPLAY_NAMES[status as keyof typeof CERTIFICATION_STATUS_DISPLAY_NAMES] || status;
}

/**
 * 获取用户状态的中文显示名称
 * @param status 用户状态英文值
 * @returns 中文显示名称
 */
export function getUserStatusDisplayName(status: string): string {
  return USER_STATUS_DISPLAY_NAMES[status as keyof typeof USER_STATUS_DISPLAY_NAMES] || status;
}

/**
 * 获取考试权限的中文显示名称
 * @param permission 考试权限英文值
 * @returns 中文显示名称
 */
export function getExamPermissionDisplayName(permission: string): string {
  return EXAM_PERMISSION_DISPLAY_NAMES[permission as keyof typeof EXAM_PERMISSION_DISPLAY_NAMES] || permission;
}

/**
 * 将中文角色名转换为英文角色名
 * @param chineseRole 中文角色名
 * @returns 英文角色名
 */
export function convertChineseRoleToEnglish(chineseRole: string): string {
  return ROLE_CHINESE_TO_ENGLISH[chineseRole as keyof typeof ROLE_CHINESE_TO_ENGLISH] || chineseRole;
}

/**
 * 将英文角色名转换为中文角色名
 * @param englishRole 英文角色名
 * @returns 中文角色名
 */
export function convertEnglishRoleToChinese(englishRole: string): string {
  return ROLE_ENGLISH_TO_CHINESE[englishRole as keyof typeof ROLE_ENGLISH_TO_CHINESE] || englishRole;
}

/**
 * 验证字段值是否符合规则
 * @param fieldName 字段名
 * @param value 字段值
 * @returns 验证结果
 */
export function validateFieldValue(fieldName: string, value: string | number | boolean | undefined | null): {
  isValid: boolean;
  error?: string;
} {
  const rule = FIELD_VALIDATION_RULES[fieldName as keyof typeof FIELD_VALIDATION_RULES];
  
  if (!rule) {
    return { isValid: true };
  }
  
  // 检查必填字段
  if (rule.required && (!value || value.toString().trim() === '')) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}为必填字段`
    };
  }
  
  // 如果值为空且非必填，则通过验证
  if (!value || value.toString().trim() === '') {
    return { isValid: true };
  }
  
  const stringValue = value.toString().trim();
  
  // 检查长度
  if ('minLength' in rule && rule.minLength && stringValue.length < rule.minLength) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}长度不能少于${rule.minLength}位`
    };
  }
  
  if ('maxLength' in rule && rule.maxLength && stringValue.length > rule.maxLength) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}长度不能超过${rule.maxLength}位`
    };
  }
  
  // 检查正则表达式
  if ('pattern' in rule && rule.pattern && !rule.pattern.test(stringValue)) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}格式不正确`
    };
  }
  
  // 检查枚举值
  if ('enum' in rule && rule.enum && !rule.enum.includes(stringValue as any)) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}必须为以下值之一: ${rule.enum.join(', ')}`
    };
  }
  
  return { isValid: true };
}

/**
 * 获取所有字段的中文表头
 * @returns 中文表头数组
 */
export function getChineseHeaders(): string[] {
  const requiredHeaders = REQUIRED_FIELDS.map(field => getFieldDisplayName(field));
  const optionalHeaders = OPTIONAL_FIELDS.map(field => getFieldDisplayName(field));
  return [...requiredHeaders, ...optionalHeaders];
}

/**
 * 将中文表头转换为英文字段名
 * @param chineseHeaders 中文表头数组
 * @returns 英文字段名数组
 */
export function convertChineseHeadersToEnglish(chineseHeaders: string[]): string[] {
  return chineseHeaders.map(header => getEnglishFieldName(header));
}

/**
 * 标准化字段名称（处理不同API之间的字段名称不一致问题）
 * @param fieldName 原始字段名
 * @returns 标准化后的字段名
 */
export function normalizeFieldName(fieldName: string): string {
  // 字段名称标准化映射表
  const fieldNormalizationMap: Record<string, string> = {
    // 用户姓名字段统一
    'full_name': 'name',
    'fullName': 'name',
    'real_name': 'name',
    'realName': 'name',
    'user_name': 'name',
    'userName': 'name',

    // 验证码字段统一
    'smsCode': 'verificationCode',
    'sms_code': 'verificationCode',
    'phone_code': 'verificationCode',
    'phoneCode': 'verificationCode',

    // 头像字段统一
    'avatar': 'avatar_url',
    'avatarUrl': 'avatar_url',
    'profile_image': 'avatar_url',
    'profileImage': 'avatar_url',

    // 时间字段统一
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'deletedAt': 'deleted_at'
  };

  return fieldNormalizationMap[fieldName] || fieldName;
}

/**
 * 批量标准化对象的字段名称
 * @param obj 原始对象
 * @returns 字段名称标准化后的对象
 */
export function normalizeObjectFieldNames<T extends Record<string, any>>(obj: T): Record<string, any> {
  const normalizedObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = normalizeFieldName(key);
    normalizedObj[normalizedKey] = value;
  }

  return normalizedObj;
}

/**
 * 提取验证码字段值（处理不同字段名称的兼容性）
 * @param requestBody 请求体对象
 * @returns 验证码值
 */
export function extractVerificationCode(requestBody: Record<string, any>): string | undefined {
  // 按优先级顺序检查不同的验证码字段名
  const codeFields = [
    'verificationCode',
    'smsCode',
    'code',
    'verification_code',
    'sms_code',
    'phone_code',
    'phoneCode'
  ];

  for (const field of codeFields) {
    if (requestBody[field] !== undefined && requestBody[field] !== null && requestBody[field] !== '') {
      return String(requestBody[field]);
    }
  }

  return undefined;
}

/**
 * 获取字段的所有可能别名
 * @param standardFieldName 标准字段名
 * @returns 字段别名数组
 */
export function getFieldAliases(standardFieldName: string): string[] {
  const aliasMap: Record<string, string[]> = {
    'name': ['full_name', 'fullName', 'real_name', 'realName', 'user_name', 'userName'],
    'verificationCode': ['smsCode', 'sms_code', 'code', 'phone_code', 'phoneCode'],
    'avatar_url': ['avatar', 'avatarUrl', 'profile_image', 'profileImage'],
    'created_at': ['createdAt', 'create_time', 'createTime'],
    'updated_at': ['updatedAt', 'update_time', 'updateTime']
  };

  return aliasMap[standardFieldName] || [];
}

// 定义行数据类型
export interface RowData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * 数据库字段到前端字段的映射表
 */
export const DB_TO_FRONTEND_FIELD_MAP = {
  // 学习进度相关字段
  user_id: 'userId',
  course_id: 'courseId',
  lesson_id: 'lessonId',
  current_time_seconds: 'currentTime',
  progress_percentage: 'progressPercentage',
  is_completed: 'isCompleted',
  last_updated_at: 'lastUpdatedAt',
  created_at: 'createdAt',
  
  // 课程进度字段
  total_lessons: 'totalLessons',
  completed_lessons: 'completedLessons',
  course_progress_percentage: 'courseProgressPercentage',
  total_watch_time: 'totalWatchTime',
  last_study_time: 'lastStudyTime',
  
  // 学习统计字段
  total_study_time: 'totalStudyTime',
  completed_courses: 'completedCourses',
  in_progress_courses: 'inProgressCourses',
  weekly_study_time: 'weeklyStudyTime',
  streak_days: 'streakDays'
} as const;

/**
 * 前端字段到数据库字段的映射表
 */
export const FRONTEND_TO_DB_FIELD_MAP = {
  // 学习进度相关字段
  userId: 'user_id',
  courseId: 'course_id',
  lessonId: 'lesson_id',
  currentTime: 'current_time_seconds',
  progressPercentage: 'progress_percentage',
  isCompleted: 'is_completed',
  lastUpdatedAt: 'last_updated_at',
  createdAt: 'created_at',
  
  // 课程进度字段
  totalLessons: 'total_lessons',
  completedLessons: 'completed_lessons',
  courseProgressPercentage: 'course_progress_percentage',
  totalWatchTime: 'total_watch_time',
  lastStudyTime: 'last_study_time',
  
  // 学习统计字段
  totalStudyTime: 'total_study_time',
  completedCourses: 'completed_courses',
  inProgressCourses: 'in_progress_courses',
  weeklyStudyTime: 'weekly_study_time',
  streakDays: 'streak_days'
} as const;

/**
 * 将数据库字段对象转换为前端字段对象
 * @param dbObject 数据库字段对象
 * @returns 前端字段对象
 */
export function convertDbToFrontend<T extends Record<string, any>>(dbObject: T): Record<string, any> {
  const frontendObject: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(dbObject)) {
    const frontendKey = DB_TO_FRONTEND_FIELD_MAP[key as keyof typeof DB_TO_FRONTEND_FIELD_MAP] || key;
    frontendObject[frontendKey] = value;
  }
  
  return frontendObject;
}

/**
 * 将前端字段对象转换为数据库字段对象
 * @param frontendObject 前端字段对象
 * @returns 数据库字段对象
 */
export function convertFrontendToDb<T extends Record<string, any>>(frontendObject: T): Record<string, any> {
  const dbObject: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(frontendObject)) {
    const dbKey = FRONTEND_TO_DB_FIELD_MAP[key as keyof typeof FRONTEND_TO_DB_FIELD_MAP] || key;
    dbObject[dbKey] = value;
  }
  
  return dbObject;
}

/**
 * 批量转换数据库字段数组为前端字段数组
 * @param dbArray 数据库字段对象数组
 * @returns 前端字段对象数组
 */
export function convertDbArrayToFrontend<T extends Record<string, any>>(dbArray: T[]): Record<string, any>[] {
  return dbArray.map(item => convertDbToFrontend(item));
}

/**
 * 批量转换前端字段数组为数据库字段数组
 * @param frontendArray 前端字段对象数组
 * @returns 数据库字段对象数组
 */
export function convertFrontendArrayToDb<T extends Record<string, any>>(frontendArray: T[]): Record<string, any>[] {
  return frontendArray.map(item => convertFrontendToDb(item));
}