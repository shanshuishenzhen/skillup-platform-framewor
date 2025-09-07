/**
 * 部门权限继承和访问控制核心逻辑
 * 提供权限计算、继承、冲突检测等功能
 */

import { createClient } from '@supabase/supabase-js';

// Supabase 客户端配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 权限类型定义
 */
export interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
  conditions?: Record<string, any>;
  source: 'direct' | 'inherited' | 'role' | 'default';
  priority: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 部门权限配置
 */
export interface DepartmentPermission {
  id: string;
  department_id: string;
  resource: string;
  action: string;
  granted: boolean;
  inherit_from_parent: boolean;
  override_children: boolean;
  conditions?: Record<string, any>;
  priority: number;
  expires_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * 权限继承规则
 */
export interface PermissionInheritanceRule {
  id: string;
  parent_department_id: string;
  child_department_id: string;
  resource: string;
  action: string;
  inherit_type: 'full' | 'partial' | 'none';
  override_allowed: boolean;
  conditions?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * 权限冲突信息
 */
export interface PermissionConflict {
  id: string;
  user_id?: string;
  department_id?: string;
  resource: string;
  action: string;
  conflict_type: 'inheritance' | 'override' | 'role_department' | 'expiry';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  conflicting_permissions: Permission[];
  suggested_resolution?: string;
  auto_resolvable: boolean;
  detected_at: string;
}

/**
 * 部门权限服务类
 */
export class DepartmentPermissionService {
  /**
   * 获取用户在特定部门的有效权限
   * @param userId 用户ID
   * @param departmentId 部门ID
   * @param resource 资源（可选）
   * @param action 操作（可选）
   * @returns 用户有效权限列表
   */
  static async getUserEffectivePermissions(
    userId: string,
    departmentId: string,
    resource?: string,
    action?: string
  ): Promise<Permission[]> {
    try {
      // 1. 获取用户直接权限
      const directPermissions = await this.getUserDirectPermissions(userId, resource, action);
      
      // 2. 获取用户角色权限
      const rolePermissions = await this.getUserRolePermissions(userId, resource, action);
      
      // 3. 获取部门权限（包括继承）
      const departmentPermissions = await this.getDepartmentEffectivePermissions(
        departmentId,
        resource,
        action
      );
      
      // 4. 合并和优先级排序
      const allPermissions = [
        ...directPermissions.map(p => ({ ...p, source: 'direct' as const, priority: 1 })),
        ...rolePermissions.map(p => ({ ...p, source: 'role' as const, priority: 2 })),
        ...departmentPermissions.map(p => ({ ...p, source: p.source, priority: 3 }))
      ];
      
      // 5. 解决权限冲突
      const resolvedPermissions = await this.resolvePermissionConflicts(allPermissions);
      
      return resolvedPermissions;
    } catch (error) {
      console.error('获取用户有效权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取部门的有效权限（包括继承）
   * @param departmentId 部门ID
   * @param resource 资源（可选）
   * @param action 操作（可选）
   * @returns 部门有效权限列表
   */
  static async getDepartmentEffectivePermissions(
    departmentId: string,
    resource?: string,
    action?: string
  ): Promise<Permission[]> {
    try {
      // 1. 获取部门直接权限
      const directPermissions = await this.getDepartmentDirectPermissions(
        departmentId,
        resource,
        action
      );
      
      // 2. 获取继承权限
      const inheritedPermissions = await this.getDepartmentInheritedPermissions(
        departmentId,
        resource,
        action
      );
      
      // 3. 合并权限并处理覆盖
      const allPermissions = [...directPermissions, ...inheritedPermissions];
      
      // 4. 按优先级排序和去重
      const effectivePermissions = this.consolidatePermissions(allPermissions);
      
      return effectivePermissions;
    } catch (error) {
      console.error('获取部门有效权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取部门直接权限
   * @param departmentId 部门ID
   * @param resource 资源（可选）
   * @param action 操作（可选）
   * @returns 部门直接权限列表
   */
  static async getDepartmentDirectPermissions(
    departmentId: string,
    resource?: string,
    action?: string
  ): Promise<Permission[]> {
    try {
      let query = supabase
        .from('department_permissions')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      
      if (resource) {
        query = query.eq('resource', resource);
      }
      
      if (action) {
        query = query.eq('action', action);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return (data || []).map(permission => ({
        id: permission.id,
        resource: permission.resource,
        action: permission.action,
        granted: permission.granted,
        conditions: permission.conditions,
        source: 'direct' as const,
        priority: permission.priority || 1,
        expires_at: permission.expires_at,
        created_at: permission.created_at,
        updated_at: permission.updated_at
      }));
    } catch (error) {
      console.error('获取部门直接权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取部门继承权限
   * @param departmentId 部门ID
   * @param resource 资源（可选）
   * @param action 操作（可选）
   * @returns 部门继承权限列表
   */
  static async getDepartmentInheritedPermissions(
    departmentId: string,
    resource?: string,
    action?: string
  ): Promise<Permission[]> {
    try {
      // 获取部门的父级路径
      const parentPath = await this.getDepartmentParentPath(departmentId);
      
      if (parentPath.length === 0) {
        return [];
      }
      
      const inheritedPermissions: Permission[] = [];
      
      // 从直接父级开始，逐级向上获取可继承的权限
      for (const parentId of parentPath) {
        const parentPermissions = await this.getDepartmentDirectPermissions(
          parentId,
          resource,
          action
        );
        
        // 筛选可继承的权限
        const inheritablePermissions = await this.filterInheritablePermissions(
          parentPermissions,
          parentId,
          departmentId
        );
        
        inheritedPermissions.push(
          ...inheritablePermissions.map(p => ({
            ...p,
            source: 'inherited' as const,
            priority: p.priority + parentPath.indexOf(parentId) + 1
          }))
        );
      }
      
      return inheritedPermissions;
    } catch (error) {
      console.error('获取部门继承权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取部门的父级路径
   * @param departmentId 部门ID
   * @returns 父级部门ID数组（从直接父级到根级）
   */
  static async getDepartmentParentPath(departmentId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('parent_id')
        .eq('id', departmentId)
        .single();
      
      if (error || !data?.parent_id) {
        return [];
      }
      
      const parentPath = [data.parent_id];
      const grandParentPath = await this.getDepartmentParentPath(data.parent_id);
      
      return [...parentPath, ...grandParentPath];
    } catch (error) {
      console.error('获取部门父级路径失败:', error);
      return [];
    }
  }
  
  /**
   * 筛选可继承的权限
   * @param permissions 权限列表
   * @param parentId 父级部门ID
   * @param childId 子级部门ID
   * @returns 可继承的权限列表
   */
  static async filterInheritablePermissions(
    permissions: Permission[],
    parentId: string,
    childId: string
  ): Promise<Permission[]> {
    try {
      const inheritablePermissions: Permission[] = [];
      
      for (const permission of permissions) {
        // 检查继承规则
        const { data: rules, error } = await supabase
          .from('permission_inheritance_rules')
          .select('*')
          .eq('parent_department_id', parentId)
          .eq('child_department_id', childId)
          .eq('resource', permission.resource)
          .eq('action', permission.action);
        
        if (error) {
          console.error('查询继承规则失败:', error);
          continue;
        }
        
        // 如果有明确的继承规则
        if (rules && rules.length > 0) {
          const rule = rules[0];
          if (rule.inherit_type === 'full' || rule.inherit_type === 'partial') {
            inheritablePermissions.push(permission);
          }
        } else {
          // 默认继承策略：检查父级权限是否允许继承
          const { data: parentPermission, error: permError } = await supabase
            .from('department_permissions')
            .select('inherit_from_parent')
            .eq('department_id', parentId)
            .eq('resource', permission.resource)
            .eq('action', permission.action)
            .single();
          
          if (!permError && parentPermission?.inherit_from_parent !== false) {
            inheritablePermissions.push(permission);
          }
        }
      }
      
      return inheritablePermissions;
    } catch (error) {
      console.error('筛选可继承权限失败:', error);
      return [];
    }
  }
  
  /**
   * 获取用户直接权限
   * @param userId 用户ID
   * @param resource 资源（可选）
   * @param action 操作（可选）
   * @returns 用户直接权限列表
   */
  static async getUserDirectPermissions(
    userId: string,
    resource?: string,
    action?: string
  ): Promise<Permission[]> {
    try {
      let query = supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      
      if (resource) {
        query = query.eq('resource', resource);
      }
      
      if (action) {
        query = query.eq('action', action);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return (data || []).map(permission => ({
        id: permission.id,
        resource: permission.resource,
        action: permission.action,
        granted: permission.granted,
        conditions: permission.conditions,
        source: 'direct' as const,
        priority: permission.priority || 1,
        expires_at: permission.expires_at,
        created_at: permission.created_at,
        updated_at: permission.updated_at
      }));
    } catch (error) {
      console.error('获取用户直接权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户角色权限
   * @param userId 用户ID
   * @param resource 资源（可选）
   * @param action 操作（可选）
   * @returns 用户角色权限列表
   */
  static async getUserRolePermissions(
    userId: string,
    resource?: string,
    action?: string
  ): Promise<Permission[]> {
    try {
      // 获取用户角色
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (roleError || !userRoles || userRoles.length === 0) {
        return [];
      }
      
      const roleIds = userRoles.map(ur => ur.role_id);
      
      // 获取角色权限
      let query = supabase
        .from('role_permissions')
        .select('*')
        .in('role_id', roleIds)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      
      if (resource) {
        query = query.eq('resource', resource);
      }
      
      if (action) {
        query = query.eq('action', action);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return (data || []).map(permission => ({
        id: permission.id,
        resource: permission.resource,
        action: permission.action,
        granted: permission.granted,
        conditions: permission.conditions,
        source: 'role' as const,
        priority: permission.priority || 2,
        expires_at: permission.expires_at,
        created_at: permission.created_at,
        updated_at: permission.updated_at
      }));
    } catch (error) {
      console.error('获取用户角色权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 合并权限并处理冲突
   * @param permissions 权限列表
   * @returns 合并后的权限列表
   */
  static consolidatePermissions(permissions: Permission[]): Permission[] {
    const permissionMap = new Map<string, Permission>();
    
    // 按优先级排序（数字越小优先级越高）
    const sortedPermissions = permissions.sort((a, b) => a.priority - b.priority);
    
    for (const permission of sortedPermissions) {
      const key = `${permission.resource}:${permission.action}`;
      
      // 如果已存在相同资源和操作的权限，比较优先级
      if (permissionMap.has(key)) {
        const existing = permissionMap.get(key)!;
        
        // 优先级更高的权限覆盖现有权限
        if (permission.priority < existing.priority) {
          permissionMap.set(key, permission);
        }
      } else {
        permissionMap.set(key, permission);
      }
    }
    
    return Array.from(permissionMap.values());
  }
  
  /**
   * 解决权限冲突
   * @param permissions 权限列表
   * @returns 解决冲突后的权限列表
   */
  static async resolvePermissionConflicts(permissions: Permission[]): Promise<Permission[]> {
    try {
      // 检测冲突
      const conflicts = await this.detectPermissionConflicts(permissions);
      
      if (conflicts.length === 0) {
        return this.consolidatePermissions(permissions);
      }
      
      // 自动解决可解决的冲突
      const resolvedPermissions = [...permissions];
      
      for (const conflict of conflicts) {
        if (conflict.auto_resolvable) {
          await this.autoResolveConflict(conflict, resolvedPermissions);
        }
      }
      
      return this.consolidatePermissions(resolvedPermissions);
    } catch (error) {
      console.error('解决权限冲突失败:', error);
      return this.consolidatePermissions(permissions);
    }
  }
  
  /**
   * 检测权限冲突
   * @param permissions 权限列表
   * @returns 权限冲突列表
   */
  static async detectPermissionConflicts(permissions: Permission[]): Promise<PermissionConflict[]> {
    const conflicts: PermissionConflict[] = [];
    const permissionGroups = new Map<string, Permission[]>();
    
    // 按资源和操作分组
    for (const permission of permissions) {
      const key = `${permission.resource}:${permission.action}`;
      if (!permissionGroups.has(key)) {
        permissionGroups.set(key, []);
      }
      permissionGroups.get(key)!.push(permission);
    }
    
    // 检查每组是否有冲突
    for (const [key, group] of permissionGroups) {
      if (group.length > 1) {
        const [resource, action] = key.split(':');
        
        // 检查是否有granted值不同的权限
        const grantedValues = [...new Set(group.map(p => p.granted))];
        if (grantedValues.length > 1) {
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random()}`,
            resource,
            action,
            conflict_type: 'inheritance',
            severity: 'medium',
            description: `资源 ${resource} 的 ${action} 操作存在权限冲突`,
            conflicting_permissions: group,
            suggested_resolution: '使用优先级最高的权限',
            auto_resolvable: true,
            detected_at: new Date().toISOString()
          });
        }
        
        // 检查过期权限冲突
        const expiredPermissions = group.filter(p => 
          p.expires_at && new Date(p.expires_at) < new Date()
        );
        
        if (expiredPermissions.length > 0) {
          conflicts.push({
            id: `expiry_conflict_${Date.now()}_${Math.random()}`,
            resource,
            action,
            conflict_type: 'expiry',
            severity: 'low',
            description: `资源 ${resource} 的 ${action} 操作存在过期权限`,
            conflicting_permissions: expiredPermissions,
            suggested_resolution: '移除过期权限',
            auto_resolvable: true,
            detected_at: new Date().toISOString()
          });
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * 自动解决权限冲突
   * @param conflict 权限冲突
   * @param permissions 权限列表（会被修改）
   */
  static async autoResolveConflict(
    conflict: PermissionConflict,
    permissions: Permission[]
  ): Promise<void> {
    try {
      switch (conflict.conflict_type) {
        case 'inheritance':
          // 保留优先级最高的权限
          const highestPriority = Math.min(
            ...conflict.conflicting_permissions.map(p => p.priority)
          );
          
          // 移除优先级较低的权限
          for (let i = permissions.length - 1; i >= 0; i--) {
            const permission = permissions[i];
            if (
              permission.resource === conflict.resource &&
              permission.action === conflict.action &&
              permission.priority > highestPriority
            ) {
              permissions.splice(i, 1);
            }
          }
          break;
          
        case 'expiry':
          // 移除过期权限
          for (let i = permissions.length - 1; i >= 0; i--) {
            const permission = permissions[i];
            if (
              permission.resource === conflict.resource &&
              permission.action === conflict.action &&
              permission.expires_at &&
              new Date(permission.expires_at) < new Date()
            ) {
              permissions.splice(i, 1);
            }
          }
          break;
      }
    } catch (error) {
      console.error('自动解决权限冲突失败:', error);
    }
  }
  
  /**
   * 检查用户是否有特定权限
   * @param userId 用户ID
   * @param departmentId 部门ID
   * @param resource 资源
   * @param action 操作
   * @returns 是否有权限
   */
  static async checkUserPermission(
    userId: string,
    departmentId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const permissions = await this.getUserEffectivePermissions(
        userId,
        departmentId,
        resource,
        action
      );
      
      // 查找匹配的权限
      const matchingPermission = permissions.find(
        p => p.resource === resource && p.action === action
      );
      
      return matchingPermission?.granted || false;
    } catch (error) {
      console.error('检查用户权限失败:', error);
      return false;
    }
  }
}

/**
 * 权限模板服务
 */
export class PermissionTemplateService {
  /**
   * 预定义权限模板
   */
  static readonly PREDEFINED_TEMPLATES = {
    admin: {
      name: '管理员模板',
      description: '完整的管理权限',
      category: 'system',
      permissions: [
        { resource: '*', action: '*', granted: true },
      ]
    },
    manager: {
      name: '部门经理模板',
      description: '部门管理权限',
      category: 'management',
      permissions: [
        { resource: 'users', action: 'read', granted: true },
        { resource: 'users', action: 'update', granted: true },
        { resource: 'reports', action: 'read', granted: true },
        { resource: 'reports', action: 'create', granted: true },
      ]
    },
    employee: {
      name: '普通员工模板',
      description: '基础员工权限',
      category: 'basic',
      permissions: [
        { resource: 'profile', action: 'read', granted: true },
        { resource: 'profile', action: 'update', granted: true },
        { resource: 'resources', action: 'read', granted: true },
      ]
    },
    readonly: {
      name: '只读模板',
      description: '只读访问权限',
      category: 'basic',
      permissions: [
        { resource: '*', action: 'read', granted: true },
      ]
    }
  };
  
  /**
   * 获取所有权限模板
   * @param category 模板类别（可选）
   * @returns 权限模板列表
   */
  static async getPermissionTemplates(category?: string) {
    try {
      // 获取预定义模板
      const predefinedTemplates = Object.entries(this.PREDEFINED_TEMPLATES)
        .filter(([_, template]) => !category || template.category === category)
        .map(([id, template]) => ({ id, ...template, type: 'predefined' }));
      
      // 获取自定义模板
      let query = supabase
        .from('permission_templates')
        .select('*')
        .eq('is_active', true);
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data: customTemplates, error } = await query;
      
      if (error) {
        throw error;
      }
      
      const formattedCustomTemplates = (customTemplates || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        permissions: template.permissions,
        type: 'custom'
      }));
      
      return [...predefinedTemplates, ...formattedCustomTemplates];
    } catch (error) {
      console.error('获取权限模板失败:', error);
      throw error;
    }
  }
  
  /**
   * 应用权限模板到部门
   * @param templateId 模板ID
   * @param departmentId 部门ID
   * @param overrideExisting 是否覆盖现有权限
   * @param userId 操作用户ID
   * @returns 应用结果
   */
  static async applyTemplateToDepart(
    templateId: string,
    departmentId: string,
    overrideExisting: boolean = false,
    userId: string
  ) {
    try {
      // 获取模板
      let template;
      
      if (this.PREDEFINED_TEMPLATES[templateId as keyof typeof this.PREDEFINED_TEMPLATES]) {
        template = this.PREDEFINED_TEMPLATES[templateId as keyof typeof this.PREDEFINED_TEMPLATES];
      } else {
        const { data, error } = await supabase
          .from('permission_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (error || !data) {
          throw new Error('权限模板不存在');
        }
        
        template = data;
      }
      
      // 如果需要覆盖现有权限，先删除
      if (overrideExisting) {
        await supabase
          .from('department_permissions')
          .update({ is_active: false })
          .eq('department_id', departmentId);
      }
      
      // 应用模板权限
      const permissionsToInsert = template.permissions.map((permission: any) => ({
        department_id: departmentId,
        resource: permission.resource,
        action: permission.action,
        granted: permission.granted,
        inherit_from_parent: true,
        override_children: false,
        conditions: permission.conditions || null,
        priority: permission.priority || 1,
        expires_at: permission.expires_at || null,
        created_by: userId,
        is_active: true
      }));
      
      const { error: insertError } = await supabase
        .from('department_permissions')
        .insert(permissionsToInsert);
      
      if (insertError) {
        throw insertError;
      }
      
      // 记录权限变更历史
      await supabase
        .from('permission_change_history')
        .insert({
          target_type: 'department',
          target_id: departmentId,
          change_type: 'template_applied',
          old_value: null,
          new_value: { template_id: templateId, template_name: template.name },
          reason: `应用权限模板: ${template.name}`,
          metadata: {
            override_existing: overrideExisting,
            permissions_count: template.permissions.length
          },
          changed_by: userId
        });
      
      return {
        success: true,
        message: `成功应用权限模板 "${template.name}" 到部门`,
        applied_permissions: template.permissions.length
      };
    } catch (error) {
      console.error('应用权限模板失败:', error);
      throw error;
    }
  }
}