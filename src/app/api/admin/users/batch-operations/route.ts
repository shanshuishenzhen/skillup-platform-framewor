/**
 * 用户批量操作API接口
 * 支持批量导入、更新、删除等操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { verifyAdminAccess } from '@/middleware/rbac';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 批量操作类型枚举
const BatchOperationType = z.enum(['import', 'update', 'delete', 'activate', 'deactivate']);

// 批量操作请求验证模式
const BatchOperationSchema = z.object({
  operation: BatchOperationType,
  userIds: z.array(z.string()).optional(),
  updateData: z.object({
    department: z.string().optional(),
    position: z.string().optional(),
    organization: z.string().optional(),
    learning_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    exam_permissions: z.array(z.string()).optional(),
    role: z.enum(['student', 'teacher', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional()
  }).optional()
});

// 用户导入数据验证模式
const UserImportSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确'),
  phone: z.string().optional(),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  organization: z.string().optional(),
  learning_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  learning_hours: z.number().min(0).default(0),
  exam_permissions: z.array(z.string()).default([]),
  certification_status: z.enum(['none', 'in_progress', 'certified', 'expired']).default('none'),
  role: z.enum(['student', 'teacher', 'admin']).default('student'),
  password: z.string().min(6, '密码至少6位').optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active')
});

type BatchOperation = z.infer<typeof BatchOperationSchema>;
type UserImport = z.infer<typeof UserImportSchema>;



/**
 * 生成随机密码
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * 解析Excel/CSV文件
 */
function parseFile(buffer: Buffer, filename: string): Record<string, unknown>[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证用户数据
 */
function validateUserData(data: Record<string, unknown>[]): { validUsers: UserImport[], errors: string[] } {
  const validUsers: UserImport[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    try {
      // 处理exam_permissions字段（可能是字符串）
      if (typeof row.exam_permissions === 'string') {
        row.exam_permissions = row.exam_permissions
          .split(',')
          .map((perm: string) => perm.trim())
          .filter((perm: string) => perm.length > 0);
      }

      // 处理learning_hours字段
      if (row.learning_hours) {
        row.learning_hours = Number(row.learning_hours);
      }

      const validUser = UserImportSchema.parse(row);
      validUsers.push(validUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        errors.push(`第${index + 2}行: ${fieldErrors}`);
      } else {
        errors.push(`第${index + 2}行: 数据格式错误`);
      }
    }
  });

  return { validUsers, errors };
}

/**
 * 检查重复用户
 */
async function checkDuplicateUsers(users: UserImport[]): Promise<{ duplicates: string[], uniqueUsers: UserImport[] }> {
  const emails = users.map(user => user.email);
  const phones = users.filter(user => user.phone).map(user => user.phone!);
  
  // 检查邮箱重复
  const { data: existingEmailUsers } = await supabase
    .from('user_profiles')
    .select('email')
    .in('email', emails);

  // 检查手机号重复
  const { data: existingPhoneUsers } = phones.length > 0 ? await supabase
    .from('user_profiles')
    .select('phone')
    .in('phone', phones) : { data: [] };

  const existingEmails = new Set(existingEmailUsers?.map(user => user.email) || []);
  const existingPhones = new Set(existingPhoneUsers?.map(user => user.phone) || []);

  const duplicates: string[] = [];
  const uniqueUsers: UserImport[] = [];

  users.forEach(user => {
    if (existingEmails.has(user.email)) {
      duplicates.push(`邮箱 ${user.email} 已存在`);
    } else if (user.phone && existingPhones.has(user.phone)) {
      duplicates.push(`手机号 ${user.phone} 已存在`);
    } else {
      uniqueUsers.push(user);
    }
  });

  return { duplicates, uniqueUsers };
}

/**
 * 创建导入批次记录
 */
async function createImportBatch(totalCount: number, validCount: number, errorCount: number): Promise<string> {
  const batchId = uuidv4();
  
  const { error } = await supabase
    .from('user_import_batches')
    .insert({
      id: batchId,
      total_count: totalCount,
      success_count: 0,
      error_count: errorCount,
      status: 'processing',
      import_data: {
        validCount,
        errorCount,
        startTime: new Date().toISOString()
      }
    });

  if (error) {
    throw new Error(`创建导入批次失败: ${error.message}`);
  }

  return batchId;
}

/**
 * 更新导入批次状态
 */
async function updateImportBatch(batchId: string, successCount: number, status: 'completed' | 'failed', errors?: string[]) {
  const { error } = await supabase
    .from('user_import_batches')
    .update({
      success_count: successCount,
      status,
      completed_at: new Date().toISOString(),
      import_data: {
        endTime: new Date().toISOString(),
        errors: errors || []
      }
    })
    .eq('id', batchId);

  if (error) {
    console.error('更新导入批次状态失败:', error);
  }
}

/**
 * 批量创建用户
 */
async function batchCreateUsers(users: UserImport[], batchId: string): Promise<{ successCount: number, errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // 生成密码（如果未提供）
      const password = user.password || generateRandomPassword();
      const hashedPassword = await bcrypt.hash(password, 10);

      // 在认证系统中创建用户
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role
        }
      });

      if (authError) {
        errors.push(`创建用户 ${user.email} 的认证账户失败: ${authError.message}`);
        continue;
      }

      // 在用户资料表中创建记录
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          employee_id: user.employee_id,
          department: user.department,
          position: user.position,
          organization: user.organization,
          learning_level: user.learning_level,
          learning_progress: 0,
          learning_hours: user.learning_hours,
          exam_permissions: user.exam_permissions,
          exam_history: [],
          certification_status: user.certification_status,
          role: user.role,
          status: user.status,
          import_batch_id: batchId,
          import_source: 'batch_import',
          import_date: new Date().toISOString(),
          sync_status: 'synced',
          password_hash: hashedPassword
        });

      if (profileError) {
        errors.push(`创建用户 ${user.email} 的资料失败: ${profileError.message}`);
        // 删除已创建的认证用户
        await supabase.auth.admin.deleteUser(authUser.user.id);
        continue;
      }

      successCount++;
    } catch (error) {
      errors.push(`创建用户 ${user.email} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  return { successCount, errors };
}

/**
 * 记录批量操作日志
 */
async function logBatchOperation(operation: string, userIds: string[], result: {
  success: boolean;
  [key: string]: unknown;
}, adminId?: string) {
  try {
    await supabase
      .from('user_batch_operations')
      .insert({
        operation_type: operation,
        user_ids: userIds,
        operation_data: result,
        admin_id: adminId,
        status: result.success ? 'completed' : 'failed'
      });
  } catch (error) {
    console.error('记录批量操作日志失败:', error);
  }
}

/**
 * POST /api/admin/users/batch-operations
 * 执行批量操作
 */
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.error },
        { status: rbacResult.statusCode }
      );
    }

    const contentType = request.headers.get('content-type');

    // 处理文件上传（批量导入）
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: '请选择要上传的文件' },
          { status: 400 }
        );
      }

      // 验证文件类型
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: '只支持 Excel (.xlsx, .xls) 和 CSV 文件' },
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

      // 解析文件
      const buffer = Buffer.from(await file.arrayBuffer());
      const rawData = parseFile(buffer, file.name);

      if (rawData.length === 0) {
        return NextResponse.json(
          { success: false, error: '文件中没有有效数据' },
          { status: 400 }
        );
      }

      // 验证数据
      const { validUsers, errors: validationErrors } = validateUserData(rawData);
      
      if (validUsers.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: '没有有效的用户数据',
            details: validationErrors
          },
          { status: 400 }
        );
      }

      // 检查重复用户
      const { duplicates, uniqueUsers } = await checkDuplicateUsers(validUsers);
      
      if (uniqueUsers.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: '所有用户都已存在',
            details: duplicates
          },
          { status: 400 }
        );
      }

      // 创建导入批次
      const batchId = await createImportBatch(
        rawData.length,
        uniqueUsers.length,
        validationErrors.length + duplicates.length
      );

      // 批量创建用户
      const { successCount, errors: createErrors } = await batchCreateUsers(uniqueUsers, batchId);
      
      // 更新导入批次状态
      const allErrors = [...validationErrors, ...duplicates, ...createErrors];
      await updateImportBatch(
        batchId,
        successCount,
        successCount > 0 ? 'completed' : 'failed',
        allErrors
      );

      // 记录操作日志
      await logBatchOperation('import', [], {
        success: successCount > 0,
        batchId,
        totalCount: rawData.length,
        successCount,
        errorCount: allErrors.length,
        errors: allErrors
      });

      return NextResponse.json({
        success: successCount > 0,
        data: {
          batchId,
          totalCount: rawData.length,
          successCount,
          errorCount: allErrors.length,
          errors: allErrors
        },
        message: `批量导入完成，成功创建 ${successCount} 个用户`
      });
    }

    // 处理其他批量操作
    const body = await request.json();
    const operationData = BatchOperationSchema.parse(body);
    const { operation, userIds = [], updateData } = operationData;

    let result: {
      success: boolean;
      updatedCount?: number;
      deletedCount?: number;
      users?: unknown[];
    } = { success: false };

    switch (operation) {
      case 'update':
        if (!updateData || userIds.length === 0) {
          return NextResponse.json(
            { success: false, error: '批量更新需要提供用户ID和更新数据' },
            { status: 400 }
          );
        }

        const { data: updatedUsers, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .select();

        if (updateError) {
          throw new Error(`批量更新失败: ${updateError.message}`);
        }

        result = {
          success: true,
          updatedCount: updatedUsers?.length || 0,
          users: updatedUsers
        };
        break;

      case 'activate':
      case 'deactivate':
        if (userIds.length === 0) {
          return NextResponse.json(
            { success: false, error: '请提供要操作的用户ID' },
            { status: 400 }
          );
        }

        const status = operation === 'activate' ? 'active' : 'inactive';
        const { data: statusUsers, error: statusError } = await supabase
          .from('user_profiles')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .select();

        if (statusError) {
          throw new Error(`批量${operation === 'activate' ? '激活' : '停用'}失败: ${statusError.message}`);
        }

        result = {
          success: true,
          updatedCount: statusUsers?.length || 0,
          users: statusUsers
        };
        break;

      case 'delete':
        if (userIds.length === 0) {
          return NextResponse.json(
            { success: false, error: '请提供要删除的用户ID' },
            { status: 400 }
          );
        }

        // 软删除（设置状态为inactive）
        const { data: deletedUsers, error: deleteError } = await supabase
          .from('user_profiles')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .select();

        if (deleteError) {
          throw new Error(`批量删除失败: ${deleteError.message}`);
        }

        result = {
          success: true,
          deletedCount: deletedUsers?.length || 0,
          users: deletedUsers
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作类型' },
          { status: 400 }
        );
    }

    // 记录操作日志
    await logBatchOperation(operation, userIds, result);

    return NextResponse.json({
      success: true,
      data: result,
      message: `批量${operation}操作完成`
    });

  } catch (error) {
    console.error('批量操作错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量操作失败'
      },
      { status: 500 }
    );
  }
}