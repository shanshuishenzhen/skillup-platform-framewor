import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ErrorHandler } from '@/utils/errorHandler';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 用户导入数据验证模式
const UserImportSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确'),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  employee_id: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin']).default('student'),
  password: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
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
    let data: any[] = [];
    
    if (filename.endsWith('.csv')) {
      // 解析CSV文件
      const text = buffer.toString('utf-8');
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }
    } else {
      // 解析Excel文件
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }
    
    return data;
  } catch (error) {
    throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证用户数据
 */
function validateUserData(data: any[], startRow: number = 2): {
  validUsers: UserImportData[];
  errors: ImportResult['errors'];
} {
  const validUsers: UserImportData[] = [];
  const errors: ImportResult['errors'] = [];
  
  data.forEach((row, index) => {
    try {
      const userData = UserImportSchema.parse(row);
      validUsers.push(userData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        errors.push({
          row: startRow + index,
          email: row.email || '未知',
          error: errorMessages
        });
      } else {
        errors.push({
          row: startRow + index,
          email: row.email || '未知',
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
  const emails = users.map(u => u.email);
  
  // 查询已存在的用户
  const { data: existingUsers } = await supabase
    .from('users')
    .select('email')
    .in('email', emails);
  
  const existingEmails = new Set(existingUsers?.map(u => u.email) || []);
  
  const newUsers: UserImportData[] = [];
  const duplicates: ImportResult['duplicates'] = [];
  
  users.forEach((user, index) => {
    if (existingEmails.has(user.email)) {
      duplicates.push({
        row: index + 2,
        email: user.email,
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
async function createUsers(users: UserImportData[]): Promise<{
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
      
      // 创建用户认证记录
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role
        }
      });
      
      if (authError) {
        throw new Error(`认证创建失败: ${authError.message}`);
      }
      
      // 创建用户资料记录
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          department: user.department,
          position: user.position,
          employee_id: user.employee_id,
          role: user.role,
          status: user.status,
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
        email: user.email,
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
    
    // 验证数据格式
    const { validUsers, errors: validationErrors } = validateUserData(rawData);
    
    // 检查重复用户
    const { newUsers, duplicates } = await checkDuplicateUsers(validUsers);
    
    // 批量创建用户
    const { imported, errors: creationErrors } = await createUsers(newUsers);
    
    // 合并所有错误
    const allErrors = [...validationErrors, ...creationErrors];
    
    const result: ImportResult = {
      success: true,
      total: rawData.length,
      imported,
      failed: allErrors.length,
      errors: allErrors,
      duplicates
    };
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `导入完成：成功 ${imported} 个，失败 ${allErrors.length} 个，重复 ${duplicates.length} 个`
    });
    
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
    // 创建模板数据
    const templateData = [
      {
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '+8613800138001',
        department: '技术部',
        position: '软件工程师',
        employee_id: 'EMP001',
        role: 'student',
        password: '',
        status: 'active'
      },
      {
        name: '李四',
        email: 'lisi@example.com',
        phone: '+8613800138002',
        department: '市场部',
        position: '市场专员',
        employee_id: 'EMP002',
        role: 'student',
        password: '',
        status: 'active'
      }
    ];
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    worksheet['!cols'] = [
      { width: 15 }, // name
      { width: 25 }, // email
      { width: 20 }, // phone
      { width: 15 }, // department
      { width: 20 }, // position
      { width: 15 }, // employee_id
      { width: 10 }, // role
      { width: 15 }, // password
      { width: 10 }  // status
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户导入模板');
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="user-import-template.xlsx"'
      }
    });
    
  } catch (error) {
    console.error('模板下载错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '模板下载失败'
      },
      { status: 500 }
    );
  }
}
