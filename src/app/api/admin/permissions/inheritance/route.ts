import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * 获取权限继承关系
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 获取所有部门权限及其继承关系
    const { data: permissions, error } = await supabase
      .from('department_permissions')
      .select(`
        *,
        department:departments(*),
        parent_department:departments!department_permissions_parent_department_id_fkey(*)
      `)
      .order('department_id');
    
    if (error) {
      return NextResponse.json(
        { error: '获取权限继承关系失败' },
        { status: 500 }
      );
    }
    
    // 构建继承树
    const inheritanceTree = buildInheritanceTree(permissions || []);
    
    return NextResponse.json({
      success: true,
      data: inheritanceTree
    });
    
  } catch (error) {
    console.error('获取权限继承关系失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 构建权限继承树
 */
function buildInheritanceTree(permissions: any[]) {
  const tree: any = {};
  
  permissions.forEach(perm => {
    const deptId = perm.department_id;
    if (!tree[deptId]) {
      tree[deptId] = {
        department: perm.department,
        permissions: [],
        inherited_from: [],
        inherited_by: []
      };
    }
    tree[deptId].permissions.push(perm);
  });
  
  return tree;
}