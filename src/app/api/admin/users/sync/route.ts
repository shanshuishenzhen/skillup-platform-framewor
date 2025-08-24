/**
 * 用户数据同步API接口
 * 支持用户数据和考试结果的同步
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 用户同步请求验证模式
const UserSyncSchema = z.object({
  users: z.array(z.object({
    employee_id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    organization: z.string().optional(),
    learning_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    learning_hours: z.number().min(0).optional(),
    exam_permissions: z.array(z.string()).optional(),
    certification_status: z.enum(['none', 'in_progress', 'certified', 'expired']).optional(),
    certification_date: z.string().optional(),
    role: z.enum(['student', 'teacher', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional()
  })),
  sync_source: z.string().default('external_system'),
  force_update: z.boolean().default(false)
});

// 考试结果同步请求验证模式
const ExamResultSyncSchema = z.object({
  results: z.array(z.object({
    user_id: z.string().optional(),
    employee_id: z.string().optional(),
    exam_id: z.string(),
    exam_name: z.string(),
    score: z.number().min(0).max(100),
    status: z.enum(['passed', 'failed', 'in_progress']),
    completed_at: z.string(),
    certification_earned: z.boolean().default(false),
    certification_name: z.string().optional()
  })),
  sync_source: z.string().default('exam_system')
});

type UserSync = z.infer<typeof UserSyncSchema>;
type ExamResultSync = z.infer<typeof ExamResultSyncSchema>;

// 用户数据类型
interface UserData {
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  organization?: string;
  learning_level?: 'beginner' | 'intermediate' | 'advanced';
  learning_hours?: number;
  exam_permissions?: string[];
  certification_status?: 'none' | 'in_progress' | 'certified' | 'expired';
  certification_date?: string;
  role?: 'student' | 'teacher' | 'admin';
  status?: 'active' | 'inactive' | 'suspended';
}

// 考试结果数据类型
interface ExamResultData {
  user_id?: string;
  employee_id?: string;
  exam_id: string;
  exam_name: string;
  score: number;
  status: 'passed' | 'failed' | 'in_progress';
  completed_at: string;
  certification_earned?: boolean;
  certification_name?: string;
}

// 用户资料类型
interface UserProfile {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  organization?: string;
  learning_level: string;
  learning_hours: number;
  exam_permissions: string[];
  certification_status: string;
  certification_date?: string;
  role: string;
  status: string;
  sync_status?: string;
  [key: string]: unknown;
}

/**
 * 检查管理员权限
 */
async function checkAdminPermission(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }
  
  // TODO: 实现JWT token验证和权限检查
  return true;
}

/**
 * 记录同步日志
 */
async function logSyncOperation(
  syncType: string,
  userId: string | null,
  status: 'success' | 'failed',
  errorMessage?: string,
  syncData?: UserData | ExamResultData
) {
  try {
    await supabase
      .from('user_sync_logs')
      .insert({
        sync_type: syncType,
        user_id: userId,
        status,
        error_message: errorMessage,
        sync_data: syncData
      });
  } catch (error) {
    console.error('记录同步日志失败:', error);
  }
}

/**
 * 根据employee_id查找用户
 */
async function findUserByEmployeeId(employeeId: string): Promise<UserProfile | null> {
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`查找用户失败: ${error.message}`);
  }

  return user;
}

/**
 * 同步单个用户数据
 */
async function syncUserData(
  userData: UserData,
  syncSource: string,
  forceUpdate: boolean
): Promise<{ success: boolean, message: string, userId?: string }> {
  try {
    // 查找现有用户
    const existingUser = await findUserByEmployeeId(userData.employee_id);
    
    if (existingUser) {
      // 更新现有用户
      if (forceUpdate || existingUser.sync_status !== 'synced') {
        const { data: updatedUser, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            department: userData.department,
            position: userData.position,
            organization: userData.organization,
            learning_level: userData.learning_level || existingUser.learning_level,
            learning_hours: userData.learning_hours || existingUser.learning_hours,
            exam_permissions: userData.exam_permissions || existingUser.exam_permissions,
            certification_status: userData.certification_status || existingUser.certification_status,
            certification_date: userData.certification_date || existingUser.certification_date,
            role: userData.role || existingUser.role,
            status: userData.status || existingUser.status,
            sync_status: 'synced',
            last_sync_time: new Date().toISOString(),
            sync_error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`更新用户失败: ${updateError.message}`);
        }

        await logSyncOperation('user_update', existingUser.id, 'success', undefined, userData);
        return {
          success: true,
          message: '用户数据更新成功',
          userId: existingUser.id
        };
      } else {
        return {
          success: true,
          message: '用户数据已是最新',
          userId: existingUser.id
        };
      }
    } else {
      // 创建新用户（仅更新用户资料，不创建认证账户）
      const userId = uuidv4();
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          employee_id: userData.employee_id,
          department: userData.department,
          position: userData.position,
          organization: userData.organization,
          learning_level: userData.learning_level || 'beginner',
          learning_progress: 0,
          learning_hours: userData.learning_hours || 0,
          exam_permissions: userData.exam_permissions || [],
          exam_history: [],
          certification_status: userData.certification_status || 'none',
          certification_date: userData.certification_date,
          role: userData.role || 'student',
          status: userData.status || 'active',
          import_source: syncSource,
          import_date: new Date().toISOString(),
          sync_status: 'synced',
          last_sync_time: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`创建用户失败: ${createError.message}`);
      }

      await logSyncOperation('user_create', userId, 'success', undefined, userData);
      return {
        success: true,
        message: '用户数据创建成功',
        userId
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '同步失败';
    await logSyncOperation('user_sync', null, 'failed', errorMessage, userData);
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * 同步考试结果
 */
async function syncExamResult(
  resultData: ExamResultData,
  syncSource: string
): Promise<{ success: boolean, message: string }> {
  try {
    let userId = resultData.user_id;
    
    // 如果没有user_id，通过employee_id查找
    if (!userId && resultData.employee_id) {
      const user = await findUserByEmployeeId(resultData.employee_id);
      if (!user) {
        throw new Error(`找不到员工ID为 ${resultData.employee_id} 的用户`);
      }
      userId = user.id;
    }

    if (!userId) {
      throw new Error('缺少用户ID或员工ID');
    }

    // 检查考试记录是否已存在
    const { data: existingRecord } = await supabase
      .from('exam_records')
      .select('id')
      .eq('user_id', userId)
      .eq('exam_id', resultData.exam_id)
      .eq('completed_at', resultData.completed_at)
      .single();

    if (existingRecord) {
      return {
        success: true,
        message: '考试记录已存在'
      };
    }

    // 创建考试记录
    const { error: examError } = await supabase
      .from('exam_records')
      .insert({
        user_id: userId,
        exam_id: resultData.exam_id,
        exam_name: resultData.exam_name,
        score: resultData.score,
        status: resultData.status,
        completed_at: resultData.completed_at,
        sync_source: syncSource
      });

    if (examError) {
      throw new Error(`创建考试记录失败: ${examError.message}`);
    }

    // 更新用户的考试历史
    const { data: user } = await supabase
      .from('user_profiles')
      .select('exam_history')
      .eq('id', userId)
      .single();

    if (user) {
      const examHistory = user.exam_history || [];
      examHistory.push({
        exam_id: resultData.exam_id,
        exam_name: resultData.exam_name,
        score: resultData.score,
        status: resultData.status,
        completed_at: resultData.completed_at
      });

      await supabase
        .from('user_profiles')
        .update({
          exam_history: examHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    // 如果获得认证，更新认证状态
    if (resultData.certification_earned && resultData.certification_name) {
      await supabase
        .from('user_profiles')
        .update({
          certification_status: 'certified',
          certification_date: resultData.completed_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    await logSyncOperation('exam_result', userId, 'success', undefined, resultData);
    return {
      success: true,
      message: '考试结果同步成功'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '同步失败';
    await logSyncOperation('exam_result', null, 'failed', errorMessage, resultData);
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * POST /api/admin/users/sync
 * 同步用户数据和考试结果
 */
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    if (!(await checkAdminPermission(request))) {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const syncType = body.sync_type || 'user'; // 'user' 或 'exam_result'

    if (syncType === 'user') {
      // 用户数据同步
      const syncData = UserSyncSchema.parse(body);
      const { users, sync_source, force_update } = syncData;

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const userData of users) {
        const result = await syncUserData(userData, sync_source, force_update);
        results.push({
          employee_id: userData.employee_id,
          ...result
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      return NextResponse.json({
        success: successCount > 0,
        data: {
          total_count: users.length,
          success_count: successCount,
          error_count: errorCount,
          results
        },
        message: `用户数据同步完成，成功 ${successCount} 个，失败 ${errorCount} 个`
      });

    } else if (syncType === 'exam_result') {
      // 考试结果同步
      const syncData = ExamResultSyncSchema.parse(body);
      const { results: examResults, sync_source } = syncData;

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const resultData of examResults) {
        const result = await syncExamResult(resultData, sync_source);
        results.push({
          exam_id: resultData.exam_id,
          user_id: resultData.user_id || resultData.employee_id,
          ...result
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      return NextResponse.json({
        success: successCount > 0,
        data: {
          total_count: examResults.length,
          success_count: successCount,
          error_count: errorCount,
          results
        },
        message: `考试结果同步完成，成功 ${successCount} 个，失败 ${errorCount} 个`
      });

    } else {
      return NextResponse.json(
        { success: false, error: '不支持的同步类型' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('数据同步错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '数据同步失败'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/sync
 * 获取同步状态和日志
 */
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    if (!(await checkAdminPermission(request))) {
      return NextResponse.json(
        { success: false, error: '权限不足' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('sync_type');
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    let query = supabase
      .from('user_sync_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (syncType) {
      query = query.eq('sync_type', syncType);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: syncLogs, error, count } = await query;

    if (error) {
      throw new Error(`获取同步日志失败: ${error.message}`);
    }

    // 获取同步统计信息
    const { data: stats } = await supabase
      .from('user_sync_logs')
      .select('sync_type, status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 最近24小时

    const syncStats = {
      total: stats?.length || 0,
      success: stats?.filter(log => log.status === 'success').length || 0,
      failed: stats?.filter(log => log.status === 'failed').length || 0,
      by_type: {
        user_sync: stats?.filter(log => log.sync_type.includes('user')).length || 0,
        exam_result: stats?.filter(log => log.sync_type === 'exam_result').length || 0
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        logs: syncLogs,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit
        },
        stats: syncStats
      }
    });

  } catch (error) {
    console.error('获取同步状态错误:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取同步状态失败'
      },
      { status: 500 }
    );
  }
}