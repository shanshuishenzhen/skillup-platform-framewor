/**
 * 验证器工具测试文件
 * 
 * 测试数据验证相关的所有功能，包括：
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

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  validator,
  isRequired,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isEmail,
  isURL,
  isUUID,
  isPhoneNumber,
  isIPAddress,
  isCreditCard,
  isDate,
  isTime,
  isDateTime,
  isISO8601,
  isLength,
  isMinLength,
  isMaxLength,
  isMin,
  isMax,
  isRange,
  isAlpha,
  isAlphanumeric,
  isNumeric,
  isDecimal,
  isHexadecimal,
  isBase64,
  isJSON,
  isPassword,
  isStrongPassword,
  isFileType,
  isImageFile,
  isDocumentFile,
  isVideoFile,
  isAudioFile,
  isFileSize,
  isFilename,
  isSlug,
  isHashtag,
  isMention,
  isColor,
  isHexColor,
  isRGBColor,
  isCoordinate,
  isLatitude,
  isLongitude,
  isPostalCode,
  isCountryCode,
  isCurrencyCode,
  isLanguageCode,
  isTimezone,
  isMimeType,
  isUserAgent,
  isJWT,
  isAPIKey,
  isSecretKey,
  sanitizeString,
  sanitizeHTML,
  sanitizeSQL,
  escape,
  unescape,
  trim,
  normalize,
  validateObject,
  validateArray,
  validateSchema,
  createValidator,
  combineValidators,
  conditionalValidator,
  asyncValidator,
  validateForm,
  validateFile,
  validateUpload,
  getValidationErrors,
  formatValidationError,
  isValidationError,
  ValidationError,
  ValidationResult,
  ValidatorFunction,
  ValidationSchema,
  ValidationOptions
} from '../../utils/validator';
import { errorHandler } from '../../utils/errorHandler';
import { envConfig } from '../../config/envConfig';

// Mock 外部依赖
jest.mock('../../utils/errorHandler');
jest.mock('../../config/envConfig');
jest.mock('validator');
jest.mock('dompurify');
jest.mock('xss');

// 类型化的 Mock 对象
const mockErrorHandler = errorHandler as jest.Mocked<typeof errorHandler>;
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;

// Mock validator 库
const mockValidatorLib = {
  isEmail: jest.fn(),
  isURL: jest.fn(),
  isUUID: jest.fn(),
  isLength: jest.fn(),
  isNumeric: jest.fn(),
  isAlpha: jest.fn(),
  isAlphanumeric: jest.fn(),
  isDecimal: jest.fn(),
  isHexadecimal: jest.fn(),
  isBase64: jest.fn(),
  isJSON: jest.fn(),
  isCreditCard: jest.fn(),
  isIP: jest.fn(),
  isMobilePhone: jest.fn(),
  isPostalCode: jest.fn(),
  isISO8601: jest.fn(),
  isMimeType: jest.fn(),
  isJWT: jest.fn(),
  escape: jest.fn(),
  unescape: jest.fn(),
  trim: jest.fn(),
  normalizeEmail: jest.fn(),
  blacklist: jest.fn(),
  whitelist: jest.fn(),
  stripLow: jest.fn()
};

// Mock DOMPurify
const mockDOMPurify = {
  sanitize: jest.fn().mockImplementation((input) => input)
};

// Mock XSS
const mockXSS = jest.fn().mockImplementation((input) => input);

/**
 * 验证器工具测试套件
 */
describe('验证器工具测试', () => {
  // 测试数据
  const validEmails = [
    'user@example.com',
    'test.email+tag@domain.co.uk',
    'user123@test-domain.com'
  ];

  const invalidEmails = [
    'invalid-email',
    '@domain.com',
    'user@',
    'user..name@domain.com',
    'user@domain'
  ];

  const validURLs = [
    'https://www.example.com',
    'http://localhost:3000',
    'ftp://files.example.com',
    'https://sub.domain.com/path?query=value#fragment'
  ];

  const invalidURLs = [
    'not-a-url',
    'http://',
    'https://.',
    'invalid://url'
  ];

  const validUUIDs = [
    '123e4567-e89b-12d3-a456-426614174000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
  ];

  const invalidUUIDs = [
    'not-a-uuid',
    '123e4567-e89b-12d3-a456',
    '123e4567-e89b-12d3-a456-426614174000-extra'
  ];

  const strongPasswords = [
    'MyStr0ng!Password',
    'C0mpl3x@P@ssw0rd',
    'S3cur3#P@ssw0rd123'
  ];

  const weakPasswords = [
    'password',
    '123456',
    'abc123',
    'Password',
    'password123'
  ];

  /**
   * 测试前置设置
   */
  beforeEach(() => {
    // 重置所有 Mock
    jest.clearAllMocks();

    // 设置默认的 Mock 返回值
    mockValidatorLib.isEmail.mockImplementation((email) => 
      validEmails.includes(email)
    );
    mockValidatorLib.isURL.mockImplementation((url) => 
      validURLs.includes(url)
    );
    mockValidatorLib.isUUID.mockImplementation((uuid) => 
      validUUIDs.includes(uuid)
    );
    mockValidatorLib.isLength.mockImplementation((str, options) => {
      const len = str.length;
      if (options.min && len < options.min) return false;
      if (options.max && len > options.max) return false;
      return true;
    });
    mockValidatorLib.isNumeric.mockImplementation((str) => 
      /^\d+$/.test(str)
    );
    mockValidatorLib.isAlpha.mockImplementation((str) => 
      /^[a-zA-Z]+$/.test(str)
    );
    mockValidatorLib.isAlphanumeric.mockImplementation((str) => 
      /^[a-zA-Z0-9]+$/.test(str)
    );
    mockValidatorLib.isDecimal.mockImplementation((str) => 
      /^\d*\.\d+$/.test(str)
    );
    mockValidatorLib.isHexadecimal.mockImplementation((str) => 
      /^[0-9A-Fa-f]+$/.test(str)
    );
    mockValidatorLib.isBase64.mockImplementation((str) => 
      /^[A-Za-z0-9+/]*={0,2}$/.test(str)
    );
    mockValidatorLib.isJSON.mockImplementation((str) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    });
    mockValidatorLib.isCreditCard.mockImplementation((str) => 
      /^\d{13,19}$/.test(str.replace(/\s/g, ''))
    );
    mockValidatorLib.isIP.mockImplementation((str) => 
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(str)
    );
    mockValidatorLib.isMobilePhone.mockImplementation((str) => 
      /^\+?[1-9]\d{1,14}$/.test(str)
    );
    mockValidatorLib.isPostalCode.mockImplementation((str) => 
      /^\d{5}(-\d{4})?$/.test(str)
    );
    mockValidatorLib.isISO8601.mockImplementation((str) => 
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)
    );
    mockValidatorLib.isMimeType.mockImplementation((str) => 
      /^[a-z]+\/[a-z0-9\-\+]+$/.test(str)
    );
    mockValidatorLib.isJWT.mockImplementation((str) => 
      /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/.test(str)
    );
    mockValidatorLib.escape.mockImplementation((str) => 
      str.replace(/[&<>"']/g, (match) => {
        const escapeMap = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return escapeMap[match];
      })
    );
    mockValidatorLib.unescape.mockImplementation((str) => 
      str.replace(/&amp;|&lt;|&gt;|&quot;|&#x27;/g, (match) => {
        const unescapeMap = {
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#x27;': "'"
        };
        return unescapeMap[match];
      })
    );
    mockValidatorLib.trim.mockImplementation((str) => str.trim());
    mockValidatorLib.normalizeEmail.mockImplementation((email) => 
      email.toLowerCase()
    );

    // 设置错误处理器 Mock
    mockErrorHandler.handleError = jest.fn().mockResolvedValue(undefined);

    // 设置环境配置 Mock
    mockEnvConfig.validation = {
      strictMode: true,
      sanitization: {
        enabled: true,
        allowedTags: ['b', 'i', 'em', 'strong'],
        allowedAttributes: ['href', 'src', 'alt']
      },
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        forbiddenPasswords: ['password', '123456', 'qwerty']
      },
      file: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
      }
    };

    // Mock 外部库
    jest.doMock('validator', () => mockValidatorLib);
    jest.doMock('dompurify', () => ({ default: mockDOMPurify }));
    jest.doMock('xss', () => ({ default: mockXSS }));
  });

  /**
   * 测试后置清理
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础数据类型验证', () => {
    it('应该验证必填字段', () => {
      expect(isRequired('value')).toBe(true);
      expect(isRequired('')).toBe(false);
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
      expect(isRequired(0)).toBe(true);
      expect(isRequired(false)).toBe(true);
    });

    it('应该验证字符串类型', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });

    it('应该验证数字类型', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(123.45)).toBe(true);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
    });

    it('应该验证布尔类型', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean(0)).toBe(false);
    });

    it('应该验证数组类型', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray('array')).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray(null)).toBe(false);
    });

    it('应该验证对象类型', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject('object')).toBe(false);
    });
  });

  describe('字符串格式验证', () => {
    it('应该验证邮箱格式', () => {
      validEmails.forEach(email => {
        expect(isEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(isEmail(email)).toBe(false);
      });
    });

    it('应该验证URL格式', () => {
      validURLs.forEach(url => {
        expect(isURL(url)).toBe(true);
      });

      invalidURLs.forEach(url => {
        expect(isURL(url)).toBe(false);
      });
    });

    it('应该验证UUID格式', () => {
      validUUIDs.forEach(uuid => {
        expect(isUUID(uuid)).toBe(true);
      });

      invalidUUIDs.forEach(uuid => {
        expect(isUUID(uuid)).toBe(false);
      });
    });

    it('应该验证手机号码格式', () => {
      const validPhones = [
        '+1234567890',
        '+86138000000000',
        '1234567890'
      ];

      const invalidPhones = [
        'not-a-phone',
        '123',
        '+'
      ];

      validPhones.forEach(phone => {
        expect(isPhoneNumber(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(isPhoneNumber(phone)).toBe(false);
      });
    });

    it('应该验证IP地址格式', () => {
      const validIPs = [
        '192.168.1.1',
        '127.0.0.1',
        '255.255.255.255'
      ];

      const invalidIPs = [
        'not-an-ip',
        '256.256.256.256',
        '192.168.1'
      ];

      validIPs.forEach(ip => {
        expect(isIPAddress(ip)).toBe(true);
      });

      invalidIPs.forEach(ip => {
        expect(isIPAddress(ip)).toBe(false);
      });
    });

    it('应该验证信用卡号格式', () => {
      const validCards = [
        '4111111111111111',
        '5555555555554444',
        '4111 1111 1111 1111'
      ];

      const invalidCards = [
        'not-a-card',
        '123',
        '4111111111111112'
      ];

      validCards.forEach(card => {
        expect(isCreditCard(card)).toBe(true);
      });

      invalidCards.forEach(card => {
        expect(isCreditCard(card)).toBe(false);
      });
    });
  });

  describe('数字范围验证', () => {
    it('应该验证字符串长度', () => {
      expect(isLength('hello', { min: 3, max: 10 })).toBe(true);
      expect(isLength('hi', { min: 3 })).toBe(false);
      expect(isLength('very long string', { max: 10 })).toBe(false);
    });

    it('应该验证最小长度', () => {
      expect(isMinLength('hello', 3)).toBe(true);
      expect(isMinLength('hi', 3)).toBe(false);
    });

    it('应该验证最大长度', () => {
      expect(isMaxLength('hello', 10)).toBe(true);
      expect(isMaxLength('very long string', 10)).toBe(false);
    });

    it('应该验证最小值', () => {
      expect(isMin(10, 5)).toBe(true);
      expect(isMin(3, 5)).toBe(false);
    });

    it('应该验证最大值', () => {
      expect(isMax(5, 10)).toBe(true);
      expect(isMax(15, 10)).toBe(false);
    });

    it('应该验证数值范围', () => {
      expect(isRange(5, { min: 1, max: 10 })).toBe(true);
      expect(isRange(0, { min: 1, max: 10 })).toBe(false);
      expect(isRange(15, { min: 1, max: 10 })).toBe(false);
    });
  });

  describe('日期时间验证', () => {
    it('应该验证日期格式', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31',
        new Date('2024-01-01')
      ];

      const invalidDates = [
        'not-a-date',
        '2024-13-01',
        '2024-01-32'
      ];

      validDates.forEach(date => {
        expect(isDate(date)).toBe(true);
      });

      invalidDates.forEach(date => {
        expect(isDate(date)).toBe(false);
      });
    });

    it('应该验证时间格式', () => {
      const validTimes = [
        '10:30:00',
        '23:59:59',
        '00:00:00'
      ];

      const invalidTimes = [
        'not-a-time',
        '25:00:00',
        '10:60:00'
      ];

      validTimes.forEach(time => {
        expect(isTime(time)).toBe(true);
      });

      invalidTimes.forEach(time => {
        expect(isTime(time)).toBe(false);
      });
    });

    it('应该验证日期时间格式', () => {
      const validDateTimes = [
        '2024-01-01 10:30:00',
        '2024-12-31T23:59:59Z',
        new Date()
      ];

      const invalidDateTimes = [
        'not-a-datetime',
        '2024-01-01 25:00:00',
        '2024-13-01T10:30:00Z'
      ];

      validDateTimes.forEach(datetime => {
        expect(isDateTime(datetime)).toBe(true);
      });

      invalidDateTimes.forEach(datetime => {
        expect(isDateTime(datetime)).toBe(false);
      });
    });

    it('应该验证ISO8601格式', () => {
      const validISO8601 = [
        '2024-01-01T10:30:00Z',
        '2024-01-01T10:30:00.000Z',
        '2024-01-01T10:30:00+08:00'
      ];

      const invalidISO8601 = [
        'not-iso8601',
        '2024-01-01 10:30:00',
        '2024/01/01T10:30:00Z'
      ];

      validISO8601.forEach(iso => {
        expect(isISO8601(iso)).toBe(true);
      });

      invalidISO8601.forEach(iso => {
        expect(isISO8601(iso)).toBe(false);
      });
    });
  });

  describe('字符类型验证', () => {
    it('应该验证字母字符', () => {
      expect(isAlpha('hello')).toBe(true);
      expect(isAlpha('Hello')).toBe(true);
      expect(isAlpha('hello123')).toBe(false);
      expect(isAlpha('hello world')).toBe(false);
    });

    it('应该验证字母数字字符', () => {
      expect(isAlphanumeric('hello123')).toBe(true);
      expect(isAlphanumeric('Hello123')).toBe(true);
      expect(isAlphanumeric('hello')).toBe(true);
      expect(isAlphanumeric('123')).toBe(true);
      expect(isAlphanumeric('hello world')).toBe(false);
      expect(isAlphanumeric('hello-123')).toBe(false);
    });

    it('应该验证数字字符', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('0')).toBe(true);
      expect(isNumeric('123.45')).toBe(false);
      expect(isNumeric('abc')).toBe(false);
    });

    it('应该验证小数', () => {
      expect(isDecimal('123.45')).toBe(true);
      expect(isDecimal('0.1')).toBe(true);
      expect(isDecimal('123')).toBe(false);
      expect(isDecimal('abc')).toBe(false);
    });

    it('应该验证十六进制', () => {
      expect(isHexadecimal('1a2b3c')).toBe(true);
      expect(isHexadecimal('ABCDEF')).toBe(true);
      expect(isHexadecimal('123456')).toBe(true);
      expect(isHexadecimal('xyz')).toBe(false);
    });

    it('应该验证Base64编码', () => {
      expect(isBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isBase64('SGVsbG8=')).toBe(true);
      expect(isBase64('invalid base64!')).toBe(false);
    });

    it('应该验证JSON格式', () => {
      expect(isJSON('{"key": "value"}')).toBe(true);
      expect(isJSON('[1, 2, 3]')).toBe(true);
      expect(isJSON('"string"')).toBe(true);
      expect(isJSON('invalid json')).toBe(false);
      expect(isJSON('{key: value}')).toBe(false);
    });
  });

  describe('密码强度验证', () => {
    it('应该验证基本密码格式', () => {
      expect(isPassword('password123')).toBe(true);
      expect(isPassword('pass')).toBe(false); // 太短
      expect(isPassword('')).toBe(false);
    });

    it('应该验证强密码', () => {
      strongPasswords.forEach(password => {
        expect(isStrongPassword(password)).toBe(true);
      });

      weakPasswords.forEach(password => {
        expect(isStrongPassword(password)).toBe(false);
      });
    });

    it('应该检查禁用密码列表', () => {
      const forbiddenPasswords = ['password', '123456', 'qwerty'];
      
      forbiddenPasswords.forEach(password => {
        expect(isStrongPassword(password)).toBe(false);
      });
    });

    it('应该验证密码复杂度要求', () => {
      const testCases = [
        { password: 'NoNumbers!', valid: false }, // 缺少数字
        { password: 'nonumbers123', valid: false }, // 缺少大写字母和特殊字符
        { password: 'NOLOWERCASE123!', valid: false }, // 缺少小写字母
        { password: 'NoSpecialChars123', valid: false }, // 缺少特殊字符
        { password: 'Valid123!', valid: true } // 满足所有要求
      ];

      testCases.forEach(({ password, valid }) => {
        expect(isStrongPassword(password)).toBe(valid);
      });
    });
  });

  describe('文件验证', () => {
    it('应该验证文件类型', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
      expect(isFileType('image/jpeg', allowedTypes)).toBe(true);
      expect(isFileType('image/png', allowedTypes)).toBe(true);
      expect(isFileType('application/pdf', allowedTypes)).toBe(true);
      expect(isFileType('text/plain', allowedTypes)).toBe(false);
    });

    it('应该验证图片文件', () => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const nonImageTypes = ['text/plain', 'application/pdf', 'video/mp4'];

      imageTypes.forEach(type => {
        expect(isImageFile(type)).toBe(true);
      });

      nonImageTypes.forEach(type => {
        expect(isImageFile(type)).toBe(false);
      });
    });

    it('应该验证文档文件', () => {
      const documentTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      const nonDocumentTypes = ['image/jpeg', 'video/mp4', 'audio/mp3'];

      documentTypes.forEach(type => {
        expect(isDocumentFile(type)).toBe(true);
      });

      nonDocumentTypes.forEach(type => {
        expect(isDocumentFile(type)).toBe(false);
      });
    });

    it('应该验证文件大小', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      expect(isFileSize(5 * 1024 * 1024, maxSize)).toBe(true); // 5MB
      expect(isFileSize(15 * 1024 * 1024, maxSize)).toBe(false); // 15MB
      expect(isFileSize(0, maxSize)).toBe(true);
    });

    it('应该验证文件名', () => {
      const validFilenames = [
        'document.pdf',
        'image_001.jpg',
        'my-file.txt'
      ];

      const invalidFilenames = [
        'file<name>.txt', // 包含非法字符
        'file|name.txt',
        'file:name.txt',
        '.hidden', // 隐藏文件
        'file.', // 以点结尾
        'very-long-filename-that-exceeds-the-maximum-allowed-length-for-filenames.txt'
      ];

      validFilenames.forEach(filename => {
        expect(isFilename(filename)).toBe(true);
      });

      invalidFilenames.forEach(filename => {
        expect(isFilename(filename)).toBe(false);
      });
    });
  });

  describe('特殊格式验证', () => {
    it('应该验证URL slug格式', () => {
      const validSlugs = [
        'hello-world',
        'my-blog-post',
        'article-123'
      ];

      const invalidSlugs = [
        'Hello World', // 包含空格和大写
        'hello_world', // 包含下划线
        'hello--world', // 连续连字符
        '-hello-world', // 以连字符开头
        'hello-world-' // 以连字符结尾
      ];

      validSlugs.forEach(slug => {
        expect(isSlug(slug)).toBe(true);
      });

      invalidSlugs.forEach(slug => {
        expect(isSlug(slug)).toBe(false);
      });
    });

    it('应该验证颜色格式', () => {
      const validColors = [
        '#FF0000',
        '#ff0000',
        'rgb(255, 0, 0)',
        'rgba(255, 0, 0, 0.5)',
        'red',
        'blue'
      ];

      const invalidColors = [
        'not-a-color',
        '#GG0000',
        'rgb(256, 0, 0)',
        'rgba(255, 0, 0, 1.5)'
      ];

      validColors.forEach(color => {
        expect(isColor(color)).toBe(true);
      });

      invalidColors.forEach(color => {
        expect(isColor(color)).toBe(false);
      });
    });

    it('应该验证坐标格式', () => {
      const validCoordinates = [
        { lat: 40.7128, lng: -74.0060 }, // New York
        { lat: 0, lng: 0 }, // Equator/Prime Meridian
        { lat: -90, lng: 180 } // South Pole
      ];

      const invalidCoordinates = [
        { lat: 91, lng: 0 }, // 纬度超出范围
        { lat: 0, lng: 181 }, // 经度超出范围
        { lat: 'invalid', lng: 0 },
        { lat: 0, lng: 'invalid' }
      ];

      validCoordinates.forEach(coord => {
        expect(isCoordinate(coord)).toBe(true);
      });

      invalidCoordinates.forEach(coord => {
        expect(isCoordinate(coord)).toBe(false);
      });
    });
  });

  describe('数据清理和转义', () => {
    it('应该清理字符串', () => {
      const dirtyString = '  Hello World  ';
      const cleanString = sanitizeString(dirtyString);
      
      expect(cleanString).toBe('Hello World');
      expect(mockValidatorLib.trim).toHaveBeenCalledWith(dirtyString);
    });

    it('应该清理HTML内容', () => {
      const dirtyHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const cleanHTML = sanitizeHTML(dirtyHTML);
      
      expect(mockDOMPurify.sanitize).toHaveBeenCalledWith(dirtyHTML, expect.any(Object));
    });

    it('应该转义特殊字符', () => {
      const unsafeString = '<script>alert("xss")</script>';
      const escapedString = escape(unsafeString);
      
      expect(mockValidatorLib.escape).toHaveBeenCalledWith(unsafeString);
    });

    it('应该反转义字符', () => {
      const escapedString = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
      const unescapedString = unescape(escapedString);
      
      expect(mockValidatorLib.unescape).toHaveBeenCalledWith(escapedString);
    });

    it('应该标准化邮箱地址', () => {
      const email = 'User@Example.COM';
      const normalizedEmail = normalize(email, 'email');
      
      expect(mockValidatorLib.normalizeEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('复合验证', () => {
    it('应该验证对象结构', () => {
      const schema = {
        name: { required: true, type: 'string', minLength: 2 },
        email: { required: true, type: 'email' },
        age: { required: false, type: 'number', min: 0, max: 120 }
      };

      const validObject = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const invalidObject = {
        name: 'J', // 太短
        email: 'invalid-email', // 无效邮箱
        age: -5 // 负数
      };

      const validResult = validateObject(validObject, schema);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateObject(invalidObject, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('应该验证数组元素', () => {
      const elementSchema = {
        type: 'string',
        minLength: 3
      };

      const validArray = ['hello', 'world', 'test'];
      const invalidArray = ['hi', 'world', 'a']; // 包含太短的字符串

      const validResult = validateArray(validArray, elementSchema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateArray(invalidArray, elementSchema);
      expect(invalidResult.isValid).toBe(false);
    });

    it('应该创建自定义验证器', () => {
      const customValidator = createValidator({
        name: 'isEven',
        message: 'Value must be even',
        validator: (value) => typeof value === 'number' && value % 2 === 0
      });

      expect(customValidator(4)).toBe(true);
      expect(customValidator(3)).toBe(false);
      expect(customValidator('4')).toBe(false);
    });

    it('应该组合多个验证器', () => {
      const combinedValidator = combineValidators([
        isRequired,
        isString,
        (value) => isMinLength(value, 5)
      ]);

      expect(combinedValidator('hello')).toBe(true);
      expect(combinedValidator('hi')).toBe(false); // 太短
      expect(combinedValidator('')).toBe(false); // 空字符串
      expect(combinedValidator(123)).toBe(false); // 不是字符串
    });

    it('应该支持条件验证', () => {
      const conditionalValidator = conditionalValidator(
        (data) => data.type === 'email',
        isEmail
      );

      expect(conditionalValidator({ type: 'email', value: 'user@example.com' })).toBe(true);
      expect(conditionalValidator({ type: 'email', value: 'invalid-email' })).toBe(false);
      expect(conditionalValidator({ type: 'phone', value: 'not-an-email' })).toBe(true); // 跳过验证
    });
  });

  describe('表单验证', () => {
    it('应该验证表单数据', () => {
      const formSchema = {
        username: {
          required: true,
          type: 'string',
          minLength: 3,
          maxLength: 20,
          pattern: /^[a-zA-Z0-9_]+$/
        },
        email: {
          required: true,
          type: 'email'
        },
        password: {
          required: true,
          type: 'password',
          strong: true
        },
        confirmPassword: {
          required: true,
          type: 'string',
          matches: 'password'
        },
        age: {
          required: false,
          type: 'number',
          min: 13,
          max: 120
        },
        terms: {
          required: true,
          type: 'boolean',
          equals: true
        }
      };

      const validFormData = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'StrongP@ssw0rd',
        confirmPassword: 'StrongP@ssw0rd',
        age: 25,
        terms: true
      };

      const invalidFormData = {
        username: 'jo', // 太短
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different',
        age: 10, // 太小
        terms: false
      };

      const validResult = validateForm(validFormData, formSchema);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toEqual({});

      const invalidResult = validateForm(invalidFormData, formSchema);
      expect(invalidResult.isValid).toBe(false);
      expect(Object.keys(invalidResult.errors)).toHaveLength(6);
    });
  });

  describe('文件上传验证', () => {
    it('应该验证上传文件', () => {
      const validFile = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 5 * 1024 * 1024 // 5MB
      };

      const invalidFile = {
        name: 'malicious<script>.exe',
        type: 'application/x-executable',
        size: 50 * 1024 * 1024 // 50MB
      };

      const validResult = validateFile(validFile);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateFile(invalidFile);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('应该验证批量文件上传', () => {
      const files = [
        {
          name: 'image1.jpg',
          type: 'image/jpeg',
          size: 2 * 1024 * 1024
        },
        {
          name: 'image2.png',
          type: 'image/png',
          size: 3 * 1024 * 1024
        },
        {
          name: 'invalid.exe',
          type: 'application/x-executable',
          size: 1 * 1024 * 1024
        }
      ];

      const result = validateUpload(files);
      expect(result.validFiles).toHaveLength(2);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.totalSize).toBe(6 * 1024 * 1024);
    });
  });

  describe('错误处理', () => {
    it('应该格式化验证错误', () => {
      const error = new ValidationError('INVALID_EMAIL', 'Invalid email format', {
        field: 'email',
        value: 'invalid-email'
      });

      const formattedError = formatValidationError(error);
      
      expect(formattedError).toEqual(
        expect.objectContaining({
          type: 'INVALID_EMAIL',
          message: 'Invalid email format',
          field: 'email',
          value: 'invalid-email'
        })
      );
    });

    it('应该检测验证错误类型', () => {
      const validationError = new ValidationError('VALIDATION_FAILED', 'Validation failed');
      const regularError = new Error('Regular error');

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(regularError)).toBe(false);
    });

    it('应该收集所有验证错误', () => {
      const data = {
        email: 'invalid-email',
        age: -5,
        name: ''
      };

      const schema = {
        email: { required: true, type: 'email' },
        age: { required: true, type: 'number', min: 0 },
        name: { required: true, type: 'string', minLength: 1 }
      };

      const errors = getValidationErrors(data, schema);
      
      expect(errors).toHaveLength(3);
      expect(errors.map(e => e.field)).toEqual(['email', 'age', 'name']);
    });
  });

  describe('异步验证', () => {
    it('应该支持异步验证器', async () => {
      const asyncEmailValidator = asyncValidator(async (email) => {
        // 模拟异步邮箱唯一性检查
        await new Promise(resolve => setTimeout(resolve, 100));
        return email !== 'taken@example.com';
      });

      const uniqueEmailResult = await asyncEmailValidator('unique@example.com');
      expect(uniqueEmailResult).toBe(true);

      const takenEmailResult = await asyncEmailValidator('taken@example.com');
      expect(takenEmailResult).toBe(false);
    });

    it('应该处理异步验证错误', async () => {
      const failingAsyncValidator = asyncValidator(async () => {
        throw new Error('Async validation failed');
      });

      try {
        await failingAsyncValidator('test');
        expect(true).toBe(false); // 不应该到达这里
      } catch (error) {
        expect(error.message).toBe('Async validation failed');
      }
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量验证', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        age: 20 + (i % 50)
      }));

      const schema = {
        id: { required: true, type: 'number' },
        email: { required: true, type: 'email' },
        name: { required: true, type: 'string', minLength: 1 },
        age: { required: true, type: 'number', min: 0, max: 120 }
      };

      const startTime = Date.now();
      data.forEach(item => validateObject(item, schema));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该优化验证器缓存', () => {
      const email = 'test@example.com';
      
      // 多次验证同一个邮箱
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        isEmail(email);
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // 应该很快完成
    });
  });
});

/**
 * 验证器工具便捷函数导出测试
 */
describe('验证器工具便捷函数', () => {
  it('应该导出所有必要的验证函数', () => {
    expect(typeof isRequired).toBe('function');
    expect(typeof isString).toBe('function');
    expect(typeof isNumber).toBe('function');
    expect(typeof isBoolean).toBe('function');
    expect(typeof isArray).toBe('function');
    expect(typeof isObject).toBe('function');
    expect(typeof isEmail).toBe('function');
    expect(typeof isURL).toBe('function');
    expect(typeof isUUID).toBe('function');
    expect(typeof isPhoneNumber).toBe('function');
    expect(typeof isIPAddress).toBe('function');
    expect(typeof isCreditCard).toBe('function');
    expect(typeof isDate).toBe('function');
    expect(typeof isTime).toBe('function');
    expect(typeof isDateTime).toBe('function');
    expect(typeof isISO8601).toBe('function');
    expect(typeof isLength).toBe('function');
    expect(typeof isMinLength).toBe('function');
    expect(typeof isMaxLength).toBe('function');
    expect(typeof isMin).toBe('function');
    expect(typeof isMax).toBe('function');
    expect(typeof isRange).toBe('function');
    expect(typeof isAlpha).toBe('function');
    expect(typeof isAlphanumeric).toBe('function');
    expect(typeof isNumeric).toBe('function');
    expect(typeof isDecimal).toBe('function');
    expect(typeof isHexadecimal).toBe('function');
    expect(typeof isBase64).toBe('function');
    expect(typeof isJSON).toBe('function');
    expect(typeof isPassword).toBe('function');
    expect(typeof isStrongPassword).toBe('function');
    expect(typeof isFileType).toBe('function');
    expect(typeof isImageFile).toBe('function');
    expect(typeof isDocumentFile).toBe('function');
    expect(typeof isVideoFile).toBe('function');
    expect(typeof isAudioFile).toBe('function');
    expect(typeof isFileSize).toBe('function');
    expect(typeof isFilename).toBe('function');
    expect(typeof isSlug).toBe('function');
    expect(typeof isHashtag).toBe('function');
    expect(typeof isMention).toBe('function');
    expect(typeof isColor).toBe('function');
    expect(typeof isHexColor).toBe('function');
    expect(typeof isRGBColor).toBe('function');
    expect(typeof isCoordinate).toBe('function');
    expect(typeof isLatitude).toBe('function');
    expect(typeof isLongitude).toBe('function');
    expect(typeof isPostalCode).toBe('function');
    expect(typeof isCountryCode).toBe('function');
    expect(typeof isCurrencyCode).toBe('function');
    expect(typeof isLanguageCode).toBe('function');
    expect(typeof isTimezone).toBe('function');
    expect(typeof isMimeType).toBe('function');
    expect(typeof isUserAgent).toBe('function');
    expect(typeof isJWT).toBe('function');
    expect(typeof isAPIKey).toBe('function');
    expect(typeof isSecretKey).toBe('function');
  });

  it('应该导出所有清理和转义函数', () => {
    expect(typeof sanitizeString).toBe('function');
    expect(typeof sanitizeHTML).toBe('function');
    expect(typeof sanitizeSQL).toBe('function');
    expect(typeof escape).toBe('function');
    expect(typeof unescape).toBe('function');
    expect(typeof trim).toBe('function');
    expect(typeof normalize).toBe('function');
  });

  it('应该导出所有复合验证函数', () => {
    expect(typeof validateObject).toBe('function');
    expect(typeof validateArray).toBe('function');
    expect(typeof validateSchema).toBe('function');
    expect(typeof createValidator).toBe('function');
    expect(typeof combineValidators).toBe('function');
    expect(typeof conditionalValidator).toBe('function');
    expect(typeof asyncValidator).toB