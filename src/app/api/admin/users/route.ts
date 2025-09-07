/**
 * 用户管理API接口
 * 支持用户查询、创建、更新、删除等操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ErrorHandler } from '@/utils/errorHandler';
import { verifyAdminAccess } from '@/middleware/rbac';

const supabase = getSupabaseAdminClient();

// 扩展用户数据验证模式
const ExtendedUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确'),
  phone: z.string().optional(),
  password: z.string().min(6, '密码至少6位').optional(),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  organization: z.string().optional(),
  learning_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  learning_progress: z.number().min(0).max(100).optional(),
  learning_hours: z.number().min(0).optional(),
  exam_permissions: z.array(z.string()).optional(),
  certification_status: z.enum(['none', 'in_progress', 'certified', 'expired']).optional(),
  role: z.enum(['student', 'teacher', 'admin']).default('student'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  import_batch_id: z.string().optional(),
  import_source: z.enum(['manual', 'excel', 'api']).optional(),
  sync_status: z.enum(['pending', 'synced', 'failed']).optional()
});

// 用户查询参数验证模式
const UserQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  search: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['user', 'admin', 'expert', 'student']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  learning_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  certification_status: z.enum(['none', 'in_progress', 'certified', 'expired']).optional(),
  import_batch_id: z.string().optional(),
  sync_status: z.enum(['pending', 'synced', 'failed']).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'learning_progress']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  ids_only: z.string().transform(val => val === 'true').optional()
});

// 批量操作验证模式
const BatchOperationSchema = z.object({
  operation: z.enum([
    'activate', 'deactivate', 'suspend', 
    'update_role', 'update_department', 'update_learning_level', 
    'update_certification_status', 'update_status', 
    'sync', 'delete'
  ]),
  user_ids: z.array(z.string()).min(1, '至少选择一个用户'),
  data: z.object({
    role: z.enum(['admin', 'expert', 'teacher', 'student', 'user']).optional(),
    department: z.string().optional(),
    learning_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    certification_status: z.enum(['none', 'pending', 'certified', 'expired']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    position: z.string().optional(),
    organization: z.string().optional()
  }).optional()
});

type ExtendedUser = z.infer<typeof ExtendedUserSchema>;
type UserQuery = z.infer<typeof UserQuerySchema>;
type BatchOperation = z.infer<typeof BatchOperationSchema>;



/**
 * 检查批量操作权限
 */
async function checkBatchOperationPermission(
  userRole: string, 
  operation: string, 
  targetUserIds: string[]
): Promise<{ isAllowed: boolean; message?: string }> {
  // 超级管理员可以执行所有操作
  if (userRole === 'admin') {
    return { isAllowed: true };
  }
  
  // 专家用户的权限限制
  if (userRole === 'expert') {
    // 专家不能删除用户
    if (operation === 'delete') {
      return { 
        isAllowed: false, 
        message: '专家用户无权删除用户' 
      };
    }
    
    // 专家不能修改管理员角色
    if (operation === 'update_role') {
      const { data: targetUsers } = await supabase
        .from('users')
        .select('role')
        .in('id', targetUserIds);
      
      if (targetUsers?.some(user => user.role === 'admin')) {
        return { 
          isAllowed: false, 
          message: '专家用户无权修改管理员用户' 
        };
      }
    }
    
    // 专家不能操作其他管理员或专家
    const { data: targetUsers } = await supabase
      .from('users')
      .select('role')
      .in('id', targetUserIds);
    
    if (targetUsers?.some(user => ['admin', 'expert'].includes(user.role))) {
      return { 
        isAllowed: false, 
        message: '专家用户无权操作管理员或其他专家用户' 
      };
    }
  }
  
  return { isAllowed: true };
}

/**
 * 验证批量操作数据
 */
interface BatchOperationData {
  status?: string;
  role?: string;
  department?: string;
  learning_level?: string;
  certification_status?: string;
}

function validateBatchOperationData(operation: string, data: BatchOperationData): { isValid: boolean; message?: string } {
  switch (operation) {
    case 'update_status':
      if (!data?.status || !['active', 'inactive', 'suspended'].includes(data.status)) {
        return { isValid: false, message: '无效的用户状态' };
      }
      break;
    case 'update_role':
      if (!data?.role || !['admin', 'expert', 'teacher', 'student', 'user'].includes(data.role)) {
        return { isValid: false, message: '无效的用户角色' };
      }
      break;
    case 'update_department':
      if (!data?.department || data.department.trim().length === 0) {
        return { isValid: false, message: '部门名称不能为空' };
      }
      if (data.department.length > 100) {
        return { isValid: false, message: '部门名称过长' };
      }
      break;
    case 'update_learning_level':
      if (!data?.learning_level || !['beginner', 'intermediate', 'advanced', 'expert'].includes(data.learning_level)) {
        return { isValid: false, message: '无效的学习等级' };
      }
      break;
    case 'update_certification_status':
      if (!data?.certification_status || !['none', 'pending', 'in_progress', 'certified', 'expired', 'rejected'].includes(data.certification_status)) {
        return { isValid: false, message: '无效的认证状态' };
      }
      break;
  }
  
  return { isValid: true };
}

/**
 * GET /api/admin/users
 * 获取用户列表（支持分页、搜索、筛选）
 */
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // 为ids_only请求提供默认的page和limit参数
    if (queryParams.ids_only === 'true') {
      queryParams.page = queryParams.page || '1';
      queryParams.limit = queryParams.limit || '20';
    }

    const {
      page,
      limit,
      search,
      department,
      role,
      status,
      learning_level,
      certification_status,
      import_batch_id,
      sync_status,
      sort_by = 'created_at',
      sort_order = 'desc',
      ids_only = false
    } = UserQuerySchema.parse(queryParams);

    // 构建查询
    let query = supabase
      .from('users')
      .select(ids_only ? 'id' : `
        id,
        name,
        email,
        phone,
        employee_id,
        department,
        position,
        organization,
        learning_level,
        learning_progress,
        learning_hours,
        last_learning_time,
        exam_permissions,
        exam_history,
        certification_status,
        certification_date,
        role,
        user_type,
        status,
        is_verified,
        face_verified,
        import_batch_id,
        import_source,
        import_date,
        sync_status,
        last_sync_time,
        created_at,
        updated_at
      `);

    // 应用筛选条件
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }

    if (department) {
      query = query.eq('department', department);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (status) {
      // 直接使用 status 字段过滤用户状态
      query = query.eq('status', status);
    } else {
      // 默认只显示活跃用户，过滤掉已删除的用户
      query = query.neq('status', 'inactive');
    }
    
    if (learning_level) {
      query = query.eq('learning_level', learning_level);
    }
    
    if (certification_status) {
      query = query.eq('certification_status', certification_status);
    }
    
    if (import_batch_id) {
      query = query.eq('import_batch_id', import_batch_id);
    }
    
    if (sync_status) {
      query = query.eq('sync_status', sync_status);
    }

    // 获取总数 - 创建新的查询对象来避免select字段冲突
    let countQuery = supabase.from('users').select('*', { count: 'exact', head: true });
    
    // 应用相同的筛选条件到count查询
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }
    
    if (department) {
      countQuery = countQuery.eq('department', department);
    }
    
    if (role) {
      countQuery = countQuery.eq('role', role);
    }
    
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    
    if (learning_level) {
      countQuery = countQuery.eq('learning_level', learning_level);
    }
    
    if (certification_status) {
      countQuery = countQuery.eq('certification_status', certification_status);
    }
    
    if (import_batch_id) {
      countQuery = countQuery.eq('import_batch_id', import_batch_id);
    }
    
    if (sync_status) {
      countQuery = countQuery.eq('sync_status', sync_status);
    }
    
    const { count } = await countQuery;

    // 如果只需要ID列表，不进行分页，直接返回所有匹配的用户ID
    if (ids_only) {
      const { data: users, error } = await query
        .order(sort_by, { ascending: sort_order === 'asc' });

      if (error) {
        throw new Error(`查询用户ID失败: ${error.message}`);
      }

      return NextResponse.json({
        success: true,
        data: {
          user_ids: users?.map((user: any) => user.id) || [],
          total: users?.length || 0
        }
      });
    }

    // 应用排序和分页
    const { data: users, error } = await query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(`查询用户失败: ${error.message}`);
    }

    // 获取统计信息
    const { data: stats } = await supabase
      .from('users')
      .select('role, user_type, learning_level, certification_status, status')
      .then(({ data }) => {
        if (!data) return { data: null };
        
        const roleStats = data.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const statusStats = data.reduce((acc, user) => {
          acc[user.status] = (acc[user.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const learningLevelStats = data.reduce((acc, user) => {
          if (user.learning_level) {
            acc[user.learning_level] = (acc[user.learning_level] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const certificationStats = data.reduce((acc, user) => {
          acc[user.certification_status] = (acc[user.certification_status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          data: {
            roleStats,
            statusStats,
            learningLevelStats,
            certificationStats
          }
        };
      });

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: stats || {
          roleStats: {},
          statusStats: {},
          learningLevelStats: {},
          certificationStats: {}
        }
      }
    });

  } catch (error) {
    console.error('获取用户列表错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取用户列表失败'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * 创建新用户
 */
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userData = ExtendedUserSchema.parse(body);

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '邮箱已存在' },
        { status: 400 }
      );
    }

    // 使用传入的密码或生成随机密码
    const password = userData.password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户认证记录
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        role: userData.role
      }
    });

    if (authError) {
      throw new Error(`认证创建失败: ${authError.message}`);
    }

    // 创建用户资料记录
    const { data: newUser, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        employee_id: userData.employee_id,
        department: userData.department,
        position: userData.position,
        organization: userData.organization,
        learning_level: userData.learning_level || 'beginner',
        learning_progress: userData.learning_progress || 0,
        learning_hours: userData.learning_hours || 0,
        exam_permissions: userData.exam_permissions || [],
        certification_status: userData.certification_status || 'none',
        role: userData.role,
        status: 'active',
        is_verified: true,
        password_hash: hashedPassword,
        import_source: 'manual',
        sync_status: 'synced',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      // 如果资料创建失败，删除已创建的认证用户
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`用户资料创建失败: ${profileError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: newUser,
        temporaryPassword: password
      },
      message: '用户创建成功'
    });

  } catch (error) {
    console.error('创建用户错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建用户失败'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users
 * 批量操作用户
 */
export async function PUT(request: NextRequest) {
  try {
    // 检查管理员权限
    const rbacResult = await verifyAdminAccess(request);
    if (!rbacResult.success) {
      return NextResponse.json(
        { success: false, error: rbacResult.message || '权限验证失败' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { operation, user_ids, data } = BatchOperationSchema.parse(body);

    // 检查批量操作权限
    const batchPermissionResult = await checkBatchOperationPermission(
      (rbacResult.user as any)?.role || 'user',
      operation,
      user_ids
    );
    
    if (!batchPermissionResult.isAllowed) {
      return NextResponse.json(
        { error: batchPermissionResult.message || '操作权限不足' },
        { status: 403 }
      );
    }

    // 验证批量操作数据
    const dataValidationResult = validateBatchOperationData(operation, data || {});
    if (!dataValidationResult.isValid) {
      return NextResponse.json(
        { error: dataValidationResult.message || '数据验证失败' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // 根据操作类型设置更新数据
    switch (operation) {
      case 'activate':
        updateData.status = 'active';
        updateData.is_verified = true;
        break;
      case 'deactivate':
        updateData.status = 'inactive';
        updateData.is_verified = false;
        break;
      case 'suspend':
        updateData.status = 'suspended';
        updateData.is_verified = false;
        break;
      case 'update_status':
        if (!data?.status) {
          return NextResponse.json(
            { success: false, error: '缺少状态信息' },
            { status: 400 }
          );
        }
        updateData.status = data.status;
        updateData.is_verified = data.status === 'active';
        break;
      case 'update_role':
        if (!data?.role) {
          return NextResponse.json(
            { success: false, error: '缺少角色信息' },
            { status: 400 }
          );
        }
        updateData.role = data.role;
        break;
      case 'update_department':
        if (!data?.department) {
          return NextResponse.json(
            { success: false, error: '缺少部门信息' },
            { status: 400 }
          );
        }
        updateData.department = data.department;
        if (data.position) updateData.position = data.position;
        if (data.organization) updateData.organization = data.organization;
        break;
      case 'update_learning_level':
        if (!data?.learning_level) {
          return NextResponse.json(
            { success: false, error: '缺少学习等级信息' },
            { status: 400 }
          );
        }
        updateData.learning_level = data.learning_level;
        break;
      case 'update_certification_status':
        if (!data?.certification_status) {
          return NextResponse.json(
            { success: false, error: '缺少认证状态信息' },
            { status: 400 }
          );
        }
        updateData.certification_status = data.certification_status;
        if (data.certification_status === 'certified') {
          updateData.certification_date = new Date().toISOString();
        }
        break;
      case 'sync':
        updateData.sync_status = 'pending';
        updateData.last_sync_time = new Date().toISOString();
        break;
      case 'delete':
        // 删除操作需要特殊处理
        break;
      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作类型' },
          { status: 400 }
        );
    }

    let result;
    
    if (operation === 'delete') {
      // 真正删除用户
      const deletedUsers = [];
      const errors = [];
      
      for (const userId of user_ids) {
        try {
          // 首先从users表删除用户资料
          const { error: profileError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
          
          if (profileError) {
            errors.push(`删除用户资料失败 (${userId}): ${profileError.message}`);
            continue;
          }
          
          // 然后删除认证记录
          const { error: authError } = await supabase.auth.admin.deleteUser(userId);
          
          if (authError) {
            errors.push(`删除认证记录失败 (${userId}): ${authError.message}`);
          } else {
            deletedUsers.push({ id: userId });
          }
        } catch (error) {
          errors.push(`删除用户失败 (${userId}): ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
      
      if (errors.length > 0) {
        console.warn('批量删除部分失败:', errors);
      }
      
      result = deletedUsers;
    } else {
      // 更新用户
      const { data: updatedUsers, error } = await supabase
        .from('users')
        .update(updateData)
        .in('id', user_ids)
        .select();

      if (error) {
        throw new Error(`批量更新用户失败: ${error.message}`);
      }

      result = updatedUsers;
    }

    // 记录批量操作日志
    const logData = {
      operation_type: 'batch_operation',
      operator_id: (rbacResult.user as any)?.id || 'unknown',
      operator_role: (rbacResult.user as any)?.role || 'unknown',
      operation: operation,
      affected_user_count: result?.length || 0,
      affected_user_ids: user_ids,
      operation_description: `批量${operation}操作`,
      operation_data: data,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      success: true
    };
    
    console.log('批量操作日志:', JSON.stringify(logData, null, 2));
    
    // 将日志保存到数据库
    try {
      await supabase.from('operation_logs').insert(logData);
    } catch (logError) {
      console.error('保存操作日志失败:', logError);
      // 日志保存失败不应该影响主要操作
    }
    
    await supabase
      .from('user_batch_operations')
      .insert({
        operation_type: operation,
        user_ids,
        operation_data: data || {},
        affected_count: result?.length || 0,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      data: {
        affectedUsers: result,
        affectedCount: result?.length || 0
      },
      message: `批量${operation}操作完成`
    });

  } catch (error) {
    console.error('批量操作用户错误:', error);
    
    // 记录失败的操作日志
    try {
      const errorLogData = {
        operation_type: 'batch_operation',
        operator_id: 'unknown',
        operator_role: 'unknown',
        operation: 'unknown',
        affected_user_count: 0,
        affected_user_ids: [],
        operation_description: '批量操作失败',
        operation_data: {},
        ip_address: 'unknown',
        user_agent: 'unknown',
        success: false,
        error_message: error instanceof Error ? error.message : '未知错误'
      };
      
      await supabase.from('operation_logs').insert(errorLogData);
    } catch (logError) {
      console.error('保存错误日志失败:', logError);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量操作失败'
      },
      { status: 500 }
    );
  }
}