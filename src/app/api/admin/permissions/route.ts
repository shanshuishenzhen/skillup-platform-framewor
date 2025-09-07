/**
 * 权限管理API路由
 * 提供系统权限列表查询功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRBAC } from '@/middleware/rbac';
import { UserRole } from '@/types/roles';

/**
 * 系统权限定义
 * 按功能模块分类的权限列表
 */
const SYSTEM_PERMISSIONS = [
  // 用户管理权限
  {
    id: 'user.view',
    name: '查看用户',
    description: '查看用户列表和用户详情',
    category: '用户管理'
  },
  {
    id: 'user.create',
    name: '创建用户',
    description: '创建新用户账号',
    category: '用户管理'
  },
  {
    id: 'user.edit',
    name: '编辑用户',
    description: '修改用户信息和状态',
    category: '用户管理'
  },
  {
    id: 'user.delete',
    name: '删除用户',
    description: '删除用户账号',
    category: '用户管理'
  },
  {
    id: 'user.import',
    name: '批量导入用户',
    description: '通过Excel/CSV批量导入用户',
    category: '用户管理'
  },
  {
    id: 'user.export',
    name: '导出用户',
    description: '导出用户数据',
    category: '用户管理'
  },
  {
    id: 'user.batch_update',
    name: '批量更新用户',
    description: '批量修改用户状态、角色等信息',
    category: '用户管理'
  },

  // 角色管理权限
  {
    id: 'role.view',
    name: '查看角色',
    description: '查看角色列表和角色详情',
    category: '角色管理'
  },
  {
    id: 'role.create',
    name: '创建角色',
    description: '创建新的用户角色',
    category: '角色管理'
  },
  {
    id: 'role.edit',
    name: '编辑角色',
    description: '修改角色信息和权限配置',
    category: '角色管理'
  },
  {
    id: 'role.delete',
    name: '删除角色',
    description: '删除用户角色',
    category: '角色管理'
  },
  {
    id: 'role.assign',
    name: '分配角色',
    description: '为用户分配角色',
    category: '角色管理'
  },

  // 课程管理权限
  {
    id: 'course.view',
    name: '查看课程',
    description: '查看课程列表和课程详情',
    category: '课程管理'
  },
  {
    id: 'course.create',
    name: '创建课程',
    description: '创建新的培训课程',
    category: '课程管理'
  },
  {
    id: 'course.edit',
    name: '编辑课程',
    description: '修改课程信息和内容',
    category: '课程管理'
  },
  {
    id: 'course.delete',
    name: '删除课程',
    description: '删除培训课程',
    category: '课程管理'
  },
  {
    id: 'course.publish',
    name: '发布课程',
    description: '发布或下架课程',
    category: '课程管理'
  },
  {
    id: 'course.assign',
    name: '分配课程',
    description: '为用户或部门分配课程',
    category: '课程管理'
  },

  // 考试管理权限
  {
    id: 'exam.view',
    name: '查看考试',
    description: '查看考试列表和考试详情',
    category: '考试管理'
  },
  {
    id: 'exam.create',
    name: '创建考试',
    description: '创建新的考试',
    category: '考试管理'
  },
  {
    id: 'exam.edit',
    name: '编辑考试',
    description: '修改考试信息和题目',
    category: '考试管理'
  },
  {
    id: 'exam.delete',
    name: '删除考试',
    description: '删除考试',
    category: '考试管理'
  },
  {
    id: 'exam.grade',
    name: '阅卷评分',
    description: '对考试进行阅卷和评分',
    category: '考试管理'
  },
  {
    id: 'exam.result',
    name: '查看考试结果',
    description: '查看考试成绩和统计',
    category: '考试管理'
  },

  // 组织管理权限
  {
    id: 'org.view',
    name: '查看组织',
    description: '查看组织架构和部门信息',
    category: '组织管理'
  },
  {
    id: 'org.create',
    name: '创建组织',
    description: '创建新的部门或组织',
    category: '组织管理'
  },
  {
    id: 'org.edit',
    name: '编辑组织',
    description: '修改组织架构和部门信息',
    category: '组织管理'
  },
  {
    id: 'org.delete',
    name: '删除组织',
    description: '删除部门或组织',
    category: '组织管理'
  },

  // 报表统计权限
  {
    id: 'report.view',
    name: '查看报表',
    description: '查看各类统计报表',
    category: '报表统计'
  },
  {
    id: 'report.export',
    name: '导出报表',
    description: '导出统计报表数据',
    category: '报表统计'
  },
  {
    id: 'report.dashboard',
    name: '查看仪表盘',
    description: '查看管理仪表盘',
    category: '报表统计'
  },

  // 系统设置权限
  {
    id: 'system.config',
    name: '系统配置',
    description: '修改系统配置参数',
    category: '系统设置'
  },
  {
    id: 'system.backup',
    name: '数据备份',
    description: '执行数据备份和恢复',
    category: '系统设置'
  },
  {
    id: 'system.log',
    name: '查看日志',
    description: '查看系统操作日志',
    category: '系统设置'
  },
  {
    id: 'system.audit',
    name: '审计管理',
    description: '查看和管理审计记录',
    category: '系统设置'
  },

  // 内容管理权限
  {
    id: 'content.view',
    name: '查看内容',
    description: '查看学习资料和文档',
    category: '内容管理'
  },
  {
    id: 'content.create',
    name: '创建内容',
    description: '创建学习资料和文档',
    category: '内容管理'
  },
  {
    id: 'content.edit',
    name: '编辑内容',
    description: '修改学习资料和文档',
    category: '内容管理'
  },
  {
    id: 'content.delete',
    name: '删除内容',
    description: '删除学习资料和文档',
    category: '内容管理'
  },
  {
    id: 'content.upload',
    name: '上传文件',
    description: '上传学习资料文件',
    category: '内容管理'
  }
];

/**
 * 获取系统权限列表
 * GET /api/admin/permissions
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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // 过滤权限列表
    let filteredPermissions = SYSTEM_PERMISSIONS;
    if (category && category !== 'all') {
      filteredPermissions = SYSTEM_PERMISSIONS.filter(p => p.category === category);
    }

    // 获取所有权限分类
    const categories = Array.from(new Set(SYSTEM_PERMISSIONS.map(p => p.category)));

    return NextResponse.json({
      success: true,
      permissions: filteredPermissions,
      categories,
      total: filteredPermissions.length
    });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}