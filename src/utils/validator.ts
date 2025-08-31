/**
 * 验证器工具模块
 * 
 * 提供各种数据验证功能，包括：
 * - 基础数据类型验证
 * - 字符串格式验证
 * - 数字范围验证
 * - 日期时间验证
 * - 邮箱和URL验证
 * - 密码强度验证
 * - 文件类型验证
 * - 自定义验证规则
 * - 批量数据验证
 * - 验证错误处理
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import validator from 'validator';
import DOMPurify from 'dompurify';
import xss from 'xss';
import { errorHandler, ErrorType } from './errorHandler';
import { envConfigManager } from './envConfig';

// 获取验证配置
const config = {
  maxStringLength: 1000,
  maxArrayLength: 100,
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
  maxFileSize: 10 * 1024 * 1024 // 10MB
};

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  public field: string;
  public value: any;
  public code: string;

  constructor(message: string, field: string, value: any, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.code = code;
  }
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

/**
 * 验证规则接口
 */
export interface ValidationRule {
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

/**
 * 验证模式接口
 */
export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// ============================================================================
// 基础数据类型验证
// ============================================================================

/**
 * 验证必填字段
 * @param value - 要验证的值
 * @returns 是否为必填值
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * 验证字符串类型
 * @param value - 要验证的值
 * @returns 是否为字符串
 */
export function isString(value: any): boolean {
  return typeof value === 'string';
}

/**
 * 验证数字类型
 * @param value - 要验证的值
 * @returns 是否为有效数字
 */
export function isNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 验证布尔类型
 * @param value - 要验证的值
 * @returns 是否为布尔值
 */
export function isBoolean(value: any): boolean {
  return typeof value === 'boolean';
}

/**
 * 验证数组类型
 * @param value - 要验证的值
 * @returns 是否为数组
 */
export function isArray(value: any): boolean {
  return Array.isArray(value);
}

/**
 * 验证对象类型
 * @param value - 要验证的值
 * @returns 是否为对象
 */
export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ============================================================================
// 字符串格式验证
// ============================================================================

/**
 * 验证邮箱格式
 * @param email - 邮箱地址
 * @returns 是否为有效邮箱
 */
export function isEmail(email: string): boolean {
  if (!isString(email)) return false;
  return validator.isEmail(email);
}

/**
 * 验证URL格式
 * @param url - URL地址
 * @returns 是否为有效URL
 */
export function isURL(url: string): boolean {
  if (!isString(url)) return false;
  return validator.isURL(url);
}

/**
 * 验证UUID格式
 * @param uuid - UUID字符串
 * @returns 是否为有效UUID
 */
export function isUUID(uuid: string): boolean {
  if (!isString(uuid)) return false;
  return validator.isUUID(uuid);
}

/**
 * 验证IP地址格式
 * @param ip - IP地址
 * @returns 是否为有效IP地址
 */
export function isIPAddress(ip: string): boolean {
  if (!isString(ip)) return false;
  return validator.isIP(ip);
}

/**
 * 验证手机号格式
 * @param phone - 手机号码
 * @returns 是否为有效手机号
 */
export function isMobilePhone(phone: string): boolean {
  if (!isString(phone)) return false;
  return validator.isMobilePhone(phone, 'zh-CN');
}

/**
 * 验证文件名格式
 * @param filename - 文件名
 * @returns 是否为有效文件名
 */
export function isFilename(filename: string): boolean {
  if (!isString(filename)) return false;
  const invalidChars = /[<>:"/\\|?*]/;
  return !invalidChars.test(filename) && filename.length > 0 && filename.length <= 255;
}

/**
 * 验证URL slug格式
 * @param slug - URL slug
 * @returns 是否为有效slug
 */
export function isSlug(slug: string): boolean {
  if (!isString(slug)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

// ============================================================================
// 密码验证
// ============================================================================

/**
 * 验证密码强度
 * @param password - 密码
 * @returns 是否为强密码
 */
export function isStrongPassword(password: string): boolean {
  if (!isString(password)) return false;
  
  const config = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: ['password', '123456', 'qwerty']
  };

  // 检查长度
  if (password.length < config.minLength) return false;

  // 检查禁用密码列表
  if (config.forbiddenPasswords?.includes(password.toLowerCase())) return false;

  // 检查大写字母
  if (config.requireUppercase && !/[A-Z]/.test(password)) return false;

  // 检查小写字母
  if (config.requireLowercase && !/[a-z]/.test(password)) return false;

  // 检查数字
  if (config.requireNumbers && !/\d/.test(password)) return false;

  // 检查特殊字符
  if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

  return true;
}

// ============================================================================
// 数据清理和标准化
// ============================================================================

/**
 * 清理和标准化数据
 * @param value - 要清理的值
 * @param type - 数据类型
 * @returns 清理后的值
 */
export function sanitize(value: any, type: string = 'string'): any {
  if (value === null || value === undefined) return value;

  switch (type) {
    case 'html':
      return DOMPurify.sanitize(value);
    case 'xss':
      return xss(value);
    case 'string':
      return validator.escape(String(value));
    default:
      return value;
  }
}

/**
 * 标准化数据
 * @param value - 要标准化的值
 * @param type - 数据类型
 * @returns 标准化后的值
 */
export function normalize(value: any, type: string = 'string'): any {
  if (value === null || value === undefined) return value;

  switch (type) {
    case 'email':
      return validator.normalizeEmail(String(value));
    case 'string':
      return validator.trim(String(value));
    default:
      return value;
  }
}

// ============================================================================
// 复合验证
// ============================================================================

/**
 * 验证对象
 * @param obj - 要验证的对象
 * @param schema - 验证模式
 * @returns 验证结果
 */
export function validateObject(obj: any, schema: ValidationSchema): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  for (const [field, rule] of Object.entries(schema)) {
    const value = obj[field];

    // 检查必填字段
    if (rule.required && !isRequired(value)) {
      errors.push(new ValidationError(
        rule.message || `${field} is required`,
        field,
        value,
        'REQUIRED'
      ));
      continue;
    }

    // 如果值为空且非必填，跳过其他验证
    if (!isRequired(value) && !rule.required) continue;

    // 类型验证
    if (rule.type) {
      let isValidType = false;
      switch (rule.type) {
        case 'string':
          isValidType = isString(value);
          break;
        case 'number':
          isValidType = isNumber(value);
          break;
        case 'boolean':
          isValidType = isBoolean(value);
          break;
        case 'array':
          isValidType = isArray(value);
          break;
        case 'object':
          isValidType = isObject(value);
          break;
        case 'email':
          isValidType = isEmail(value);
          break;
        case 'url':
          isValidType = isURL(value);
          break;
        case 'uuid':
          isValidType = isUUID(value);
          break;
      }

      if (!isValidType) {
        errors.push(new ValidationError(
          rule.message || `${field} must be of type ${rule.type}`,
          field,
          value,
          'TYPE_ERROR'
        ));
        continue;
      }
    }

    // 范围验证
    if (rule.min !== undefined && isNumber(value) && value < rule.min) {
      errors.push(new ValidationError(
        rule.message || `${field} must be at least ${rule.min}`,
        field,
        value,
        'MIN_VALUE'
      ));
    }

    if (rule.max !== undefined && isNumber(value) && value > rule.max) {
      errors.push(new ValidationError(
        rule.message || `${field} must be at most ${rule.max}`,
        field,
        value,
        'MAX_VALUE'
      ));
    }

    // 模式验证
    if (rule.pattern && isString(value) && !rule.pattern.test(value)) {
      errors.push(new ValidationError(
        rule.message || `${field} does not match required pattern`,
        field,
        value,
        'PATTERN_MISMATCH'
      ));
    }

    // 自定义验证
    if (rule.custom && !rule.custom(value)) {
      errors.push(new ValidationError(
        rule.message || `${field} failed custom validation`,
        field,
        value,
        'CUSTOM_ERROR'
      ));
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证数组
 * @param arr - 要验证的数组
 * @param elementSchema - 元素验证模式
 * @returns 验证结果
 */
export function validateArray(arr: any[], elementSchema: ValidationSchema): ValidationResult {
  if (!isArray(arr)) {
    return {
      isValid: false,
      errors: [new ValidationError('Value must be an array', 'array', arr, 'TYPE_ERROR')]
    };
  }

  const allErrors: ValidationError[] = [];
  const allWarnings: string[] = [];

  arr.forEach((item, index) => {
    const result = validateObject(item, elementSchema);
    if (!result.isValid) {
      result.errors.forEach(error => {
        error.field = `[${index}].${error.field}`;
        allErrors.push(error);
      });
    }
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * 创建自定义验证器
 * @param config - 验证器配置
 * @returns 验证器函数
 */
export function createValidator(config: {
  name: string;
  message: string;
  validator: (value: any) => boolean;
}) {
  return (value: any) => {
    if (!config.validator(value)) {
      throw new ValidationError(config.message, config.name, value, 'CUSTOM_ERROR');
    }
    return true;
  };
}

/**
 * 创建条件验证器
 * @param condition - 条件函数
 * @param validator - 验证器函数
 * @returns 条件验证器函数
 */
export function createConditionalValidator(
  condition: (data: any) => boolean,
  validator: (value: any) => boolean
) {
  return (data: any) => {
    if (!condition(data)) return true; // 条件不满足时跳过验证
    return validator(data.value);
  };
}

// ============================================================================
// 文件验证
// ============================================================================

/**
 * 验证文件上传
 * @param file - 文件对象
 * @returns 验证结果
 */
export function validateUpload(file: File): ValidationResult {
  const errors: ValidationError[] = [];
  const config = envConfigManager.loadConfig().upload;
  
  // 默认配置
  const maxSize = (config?.maxFileSizeMB || 10) * 1024 * 1024; // 转换为字节
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

  // 检查文件大小
  if (file.size > maxSize) {
    errors.push(new ValidationError(
      `File size must be less than ${maxSize / 1024 / 1024}MB`,
      'size',
      file.size,
      'FILE_TOO_LARGE'
    ));
  }

  // 检查文件类型
  if (!allowedTypes.includes(file.type)) {
    errors.push(new ValidationError(
      `File type ${file.type} is not allowed`,
      'type',
      file.type,
      'INVALID_FILE_TYPE'
    ));
  }

  // 检查文件扩展名
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(new ValidationError(
      `File extension ${extension} is not allowed`,
      'extension',
      extension,
      'INVALID_FILE_EXTENSION'
    ));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// 错误处理
// ============================================================================

/**
 * 获取验证错误信息
 * @param errors - 验证错误数组
 * @returns 格式化的错误信息
 */
export function getValidationErrors(errors: ValidationError[]): string[] {
  return errors.map(error => formatValidationError(error));
}

/**
 * 格式化验证错误
 * @param error - 验证错误
 * @returns 格式化的错误信息
 */
export function formatValidationError(error: ValidationError): string {
  return `${error.field}: ${error.message}`;
}

/**
 * 检查是否为验证错误
 * @param error - 错误对象
 * @returns 是否为验证错误
 */
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

// ============================================================================
// 异步验证
// ============================================================================

/**
 * 异步邮箱验证器
 * @param email - 邮箱地址
 * @returns Promise<boolean>
 */
export async function asyncEmailValidator(email: string): Promise<boolean> {
  try {
    // 基础格式验证
    if (!isEmail(email)) return false;
    
    // 这里可以添加更复杂的异步验证逻辑
    // 比如检查邮箱是否已存在、域名是否有效等
    
    return true;
  } catch (error) {
    await errorHandler.createError(
      ErrorType.VALIDATION_ERROR,
      (error as Error).message,
      {
        context: { additionalData: { email } },
        originalError: error as Error
      }
    );
    return false;
  }
}

/**
 * 批量异步验证
 * @param data - 要验证的数据数组
 * @param validator - 验证器函数
 * @returns Promise<ValidationResult[]>
 */
export async function batchValidate<T>(
  data: T[],
  validator: (item: T) => Promise<ValidationResult>
): Promise<ValidationResult[]> {
  try {
    return await Promise.all(data.map(validator));
  } catch (error) {
    await errorHandler.createError(
      ErrorType.VALIDATION_ERROR,
      (error as Error).message,
      {
        context: { additionalData: { data } },
        originalError: error as Error
      }
    );
    return [];
  }
}

const validator = {
  // 基础验证
  isRequired,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  
  // 格式验证
  isEmail,
  isURL,
  isUUID,
  isIPAddress,
  isMobilePhone,
  isFilename,
  isSlug,
  
  // 密码验证
  isStrongPassword,
  
  // 数据处理
  sanitize,
  normalize,
  
  // 复合验证
  validateObject,
  validateArray,
  createValidator,
  createConditionalValidator,
  
  // 文件验证
  validateUpload,
  
  // 错误处理
  getValidationErrors,
  formatValidationError,
  isValidationError,
  ValidationError,
  
  // 异步验证
  asyncEmailValidator,
  batchValidate
};

export default validator;