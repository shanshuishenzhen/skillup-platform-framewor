/**
 * 格式化工具函数集合
 * 提供日期、时间、数字等常用格式化功能
 */

/**
 * 格式化日期为本地化字符串
 * @param date - 要格式化的日期
 * @param options - 格式化选项
 * @returns 格式化后的日期字符串
 * 
 * @example
 * formatDate(new Date()) // "2025年9月2日"
 * formatDate(new Date(), { includeTime: true }) // "2025年9月2日 16:30:45"
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: {
    includeTime?: boolean;
    locale?: string;
    timeZone?: string;
  } = {}
): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }
  
  const {
    includeTime = false,
    locale = 'zh-CN',
    timeZone = 'Asia/Shanghai'
  } = options;
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone
  };
  
  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.second = '2-digit';
  }
  
  return dateObj.toLocaleDateString(locale, formatOptions);
}

/**
 * 格式化时间为相对时间（如：2小时前）
 * @param date - 要格式化的日期
 * @returns 相对时间字符串
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1小时前"
 * formatRelativeTime(new Date(Date.now() + 86400000)) // "1天后"
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '-';
  }
  
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const isPast = diffMs < 0;
  const suffix = isPast ? '前' : '后';
  
  if (diffMinutes < 1) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟${suffix}`;
  } else if (diffHours < 24) {
    return `${diffHours}小时${suffix}`;
  } else if (diffDays < 30) {
    return `${diffDays}天${suffix}`;
  } else {
    return formatDate(dateObj);
  }
}

/**
 * 格式化时长（秒）为可读字符串
 * @param seconds - 秒数
 * @returns 格式化后的时长字符串
 * 
 * @example
 * formatDuration(3661) // "1小时1分钟1秒"
 * formatDuration(90) // "1分钟30秒"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours}小时`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes}分钟`);
  }
  
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}秒`);
  }
  
  return parts.join('');
}

/**
 * 格式化数字为百分比
 * @param value - 数值（0-1之间）
 * @param decimals - 小数位数
 * @returns 百分比字符串
 * 
 * @example
 * formatPercentage(0.856) // "85.6%"
 * formatPercentage(0.856, 0) // "86%"
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value == null) return '-';
  
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化分数
 * @param score - 得分
 * @param total - 总分
 * @returns 格式化后的分数字符串
 * 
 * @example
 * formatScore(85, 100) // "85/100"
 * formatScore(null, 100) // "-/100"
 */
export function formatScore(
  score: number | null | undefined,
  total: number | null | undefined
): string {
  const scoreStr = score != null ? score.toString() : '-';
  const totalStr = total != null ? total.toString() : '-';
  
  return `${scoreStr}/${totalStr}`;
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的文件大小字符串
 * 
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1048576) // "1.0 MB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return '-';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * 格式化考试状态
 * @param status - 考试状态
 * @returns 格式化后的状态字符串
 * 
 * @example
 * formatExamStatus('draft') // "草稿"
 * formatExamStatus('published') // "已发布"
 */
export function formatExamStatus(status: string | null | undefined): string {
  if (!status) return '-';
  
  const statusMap: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    active: '进行中',
    completed: '已结束',
    cancelled: '已取消'
  };
  
  return statusMap[status] || status;
}

/**
 * 格式化题目难度
 * @param difficulty - 难度等级
 * @returns 格式化后的难度字符串
 * 
 * @example
 * formatDifficulty('easy') // "简单"
 * formatDifficulty('hard') // "困难"
 */
export function formatDifficulty(difficulty: string | null | undefined): string {
  if (!difficulty) return '-';
  
  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };
  
  return difficultyMap[difficulty] || difficulty;
}

/**
 * 格式化题目类型
 * @param type - 题目类型
 * @returns 格式化后的类型字符串
 * 
 * @example
 * formatQuestionType('choice') // "选择题"
 * formatQuestionType('coding') // "编程题"
 */
export function formatQuestionType(type: string | null | undefined): string {
  if (!type) return '-';
  
  const typeMap: Record<string, string> = {
    choice: '选择题',
    true_false: '判断题',
    fill_blank: '填空题',
    short_answer: '简答题',
    coding: '编程题'
  };
  
  return typeMap[type] || type;
}

/**
 * 截断文本并添加省略号
 * @param text - 要截断的文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本
 * 
 * @example
 * truncateText('这是一段很长的文本内容', 10) // "这是一段很长的文..."
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number = 50
): string {
  if (!text) return '-';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength) + '...';
}

/**
 * 格式化数字，添加千分位分隔符
 * @param num - 要格式化的数字
 * @returns 格式化后的数字字符串
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '-';
  
  return num.toLocaleString('zh-CN');
}