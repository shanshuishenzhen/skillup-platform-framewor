/**
 * 用户数据导出API路由
 * GET /api/admin/export/users - 导出用户数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 导出用户数据
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
    const format = searchParams.get('format') || 'excel'; // excel, csv, json
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // 模拟用户数据
    const users = [
      {
        id: '1',
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138001',
        department: '技术部',
        position: '软件工程师',
        role: 'student',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
        lastLoginAt: '2024-01-20T09:15:00Z'
      },
      {
        id: '2',
        name: '李四',
        email: 'lisi@example.com',
        phone: '13800138002',
        department: '产品部',
        position: '产品经理',
        role: 'student',
        status: 'active',
        createdAt: '2024-01-16T14:20:00Z',
        lastLoginAt: '2024-01-19T16:45:00Z'
      },
      // 更多模拟数据...
    ];

    if (format === 'json') {
      // 返回JSON格式
      return NextResponse.json({
        success: true,
        data: {
          users,
          total: users.length,
          exportTime: new Date().toISOString()
        }
      });
    } else if (format === 'csv') {
      // 生成CSV格式
      const csvHeaders = [
        'ID',
        '姓名', 
        '邮箱',
        '手机号',
        '部门',
        '职位',
        '角色',
        '状态',
        '创建时间',
        '最后登录'
      ];

      const csvRows = users.map(user => [
        user.id,
        user.name,
        user.email,
        user.phone || '',
        user.department || '',
        user.position || '',
        user.role,
        user.status,
        user.createdAt,
        user.lastLoginAt || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // 默认返回Excel格式的数据结构
      const excelData = {
        sheets: [
          {
            name: '用户信息',
            headers: [
              'ID', '姓名', '邮箱', '手机号', '部门', '职位', '角色', '状态', '创建时间', '最后登录'
            ],
            data: users.map(user => [
              user.id,
              user.name,
              user.email,
              user.phone || '',
              user.department || '',
              user.position || '',
              user.role,
              user.status,
              user.createdAt,
              user.lastLoginAt || ''
            ])
          }
        ]
      };

      return NextResponse.json({
        success: true,
        data: excelData,
        filename: `users_export_${new Date().toISOString().split('T')[0]}.xlsx`
      });
    }

  } catch (error) {
    console.error('导出用户数据失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '导出用户数据失败'
    }, { status: 500 });
  }
}
