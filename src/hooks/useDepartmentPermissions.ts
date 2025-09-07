/**
 * 部门权限管理 React Hook
 * 提供权限检查、权限管理等功能
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/**
 * 权限信息接口
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
 * 部门权限配置接口
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
 * 权限模板接口
 */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  permissions: any[];
  type: 'predefined' | 'custom';
}

/**
 * 权限冲突接口
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
 * Hook 返回值接口
 */
export interface UseDepartmentPermissionsReturn {
  // 权限检查
  checkPermission: (resource: string, action: string, departmentId?: string) => Promise<boolean>;
  hasPermission: (resource: string, action: string, departmentId?: string) => boolean;
  
  // 权限数据
  userPermissions: Permission[];
  departmentPermissions: DepartmentPermission[];
  effectivePermissions: Permission[];
  
  // 权限管理
  createDepartmentPermission: (permission: Partial<DepartmentPermission>) => Promise<boolean>;
  updateDepartmentPermission: (id: string, updates: Partial<DepartmentPermission>) => Promise<boolean>;
  deleteDepartmentPermission: (id: string) => Promise<boolean>;
  
  // 权限模板
  permissionTemplates: PermissionTemplate[];
  applyTemplate: (templateId: string, departmentId: string, overrideExisting?: boolean) => Promise<boolean>;
  
  // 权限冲突
  permissionConflicts: PermissionConflict[];
  resolveConflict: (conflictId: string, resolution: string) => Promise<boolean>;
  
  // 状态
  loading: boolean;
  error: string | null;
  
  // 刷新数据
  refreshPermissions: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshConflicts: () => Promise<void>;
}

/**
 * 部门权限管理 Hook
 * @param departmentId 部门ID（可选）
 * @param autoLoad 是否自动加载数据
 * @returns Hook 返回值
 */
export function useDepartmentPermissions(
  departmentId?: string,
  autoLoad: boolean = true
): UseDepartmentPermissionsReturn {
  const { user, token } = useAuth();
  
  // 状态管理
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [departmentPermissions, setDepartmentPermissions] = useState<DepartmentPermission[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<Permission[]>([]);
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);
  const [permissionConflicts, setPermissionConflicts] = useState<PermissionConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 当前部门ID
  const currentDepartmentId = useMemo(() => {
    return departmentId || user?.department_id;
  }, [departmentId, user?.department_id]);
  
  /**
   * 获取请求头
   */
  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [token]);
  
  /**
   * 处理API错误
   */
  const handleApiError = useCallback((error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);
    const message = error.message || defaultMessage;
    setError(message);
    toast.error(message);
  }, []);
  
  /**
   * 检查权限（异步）
   */
  const checkPermission = useCallback(async (
    resource: string,
    action: string,
    targetDepartmentId?: string
  ): Promise<boolean> => {
    if (!user || !token) {
      return false;
    }
    
    try {
      const deptId = targetDepartmentId || currentDepartmentId;
      
      const response = await fetch('/api/admin/permissions/check', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          user_id: user.id,
          resource,
          action,
          department_id: deptId
        })
      });
      
      if (!response.ok) {
        throw new Error(`权限检查失败: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success && result.data?.has_permission;
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }, [user, token, currentDepartmentId, getHeaders]);
  
  /**
   * 检查权限（同步，基于已加载的权限数据）
   */
  const hasPermission = useCallback((
    resource: string,
    action: string,
    targetDepartmentId?: string
  ): boolean => {
    if (!user) {
      return false;
    }
    
    // 超级管理员拥有所有权限
    if (user.is_super_admin) {
      return true;
    }
    
    // 在有效权限中查找匹配项
    const matchingPermission = effectivePermissions.find(
      p => p.resource === resource && p.action === action
    );
    
    return matchingPermission?.granted || false;
  }, [user, effectivePermissions]);
  
  /**
   * 获取用户权限
   */
  const fetchUserPermissions = useCallback(async () => {
    if (!user || !token || !currentDepartmentId) {
      return;
    }
    
    try {
      const response = await fetch(
        `/api/admin/permissions/check?user_id=${user.id}&department_id=${currentDepartmentId}&include_inherited=true`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );
      
      if (!response.ok) {
        throw new Error(`获取用户权限失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUserPermissions(result.data?.user_permissions || []);
        setEffectivePermissions(result.data?.effective_permissions || []);
      }
    } catch (error) {
      handleApiError(error, '获取用户权限失败');
    }
  }, [user, token, currentDepartmentId, getHeaders, handleApiError]);
  
  /**
   * 获取部门权限
   */
  const fetchDepartmentPermissions = useCallback(async () => {
    if (!token || !currentDepartmentId) {
      return;
    }
    
    try {
      const response = await fetch(
        `/api/admin/departments/permissions?department_id=${currentDepartmentId}&include_inherited=true`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );
      
      if (!response.ok) {
        throw new Error(`获取部门权限失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setDepartmentPermissions(result.data?.permissions || []);
      }
    } catch (error) {
      handleApiError(error, '获取部门权限失败');
    }
  }, [token, currentDepartmentId, getHeaders, handleApiError]);
  
  /**
   * 获取权限模板
   */
  const fetchPermissionTemplates = useCallback(async () => {
    if (!token) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/departments/permission-templates', {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`获取权限模板失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPermissionTemplates(result.data?.templates || []);
      }
    } catch (error) {
      handleApiError(error, '获取权限模板失败');
    }
  }, [token, getHeaders, handleApiError]);
  
  /**
   * 获取权限冲突
   */
  const fetchPermissionConflicts = useCallback(async () => {
    if (!token) {
      return;
    }
    
    try {
      const params = new URLSearchParams();
      if (currentDepartmentId) {
        params.append('department_id', currentDepartmentId);
      }
      
      const response = await fetch(
        `/api/admin/permissions/conflicts?${params.toString()}`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );
      
      if (!response.ok) {
        throw new Error(`获取权限冲突失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPermissionConflicts(result.data?.conflicts || []);
      }
    } catch (error) {
      handleApiError(error, '获取权限冲突失败');
    }
  }, [token, currentDepartmentId, getHeaders, handleApiError]);
  
  /**
   * 创建部门权限
   */
  const createDepartmentPermission = useCallback(async (
    permission: Partial<DepartmentPermission>
  ): Promise<boolean> => {
    if (!token) {
      toast.error('未授权操作');
      return false;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/departments/permissions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...permission,
          department_id: permission.department_id || currentDepartmentId
        })
      });
      
      if (!response.ok) {
        throw new Error(`创建部门权限失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('部门权限创建成功');
        await fetchDepartmentPermissions();
        return true;
      } else {
        throw new Error(result.error || '创建部门权限失败');
      }
    } catch (error) {
      handleApiError(error, '创建部门权限失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, currentDepartmentId, getHeaders, handleApiError, fetchDepartmentPermissions]);
  
  /**
   * 更新部门权限
   */
  const updateDepartmentPermission = useCallback(async (
    id: string,
    updates: Partial<DepartmentPermission>
  ): Promise<boolean> => {
    if (!token) {
      toast.error('未授权操作');
      return false;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/departments/permissions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id,
          ...updates
        })
      });
      
      if (!response.ok) {
        throw new Error(`更新部门权限失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('部门权限更新成功');
        await fetchDepartmentPermissions();
        return true;
      } else {
        throw new Error(result.error || '更新部门权限失败');
      }
    } catch (error) {
      handleApiError(error, '更新部门权限失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, getHeaders, handleApiError, fetchDepartmentPermissions]);
  
  /**
   * 删除部门权限
   */
  const deleteDepartmentPermission = useCallback(async (id: string): Promise<boolean> => {
    if (!token) {
      toast.error('未授权操作');
      return false;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/departments/permissions', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          action: 'delete',
          permission_ids: [id]
        })
      });
      
      if (!response.ok) {
        throw new Error(`删除部门权限失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('部门权限删除成功');
        await fetchDepartmentPermissions();
        return true;
      } else {
        throw new Error(result.error || '删除部门权限失败');
      }
    } catch (error) {
      handleApiError(error, '删除部门权限失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, getHeaders, handleApiError, fetchDepartmentPermissions]);
  
  /**
   * 应用权限模板
   */
  const applyTemplate = useCallback(async (
    templateId: string,
    targetDepartmentId: string,
    overrideExisting: boolean = false
  ): Promise<boolean> => {
    if (!token) {
      toast.error('未授权操作');
      return false;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/departments/permission-templates', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          template_id: templateId,
          department_id: targetDepartmentId,
          override_existing: overrideExisting
        })
      });
      
      if (!response.ok) {
        throw new Error(`应用权限模板失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('权限模板应用成功');
        await fetchDepartmentPermissions();
        return true;
      } else {
        throw new Error(result.error || '应用权限模板失败');
      }
    } catch (error) {
      handleApiError(error, '应用权限模板失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, getHeaders, handleApiError, fetchDepartmentPermissions]);
  
  /**
   * 解决权限冲突
   */
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: string
  ): Promise<boolean> => {
    if (!token) {
      toast.error('未授权操作');
      return false;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/permissions/conflicts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          conflict_id: conflictId,
          resolution
        })
      });
      
      if (!response.ok) {
        throw new Error(`解决权限冲突失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('权限冲突解决成功');
        await fetchPermissionConflicts();
        await fetchDepartmentPermissions();
        return true;
      } else {
        throw new Error(result.error || '解决权限冲突失败');
      }
    } catch (error) {
      handleApiError(error, '解决权限冲突失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, getHeaders, handleApiError, fetchPermissionConflicts, fetchDepartmentPermissions]);
  
  /**
   * 刷新权限数据
   */
  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchUserPermissions(),
        fetchDepartmentPermissions()
      ]);
    } catch (error) {
      handleApiError(error, '刷新权限数据失败');
    } finally {
      setLoading(false);
    }
  }, [fetchUserPermissions, fetchDepartmentPermissions, handleApiError]);
  
  /**
   * 刷新权限模板
   */
  const refreshTemplates = useCallback(async () => {
    await fetchPermissionTemplates();
  }, [fetchPermissionTemplates]);
  
  /**
   * 刷新权限冲突
   */
  const refreshConflicts = useCallback(async () => {
    await fetchPermissionConflicts();
  }, [fetchPermissionConflicts]);
  
  // 自动加载数据
  useEffect(() => {
    if (autoLoad && user && token) {
      refreshPermissions();
      refreshTemplates();
      refreshConflicts();
    }
  }, [autoLoad, user, token, refreshPermissions, refreshTemplates, refreshConflicts]);
  
  return {
    // 权限检查
    checkPermission,
    hasPermission,
    
    // 权限数据
    userPermissions,
    departmentPermissions,
    effectivePermissions,
    
    // 权限管理
    createDepartmentPermission,
    updateDepartmentPermission,
    deleteDepartmentPermission,
    
    // 权限模板
    permissionTemplates,
    applyTemplate,
    
    // 权限冲突
    permissionConflicts,
    resolveConflict,
    
    // 状态
    loading,
    error,
    
    // 刷新数据
    refreshPermissions,
    refreshTemplates,
    refreshConflicts
  };
}

/**
 * 权限检查 Hook（简化版）
 * @param resource 资源
 * @param action 操作
 * @param departmentId 部门ID（可选）
 * @returns 是否有权限
 */
export function usePermissionCheck(
  resource: string,
  action: string,
  departmentId?: string
): boolean {
  const { hasPermission } = useDepartmentPermissions(departmentId, true);
  return hasPermission(resource, action, departmentId);
}

/**
 * 管理员权限检查 Hook
 * @returns 是否有管理员权限
 */
export function useAdminPermission(): boolean {
  return usePermissionCheck('admin', 'access');
}

/**
 * 部门管理权限检查 Hook
 * @param departmentId 部门ID（可选）
 * @returns 是否有部门管理权限
 */
export function useDepartmentManagementPermission(departmentId?: string): boolean {
  return usePermissionCheck('departments', 'manage', departmentId);
}