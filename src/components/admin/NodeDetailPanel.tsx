'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit,
  Save,
  Cancel,
  User,
  Users,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Activity,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Tag,
  Hash,
  Briefcase,
  Target,
  BarChart3,
  PieChart,
  Settings,
  Shield,
  Key,
  UserCheck,
  UserX,
  Plus,
  Minus,
  Move,
  Trash2,
  Copy,
  ExternalLink,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

// 部门详细信息接口
interface DepartmentDetail {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  parent_name?: string;
  level: number;
  path: string;
  manager_id?: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  member_count: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  location?: string;
  budget?: number;
  cost_center?: string;
  responsibilities?: string[];
  goals?: string[];
  kpis?: KPI[];
  permissions?: Permission[];
  children_count: number;
  direct_reports: User[];
  recent_activities: Activity[];
}

// KPI接口
interface KPI {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  status: 'on_track' | 'at_risk' | 'behind';
}

// 权限接口
interface Permission {
  id: string;
  name: string;
  type: 'read' | 'write' | 'admin';
  resource: string;
  granted_at: string;
  granted_by: string;
}

// 用户接口
interface User {
  id: string;
  name: string;
  email: string;
  position: string;
  avatar?: string;
  status: 'active' | 'inactive';
  joined_at: string;
}

// 活动接口
interface Activity {
  id: string;
  type: 'member_added' | 'member_removed' | 'structure_changed' | 'permission_changed';
  description: string;
  user_name: string;
  timestamp: string;
}

// 组件属性接口
interface NodeDetailPanelProps {
  nodeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (nodeId: string, data: Partial<DepartmentDetail>) => void;
  onDelete?: (nodeId: string) => void;
  onAddChild?: (parentId: string) => void;
  onMove?: (nodeId: string, newParentId: string) => void;
  className?: string;
}

/**
 * 节点详细信息面板组件
 * 提供部门节点的详细信息展示和编辑功能
 * 
 * @param props - 组件属性
 * @param props.nodeId - 节点ID
 * @param props.isOpen - 是否打开面板
 * @param props.onClose - 关闭回调
 * @param props.onEdit - 编辑回调
 * @param props.onDelete - 删除回调
 * @param props.onAddChild - 添加子节点回调
 * @param props.onMove - 移动节点回调
 * @param props.className - CSS类名
 * @returns 节点详细信息面板组件
 */
const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  nodeId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAddChild,
  onMove,
  className = ''
}) => {
  // 状态管理
  const [nodeDetail, setNodeDetail] = useState<DepartmentDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DepartmentDetail>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'permissions' | 'kpis' | 'activities'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /**
   * 获取节点详细信息
   * @param id - 节点ID
   */
  const fetchNodeDetail = async (id: string) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 模拟数据
      const mockDetail: DepartmentDetail = {
        id,
        name: '技术部',
        code: 'TECH',
        description: '负责公司技术研发、系统维护和技术支持工作',
        parent_id: 'root',
        parent_name: '总公司',
        level: 1,
        path: '/总公司/技术部',
        manager_id: 'user1',
        manager_name: '张三',
        manager_email: 'zhangsan@company.com',
        manager_phone: '13800138000',
        member_count: 25,
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        location: '北京市朝阳区',
        budget: 5000000,
        cost_center: 'CC001',
        responsibilities: [
          '系统架构设计',
          '代码开发与维护',
          '技术文档编写',
          '技术培训与支持'
        ],
        goals: [
          '提升系统性能20%',
          '完成新产品开发',
          '建立技术标准规范',
          '培养技术人才'
        ],
        kpis: [
          {
            id: 'kpi1',
            name: '系统可用性',
            target: 99.9,
            current: 99.5,
            unit: '%',
            period: 'monthly',
            status: 'at_risk'
          },
          {
            id: 'kpi2',
            name: '项目交付率',
            target: 95,
            current: 98,
            unit: '%',
            period: 'monthly',
            status: 'on_track'
          }
        ],
        permissions: [
          {
            id: 'perm1',
            name: '系统管理',
            type: 'admin',
            resource: 'system',
            granted_at: '2024-01-01T00:00:00Z',
            granted_by: '管理员'
          },
          {
            id: 'perm2',
            name: '用户管理',
            type: 'write',
            resource: 'users',
            granted_at: '2024-01-01T00:00:00Z',
            granted_by: '管理员'
          }
        ],
        children_count: 3,
        direct_reports: [
          {
            id: 'user1',
            name: '李四',
            email: 'lisi@company.com',
            position: '高级工程师',
            status: 'active',
            joined_at: '2023-06-01T00:00:00Z'
          },
          {
            id: 'user2',
            name: '王五',
            email: 'wangwu@company.com',
            position: '前端工程师',
            status: 'active',
            joined_at: '2023-08-15T00:00:00Z'
          }
        ],
        recent_activities: [
          {
            id: 'act1',
            type: 'member_added',
            description: '新增成员：赵六',
            user_name: '张三',
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            id: 'act2',
            type: 'permission_changed',
            description: '更新了系统权限',
            user_name: '管理员',
            timestamp: '2024-01-14T15:20:00Z'
          }
        ]
      };
      
      setNodeDetail(mockDetail);
      setEditForm(mockDetail);
    } catch (error) {
      console.error('获取节点详情失败:', error);
      toast.error('获取节点详情失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理编辑保存
   */
  const handleSave = async () => {
    if (!nodeDetail || !editForm) return;
    
    try {
      setLoading(true);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 更新本地状态
      const updatedDetail = { ...nodeDetail, ...editForm };
      setNodeDetail(updatedDetail);
      setIsEditing(false);
      
      // 调用回调
      onEdit?.(nodeDetail.id, editForm);
      
      toast.success('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理删除
   */
  const handleDelete = async () => {
    if (!nodeDetail) return;
    
    try {
      setLoading(true);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 调用回调
      onDelete?.(nodeDetail.id);
      
      toast.success('删除成功');
      onClose();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  /**
   * 获取KPI状态颜色
   * @param status - KPI状态
   * @returns 颜色类名
   */
  const getKPIStatusColor = (status: KPI['status']) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-100';
      case 'at_risk': return 'text-yellow-600 bg-yellow-100';
      case 'behind': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  /**
   * 获取权限类型图标
   * @param type - 权限类型
   * @returns 图标组件
   */
  const getPermissionIcon = (type: Permission['type']) => {
    switch (type) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'write': return <Edit className="w-4 h-4" />;
      case 'read': return <Eye className="w-4 h-4" />;
      default: return <Key className="w-4 h-4" />;
    }
  };

  /**
   * 格式化日期
   * @param dateString - 日期字符串
   * @returns 格式化后的日期
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  /**
   * 格式化货币
   * @param amount - 金额
   * @returns 格式化后的货币字符串
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  // 监听nodeId变化
  useEffect(() => {
    if (nodeId && isOpen) {
      fetchNodeDetail(nodeId);
    }
  }, [nodeId, isOpen]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setActiveTab('overview');
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen || !nodeId) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* 面板 */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ${className}`}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? '编辑部门' : '部门详情'}
              </h2>
              {nodeDetail && (
                <p className="text-sm text-gray-500">{nodeDetail.code}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="编辑"
              >
                <Edit className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* 内容 */}
        {!loading && nodeDetail && (
          <div className="flex-1 overflow-hidden">
            {/* 标签页导航 */}
            <div className="flex border-b border-gray-200">
              {[
                { key: 'overview', label: '概览', icon: Building2 },
                { key: 'members', label: '成员', icon: Users },
                { key: 'permissions', label: '权限', icon: Shield },
                { key: 'kpis', label: 'KPI', icon: Target },
                { key: 'activities', label: '活动', icon: Activity }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 标签页内容 */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* 概览标签页 */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* 基本信息 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          部门名称
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{nodeDetail.name}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          部门编码
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.code || ''}
                            onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{nodeDetail.code}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          描述
                        </label>
                        {isEditing ? (
                          <textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{nodeDetail.description || '暂无描述'}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          位置
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.location || ''}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{nodeDetail.location || '未设置'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 负责人信息 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">负责人信息</h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{nodeDetail.manager_name || '未设置'}</span>
                      </div>
                      
                      {nodeDetail.manager_email && (
                        <div className="flex items-center space-x-3 mb-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{nodeDetail.manager_email}</span>
                        </div>
                      )}
                      
                      {nodeDetail.manager_phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{nodeDetail.manager_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">统计信息</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">成员数量</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{nodeDetail.member_count}</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-900">子部门</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{nodeDetail.children_count}</p>
                      </div>
                    </div>
                  </div>

                  {/* 预算信息 */}
                  {nodeDetail.budget && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">预算信息</h3>
                      
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <BarChart3 className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-900">年度预算</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">{formatCurrency(nodeDetail.budget)}</p>
                        {nodeDetail.cost_center && (
                          <p className="text-sm text-yellow-700 mt-1">成本中心: {nodeDetail.cost_center}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 成员标签页 */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">部门成员</h3>
                    <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Plus className="w-4 h-4" />
                      <span>添加成员</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {nodeDetail.direct_reports.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.position}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status === 'active' ? '在职' : '离职'}
                          </span>
                          
                          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 权限标签页 */}
              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">部门权限</h3>
                    <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Plus className="w-4 h-4" />
                      <span>添加权限</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {nodeDetail.permissions?.map(permission => (
                      <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            permission.type === 'admin' ? 'bg-red-100 text-red-600' :
                            permission.type === 'write' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {getPermissionIcon(permission.type)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{permission.name}</p>
                            <p className="text-sm text-gray-500">资源: {permission.resource}</p>
                            <p className="text-xs text-gray-400">
                              授权时间: {formatDate(permission.granted_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            permission.type === 'admin' ? 'bg-red-100 text-red-800' :
                            permission.type === 'write' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {permission.type === 'admin' ? '管理员' :
                             permission.type === 'write' ? '读写' : '只读'}
                          </span>
                          
                          <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KPI标签页 */}
              {activeTab === 'kpis' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">关键绩效指标</h3>
                    <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Plus className="w-4 h-4" />
                      <span>添加KPI</span>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {nodeDetail.kpis?.map(kpi => {
                      const progress = (kpi.current / kpi.target) * 100;
                      return (
                        <div key={kpi.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{kpi.name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${getKPIStatusColor(kpi.status)}`}>
                              {kpi.status === 'on_track' ? '正常' :
                               kpi.status === 'at_risk' ? '风险' : '落后'}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">当前值: {kpi.current}{kpi.unit}</span>
                              <span className="text-gray-600">目标值: {kpi.target}{kpi.unit}</span>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  progress >= 100 ? 'bg-green-500' :
                                  progress >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>进度: {progress.toFixed(1)}%</span>
                              <span>周期: {kpi.period === 'monthly' ? '月度' : kpi.period === 'quarterly' ? '季度' : '年度'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 活动标签页 */}
              {activeTab === 'activities' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">最近活动</h3>
                  
                  <div className="space-y-3">
                    {nodeDetail.recent_activities.map(activity => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'member_added' ? 'bg-green-100 text-green-600' :
                          activity.type === 'member_removed' ? 'bg-red-100 text-red-600' :
                          activity.type === 'structure_changed' ? 'bg-blue-100 text-blue-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {activity.type === 'member_added' ? <UserCheck className="w-4 h-4" /> :
                           activity.type === 'member_removed' ? <UserX className="w-4 h-4" /> :
                           activity.type === 'structure_changed' ? <Move className="w-4 h-4" /> :
                           <Shield className="w-4 h-4" />}
                        </div>
                        
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">操作人: {activity.user_name}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{formatDate(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部操作栏 */}
        {!loading && nodeDetail && (
          <div className="border-t border-gray-200 p-4">
            {isEditing ? (
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(nodeDetail);
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>取消</span>
                </button>
              </div>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={() => onAddChild?.(nodeDetail.id)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加子部门</span>
                </button>
                
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">确认删除</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              确定要删除部门 "{nodeDetail?.name}" 吗？此操作不可撤销。
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                确认删除
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NodeDetailPanel;