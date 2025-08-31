/**
 * Excel模板下载API
 * 提供各种数据导入模板的下载服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';
import { 
  getAllTemplates, 
  getTemplateByType, 
  generateExcelData,
  ExcelTemplate 
} from '@/utils/excelTemplateGenerator';

/**
 * GET /api/admin/templates
 * 获取所有可用模板列表或下载指定模板
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const action = searchParams.get('action') || 'list';

    // 如果是获取模板列表
    if (action === 'list') {
      const templates = getAllTemplates();
      const templateList = templates.map(template => ({
        type: getTemplateTypeByName(template.name),
        name: template.name,
        filename: template.filename,
        description: template.description,
        version: template.version,
        columnCount: template.columns.length,
        sampleDataCount: template.sampleData?.length || 0
      }));

      return NextResponse.json({
        success: true,
        data: templateList
      });
    }

    // 如果是下载模板
    if (action === 'download' && type) {
      const template = getTemplateByType(type);
      
      if (!template) {
        return NextResponse.json({
          success: false,
          message: '模板类型不存在'
        }, { status: 404 });
      }

      const excelData = generateExcelData(template);
      
      return NextResponse.json({
        success: true,
        data: excelData,
        filename: template.filename,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    // 如果是获取模板详情
    if (action === 'detail' && type) {
      const template = getTemplateByType(type);
      
      if (!template) {
        return NextResponse.json({
          success: false,
          message: '模板类型不存在'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: template
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的请求参数'
    }, { status: 400 });

  } catch (error) {
    console.error('获取模板失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取模板失败'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/templates/validate
 * 验证上传的Excel文件是否符合模板格式
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, headers, data } = body;

    if (!type || !headers || !data) {
      return NextResponse.json({
        success: false,
        message: '请提供模板类型、表头和数据'
      }, { status: 400 });
    }

    const template = getTemplateByType(type);
    if (!template) {
      return NextResponse.json({
        success: false,
        message: '模板类型不存在'
      }, { status: 404 });
    }

    // 验证表头
    const validationResult = validateExcelData(template, headers, data);
    
    return NextResponse.json({
      success: true,
      data: validationResult
    });

  } catch (error) {
    console.error('验证模板失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '验证模板失败'
    }, { status: 500 });
  }
}

/**
 * 根据模板名称获取类型
 */
function getTemplateTypeByName(name: string): string {
  if (name.includes('用户')) return 'users';
  if (name.includes('考试')) return 'exams';
  if (name.includes('资源')) return 'resources';
  return 'unknown';
}

/**
 * 验证Excel数据
 */
function validateExcelData(template: ExcelTemplate, headers: string[], data: any[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 验证表头
  const requiredHeaders = template.columns.map(col => col.title);
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  const extraHeaders = headers.filter(header => !requiredHeaders.includes(header));
  
  if (missingHeaders.length > 0) {
    errors.push(`缺少必需的列: ${missingHeaders.join(', ')}`);
  }
  
  if (extraHeaders.length > 0) {
    warnings.push(`发现额外的列: ${extraHeaders.join(', ')}`);
  }
  
  // 验证数据
  const validData: any[] = [];
  const invalidRows: Array<{ row: number; errors: string[] }> = [];
  
  data.forEach((row, index) => {
    const rowErrors: string[] = [];
    const validatedRow: any = {};
    
    template.columns.forEach(column => {
      const value = row[column.title];
      const columnIndex = headers.indexOf(column.title);
      
      // 检查必填字段
      if (column.required && (value === undefined || value === null || value === '')) {
        rowErrors.push(`${column.title}不能为空`);
        return;
      }
      
      // 类型验证
      if (value !== undefined && value !== null && value !== '') {
        const validationError = validateFieldValue(column, value);
        if (validationError) {
          rowErrors.push(`${column.title}: ${validationError}`);
        } else {
          validatedRow[column.key] = value;
        }
      }
    });
    
    if (rowErrors.length > 0) {
      invalidRows.push({
        row: index + 1,
        errors: rowErrors
      });
    } else {
      validData.push(validatedRow);
    }
  });
  
  return {
    isValid: errors.length === 0 && invalidRows.length === 0,
    errors,
    warnings,
    validData,
    invalidRows,
    summary: {
      totalRows: data.length,
      validRows: validData.length,
      invalidRows: invalidRows.length,
      errorCount: errors.length,
      warningCount: warnings.length
    }
  };
}

/**
 * 验证字段值
 */
function validateFieldValue(column: any, value: any): string | null {
  // 邮箱验证
  if (column.type === 'email') {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(value)) {
      return '邮箱格式不正确';
    }
  }
  
  // 手机号验证
  if (column.type === 'phone') {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(value)) {
      return '手机号格式不正确';
    }
  }
  
  // 数字验证
  if (column.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) {
      return '必须是数字';
    }
    if (column.validation?.min !== undefined && num < column.validation.min) {
      return `不能小于${column.validation.min}`;
    }
    if (column.validation?.max !== undefined && num > column.validation.max) {
      return `不能大于${column.validation.max}`;
    }
  }
  
  // 选择项验证
  if (column.type === 'select' && column.options) {
    if (!column.options.includes(value)) {
      return `必须是以下值之一: ${column.options.join(', ')}`;
    }
  }
  
  // 长度验证
  if (column.validation?.min !== undefined && value.length < column.validation.min) {
    return `长度不能少于${column.validation.min}个字符`;
  }
  if (column.validation?.max !== undefined && value.length > column.validation.max) {
    return `长度不能超过${column.validation.max}个字符`;
  }
  
  // 正则验证
  if (column.validation?.pattern) {
    const regex = new RegExp(column.validation.pattern);
    if (!regex.test(value)) {
      return column.validation.message || '格式不正确';
    }
  }
  
  return null;
}
