import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { ErrorHandler } from '@/utils/errorHandler';
import { UserRole, isValidRole, ROLE_DISPLAY_NAMES } from '@/types/roles';
import { 
  FIELD_DISPLAY_NAMES, 
  CHINESE_TO_ENGLISH_FIELDS, 
  REQUIRED_FIELDS, 
  OPTIONAL_FIELDS,
  getFieldDisplayName,
  getEnglishFieldName,
  validateFieldValue,
  getChineseHeaders,
  convertChineseHeadersToEnglish,
  convertChineseRoleToEnglish
} from '@/types/dictionary';
import fs from 'fs';
import path from 'path';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 用户导入数据验证模式
const UserImportSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  username: z.string().optional(), // 用户名字段，可选
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
  learning_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  learning_hours: z.number().min(0).default(0),
  exam_permissions: z.array(z.string()).default([]),
  certification_status: z.enum(['none', 'in_progress', 'certified', 'expired']).default('none'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active')
});

type UserImportData = z.infer<typeof UserImportSchema>;

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  duplicates: Array<{
    row: number;
    email: string;
    action: 'skipped' | 'updated';
  }>;
}

/**
 * 生成随机密码
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * 解析Excel/CSV文件
 */
function parseFile(buffer: Buffer, filename: string): UserImportData[] {
  try {
    let data: Record<string, string>[] = [];
    
    if (filename.endsWith('.csv')) {
      // 解析CSV文件
      const text = buffer.toString('utf-8');
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      // 将中文表头转换为英文字段名
      const englishHeaders = headers.map(header => getEnglishFieldName(header) || header);
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          englishHeaders.forEach((header, index) => {
            // 确保所有字段都被添加到row对象中，即使值为空
            let value = values[index] || '';
            value = value.toString().trim();
            
            // 特殊处理角色字段：将中文角色名转换为英文
            if (header === 'role' && value) {
              value = convertChineseRoleToEnglish(value);
            }
            
            row[header] = value;
          });
          
          // 确保所有必需的字段都存在，即使值为空
          const requiredFields = ['name', 'phone', 'id_card', 'role', 'password'];
          requiredFields.forEach(field => {
            if (!(field in row)) {
              row[field] = '';
            }
          });
          
          data.push(row);
        }
      }
    } else {
      // 解析Excel文件
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      // 转换中文表头为英文字段名
      data = rawData.map(row => {
        const convertedRow: Record<string, string> = {};
        Object.keys(row).forEach(key => {
          const englishKey = getEnglishFieldName(key) || key;
          let value = (row as any)[key];
          
          // 确保所有值都转换为字符串类型，包括空值
          if (value !== null && value !== undefined) {
            value = value.toString().trim();
          } else {
            value = '';
          }
          
          // 特殊处理角色字段：将中文角色名转换为英文
          if (englishKey === 'role' && value) {
            value = convertChineseRoleToEnglish(value);
          }
          
          convertedRow[englishKey] = value;
        });
        
        // 确保所有必需的字段都存在，即使值为空
        const requiredFields = ['name', 'phone', 'id_card', 'role', 'password'];
        requiredFields.forEach(field => {
          if (!(field in convertedRow)) {
            convertedRow[field] = '';
          }
        });
        
        return convertedRow;
       });
    }
    
    return data;
  } catch (error) {
    throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证用户数据
 */
function validateUserData(data: Record<string, string>[], startRow: number = 2): {
  validUsers: UserImportData[];
  errors: ImportResult['errors'];
} {
  const validUsers: UserImportData[] = [];
  const errors: ImportResult['errors'] = [];
  
  data.forEach((row, index) => {
    try {
      // 添加调试日志
      console.log(`验证第${startRow + index}行数据:`, {
        phone: row.phone,
        phoneType: typeof row.phone,
        password: row.password,
        passwordType: typeof row.password,
        role: row.role,
        roleType: typeof row.role
      });
      
      const userData = UserImportSchema.parse(row);
      validUsers.push(userData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.log(`第${startRow + index}行验证失败:`, errorMessages, '原始数据:', row);
        errors.push({
          row: startRow + index,
          email: row.email || row.name || '未知',
          error: errorMessages
        });
      } else {
        errors.push({
          row: startRow + index,
          email: row.email || row.name || '未知',
          error: '数据格式错误'
        });
      }
    }
  });
  
  return { validUsers, errors };
}

/**
 * 检查重复用户
 */
async function checkDuplicateUsers(users: UserImportData[]): Promise<{
  newUsers: UserImportData[];
  duplicates: ImportResult['duplicates'];
}> {
  const emails = users.map(user => user.email).filter(Boolean);
  const phones = users.map(user => user.phone).filter(Boolean);
  const idCards = users.map(user => user.id_card).filter(Boolean);
  const employeeIds = users.map(user => user.employee_id).filter(Boolean);
  
  // 构建查询条件
  const conditions = [];
  if (emails.length > 0) conditions.push(`email.in.(${emails.join(',')})`);
  if (phones.length > 0) conditions.push(`phone.in.(${phones.join(',')})`);
  if (idCards.length > 0) conditions.push(`id_card.in.(${idCards.join(',')})`);
  if (employeeIds.length > 0) conditions.push(`employee_id.in.(${employeeIds.join(',')})`);
  
  let existingUsers: any[] = [];
  
  if (conditions.length > 0) {
    // 查询已存在的用户
    const { data, error } = await supabase
      .from('users')
      .select('email, phone, id_card, employee_id')
      .or(conditions.join(','));
    
    if (error) {
      throw new Error('检查重复用户失败: ' + error.message);
    }
    
    existingUsers = data || [];
  }
  
  const existingEmails = new Set(existingUsers.filter(u => u.email).map(u => u.email));
  const existingPhones = new Set(existingUsers.filter(u => u.phone).map(u => u.phone));
  const existingIdCards = new Set(existingUsers.filter(u => u.id_card).map(u => u.id_card));
  const existingEmployeeIds = new Set(existingUsers.filter(u => u.employee_id).map(u => u.employee_id));
  
  const newUsers: UserImportData[] = [];
  const duplicates: ImportResult['duplicates'] = [];
  
  users.forEach((user, index) => {
    let isDuplicate = false;
    let duplicateField = '';
    
    if (user.email && existingEmails.has(user.email)) {
      isDuplicate = true;
      duplicateField = 'email';
    } else if (user.phone && existingPhones.has(user.phone)) {
      isDuplicate = true;
      duplicateField = 'phone';
    } else if (user.id_card && existingIdCards.has(user.id_card)) {
      isDuplicate = true;
      duplicateField = 'id_card';
    } else if (user.employee_id && existingEmployeeIds.has(user.employee_id)) {
      isDuplicate = true;
      duplicateField = 'employee_id';
    }
    
    if (isDuplicate) {
      duplicates.push({
        row: index + 2,
        email: user.email || user.name || '未知',
        action: 'skipped' // 可以根据配置决定是跳过还是更新
      });
    } else {
      newUsers.push(user);
    }
  });
  
  return { newUsers, duplicates };
}

/**
 * 批量创建用户
 */
async function createUsers(users: UserImportData[], batchId: string): Promise<{
  imported: number;
  errors: ImportResult['errors'];
}> {
  let imported = 0;
  const errors: ImportResult['errors'] = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      // 生成密码
      const password = user.password || generateRandomPassword();
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // 如果没有邮箱，生成一个临时邮箱
      const userEmail = user.email || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@temp.local`;
      
      // 创建用户认证记录
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: password,
        email_confirm: !user.email, // 如果是临时邮箱则不需要确认
        user_metadata: {
          name: user.name,
          role: user.role
        }
      });
      
      if (authError) {
        throw new Error(`认证创建失败: ${authError.message}`);
      }
      
      // 插入用户记录到users表
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          id_card: user.id_card,
          employee_id: user.employee_id,
          department: user.department,
          position: user.position,
          organization: user.organization,
          role: user.role,
          user_type: 'registered',
          password_hash: hashedPassword,
          import_batch_id: batchId,
          import_source: 'excel_import',
          import_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        // 如果资料创建失败，删除已创建的认证用户
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`用户资料创建失败: ${profileError.message}`);
      }
      
      imported++;
      
      // 发送欢迎邮件（可选）
      // await sendWelcomeEmail(user.email, user.name, password);
      
    } catch (error) {
      errors.push({
        row: i + 2,
        email: user.email || user.name || '未知',
        error: error instanceof Error ? error.message : '创建用户失败'
      });
    }
  }
  
  return { imported, errors };
}

/**
 * POST /api/admin/users/import
 * 批量导入用户
 */
export async function POST(request: NextRequest) {
  try {
    // 生成唯一的批次ID
    const batchId = randomUUID();
    
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
    const options = JSON.parse(formData.get('options') as string || '{}');
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要导入的文件' },
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
    
    // 处理数据格式
    const processedData = rawData.map((row: Record<string, string>) => {
      // 处理可能的字段名变体
      const normalizedRow: Record<string, unknown> = {};
      
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/[\s-_]/g, '');
        switch (normalizedKey) {
          case 'name':
          case 'username':
          case 'fullname':
            normalizedRow.name = row[key];
            break;
          case 'email':
          case 'emailaddress':
            normalizedRow.email = row[key];
            break;
          case 'phone':
          case 'phonenumber':
          case 'mobile':
            normalizedRow.phone = row[key];
            break;
          case 'employeeid':
          case 'empid':
          case 'staffid':
            normalizedRow.employee_id = row[key];
            break;
          case 'department':
          case 'dept':
            normalizedRow.department = row[key];
            break;
          case 'position':
          case 'title':
          case 'jobtitle':
            normalizedRow.position = row[key];
            break;
          case 'organization':
          case 'org':
          case 'company':
            normalizedRow.organization = row[key];
            break;
          case 'learninglevel':
          case 'level':
            normalizedRow.learning_level = row[key];
            break;
          case 'learninghours':
          case 'hours':
            normalizedRow.learning_hours = Number(row[key]) || 0;
            break;
          case 'exampermissions':
          case 'permissions':
            if (typeof row[key] === 'string') {
              normalizedRow.exam_permissions = row[key].split(',').map((perm: string) => perm.trim()).filter((perm: string) => perm.length > 0);
            } else if (Array.isArray(row[key])) {
              normalizedRow.exam_permissions = row[key];
            } else {
              normalizedRow.exam_permissions = [];
            }
            break;
          case 'certificationstatus':
          case 'certification':
            normalizedRow.certification_status = row[key];
            break;
          case 'role':
          case 'usertype':
            normalizedRow.role = row[key];
            break;
          case 'password':
          case 'pwd':
            normalizedRow.password = row[key];
            break;
          case 'status':
          case 'state':
            normalizedRow.status = row[key];
            break;
          default:
            normalizedRow[key] = row[key];
        }
      });
      
      return normalizedRow;
    });
    
    // 验证数据格式
    const { validUsers, errors: validationErrors } = validateUserData(processedData);
    
    // 检查重复用户
    const { newUsers, duplicates } = await checkDuplicateUsers(validUsers);
    
    // 批量创建用户
    const { imported, errors: creationErrors } = await createUsers(newUsers, batchId);
    
    // 合并所有错误
    const allErrors = [...validationErrors, ...creationErrors];
    
    // 添加重复用户到错误列表中用于显示
    const duplicateErrors = duplicates.map(duplicate => ({
      row: duplicate.row,
      email: duplicate.email,
      error: `重复用户已跳过 (${duplicate.action})`
    }));
    
    const totalErrors = [...allErrors, ...duplicateErrors];
    
    const result = {
      success: true,
      message: `导入完成：成功 ${imported} 个，失败 ${allErrors.length} 个，重复 ${duplicates.length} 个`,
      imported,
      failed: allErrors.length,
      errors: totalErrors
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('用户导入错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '导入失败'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/import/template
 * 下载导入模板
 */
export async function GET() {
  try {
    // 读取现有的Excel模板文件
    const templatePath = path.join(process.cwd(), 'templates', '用户导入模板.xlsx');
    
    // 检查文件是否存在
    if (!fs.existsSync(templatePath)) {
      console.error('模板文件不存在:', templatePath);
      return NextResponse.json(
        { error: '模板文件不存在' },
        { status: 404 }
      );
    }
    
    // 读取文件内容
    const fileBuffer = fs.readFileSync(templatePath);
    
    // 返回Excel文件
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="用户导入模板.xlsx"',
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('下载模板失败:', error);
    return NextResponse.json(
      { error: '下载模板失败' },
      { status: 500 }
    );
  }
}
