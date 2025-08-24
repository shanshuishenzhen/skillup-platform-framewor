/**
 * 全局字典映射表
 * 包含所有字段的中英文对照、枚举值映射等
 */

// 字段名称映射表（英文 -> 中文）
export const FIELD_DISPLAY_NAMES = {
  // 基本信息字段
  name: '姓名',
  username: '用户名',
  email: '邮箱',
  phone: '手机号',
  id_card: '身份证号码',
  employee_id: '员工编号',
  department: '部门',
  position: '职位',
  organization: '组织机构',
  
  // 学习相关字段
  learning_level: '学习等级',
  learning_hours: '学习时长',
  learning_progress: '学习进度',
  
  // 考试相关字段
  exam_permissions: '考试权限',
  exam_history: '考试历史',
  certification_status: '认证状态',
  
  // 系统字段
  role: '角色',
  password: '密码',
  status: '状态',
  import_source: '导入来源',
  import_date: '导入日期',
  sync_status: '同步状态',
  password_hash: '密码哈希',
  created_at: '创建时间',
  updated_at: '更新时间'
} as const;

// 中文字段名映射到英文字段名（包含带星号的必填字段）
export const CHINESE_TO_ENGLISH_FIELDS = {
  '姓名': 'name',
  '姓名*': 'name',
  '用户名': 'username',
  '用户名*': 'username',
  '邮箱': 'email',
  '手机号': 'phone',
  '手机号*': 'phone',
  '手机号码': 'phone',
  '手机号码*': 'phone',
  '身份证号码': 'id_card',
  '身份证号码*': 'id_card',
  '员工编号': 'employee_id',
  '员工ID': 'employee_id',
  '部门': 'department',
  '职位': 'position',
  '组织机构': 'organization',
  '学习等级': 'learning_level',
  '学习时长': 'learning_hours',
  '学习进度': 'learning_progress',
  '考试权限': 'exam_permissions',
  '考试历史': 'exam_history',
  '认证状态': 'certification_status',
  '角色': 'role',
  '角色*': 'role',
  '密码': 'password',
  '密码*': 'password',
  '状态': 'status'
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
  if (rule.minLength && stringValue.length < rule.minLength) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}长度不能少于${rule.minLength}位`
    };
  }
  
  if (rule.maxLength && stringValue.length > rule.maxLength) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}长度不能超过${rule.maxLength}位`
    };
  }
  
  // 检查正则表达式
  if (rule.pattern && !rule.pattern.test(stringValue)) {
    return {
      isValid: false,
      error: `${getFieldDisplayName(fieldName)}格式不正确`
    };
  }
  
  // 检查枚举值
  if ('enum' in rule && rule.enum && !rule.enum.includes(stringValue)) {
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

// 定义行数据类型
export interface RowData {
  [key: string]: string | number | boolean | undefined;
}