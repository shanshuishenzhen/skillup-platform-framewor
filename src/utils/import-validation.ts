import { z } from 'zod';
import { UserRole } from '@/types/roles';

/**
 * 用户导入数据验证模式
 */
export const UserImportSchema = z.object({
  name: z.string()
    .min(1, '姓名不能为空')
    .max(50, '姓名不能超过50个字符')
    .regex(/^[\u4e00-\u9fa5a-zA-Z\s]+$/, '姓名只能包含中文、英文和空格'),
  
  phone: z.string()
    .min(1, '手机号不能为空')
    .regex(/^1[3-9]\d{9}$/, '手机号格式不正确，应为11位数字且以1开头'),
  
  id_card: z.string()
    .min(1, '身份证号码不能为空')
    .regex(/^[1-9]\d{13}[0-9Xx]$|^[1-9]\d{16}[0-9Xx]$/, '身份证号码格式不正确'),
  
  role: z.enum(['admin', 'expert', 'teacher', 'student', 'examiner', 'internal_supervisor', 'guest'], {
    errorMap: () => ({ message: '角色必须是：admin, expert, teacher, student, examiner, internal_supervisor, guest 中的一个' })
  }),
  
  password: z.string()
    .min(6, '密码至少需要6位字符')
    .max(50, '密码不能超过50个字符')
    .optional()
    .or(z.literal('')),
  
  email: z.string()
    .email('邮箱格式不正确')
    .max(100, '邮箱不能超过100个字符')
    .optional()
    .or(z.literal('')),
  
  employee_id: z.string()
    .max(50, '员工ID不能超过50个字符')
    .optional()
    .or(z.literal('')),
  
  department: z.string()
    .max(100, '部门名称不能超过100个字符')
    .optional()
    .or(z.literal('')),
  
  position: z.string()
    .max(100, '职位名称不能超过100个字符')
    .optional()
    .or(z.literal('')),
  
  organization: z.string()
    .max(100, '组织机构名称不能超过100个字符')
    .optional()
    .or(z.literal('')),
  
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: '状态必须是 active 或 inactive' })
  }).default('active')
});

export type UserImportData = z.infer<typeof UserImportSchema>;

/**
 * 验证错误接口
 */
export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validData: UserImportData[];
  invalidData: any[];
}

/**
 * 中文角色映射
 */
const ROLE_MAPPING: Record<string, UserRole> = {
  '管理员': UserRole.ADMIN,
  '系统管理员': UserRole.ADMIN,
  '专家': UserRole.EXPERT,
  '教师': UserRole.TEACHER,
  '老师': UserRole.TEACHER,
  '学生': UserRole.STUDENT,
  '学员': UserRole.STUDENT,
  '考官': UserRole.EXAMINER,
  '监督员': UserRole.INTERNAL_SUPERVISOR,
  '内部监督员': UserRole.INTERNAL_SUPERVISOR,
  '访客': UserRole.GUEST,
  '游客': UserRole.GUEST
}

/**
 * 中文字段名映射
 */
const FIELD_MAPPING: Record<string, string> = {
  '姓名': 'name',
  '用户名': 'name',
  '真实姓名': 'name',
  '手机号': 'phone',
  '手机号码': 'phone',
  '电话': 'phone',
  '联系电话': 'phone',
  '身份证号': 'id_card',
  '身份证号码': 'id_card',
  '身份证': 'id_card',
  '角色': 'role',
  '用户角色': 'role',
  '权限': 'role',
  '密码': 'password',
  '登录密码': 'password',
  '邮箱': 'email',
  '电子邮箱': 'email',
  '邮件': 'email',
  'Email': 'email',
  'E-mail': 'email',
  '员工ID': 'employee_id',
  '员工编号': 'employee_id',
  '工号': 'employee_id',
  '部门': 'department',
  '所属部门': 'department',
  '职位': 'position',
  '岗位': 'position',
  '职务': 'position',
  '组织': 'organization',
  '组织机构': 'organization',
  '机构': 'organization',
  '状态': 'status',
  '用户状态': 'status',
  '账户状态': 'status'
};

/**
 * 转换中文角色为英文
 */
export function convertChineseRole(role: string): UserRole | null {
  const normalizedRole = role.trim();
  
  // 直接匹配英文角色
  if (Object.values(UserRole).includes(normalizedRole as UserRole)) {
    return normalizedRole as UserRole;
  }
  
  // 匹配中文角色
  const mappedRole = ROLE_MAPPING[normalizedRole];
  if (mappedRole) {
    return mappedRole;
  }
  
  return null;
}

/**
 * 转换中文字段名为英文
 */
export function convertChineseFieldName(fieldName: string): string {
  const normalizedField = fieldName.trim().replace(/\*/g, ''); // 移除必填标记
  return FIELD_MAPPING[normalizedField] || fieldName;
}

/**
 * 标准化用户数据
 */
export function normalizeUserData(rawData: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = convertChineseFieldName(key);
    let normalizedValue = value;
    
    // 处理空值
    if (normalizedValue === null || normalizedValue === undefined || normalizedValue === '') {
      normalizedValue = '';
    } else {
      normalizedValue = String(normalizedValue).trim();
    }
    
    // 特殊处理角色字段
    if (normalizedKey === 'role' && normalizedValue) {
      const convertedRole = convertChineseRole(normalizedValue);
      if (convertedRole) {
        normalizedValue = convertedRole;
      }
    }
    
    // 特殊处理状态字段
    if (normalizedKey === 'status' && normalizedValue) {
      const statusMap: Record<string, string> = {
        '激活': 'active',
        '启用': 'active',
        '正常': 'active',
        '有效': 'active',
        '禁用': 'inactive',
        '停用': 'inactive',
        '无效': 'inactive',
        '冻结': 'inactive'
      };
      normalizedValue = statusMap[normalizedValue] || normalizedValue;
    }
    
    normalized[normalizedKey] = normalizedValue;
  }
  
  return normalized;
}

/**
 * 验证身份证号码
 */
export function validateIdCard(idCard: string): boolean {
  if (!idCard || typeof idCard !== 'string') return false;
  
  const id = idCard.trim();
  
  // 15位或18位身份证号码
  if (!/^[1-9]\d{13}[0-9Xx]$|^[1-9]\d{16}[0-9Xx]$/.test(id)) {
    return false;
  }
  
  // 18位身份证校验码验证
  if (id.length === 18) {
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(id[i]) * weights[i];
    }
    
    const checkCode = checkCodes[sum % 11];
    return id[17].toUpperCase() === checkCode;
  }
  
  return true; // 15位身份证暂不做详细校验
}

/**
 * 验证手机号码
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  const phoneNumber = phone.trim().replace(/[\s-]/g, ''); // 移除空格和连字符
  return /^1[3-9]\d{9}$/.test(phoneNumber);
}

/**
 * 验证邮箱地址
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * 批量验证用户数据
 */
export function validateUserImportData(rawDataList: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const validData: UserImportData[] = [];
  const invalidData: any[] = [];
  
  for (let i = 0; i < rawDataList.length; i++) {
    const rowNumber = i + 2; // Excel行号从2开始（第1行是表头）
    const rawData = rawDataList[i];
    
    try {
      // 标准化数据
      const normalizedData = normalizeUserData(rawData);
      
      // 验证必填字段
      const requiredFields = ['name', 'phone', 'id_card', 'role'];
      for (const field of requiredFields) {
        if (!normalizedData[field] || normalizedData[field] === '') {
          errors.push({
            row: rowNumber,
            field,
            value: normalizedData[field],
            message: `${field === 'name' ? '姓名' : field === 'phone' ? '手机号' : field === 'id_card' ? '身份证号码' : '角色'}不能为空`,
            severity: 'error'
          });
        }
      }
      
      // 特殊验证
      if (normalizedData.phone && !validatePhone(normalizedData.phone)) {
        errors.push({
          row: rowNumber,
          field: 'phone',
          value: normalizedData.phone,
          message: '手机号格式不正确',
          severity: 'error'
        });
      }
      
      if (normalizedData.id_card && !validateIdCard(normalizedData.id_card)) {
        errors.push({
          row: rowNumber,
          field: 'id_card',
          value: normalizedData.id_card,
          message: '身份证号码格式不正确',
          severity: 'error'
        });
      }
      
      if (normalizedData.email && normalizedData.email !== '' && !validateEmail(normalizedData.email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          value: normalizedData.email,
          message: '邮箱格式不正确',
          severity: 'error'
        });
      }
      
      if (normalizedData.role && !convertChineseRole(normalizedData.role)) {
        errors.push({
          row: rowNumber,
          field: 'role',
          value: normalizedData.role,
          message: '角色值无效，必须是：admin, expert, teacher, student, examiner, internal_supervisor, guest 中的一个',
          severity: 'error'
        });
      }
      
      // 使用Zod进行完整验证
      const validationResult = UserImportSchema.safeParse(normalizedData);
      
      if (validationResult.success) {
        validData.push(validationResult.data);
        
        // 添加警告信息
        if (!normalizedData.email || normalizedData.email === '') {
          warnings.push({
            row: rowNumber,
            field: 'email',
            value: normalizedData.email,
            message: '未提供邮箱地址，将无法接收系统通知',
            severity: 'warning'
          });
        }
        
        if (!normalizedData.password || normalizedData.password === '') {
          warnings.push({
            row: rowNumber,
            field: 'password',
            value: normalizedData.password,
            message: '未提供密码，系统将自动生成随机密码',
            severity: 'warning'
          });
        }
      } else {
        invalidData.push(rawData);
        
        // 添加Zod验证错误
        validationResult.error.errors.forEach(error => {
          errors.push({
            row: rowNumber,
            field: error.path.join('.'),
            value: error.path.reduce((obj, key) => obj?.[key], normalizedData),
            message: error.message,
            severity: 'error'
          });
        });
      }
      
    } catch (error) {
      invalidData.push(rawData);
      errors.push({
        row: rowNumber,
        field: 'general',
        value: rawData,
        message: error instanceof Error ? error.message : '数据处理失败',
        severity: 'error'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validData,
    invalidData
  };
}

/**
 * 检查数据内部重复
 */
export function checkInternalDuplicates(data: UserImportData[]): ValidationError[] {
  const duplicates: ValidationError[] = [];
  const seen = {
    phone: new Map<string, number>(),
    id_card: new Map<string, number>(),
    email: new Map<string, number>(),
    employee_id: new Map<string, number>()
  };
  
  data.forEach((user, index) => {
    const rowNumber = index + 2;
    
    // 检查手机号重复
    if (user.phone) {
      if (seen.phone.has(user.phone)) {
        duplicates.push({
          row: rowNumber,
          field: 'phone',
          value: user.phone,
          message: `手机号与第${seen.phone.get(user.phone)}行重复`,
          severity: 'error'
        });
      } else {
        seen.phone.set(user.phone, rowNumber);
      }
    }
    
    // 检查身份证号重复
    if (user.id_card) {
      if (seen.id_card.has(user.id_card)) {
        duplicates.push({
          row: rowNumber,
          field: 'id_card',
          value: user.id_card,
          message: `身份证号码与第${seen.id_card.get(user.id_card)}行重复`,
          severity: 'error'
        });
      } else {
        seen.id_card.set(user.id_card, rowNumber);
      }
    }
    
    // 检查邮箱重复
    if (user.email && user.email !== '') {
      if (seen.email.has(user.email)) {
        duplicates.push({
          row: rowNumber,
          field: 'email',
          value: user.email,
          message: `邮箱与第${seen.email.get(user.email)}行重复`,
          severity: 'error'
        });
      } else {
        seen.email.set(user.email, rowNumber);
      }
    }
    
    // 检查员工ID重复
    if (user.employee_id && user.employee_id !== '') {
      if (seen.employee_id.has(user.employee_id)) {
        duplicates.push({
          row: rowNumber,
          field: 'employee_id',
          value: user.employee_id,
          message: `员工ID与第${seen.employee_id.get(user.employee_id)}行重复`,
          severity: 'error'
        });
      } else {
        seen.employee_id.set(user.employee_id, rowNumber);
      }
    }
  });
  
  return duplicates;
}