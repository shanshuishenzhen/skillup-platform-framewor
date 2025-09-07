import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 验证管理员权限
 * @param token - JWT令牌
 * @returns 管理员信息或null
 */
async function verifyAdminToken(token: string) {
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', decoded.adminId)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      return null;
    }

    return admin;
  } catch (error) {
    return null;
  }
}

/**
 * 记录操作日志
 * @param adminId - 管理员ID
 * @param action - 操作类型
 * @param resourceType - 资源类型
 * @param resourceId - 资源ID
 * @param details - 操作详情
 */
async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: any
) {
  try {
    await supabase.from('admin_logs').insert({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
}

/**
 * 生成部门路径
 * @param parentPath - 父部门路径
 * @param departmentCode - 部门编码
 * @returns 新的部门路径
 */
function generateDepartmentPath(parentPath: string | null, departmentCode: string): string {
  if (!parentPath) {
    return departmentCode;
  }
  return `${parentPath}.${departmentCode}`;
}

/**
 * 计算部门层级
 * @param path - 部门路径
 * @returns 部门层级（从1开始）
 */
function calculateLevel(path: string): number {
  return path.split('.').length;
}

/**
 * 检查是否会形成循环引用
 * @param departmentId - 要移动的部门ID
 * @param newParentId - 新的父部门ID
 * @returns 是否会形成循环引用
 */
async function checkCircularReference(departmentId: string, newParentId: string | null): Promise<boolean> {
  if (!newParentId) {
    return false; // 移动到根级别，不会形成循环
  }

  if (departmentId === newParentId) {
    return true; // 不能将部门移动到自己下面
  }

  // 获取要移动的部门信息
  const { data: department } = await supabase
    .from('departments')
    .select('path')
    .eq('id', departmentId)
    .single();

  if (!department) {
    return true; // 部门不存在
  }

  // 获取新父部门信息
  const { data: newParent } = await supabase
    .from('departments')
    .select('path')
    .eq('id', newParentId)
    .single();

  if (!newParent) {
    return true; // 新父部门不存在
  }

  // 检查新父部门是否是当前部门的子部门
  return newParent.path.startsWith(department.path + '.');
}

/**
 * 更新部门及其子部门的路径和层级
 * @param departmentId - 部门ID
 * @param newPath - 新路径
 * @param newLevel - 新层级
 */
async function updateDepartmentPaths(departmentId: string, newPath: string, newLevel: number) {
  // 获取当前部门信息
  const { data: currentDept } = await supabase
    .from('departments')
    .select('path, level')
    .eq('id', departmentId)
    .single();

  if (!currentDept) {
    throw new Error('部门不存在');
  }

  const oldPath = currentDept.path;
  const oldLevel = currentDept.level;
  const levelDiff = newLevel - oldLevel;

  // 更新当前部门
  await supabase
    .from('departments')
    .update({
      path: newPath,
      level: newLevel,
      updated_at: new Date().toISOString()
    })
    .eq('id', departmentId);

  // 获取所有子部门
  const { data: subDepartments } = await supabase
    .from('departments')
    .select('id, path, level')
    .like('path', `${oldPath}.%`);

  if (subDepartments && subDepartments.length > 0) {
    // 批量更新子部门的路径和层级
    const updates = subDepartments.map(dept => {
      const relativePath = dept.path.substring(oldPath.length + 1);
      const newSubPath = `${newPath}.${relativePath}`;
      const newSubLevel = dept.level + levelDiff;

      return supabase
        .from('departments')
        .update({
          path: newSubPath,
          level: newSubLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', dept.id);
    });

    await Promise.all(updates);
  }
}

/**
 * 移动部门到新的父部门
 * PUT /api/admin/departments/[id]/move
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const departmentId = params.id;
    const body = await request.json();
    const { new_parent_id, position } = body;

    // 验证部门是否存在
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', departmentId)
      .single();

    if (deptError || !department) {
      return NextResponse.json({ error: '部门不存在' }, { status: 404 });
    }

    // 检查循环引用
    const hasCircularRef = await checkCircularReference(departmentId, new_parent_id);
    if (hasCircularRef) {
      return NextResponse.json({ error: '不能将部门移动到其子部门下，这会形成循环引用' }, { status: 400 });
    }

    // 获取新父部门信息（如果有）
    let newParent = null;
    if (new_parent_id) {
      const { data: parentData, error: parentError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', new_parent_id)
        .eq('status', 'active')
        .single();

      if (parentError || !parentData) {
        return NextResponse.json({ error: '新父部门不存在或已禁用' }, { status: 400 });
      }
      newParent = parentData;
    }

    // 计算新的路径和层级
    const newPath = generateDepartmentPath(
      newParent ? newParent.path : null,
      department.code
    );
    const newLevel = calculateLevel(newPath);

    // 检查层级限制（最多5级）
    if (newLevel > 5) {
      return NextResponse.json({ error: '部门层级不能超过5级' }, { status: 400 });
    }

    // 开始事务操作
    try {
      // 更新部门的父级关系
      const { error: updateError } = await supabase
        .from('departments')
        .update({
          parent_id: new_parent_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', departmentId);

      if (updateError) {
        throw updateError;
      }

      // 更新部门及其子部门的路径和层级
      await updateDepartmentPaths(departmentId, newPath, newLevel);

      // 如果指定了位置，更新排序
      if (typeof position === 'number') {
        // 获取同级部门
        const { data: siblings } = await supabase
          .from('departments')
          .select('id, sort_order')
          .eq('parent_id', new_parent_id || null)
          .neq('id', departmentId)
          .order('sort_order');

        if (siblings) {
          // 重新计算排序
          const updates = [];
          let currentOrder = 1;

          for (let i = 0; i < siblings.length + 1; i++) {
            if (i === position) {
              // 插入移动的部门
              updates.push(
                supabase
                  .from('departments')
                  .update({ sort_order: currentOrder })
                  .eq('id', departmentId)
              );
              currentOrder++;
            }
            
            if (i < siblings.length) {
              updates.push(
                supabase
                  .from('departments')
                  .update({ sort_order: currentOrder })
                  .eq('id', siblings[i].id)
              );
              currentOrder++;
            }
          }

          await Promise.all(updates);
        }
      }

      // 获取更新后的部门信息
      const { data: updatedDepartment } = await supabase
        .from('departments')
        .select(`
          *,
          parent:departments!parent_id(id, name, code),
          children:departments!parent_id(id, name, code, status),
          _count_members:user_departments(count)
        `)
        .eq('id', departmentId)
        .single();

      // 记录操作日志
      await logAdminAction(
        admin.id,
        'move_department',
        'department',
        departmentId,
        {
          old_parent_id: department.parent_id,
          new_parent_id,
          old_path: department.path,
          new_path: newPath,
          position
        }
      );

      return NextResponse.json({
        success: true,
        message: '部门移动成功',
        department: updatedDepartment
      });

    } catch (error) {
      console.error('移动部门失败:', error);
      return NextResponse.json({ error: '移动部门失败，请重试' }, { status: 500 });
    }

  } catch (error) {
    console.error('移动部门失败:', error);
    return NextResponse.json(
      { error: '移动部门失败' },
      { status: 500 }
    );
  }
}

/**
 * 批量调整部门排序
 * POST /api/admin/departments/[id]/move
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    const body = await request.json();
    const { department_orders } = body; // [{ id: string, sort_order: number }]

    if (!Array.isArray(department_orders) || department_orders.length === 0) {
      return NextResponse.json({ error: '无效的排序数据' }, { status: 400 });
    }

    // 批量更新排序
    const updates = department_orders.map(({ id, sort_order }) => 
      supabase
        .from('departments')
        .update({ 
          sort_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    );

    await Promise.all(updates);

    // 记录操作日志
    await logAdminAction(
      admin.id,
      'reorder_departments',
      'department',
      'batch',
      { department_orders }
    );

    return NextResponse.json({
      success: true,
      message: '部门排序更新成功'
    });

  } catch (error) {
    console.error('更新部门排序失败:', error);
    return NextResponse.json(
      { error: '更新部门排序失败' },
      { status: 500 }
    );
  }
}