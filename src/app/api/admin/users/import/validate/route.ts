import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { z } from 'zod';
import { UserRole, isValidRole } from '@/types/roles';
import { 
  FIELD_DISPLAY_NAMES, 
  CHINESE_TO_ENGLISH_FIELDS, 
  REQUIRED_FIELDS, 
  OPTIONAL_FIELDS,
  getFieldDisplayName,
  getEnglishFieldName,
  validateFieldValue,
  convertChineseRoleToEnglish
} from '@/types/dictionary';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 用户导入数据验证模式
const UserImportSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  phone: z.string().min(1, '手机号不能为空').regex(/^1[3-9]\d{9}$/, '手机号格式不正确，必须为11位数字'),
  id_card: z.string().min(1, '身份证号码不能为空').regex(/^[1-9]\d{13}[0-9Xx]$|^[1-9]\d{16}[0-9Xx]$/, '身份证号码格式不正确，必须为15位或18位，末位可以是数字或X'),
  role: z.enum(['admin', 'expert', 'teacher', 'student', 'examiner', 'internal_supervisor', 'guest'], {
    errorMap: () => ({ message: '角色必须为：admin, expert, teacher, student, examiner, internal_supervisor, guest 之一' })
  }),
  password: z.string().min(1, '密码不能为空').min(6, '密码至少6位字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  organization: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

type UserImportData = z.infer<typeof UserImportSchema>;

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  duplicates: {
    row: number;
    field: string;
    value: string;
    existingUser?: string;
  }[];
  preview: UserImportData[];
  summary: {
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

/**
 * 解析Excel/CSV文件
 * @param buffer 文件缓冲区
 * @param filename 文件名
 * @returns 解析后的数据数组
 */
function parseFile(buffer: Buffer, filename: string): Record<string, string>[] {
  try {
    let data: Record<string, string>[] = [];
    
    if (filename.endsWith('.csv')) {
      // 解析CSV文件
      const text = buffer.toString('utf-8');
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          return getEnglishFieldName(header.trim()) || header.trim();
        },
        transform: (value: string, field: string) => {
          let transformedValue = value.trim();
          // 特殊处理角色字段：将中文角色名转换为英文
          if (field === 'role' && transformedValue) {
            transformedValue = convertChineseRoleToEnglish(transformedValue);
          }
          return transformedValue;
        }
      });
      
      if (parseResult.errors.length > 0) {
        throw new Error(`CSV解析错误: ${parseResult.errors.map(e => e.message).join(', ')}`);
      }
      
      data = parseResult.data as Record<string, string>[];
    } else {
      // 解析Excel文件
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
      
      // 转换中文表头为英文字段名
      data = rawData.map(row => {
        const convertedRow: Record<string, string> = {};
        Object.keys(row).forEach(key => {
          const englishKey = getEnglishFieldName(key.trim()) || key.trim();
          const rawValue = row[key as keyof typeof row];
          
          // 确保所有值都转换为字符串类型
          let value: string;
          if (rawValue !== null && rawValue !== undefined) {
            value = rawValue.toString().trim();
          } else {
            value = '';
          }
          
          // 特殊处理角色字段：将中文角色名转换为英文
          if (englishKey === 'role' && value) {
            value = convertChineseRoleToEnglish(value);
          }
          
          convertedRow[englishKey] = value;
        });
        
        return convertedRow;
      });
    }
    
    return data.filter(row => {
      // 过滤掉完全空的行
      return Object.values(row).some(value => value && value.trim() !== '');
    });
  } catch (error) {
    throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证用户数据
 * @param data 原始数据
 * @returns 验证结果
 */
async function validateUserData(data: Record<string, string>[]): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const validUsers: UserImportData[] = [];
  const duplicates: ValidationResult['duplicates'] = [];
  
  // 统计信息
  const summary = {
    byRole: {} as Record<string, number>,
    byDepartment: {} as Record<string, number>,
    byStatus: {} as Record<string, number>
  };
  
  // 检查重复数据（文件内部重复）
  const phoneSet = new Set<string>();
  const idCardSet = new Set<string>();
  const emailSet = new Set<string>();
  const employeeIdSet = new Set<string>();
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2; // Excel行号从2开始（第1行是表头）
    
    try {
      // 检查文件内部重复
      if (row.phone && phoneSet.has(row.phone)) {
        duplicates.push({
          row: rowNumber,
          field: 'phone',
          value: row.phone
        });
      } else if (row.phone) {
        phoneSet.add(row.phone);
      }
      
      if (row.id_card && idCardSet.has(row.id_card)) {
        duplicates.push({
          row: rowNumber,
          field: 'id_card',
          value: row.id_card
        });
      } else if (row.id_card) {
        idCardSet.add(row.id_card);
      }
      
      if (row.email && emailSet.has(row.email)) {
        duplicates.push({
          row: rowNumber,
          field: 'email',
          value: row.email
        });
      } else if (row.email) {
        emailSet.add(row.email);
      }
      
      if (row.employee_id && employeeIdSet.has(row.employee_id)) {
        duplicates.push({
          row: rowNumber,
          field: 'employee_id',
          value: row.employee_id
        });
      } else if (row.employee_id) {
        employeeIdSet.add(row.employee_id);
      }
      
      // 数据格式验证
      const userData = UserImportSchema.parse(row);
      validUsers.push(userData);
      
      // 统计信息
      summary.byRole[userData.role] = (summary.byRole[userData.role] || 0) + 1;
      if (userData.department) {
        summary.byDepartment[userData.department] = (summary.byDepartment[userData.department] || 0) + 1;
      }
      summary.byStatus[userData.status] = (summary.byStatus[userData.status] || 0) + 1;
      
      // 检查警告项
      if (!userData.email) {
        warnings.push({
          row: rowNumber,
          field: 'email',
          value: '',
          error: '邮箱为空，将无法接收系统通知',
          severity: 'warning'
        });
      }
      
      if (!userData.department) {
        warnings.push({
          row: rowNumber,
          field: 'department',
          value: '',
          error: '部门为空，可能影响权限分配',
          severity: 'warning'
        });
      }
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(e => {
          errors.push({
            row: rowNumber,
            field: e.path.join('.'),
            value: row[e.path[0] as string] || '',
            error: e.message,
            severity: 'error'
          });
        });
      } else {
        errors.push({
          row: rowNumber,
          field: 'unknown',
          value: '',
          error: '数据格式错误',
          severity: 'error'
        });
      }
    }
  }
  
  // 检查数据库中的重复用户
  if (validUsers.length > 0) {
    const phones = validUsers.map(u => u.phone).filter(Boolean);
    const idCards = validUsers.map(u => u.id_card).filter(Boolean);
    const emails = validUsers.map(u => u.email).filter(Boolean);
    const employeeIds = validUsers.map(u => u.employee_id).filter(Boolean);
    
    const conditions = [];
    if (phones.length > 0) conditions.push(`phone.in.(${phones.join(',')})`);
    if (idCards.length > 0) conditions.push(`id_card.in.(${idCards.join(',')})`);
    if (emails.length > 0) conditions.push(`email.in.(${emails.join(',')})`);
    if (employeeIds.length > 0) conditions.push(`employee_id.in.(${employeeIds.join(',')})`);
    
    if (conditions.length > 0) {
      const { data: existingUsers, error } = await supabase
        .from('users')
        .select('name, phone, id_card, email, employee_id')
        .or(conditions.join(','));
      
      if (!error && existingUsers) {
        // 标记数据库中的重复用户
        validUsers.forEach((user, index) => {
          const existing = existingUsers.find(eu => 
            (user.phone && eu.phone === user.phone) ||
            (user.id_card && eu.id_card === user.id_card) ||
            (user.email && eu.email === user.email) ||
            (user.employee_id && eu.employee_id === user.employee_id)
          );
          
          if (existing) {
            const rowNumber = data.findIndex(d => 
              d.phone === user.phone || d.id_card === user.id_card
            ) + 2;
            
            duplicates.push({
              row: rowNumber,
              field: 'database',
              value: user.phone || user.id_card || user.email || '',
              existingUser: existing.name
            });
          }
        });
      }
    }
  }
  
  const errorRows = new Set(errors.map(e => e.row)).size;
  const warningRows = new Set(warnings.map(w => w.row)).size;
  
  return {
    success: errors.length === 0,
    totalRows: data.length,
    validRows: data.length - errorRows,
    errorRows,
    warningRows,
    errors,
    warnings,
    duplicates,
    preview: validUsers.slice(0, 10), // 只返回前10条预览数据
    summary
  };
}

/**
 * POST /api/admin/users/import/validate
 * 验证导入文件
 */
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: '缺少认证信息' },
        { status: 401 }
      );
    }
    
    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要验证的文件' },
        { status: 400 }
      );
    }
    
    // 验证文件类型
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, error: '不支持的文件格式，请使用CSV或Excel文件' },
        { status: 400 }
      );
    }
    
    // 验证文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '文件大小不能超过10MB' },
        { status: 400 }
      );
    }
    
    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 解析文件数据
    const rawData = parseFile(buffer, file.name);
    
    if (rawData.length === 0) {
      return NextResponse.json(
        { success: false, error: '文件中没有有效数据' },
        { status: 400 }
      );
    }
    
    // 验证数据
    const validationResult = await validateUserData(rawData);
    
    return NextResponse.json({
      success: true,
      data: validationResult
    });
    
  } catch (error) {
    console.error('文件验证错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '验证失败'
      },
      { status: 500 }
    );
  }
}