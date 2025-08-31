import * as XLSX from 'xlsx';
import { convertChineseFieldName } from './import-validation';

/**
 * 文件解析结果接口
 */
export interface ParseResult {
  success: boolean;
  data: Record<string, any>[];
  headers: string[];
  error?: string;
  totalRows: number;
  validRows: number;
}

/**
 * 支持的文件类型
 */
export const SUPPORTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/csv': 'csv',
  'application/csv': 'csv'
};

/**
 * 检查文件类型是否支持
 */
export function isSupportedFileType(mimeType: string): boolean {
  return Object.keys(SUPPORTED_FILE_TYPES).includes(mimeType);
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * 解析CSV文件
 */
export function parseCSV(content: string): ParseResult {
  try {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        data: [],
        headers: [],
        error: 'CSV文件为空',
        totalRows: 0,
        validRows: 0
      };
    }
    
    // 解析表头
    const headers = lines[0].split(',').map(header => 
      header.trim().replace(/^"|"$/g, '') // 移除引号
    );
    
    // 标准化表头
    const normalizedHeaders = headers.map(header => convertChineseFieldName(header));
    
    const data: Record<string, any>[] = [];
    let validRows = 0;
    
    // 解析数据行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      if (values.length !== headers.length) {
        continue; // 跳过列数不匹配的行
      }
      
      const row: Record<string, any> = {};
      for (let j = 0; j < normalizedHeaders.length; j++) {
        row[normalizedHeaders[j]] = values[j]?.trim() || '';
      }
      
      // 检查是否为空行（所有字段都为空）
      const hasData = Object.values(row).some(value => value !== '');
      if (hasData) {
        data.push(row);
        validRows++;
      }
    }
    
    return {
      success: true,
      data,
      headers: normalizedHeaders,
      totalRows: lines.length - 1,
      validRows
    };
    
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      error: error instanceof Error ? error.message : 'CSV解析失败',
      totalRows: 0,
      validRows: 0
    };
  }
}

/**
 * 解析CSV行（处理引号和逗号）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 双引号转义
        current += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * 解析Excel文件
 */
export function parseExcel(buffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        data: [],
        headers: [],
        error: 'Excel文件中没有工作表',
        totalRows: 0,
        validRows: 0
      };
    }
    
    // 使用第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return {
        success: false,
        data: [],
        headers: [],
        error: '无法读取工作表',
        totalRows: 0,
        validRows: 0
      };
    }
    
    // 转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // 使用数组格式
      defval: '', // 空单元格默认值
      raw: false // 将所有值转换为字符串
    }) as any[][];
    
    if (jsonData.length === 0) {
      return {
        success: false,
        data: [],
        headers: [],
        error: 'Excel文件为空',
        totalRows: 0,
        validRows: 0
      };
    }
    
    // 获取表头
    const headers = jsonData[0].map(header => 
      String(header || '').trim()
    ).filter(header => header !== '');
    
    if (headers.length === 0) {
      return {
        success: false,
        data: [],
        headers: [],
        error: '未找到有效的表头',
        totalRows: 0,
        validRows: 0
      };
    }
    
    // 标准化表头
    const normalizedHeaders = headers.map(header => convertChineseFieldName(header));
    
    const data: Record<string, any>[] = [];
    let validRows = 0;
    
    // 解析数据行
    for (let i = 1; i < jsonData.length; i++) {
      const rowData = jsonData[i];
      if (!rowData || rowData.length === 0) continue;
      
      const row: Record<string, any> = {};
      let hasData = false;
      
      for (let j = 0; j < normalizedHeaders.length; j++) {
        const value = j < rowData.length ? String(rowData[j] || '').trim() : '';
        row[normalizedHeaders[j]] = value;
        
        if (value !== '') {
          hasData = true;
        }
      }
      
      // 只添加有数据的行
      if (hasData) {
        data.push(row);
        validRows++;
      }
    }
    
    return {
      success: true,
      data,
      headers: normalizedHeaders,
      totalRows: jsonData.length - 1,
      validRows
    };
    
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      error: error instanceof Error ? error.message : 'Excel解析失败',
      totalRows: 0,
      validRows: 0
    };
  }
}

/**
 * 通用文件解析函数
 */
export async function parseFile(file: File): Promise<ParseResult> {
  try {
    // 验证文件类型
    if (!isSupportedFileType(file.type)) {
      const extension = getFileExtension(file.name);
      if (!['xlsx', 'xls', 'csv'].includes(extension)) {
        return {
          success: false,
          data: [],
          headers: [],
          error: '不支持的文件类型，请上传Excel(.xlsx, .xls)或CSV(.csv)文件',
          totalRows: 0,
          validRows: 0
        };
      }
    }
    
    // 验证文件大小
    if (!validateFileSize(file)) {
      return {
        success: false,
        data: [],
        headers: [],
        error: '文件大小超过10MB限制',
        totalRows: 0,
        validRows: 0
      };
    }
    
    // 读取文件内容
    const buffer = await file.arrayBuffer();
    
    // 根据文件类型解析
    const extension = getFileExtension(file.name);
    const mimeType = file.type;
    
    if (extension === 'csv' || mimeType.includes('csv')) {
      const content = new TextDecoder('utf-8').decode(buffer);
      return parseCSV(content);
    } else if (['xlsx', 'xls'].includes(extension) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return parseExcel(buffer);
    } else {
      return {
        success: false,
        data: [],
        headers: [],
        error: '无法识别文件格式',
        totalRows: 0,
        validRows: 0
      };
    }
    
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      error: error instanceof Error ? error.message : '文件解析失败',
      totalRows: 0,
      validRows: 0
    };
  }
}

/**
 * 生成CSV内容
 */
export function generateCSV(data: Record<string, any>[], headers?: string[]): string {
  if (data.length === 0) return '';
  
  const csvHeaders = headers || Object.keys(data[0]);
  const csvRows = [csvHeaders];
  
  data.forEach(row => {
    const csvRow = csvHeaders.map(header => {
      const value = row[header] || '';
      const stringValue = String(value);
      
      // 如果值包含逗号、引号或换行符，需要用引号包围
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    
    csvRows.push(csvRow);
  });
  
  return csvRows.map(row => row.join(',')).join('\n');
}

/**
 * 下载CSV文件
 */
export function downloadCSV(data: Record<string, any>[], filename: string, headers?: string[]): void {
  const csvContent = generateCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 预览数据（返回前几行用于显示）
 */
export function previewData(data: Record<string, any>[], maxRows: number = 5): Record<string, any>[] {
  return data.slice(0, maxRows);
}

/**
 * 获取数据统计信息
 */
export function getDataStats(data: Record<string, any>[]): {
  totalRows: number;
  totalColumns: number;
  emptyRows: number;
  columnStats: Record<string, { filled: number; empty: number; }>;
} {
  if (data.length === 0) {
    return {
      totalRows: 0,
      totalColumns: 0,
      emptyRows: 0,
      columnStats: {}
    };
  }
  
  const columns = Object.keys(data[0]);
  const columnStats: Record<string, { filled: number; empty: number; }> = {};
  
  // 初始化列统计
  columns.forEach(col => {
    columnStats[col] = { filled: 0, empty: 0 };
  });
  
  let emptyRows = 0;
  
  data.forEach(row => {
    let hasData = false;
    
    columns.forEach(col => {
      const value = row[col];
      if (value && String(value).trim() !== '') {
        columnStats[col].filled++;
        hasData = true;
      } else {
        columnStats[col].empty++;
      }
    });
    
    if (!hasData) {
      emptyRows++;
    }
  });
  
  return {
    totalRows: data.length,
    totalColumns: columns.length,
    emptyRows,
    columnStats
  };
}