import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { UserRole } from '@/types/roles';
import { convertChineseRoleToEnglish } from '@/types/dictionary';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 导入配置验证模式
const ImportConfigSchema = z.object({
  duplicateStrategy: z.enum(['skip', 'update', 'error']).default('skip'),
  defaultRole: z.enum(['admin', 'expert', 'teacher', 'student', 'examiner', 'internal_supervisor', 'guest']).optional(),
  defaultPassword: z.string().optional(),
  sendNotification: z.boolean().default(false),
  validateOnly: z.boolean().default(false),
  batchSize: z.number().min(1).max(1000).default(100),
  autoActivate: z.boolean().default(true)
});

// 用户数据验证模式
const UserImportSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  phone: z.string().min(1, '手机号不能为空').regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  id_card: z.string().min(1, '身份证号码不能为空').regex(/^[1-9]\d{13}[0-9Xx]$|^[1-9]\d{16}[0-9Xx]$/, '身份证号码格式不正确'),
  role: z.enum(['admin', 'expert', 'teacher', 'student', 'examiner', 'internal_supervisor', 'guest']),
  password: z.string().min(6, '密码至少6位字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  organization: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

type UserImportData = z.infer<typeof UserImportSchema>;
type ImportConfig = z.infer<typeof ImportConfigSchema>;

interface ImportError {
  row: number;
  user: string;
  field?: string;
  error: string;
  severity: 'error' | 'warning';
}

interface ImportResult {
  success: boolean;
  batchId: string;
  summary: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    updated: number;
    newUsers: number;
    duplicates: number;
    processingTime: number;
  };
  errors: ImportError[];
  warnings: ImportError[];
  suggestions: string[];
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
 * 检查用户是否已存在
 */
async function checkExistingUser(user: UserImportData): Promise<{
  exists: boolean;
  existingUser?: any;
  duplicateField?: string;
}> {
  const conditions = [];
  if (user.phone) conditions.push(`phone.eq.${user.phone}`);
  if (user.id_card) conditions.push(`id_card.eq.${user.id_card}`);
  if (user.email) conditions.push(`email.eq.${user.email}`);
  if (user.employee_id) conditions.push(`employee_id.eq.${user.employee_id}`);
  
  if (conditions.length === 0) {
    return { exists: false };
  }
  
  const { data: existingUsers, error } = await supabase
    .from('users')
    .select('*')
    .or(conditions.join(','))
    .limit(1);
  
  if (error) {
    throw new Error(`检查重复用户失败: ${error.message}`);
  }
  
  if (existingUsers && existingUsers.length > 0) {
    const existing = existingUsers[0];
    let duplicateField = 'unknown';
    
    if (existing.phone === user.phone) duplicateField = 'phone';
    else if (existing.id_card === user.id_card) duplicateField = 'id_card';
    else if (existing.email === user.email) duplicateField = 'email';
    else if (existing.employee_id === user.employee_id) duplicateField = 'employee_id';
    
    return {
      exists: true,
      existingUser: existing,
      duplicateField
    };
  }
  
  return { exists: false };
}

/**
 * 创建新用户
 */
async function createUser(user: UserImportData, batchId: string, config: ImportConfig): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    // 生成密码
    const password = user.password || config.defaultPassword || generateRandomPassword();
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
        import_source: 'batch_import',
        import_date: new Date().toISOString(),
        status: config.autoActivate ? 'active' : user.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      // 如果资料创建失败，删除已创建的认证用户
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`用户资料创建失败: ${profileError.message}`);
    }
    
    return {
      success: true,
      userId: authUser.user.id
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建用户失败'
    };
  }
}

/**
 * 更新现有用户
 */
async function updateUser(user: UserImportData, existingUser: any, batchId: string, config: ImportConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const updateData: any = {
      name: user.name,
      phone: user.phone,
      id_card: user.id_card,
      role: user.role,
      department: user.department,
      position: user.position,
      organization: user.organization,
      import_batch_id: batchId,
      import_source: 'batch_import_update',
      import_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 如果提供了邮箱，则更新邮箱
    if (user.email) {
      updateData.email = user.email;
    }
    
    // 如果提供了员工ID，则更新员工ID
    if (user.employee_id) {
      updateData.employee_id = user.employee_id;
    }
    
    // 如果提供了新密码，则更新密码
    if (user.password && user.password !== existingUser.password_hash) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      updateData.password_hash = hashedPassword;
      
      // 同时更新认证系统中的密码
      await supabase.auth.admin.updateUserById(existingUser.id, {
        password: user.password
      });
    }
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', existingUser.id);
    
    if (error) {
      throw new Error(`更新用户失败: ${error.message}`);
    }
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新用户失败'
    };
  }
}

/**
 * 处理单个用户导入
 */
async function processUser(
  user: UserImportData, 
  rowIndex: number, 
  batchId: string, 
  config: ImportConfig
): Promise<{
  action: 'created' | 'updated' | 'skipped' | 'failed';
  error?: ImportError;
  warning?: ImportError;
}> {
  try {
    // 检查用户是否已存在
    const { exists, existingUser, duplicateField } = await checkExistingUser(user);
    
    if (exists) {
      switch (config.duplicateStrategy) {
        case 'skip':
          return {
            action: 'skipped',
            warning: {
              row: rowIndex + 2,
              user: user.name,
              field: duplicateField,
              error: `用户已存在（${duplicateField}重复），已跳过`,
              severity: 'warning'
            }
          };
          
        case 'update':
          const updateResult = await updateUser(user, existingUser, batchId, config);
          if (updateResult.success) {
            return { action: 'updated' };
          } else {
            return {
              action: 'failed',
              error: {
                row: rowIndex + 2,
                user: user.name,
                error: updateResult.error || '更新用户失败',
                severity: 'error'
              }
            };
          }
          
        case 'error':
          return {
            action: 'failed',
            error: {
              row: rowIndex + 2,
              user: user.name,
              field: duplicateField,
              error: `用户已存在（${duplicateField}重复），导入失败`,
              severity: 'error'
            }
          };
      }
    } else {
      // 创建新用户
      const createResult = await createUser(user, batchId, config);
      if (createResult.success) {
        return { action: 'created' };
      } else {
        return {
          action: 'failed',
          error: {
            row: rowIndex + 2,
            user: user.name,
            error: createResult.error || '创建用户失败',
            severity: 'error'
          }
        };
      }
    }
  } catch (error) {
    return {
      action: 'failed',
      error: {
        row: rowIndex + 2,
        user: user.name,
        error: error instanceof Error ? error.message : '处理用户失败',
        severity: 'error'
      }
    };
  }
}

/**
 * 批量处理用户导入
 */
async function processBatchImport(
  users: UserImportData[], 
  config: ImportConfig
): Promise<ImportResult> {
  const startTime = Date.now();
  const batchId = randomUUID();
  
  const summary = {
    total: users.length,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    updated: 0,
    newUsers: 0,
    duplicates: 0,
    processingTime: 0
  };
  
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];
  const suggestions: string[] = [];
  
  // 如果是验证模式，只进行数据验证
  if (config.validateOnly) {
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        // 验证数据格式
        UserImportSchema.parse(user);
        
        // 检查重复
        const { exists, duplicateField } = await checkExistingUser(user);
        if (exists) {
          summary.duplicates++;
          warnings.push({
            row: i + 2,
            user: user.name,
            field: duplicateField,
            error: `用户已存在（${duplicateField}重复）`,
            severity: 'warning'
          });
        } else {
          summary.successful++;
        }
        
        summary.processed++;
      } catch (error) {
        summary.failed++;
        if (error instanceof z.ZodError) {
          error.errors.forEach(e => {
            errors.push({
              row: i + 2,
              user: user.name,
              field: e.path.join('.'),
              error: e.message,
              severity: 'error'
            });
          });
        }
      }
    }
    
    suggestions.push('这是验证模式，未实际导入用户数据');
    if (summary.duplicates > 0) {
      suggestions.push(`发现 ${summary.duplicates} 个重复用户，请检查重复处理策略`);
    }
    if (summary.failed > 0) {
      suggestions.push(`发现 ${summary.failed} 个数据错误，请修正后重新导入`);
    }
  } else {
    // 实际导入模式
    const batchSize = config.batchSize;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const user = batch[j];
        const globalIndex = i + j;
        
        const result = await processUser(user, globalIndex, batchId, config);
        
        switch (result.action) {
          case 'created':
            summary.successful++;
            summary.newUsers++;
            break;
          case 'updated':
            summary.successful++;
            summary.updated++;
            break;
          case 'skipped':
            summary.skipped++;
            if (result.warning) warnings.push(result.warning);
            break;
          case 'failed':
            summary.failed++;
            if (result.error) errors.push(result.error);
            break;
        }
        
        summary.processed++;
      }
      
      // 批次间短暂延迟，避免数据库压力过大
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 生成建议
    if (summary.successful > 0) {
      suggestions.push(`成功导入 ${summary.successful} 个用户`);
    }
    if (summary.failed > 0) {
      suggestions.push(`${summary.failed} 个用户导入失败，请检查错误详情`);
    }
    if (summary.skipped > 0) {
      suggestions.push(`${summary.skipped} 个用户被跳过（重复用户）`);
    }
    if (config.sendNotification && summary.successful > 0) {
      suggestions.push('建议向新用户发送欢迎邮件或短信通知');
    }
  }
  
  summary.processingTime = Date.now() - startTime;
  
  return {
    success: summary.failed === 0,
    batchId,
    summary,
    errors,
    warnings,
    suggestions
  };
}

/**
 * POST /api/admin/users/import/execute
 * 执行批量导入
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
    
    const body = await request.json();
    const { users, config } = body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有提供有效的用户数据' },
        { status: 400 }
      );
    }
    
    // 验证配置
    const validatedConfig = ImportConfigSchema.parse(config || {});
    
    // 验证用户数据
    const validatedUsers: UserImportData[] = [];
    const validationErrors: ImportError[] = [];
    
    for (let i = 0; i < users.length; i++) {
      try {
        const user = users[i];
        
        // 应用默认值
        if (validatedConfig.defaultRole && !user.role) {
          user.role = validatedConfig.defaultRole;
        }
        if (validatedConfig.defaultPassword && !user.password) {
          user.password = validatedConfig.defaultPassword;
        }
        
        const validatedUser = UserImportSchema.parse(user);
        validatedUsers.push(validatedUser);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(e => {
            validationErrors.push({
              row: i + 2,
              user: users[i]?.name || '未知',
              field: e.path.join('.'),
              error: e.message,
              severity: 'error'
            });
          });
        }
      }
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: '数据验证失败',
        errors: validationErrors
      }, { status: 400 });
    }
    
    // 执行批量导入
    const result = await processBatchImport(validatedUsers, validatedConfig);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('批量导入执行错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '导入执行失败'
      },
      { status: 500 }
    );
  }
}