/**
 * 权限冲突解决组件
 * 用于检测、展示和解决部门权限继承中的冲突问题
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  Building,
  ArrowRight,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  Eye,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * 权限冲突类型
 */
type ConflictType = 'inheritance' | 'override' | 'priority' | 'condition';

/**
 * 权限冲突严重程度
 */
type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 权限冲突解决策略
 */
type ResolutionStrategy = 'keep_parent' | 'keep_child' | 'merge' | 'manual' | 'priority_based';

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
  department_id: string;
}

/**
 * 部门信息接口
 */
interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  level: number;
}

/**
 * 权限冲突接口
 */
interface PermissionConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  resource: string;
  action: string;
  department_id: string;
  department_name: string;
  parent_department_id?: string;
  parent_department_name?: string;
  conflicting_permissions: Permission[];
  description: string;
  suggested_resolution: ResolutionStrategy;
  auto_resolvable: boolean;
  created_at: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

/**
 * 冲突解决方案接口
 */
interface ConflictResolution {
  conflict_id: string;
  strategy: ResolutionStrategy;
  target_permission: Partial<Permission>;
  notes: string;
  apply_to_children: boolean;
}

/**
 * 组件属性接口
 */
interface PermissionConflictResolverProps {
  /** 部门ID，如果指定则只显示该部门的冲突 */
  departmentId?: string;
  /** 是否自动检测冲突 */
  autoDetect?: boolean;
  /** 冲突解决回调 */
  onConflictResolved?: (conflict: PermissionConflict, resolution: ConflictResolution) => void;
  /** 类名 */
  className?: string;
}

/**
 * 权限冲突解决组件
 */
export function PermissionConflictResolver({
  departmentId,
  autoDetect = true,
  onConflictResolved,
  className
}: PermissionConflictResolverProps) {
  const [conflicts, setConflicts] = useState<PermissionConflict[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<PermissionConflict | null>(null);
  const [resolutionStrategy, setResolutionStrategy] = useState<ResolutionStrategy>('manual');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [applyToChildren, setApplyToChildren] = useState(false);
  const [activeTab, setActiveTab] = useState('unresolved');
  
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
      toast.error('获取部门数据失败');
    }
  };
  
  /**
   * 检测权限冲突
   */
  const detectConflicts = async () => {
    try {
      setLoading(true);
      
      const url = departmentId 
        ? `/api/admin/permissions/conflicts?department_id=${departmentId}`
        : '/api/admin/permissions/conflicts';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('检测权限冲突失败');
      }
      
      const result = await response.json();
      if (result.success) {
        setConflicts(result.data?.conflicts || []);
      }
    } catch (error) {
      console.error('检测权限冲突失败:', error);
      toast.error('检测权限冲突失败');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 解决权限冲突
   */
  const resolveConflict = async (conflict: PermissionConflict, resolution: ConflictResolution) => {
    try {
      setResolving(conflict.id);
      
      const response = await fetch('/api/admin/permissions/conflicts/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conflict_id: conflict.id,
          resolution
        })
      });
      
      if (!response.ok) {
        throw new Error('解决权限冲突失败');
      }
      
      const result = await response.json();
      if (result.success) {
        // 更新冲突状态
        setConflicts(prev => prev.map(c => 
          c.id === conflict.id 
            ? { ...c, resolved: true, resolved_at: new Date().toISOString() }
            : c
        ));
        
        toast.success('权限冲突已解决');
        onConflictResolved?.(conflict, resolution);
        setSelectedConflict(null);
      }
    } catch (error) {
      console.error('解决权限冲突失败:', error);
      toast.error('解决权限冲突失败');
    } finally {
      setResolving(null);
    }
  };
  
  /**
   * 自动解决冲突
   */
  const autoResolveConflicts = async () => {
    try {
      setLoading(true);
      
      const autoResolvableConflicts = conflicts.filter(c => c.auto_resolvable && !c.resolved);
      
      if (autoResolvableConflicts.length === 0) {
        toast.info('没有可自动解决的冲突');
        return;
      }
      
      const response = await fetch('/api/admin/permissions/conflicts/auto-resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conflict_ids: autoResolvableConflicts.map(c => c.id)
        })
      });
      
      if (!response.ok) {
        throw new Error('自动解决冲突失败');
      }
      
      const result = await response.json();
      if (result.success) {
        await detectConflicts(); // 重新检测冲突
        toast.success(`已自动解决 ${result.data?.resolved_count || 0} 个冲突`);
      }
    } catch (error) {
      console.error('自动解决冲突失败:', error);
      toast.error('自动解决冲突失败');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 获取冲突严重程度颜色
   */
  const getSeverityColor = (severity: ConflictSeverity): string => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  /**
   * 获取冲突类型图标
   */
  const getConflictTypeIcon = (type: ConflictType) => {
    switch (type) {
      case 'inheritance': return Shield;
      case 'override': return Settings;
      case 'priority': return Zap;
      case 'condition': return Eye;
      default: return AlertTriangle;
    }
  };
  
  /**
   * 筛选冲突
   */
  const filteredConflicts = useMemo(() => {
    switch (activeTab) {
      case 'unresolved':
        return conflicts.filter(c => !c.resolved);
      case 'resolved':
        return conflicts.filter(c => c.resolved);
      case 'auto-resolvable':
        return conflicts.filter(c => c.auto_resolvable && !c.resolved);
      case 'critical':
        return conflicts.filter(c => c.severity === 'critical' && !c.resolved);
      default:
        return conflicts;
    }
  }, [conflicts, activeTab]);
  
  /**
   * 统计信息
   */
  const stats = useMemo(() => {
    const total = conflicts.length;
    const unresolved = conflicts.filter(c => !c.resolved).length;
    const resolved = conflicts.filter(c => c.resolved).length;
    const autoResolvable = conflicts.filter(c => c.auto_resolvable && !c.resolved).length;
    const critical = conflicts.filter(c => c.severity === 'critical' && !c.resolved).length;
    
    return { total, unresolved, resolved, autoResolvable, critical };
  }, [conflicts]);
  
  /**
   * 渲染冲突卡片
   */
  const renderConflictCard = (conflict: PermissionConflict) => {
    const IconComponent = getConflictTypeIcon(conflict.type);
    
    return (
      <Card key={conflict.id} className={cn(
        'transition-all duration-200 hover:shadow-md',
        conflict.severity === 'critical' && 'border-red-300',
        conflict.resolved && 'opacity-60'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <IconComponent className="w-5 h-5 text-orange-600" />
                <span className="font-medium">
                  {conflict.resource}:{conflict.action}
                </span>
                <Badge className={getSeverityColor(conflict.severity)}>
                  {conflict.severity}
                </Badge>
                {conflict.auto_resolvable && (
                  <Badge variant="outline" className="text-green-600">
                    可自动解决
                  </Badge>
                )}
                {conflict.resolved && (
                  <Badge variant="outline" className="text-gray-600">
                    已解决
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                {conflict.description}
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Building className="w-3 h-3" />
                  <span>{conflict.department_name}</span>
                </div>
                {conflict.parent_department_name && (
                  <>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex items-center space-x-1">
                      <Building className="w-3 h-3" />
                      <span>{conflict.parent_department_name}</span>
                    </div>
                  </>
                )}
                <div>
                  {new Date(conflict.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">冲突权限:</div>
                <div className="flex flex-wrap gap-1">
                  {conflict.conflicting_permissions.map((permission, index) => (
                    <Badge
                      key={index}
                      variant={permission.granted ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {permission.granted ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldX className="w-3 h-3 mr-1" />}
                      {permission.source === 'direct' ? '直接' : '继承'}
                      (优先级: {permission.priority})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 ml-4">
              {!conflict.resolved && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedConflict(conflict);
                        setResolutionStrategy(conflict.suggested_resolution);
                        setResolutionNotes('');
                        setApplyToChildren(false);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      解决
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>解决权限冲突</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>冲突详情</Label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm">
                          <div className="font-medium mb-1">
                            {conflict.resource}:{conflict.action}
                          </div>
                          <div className="text-gray-600">
                            {conflict.description}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="strategy">解决策略</Label>
                        <Select
                          value={resolutionStrategy}
                          onValueChange={(value) => setResolutionStrategy(value as ResolutionStrategy)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keep_parent">保留父级权限</SelectItem>
                            <SelectItem value="keep_child">保留子级权限</SelectItem>
                            <SelectItem value="merge">合并权限</SelectItem>
                            <SelectItem value="priority_based">基于优先级</SelectItem>
                            <SelectItem value="manual">手动配置</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="notes">解决说明</Label>
                        <Textarea
                          id="notes"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="请输入解决说明..."
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="applyToChildren"
                          checked={applyToChildren}
                          onChange={(e) => setApplyToChildren(e.target.checked)}
                        />
                        <Label htmlFor="applyToChildren">
                          应用到子部门
                        </Label>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedConflict(null)}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedConflict) {
                              const resolution: ConflictResolution = {
                                conflict_id: selectedConflict.id,
                                strategy: resolutionStrategy,
                                target_permission: {},
                                notes: resolutionNotes,
                                apply_to_children: applyToChildren
                              };
                              resolveConflict(selectedConflict, resolution);
                            }
                          }}
                          disabled={resolving === conflict.id}
                        >
                          {resolving === conflict.id && (
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          )}
                          确认解决
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {conflict.resolved && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  已解决
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      await fetchDepartments();
      if (autoDetect) {
        await detectConflicts();
      }
    };
    
    initData();
  }, [departmentId, autoDetect]);
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span>权限冲突解决</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={detectConflicts}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              重新检测
            </Button>
            
            {stats.autoResolvable > 0 && (
              <Button
                size="sm"
                onClick={autoResolveConflicts}
                disabled={loading}
              >
                <Zap className="w-4 h-4 mr-1" />
                自动解决 ({stats.autoResolvable})
              </Button>
            )}
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-5 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">总冲突</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.unresolved}</div>
            <div className="text-sm text-gray-500">未解决</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-500">已解决</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.autoResolvable}</div>
            <div className="text-sm text-gray-500">可自动解决</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-gray-500">严重冲突</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="unresolved">
              未解决 ({stats.unresolved})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              已解决 ({stats.resolved})
            </TabsTrigger>
            <TabsTrigger value="auto-resolvable">
              可自动解决 ({stats.autoResolvable})
            </TabsTrigger>
            <TabsTrigger value="critical">
              严重冲突 ({stats.critical})
            </TabsTrigger>
            <TabsTrigger value="all">
              全部 ({stats.total})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">检测权限冲突中...</p>
                </div>
              </div>
            ) : filteredConflicts.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredConflicts.map(conflict => renderConflictCard(conflict))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-gray-500">
                  {activeTab === 'unresolved' ? '没有未解决的冲突' : '没有找到相关冲突'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {stats.unresolved > 0 && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              检测到 {stats.unresolved} 个未解决的权限冲突，其中 {stats.critical} 个为严重冲突。
              建议优先处理严重冲突以确保系统安全。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default PermissionConflictResolver;