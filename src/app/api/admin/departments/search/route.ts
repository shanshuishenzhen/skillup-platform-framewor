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
 * 构建搜索查询
 * @param query - 搜索查询对象
 * @returns Supabase查询构建器
 */
function buildSearchQuery(query: any) {
  let supabaseQuery = supabase
    .from('departments')
    .select(`
      *,
      parent:departments!parent_id(id, name, code),
      children:departments!parent_id(id, name, code, status),
      _count_members:user_departments(count)
    `);

  // 关键词搜索
  if (query.keyword) {
    supabaseQuery = supabaseQuery.or(
      `name.ilike.%${query.keyword}%,code.ilike.%${query.keyword}%,description.ilike.%${query.keyword}%`
    );
  }

  // 状态筛选
  if (query.status && query.status !== 'all') {
    supabaseQuery = supabaseQuery.eq('status', query.status);
  }

  // 层级筛选
  if (query.level && query.level !== 'all') {
    supabaseQuery = supabaseQuery.eq('level', parseInt(query.level));
  }

  // 父部门筛选
  if (query.parent_id) {
    if (query.parent_id === 'root') {
      supabaseQuery = supabaseQuery.is('parent_id', null);
    } else {
      supabaseQuery = supabaseQuery.eq('parent_id', query.parent_id);
    }
  }

  // 部门类型筛选
  if (query.department_type && query.department_type !== 'all') {
    supabaseQuery = supabaseQuery.eq('department_type', query.department_type);
  }

  // 成员数量范围筛选
  if (query.member_count_min || query.member_count_max) {
    // 这里需要通过子查询来实现，暂时跳过复杂的成员数量筛选
    // 实际项目中可以通过视图或者复杂查询来实现
  }

  // 创建时间范围筛选
  if (query.created_from) {
    supabaseQuery = supabaseQuery.gte('created_at', query.created_from);
  }
  if (query.created_to) {
    supabaseQuery = supabaseQuery.lte('created_at', query.created_to);
  }

  // 更新时间范围筛选
  if (query.updated_from) {
    supabaseQuery = supabaseQuery.gte('updated_at', query.updated_from);
  }
  if (query.updated_to) {
    supabaseQuery = supabaseQuery.lte('updated_at', query.updated_to);
  }

  return supabaseQuery;
}

/**
 * 搜索和筛选部门
 * GET /api/admin/departments/search
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const searchQuery = {
      keyword: searchParams.get('keyword') || '',
      status: searchParams.get('status') || 'all',
      level: searchParams.get('level') || 'all',
      parent_id: searchParams.get('parent_id') || '',
      department_type: searchParams.get('department_type') || 'all',
      member_count_min: searchParams.get('member_count_min') || '',
      member_count_max: searchParams.get('member_count_max') || '',
      created_from: searchParams.get('created_from') || '',
      created_to: searchParams.get('created_to') || '',
      updated_from: searchParams.get('updated_from') || '',
      updated_to: searchParams.get('updated_to') || '',
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      page_size: parseInt(searchParams.get('page_size') || '20')
    };

    // 验证分页参数
    if (searchQuery.page < 1) searchQuery.page = 1;
    if (searchQuery.page_size < 1 || searchQuery.page_size > 100) searchQuery.page_size = 20;

    // 构建查询
    let query = buildSearchQuery(searchQuery);

    // 排序
    const validSortFields = ['name', 'code', 'level', 'created_at', 'updated_at', 'sort_order'];
    const sortBy = validSortFields.includes(searchQuery.sort_by) ? searchQuery.sort_by : 'created_at';
    const sortOrder = searchQuery.sort_order === 'asc' ? true : false;
    
    query = query.order(sortBy, { ascending: sortOrder });

    // 分页
    const from = (searchQuery.page - 1) * searchQuery.page_size;
    const to = from + searchQuery.page_size - 1;
    
    query = query.range(from, to);

    // 执行查询
    const { data: departments, error, count } = await query;

    if (error) {
      console.error('搜索部门失败:', error);
      return NextResponse.json({ error: '搜索部门失败' }, { status: 500 });
    }

    // 获取总数（用于分页）
    const { count: totalCount } = await buildSearchQuery(searchQuery)
      .select('*', { count: 'exact', head: true });

    // 计算分页信息
    const totalPages = Math.ceil((totalCount || 0) / searchQuery.page_size);
    const hasNextPage = searchQuery.page < totalPages;
    const hasPrevPage = searchQuery.page > 1;

    // 处理部门数据，添加成员数量
    const processedDepartments = await Promise.all(
      (departments || []).map(async (dept) => {
        // 获取部门成员数量
        const { count: memberCount } = await supabase
          .from('user_departments')
          .select('*', { count: 'exact', head: true })
          .eq('department_id', dept.id)
          .is('end_date', null);

        // 获取子部门数量
        const { count: childrenCount } = await supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', dept.id)
          .eq('status', 'active');

        return {
          ...dept,
          member_count: memberCount || 0,
          children_count: childrenCount || 0
        };
      })
    );

    // 记录操作日志
    await logAdminAction(
      admin.id,
      'search_departments',
      'department',
      'search',
      { search_query: searchQuery, result_count: departments?.length || 0 }
    );

    return NextResponse.json({
      success: true,
      departments: processedDepartments,
      pagination: {
        current_page: searchQuery.page,
        page_size: searchQuery.page_size,
        total_count: totalCount || 0,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      },
      search_query: searchQuery
    });

  } catch (error) {
    console.error('搜索部门失败:', error);
    return NextResponse.json(
      { error: '搜索部门失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取搜索建议和自动完成
 * POST /api/admin/departments/search
 */
export async function POST(request: NextRequest) {
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
    const { query, type = 'all', limit = 10 } = body;

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: []
      });
    }

    const suggestions = [];

    // 部门名称建议
    if (type === 'all' || type === 'name') {
      const { data: nameResults } = await supabase
        .from('departments')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .eq('status', 'active')
        .limit(limit);

      if (nameResults) {
        suggestions.push(...nameResults.map(dept => ({
          type: 'name',
          value: dept.name,
          label: dept.name,
          id: dept.id
        })));
      }
    }

    // 部门编码建议
    if (type === 'all' || type === 'code') {
      const { data: codeResults } = await supabase
        .from('departments')
        .select('id, code, name')
        .ilike('code', `%${query}%`)
        .eq('status', 'active')
        .limit(limit);

      if (codeResults) {
        suggestions.push(...codeResults.map(dept => ({
          type: 'code',
          value: dept.code,
          label: `${dept.code} - ${dept.name}`,
          id: dept.id
        })));
      }
    }

    // 部门描述建议
    if (type === 'all' || type === 'description') {
      const { data: descResults } = await supabase
        .from('departments')
        .select('id, name, description')
        .ilike('description', `%${query}%`)
        .eq('status', 'active')
        .not('description', 'is', null)
        .limit(limit);

      if (descResults) {
        suggestions.push(...descResults.map(dept => ({
          type: 'description',
          value: dept.name,
          label: `${dept.name} - ${dept.description?.substring(0, 50)}...`,
          id: dept.id
        })));
      }
    }

    // 去重并限制数量
    const uniqueSuggestions = suggestions
      .filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id && t.type === item.type)
      )
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      suggestions: uniqueSuggestions
    });

  } catch (error) {
    console.error('获取搜索建议失败:', error);
    return NextResponse.json(
      { error: '获取搜索建议失败' },
      { status: 500 }
    );
  }
}