/**
 * 权限变更历史记录API
 * 提供权限变更历史的查询和管理功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifyRBAC } from '@/middleware/rbac';
import { UserRole } from '@/types/roles';

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 权限历史查询验证模式
const PermissionHistoryQuerySchema = z.object({
  user_id: z.string().optional(),
  operator_id: z.string().optional(),
  operation: z.enum(['add', 'remove', 'replace', 'template_apply']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'operation', 'user_id']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

/**
 * GET /api/admin/permission-history
 * 获取权限变更历史记录
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      user_id: searchParams.get('user_id') || undefined,
      operator_id: searchParams.get('operator_id') || undefined,
      operation: searchParams.get('operation') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc'
    };

    const validatedParams = PermissionHistoryQuerySchema.parse(queryParams);
    const { page, limit, sort_by, sort_order, ...filters } = validatedParams;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let query = supabase
      .from('permission_change_logs')
      .select(`
        id,
        user_id,
        operator_id,
        operation,
        permissions_added,
        permissions_removed,
        template_id,
        reason,
        ip_address,
        user_agent,
        created_at,
        user:users!user_id(name, email, employee_id),
        operator:users!operator_id(name, email),
        template:permission_templates(name, description)
      `, { count: 'exact' });

    // 应用过滤条件
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.operator_id) {
      query = query.eq('operator_id', filters.operator_id);
    }
    if (filters.operation) {
      query = query.eq('operation', filters.operation);
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // 应用排序和分页
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: historyRecords, error, count } = await query;

    if (error) {
      throw new Error(`获取权限变更历史失败: ${error.message}`);
    }

    // 获取统计信息
    const { data: stats, error: statsError } = await supabase
      .from('permission_change_logs')
      .select('operation')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // 最近30天

    let operationStats = {};
    if (!statsError && stats) {
      operationStats = stats.reduce((acc: any, record: any) => {
        acc[record.operation] = (acc[record.operation] || 0) + 1;
        return acc;
      }, {});
    }

    return NextResponse.json({
      success: true,
      data: {
        records: historyRecords || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        statistics: {
          recentOperations: operationStats,
          totalRecords: count || 0
        }
      }
    });

  } catch (error) {
    console.error('获取权限变更历史失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '查询参数格式错误', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/permission-history
 * 清理权限变更历史记录
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证超级管理员权限
    const rbacResult = await verifyRBAC(request, [UserRole.SUPER_ADMIN]);
    if (!rbacResult.success) {
      return NextResponse.json(
        { error: rbacResult.error },
        { status: rbacResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get('days_to_keep') || '90');
    
    if (daysToKeep < 30) {
      return NextResponse.json(
        { error: '至少需要保留30天的历史记录' },
        { status: 400 }
      );
    }

    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

    // 删除指定日期之前的记录
    const { data: deletedRecords, error } = await supabase
      .from('permission_change_logs')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id');

    if (error) {
      throw new Error(`清理权限变更历史失败: ${error.message}`);
    }

    // 记录清理操作
    await supabase
      .from('system_operation_logs')
      .insert({
        operator_id: rbacResult.user.id,
        operation: 'permission_history_cleanup',
        description: `清理了 ${deletedRecords?.length || 0} 条权限变更历史记录（${daysToKeep}天前）`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: `成功清理了 ${deletedRecords?.length || 0} 条历史记录`,
      data: {
        deletedCount: deletedRecords?.length || 0,
        cutoffDate,
        daysKept: daysToKeep
      }
    });

  } catch (error) {
    console.error('清理权限变更历史失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}