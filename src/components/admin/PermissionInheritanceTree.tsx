/**
 * 权限继承树形可视化组件
 * 展示部门权限的继承关系和层级结构
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  Building,
  ArrowDown,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 部门信息接口
 */
interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  level: number;
  children?: Department[];
}

/**
 * 权限信息接口
 */
interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
  inherit_from_parent: boolean;
  override_children: boolean;
  priority: number;
  source: 'direct' | 'inherited';
  inherited_from?: string;
  conditions?: Record<string, any>;
}

/**
 * 部门权限节点接口
 */
interface DepartmentPermissionNode {
  department: Department;
  permissions: Permission[];
  children: DepartmentPermissionNode[];
  isExpanded: boolean;
  hasConflicts: boolean;
}

/**
 * 组件属性接口
 */
interface PermissionInheritanceTreeProps {
  /** 根部门ID */
  rootDepartmentId?: string;
  /** 要高亮显示的权限 */
  highlightPermission?: { resource: string; action: string };
  /** 是否显示权限详情 */
  showPermissionDetails?: boolean;
  /** 权限点击回调 */
  onPermissionClick?: (permission: Permission, department: Department) => void;
  /** 部门点击回调 */
  onDepartmentClick?: (department: Department) => void;
  /** 类名 */
  className?: string;
}

/**
 * 权限继承树形可视化组件
 */
export function PermissionInheritanceTree({
  rootDepartmentId,
  highlightPermission,
  showPermissionDetails = true,
  onPermissionClick,
  onDepartmentClick,
  className
}: PermissionInheritanceTreeProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [treeData, setTreeData] = useState<DepartmentPermissionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showInheritedOnly, setShowInheritedOnly] = useState(false);
  
  /**
   * 获取部门数据
   */
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (!response.ok) {
        throw new Error('获取部门数据失败');
      }
      
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data?.departments || []);
      }
    } catch (error) {
      console.error('获取部门数据失败:', error);
      setError('获取部门数据失败');
    }
  };
  
  /**
   * 获取权限数据
   */
  const fetchPermissions = async () => {
    try {
      const permissionsByDept: Record<string, Permission[]> = {};
      
      // 为每个部门获取权限
      for (const dept of departments) {
        const response = await fetch(
          `/api/admin/departments/permissions?department_id=${dept.id}&include_inherited=true`
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            permissionsByDept[dept.id] = result.data?.permissions || [];
          }
        }
      }
      
      setPermissions(permissionsByDept);
    } catch (error) {
      console.error('获取权限数据失败:', error);
      setError('获取权限数据失败');
    }
  };
  
  /**
   * 构建部门树形结构
   */
  const buildDepartmentTree = useMemo(() => {
    if (departments.length === 0) return [];
    
    const departmentMap = new Map<string, Department>();
    departments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });
    
    const rootNodes: Department[] = [];
    
    departments.forEach(dept => {
      const deptNode = departmentMap.get(dept.id)!;
      
      if (dept.parent_id && departmentMap.has(dept.parent_id)) {
        const parent = departmentMap.get(dept.parent_id)!;
        parent.children!.push(deptNode);
      } else {
        rootNodes.push(deptNode);
      }
    });
    
    return rootNodes;
  }, [departments]);
  
  /**
   * 构建权限继承树
   */
  const buildPermissionTree = useMemo(() => {
    const buildNode = (dept: Department): DepartmentPermissionNode => {
      const deptPermissions = permissions[dept.id] || [];
      
      // 检测权限冲突
      const hasConflicts = detectPermissionConflicts(deptPermissions);
      
      return {
        department: dept,
        permissions: deptPermissions,
        children: (dept.children || []).map(child => buildNode(child)),
        isExpanded: expandedNodes.has(dept.id),
        hasConflicts
      };
    };
    
    return buildDepartmentTree.map(dept => buildNode(dept));
  }, [buildDepartmentTree, permissions, expandedNodes]);
  
  /**
   * 检测权限冲突
   */
  const detectPermissionConflicts = (permissions: Permission[]): boolean => {
    const permissionMap = new Map<string, Permission[]>();
    
    permissions.forEach(permission => {
      const key = `${permission.resource}:${permission.action}`;
      if (!permissionMap.has(key)) {
        permissionMap.set(key, []);
      }
      permissionMap.get(key)!.push(permission);
    });
    
    // 检查是否有相同资源和操作但不同授权状态的权限
    for (const [, perms] of permissionMap) {
      if (perms.length > 1) {
        const grantedValues = new Set(perms.map(p => p.granted));
        if (grantedValues.size > 1) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  /**
   * 切换节点展开状态
   */
  const toggleNodeExpansion = (departmentId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  };
  
  /**
   * 展开所有节点
   */
  const expandAll = () => {
    const allDepartmentIds = new Set(departments.map(d => d.id));
    setExpandedNodes(allDepartmentIds);
  };
  
  /**
   * 折叠所有节点
   */
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };
  
  /**
   * 筛选权限
   */
  const filterPermissions = (permissions: Permission[]): Permission[] => {
    let filtered = permissions;
    
    if (showInheritedOnly) {
      filtered = filtered.filter(p => p.source === 'inherited');
    }
    
    if (highlightPermission) {
      filtered = filtered.filter(
        p => p.resource === highlightPermission.resource && 
             p.action === highlightPermission.action
      );
    }
    
    return filtered;
  };
  
  /**
   * 渲染权限标签
   */
  const renderPermissionBadge = (permission: Permission, department: Department) => {
    const isHighlighted = highlightPermission && 
      permission.resource === highlightPermission.resource && 
      permission.action === highlightPermission.action;
    
    const badgeVariant = permission.granted ? 'default' : 'destructive';
    const icon = permission.granted ? ShieldCheck : ShieldX;
    const IconComponent = icon;
    
    return (
      <TooltipProvider key={`${permission.resource}:${permission.action}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={badgeVariant}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:scale-105',
                isHighlighted && 'ring-2 ring-blue-500 ring-offset-2',
                permission.source === 'inherited' && 'opacity-75 border-dashed'
              )}
              onClick={() => onPermissionClick?.(permission, department)}
            >
              <IconComponent className="w-3 h-3 mr-1" />
              {permission.resource}:{permission.action}
              {permission.source === 'inherited' && (
                <ArrowDown className="w-3 h-3 ml-1" />
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-medium">
                {permission.resource}:{permission.action}
              </div>
              <div className="text-sm">
                状态: {permission.granted ? '允许' : '拒绝'}
              </div>
              <div className="text-sm">
                来源: {permission.source === 'direct' ? '直接配置' : '继承权限'}
              </div>
              {permission.inherited_from && (
                <div className="text-sm">
                  继承自: {departments.find(d => d.id === permission.inherited_from)?.name}
                </div>
              )}
              <div className="text-sm">
                优先级: {permission.priority}
              </div>
              {permission.conditions && (
                <div className="text-sm">
                  条件: {JSON.stringify(permission.conditions)}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  /**
   * 渲染部门节点
   */
  const renderDepartmentNode = (node: DepartmentPermissionNode, level: number = 0) => {
    const { department, permissions, children, isExpanded, hasConflicts } = node;
    const filteredPermissions = filterPermissions(permissions);
    const hasChildren = children.length > 0;
    
    return (
      <div key={department.id} className="space-y-2">
        <div
          className={cn(
            'flex items-center space-x-2 p-3 rounded-lg border transition-all duration-200',
            'hover:bg-gray-50 cursor-pointer',
            hasConflicts && 'border-red-300 bg-red-50',
            level > 0 && 'ml-6'
          )}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => onDepartmentClick?.(department)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(department.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          )}
          
          <Building className="w-5 h-5 text-blue-600" />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{department.name}</span>
              <Badge variant="outline" className="text-xs">
                Level {department.level}
              </Badge>
              {hasConflicts && (
                <Badge variant="destructive" className="text-xs">
                  冲突
                </Badge>
              )}
            </div>
            
            {showPermissionDetails && filteredPermissions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filteredPermissions.map(permission => 
                  renderPermissionBadge(permission, department)
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{filteredPermissions.length} 权限</span>
          </div>
        </div>
        
        {isExpanded && children.map(child => 
          renderDepartmentNode(child, level + 1)
        )}
      </div>
    );
  };
  
  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await fetchDepartments();
      } catch (error) {
        console.error('初始化数据失败:', error);
        setError('初始化数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    initData();
  }, []);
  
  // 获取权限数据
  useEffect(() => {
    if (departments.length > 0) {
      fetchPermissions();
    }
  }, [departments]);
  
  // 构建树形数据
  useEffect(() => {
    setTreeData(buildPermissionTree);
  }, [buildPermissionTree]);
  
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">加载权限继承树...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            <ShieldX className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>权限继承树</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInheritedOnly(!showInheritedOnly)}
            >
              {showInheritedOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showInheritedOnly ? '显示全部' : '仅继承'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={expandAll}>
              展开全部
            </Button>
            
            <Button variant="outline" size="sm" onClick={collapseAll}>
              折叠全部
            </Button>
          </div>
        </div>
        
        {highlightPermission && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <Info className="w-4 h-4" />
            <span>
              高亮显示: {highlightPermission.resource}:{highlightPermission.action}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {treeData.length > 0 ? (
              treeData.map(node => renderDepartmentNode(node))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Building className="w-8 h-8 mx-auto mb-2" />
                <p>暂无部门数据</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>允许</span>
            </div>
            <div className="flex items-center space-x-1">
              <ShieldX className="w-4 h-4 text-red-600" />
              <span>拒绝</span>
            </div>
            <div className="flex items-center space-x-1">
              <ArrowDown className="w-4 h-4" />
              <span>继承</span>
            </div>
          </div>
          
          <div>
            共 {departments.length} 个部门
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PermissionInheritanceTree;