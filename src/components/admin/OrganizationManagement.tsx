'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Building2, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  UserPlus,
  BarChart3,
  Move,
  RefreshCw,
  Eye,
  Settings,
  X,
  Crown,
  UserMinus,
  GitBranch,
  Layers,
  PieChart,
  TrendingUp,
  Lock,
  Unlock,
  History,
  Database,
  Activity,
  Network,
  Shield,
  Key,
  FileText,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DepartmentCreateModal from './DepartmentCreateModal';
import DepartmentEditModal from './DepartmentEditModal';
import DepartmentMemberModal from './DepartmentMemberModal';
import DepartmentStatsModal from './DepartmentStatsModal';
import OrganizationChartAdvanced from './OrganizationChartAdvanced';
import OrganizationExportTools from './OrganizationExportTools';
import OrganizationAnimations, { 
  DepartmentNodeAnimation, 
  LoadingAnimation 
} from './OrganizationAnimations';
import PermissionInheritanceManager from './PermissionInheritanceManager';
import UserPermissionManager from './UserPermissionManager';
import PermissionAuditLogger from './PermissionAuditLogger';
import DepartmentStats from './DepartmentStats';
import { OrgChartVisualization } from './OrgChartVisualization';

// 导入子组件
import DepartmentPermissions from './DepartmentPermissions';
import PermissionTemplates from './PermissionTemplates';
import PermissionConflictResolver from './PermissionConflictResolver';
import PermissionAuditLog from './PermissionAuditLog';
import DataAccessControl from './DataAccessControl';
import OrganizationChart from './OrganizationChart';
import DepartmentStatistics from './DepartmentStatistics';

// 拖拽类型常量
const ItemTypes = {
  DEPARTMENT: 'department'
};

// 类型定义
interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  level: number;
  path: string;
  sort_order: number;
  manager_id?: string;
  manager_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  status: 'active' | 'inactive';
  member_count: number;
  children?: Department[];
  created_at: string;
  updated_at: string;
}

// 拖拽项目类型
interface DragItem {
  type: string;
  id: string;
  department: Department;
}

interface DepartmentMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  position?: string;
  is_primary: boolean;
  is_manager: boolean;
  start_date: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'transferred';
}

interface OrganizationManagementProps {
  onClose?: () => void;
}

/**
 * 组织架构管理组件
 * 提供部门的树形展示、CRUD操作、成员管理、权限配置等功能
 * 
 * @param props - 组件属性
 * @param props.onClose - 关闭回调函数
 * @returns 组织架构管理界面
 */
const OrganizationManagement: React.FC<OrganizationManagementProps> = ({ onClose }) => {
  // 状态管理
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchResults, setSearchResults] = useState<Department[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState('structure');
  const [viewMode, setViewMode] = useState<'tree' | 'chart' | 'advanced'>('tree');
  const chartRef = useRef<SVGSVGElement>(null);
  
  // 权限管理子标签页状态
  const [permissionTab, setPermissionTab] = useState<'department' | 'inheritance' | 'user' | 'audit'>('department');

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const params = new URLSearchParams({
        tree: 'true',
        include_stats: 'true',
        status: statusFilter === 'all' ? '' : statusFilter
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/departments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取部门列表失败');
      }

      const data = await response.json();
      setDepartments(data.departments || []);
      
      // 默认展开根节点
      if (data.departments?.length > 0) {
        const rootIds = data.departments
          .filter((dept: Department) => !dept.parent_id)
          .map((dept: Department) => dept.id);
        setExpandedNodes(new Set(rootIds));
      }

    } catch (error) {
      console.error('获取部门列表失败:', error);
      toast.error('获取部门列表失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, statusFilter]);

  // 搜索部门
  const searchDepartments = async (keyword: string, filters: any = {}) => {
    if (!keyword.trim() && Object.keys(filters).length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const params = new URLSearchParams({
        search: keyword,
        ...filters
      });

      const response = await fetch(`/api/admin/departments/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('搜索失败');
      }

      const data = await response.json();
      setSearchResults(data.departments || []);
    } catch (error) {
      console.error('搜索失败:', error);
      toast.error('搜索失败');
    } finally {
      setIsSearching(false);
    }
  };

  // 处理搜索输入变化
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      searchDepartments(value, {
        status: statusFilter === 'all' ? '' : statusFilter,
        level: filterLevel === 'all' ? '' : filterLevel,
        type: filterType === 'all' ? '' : filterType
      });
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // 处理筛选变化
  const handleFilterChange = () => {
    if (searchTerm.trim()) {
      searchDepartments(searchTerm, {
        status: statusFilter === 'all' ? '' : statusFilter,
        level: filterLevel === 'all' ? '' : filterLevel,
        type: filterType === 'all' ? '' : filterType
      });
    }
  };

  // 选择部门
  const selectDepartment = async (department: Department) => {
    setSelectedDepartment(department);
    await fetchDepartmentMembers(department.id);
  };

  // 获取部门成员
  const fetchDepartmentMembers = async (departmentId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`/api/admin/departments/${departmentId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取部门成员失败');
      }

      const data = await response.json();
      setDepartmentMembers(data.members || []);
    } catch (error) {
      console.error('获取部门成员失败:', error);
      toast.error('获取部门成员失败');
    }
  };

  // 切换节点展开状态
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 编辑部门
  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setShowEditModal(true);
  };

  // 管理成员
  const handleManageMembers = (department: Department) => {
    setSelectedDepartment(department);
    setShowMemberModal(true);
  };

  // 查看统计
  const handleViewStats = (department: Department) => {
    setSelectedDepartment(department);
    setShowStatsModal(true);
  };

  // 模态框成功回调
  const handleModalSuccess = () => {
    fetchDepartments();
    if (selectedDepartment) {
      fetchDepartmentMembers(selectedDepartment.id);
    }
  };

  // 拖拽组件
  const DraggableDepartmentNode: React.FC<{ department: Department; level: number }> = ({ department, level }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.DEPARTMENT,
      item: { type: ItemTypes.DEPARTMENT, id: department.id, department },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [{ isOver, canDrop }, drop] = useDrop({
      accept: ItemTypes.DEPARTMENT,
      drop: (item: DragItem) => {
        if (item.id !== department.id) {
          handleMoveDepartment(item.department, department);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });

    const ref = React.useRef<HTMLDivElement>(null);
    drag(drop(ref));

    return (
      <div
        ref={ref}
        className={`
          ${isDragging ? 'opacity-50' : ''}
          ${isOver && canDrop ? 'bg-blue-50 border-blue-200' : ''}
        `}
      >
        {renderDepartmentNode(department, level)}
      </div>
    );
  };

  // 移动部门
  const handleMoveDepartment = async (sourceDept: Department, targetDept: Department) => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch(`/api/admin/departments/${sourceDept.id}/move`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_parent_id: targetDept.id
        })
      });

      if (!response.ok) {
        throw new Error('移动部门失败');
      }

      toast.success('部门移动成功');
      fetchDepartments();
    } catch (error) {
      console.error('移动部门失败:', error);
      toast.error('移动部门失败');
    }
  };

  // 渲染部门节点
  const renderDepartmentNode = (department: Department, level: number = 0): React.ReactNode => {
    const hasChildren = department.children && department.children.length > 0;
    const isExpanded = expandedNodes.has(department.id);
    const isSelected = selectedDepartment?.id === department.id;

    return (
      <div key={department.id} className="select-none">
        <div
          className={`
            flex items-center p-2 rounded-lg cursor-pointer transition-colors
            ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}
          `}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => selectDepartment(department)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(department.id);
                }}
                className="p-1 hover:bg-gray-200 rounded mr-1"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <Building2 className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 truncate">{department.name}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {department.code}
                </span>
                {department.status === 'inactive' && (
                  <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                    已停用
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                第{department.level}级 · {department.member_count || 0}人
                {department.manager_name && (
                  <span className="ml-2">· 负责人: {department.manager_name}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditDepartment(department);
              }}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleManageMembers(department);
              }}
              className="p-1 text-gray-400 hover:text-green-600 rounded"
              title="管理成员"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewStats(department);
              }}
              className="p-1 text-gray-400 hover:text-purple-600 rounded"
              title="查看统计"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {department.children!.map(child => (
              <DraggableDepartmentNode
                key={child.id}
                department={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染成员列表
  const renderMembersList = () => {
    if (!selectedDepartment) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">选择部门</h3>
            <p className="text-gray-500">请从左侧选择一个部门查看详细信息</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDepartment.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDepartment.description || '暂无描述'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleManageMembers(selectedDepartment)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                添加成员
              </button>
              <button
                onClick={() => handleEditDepartment(selectedDepartment)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                编辑部门
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {departmentMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">该部门暂无成员</p>
              <button
                onClick={() => handleManageMembers(selectedDepartment)}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                添加第一个成员
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {departmentMembers.map(member => (
                <div
                  key={member.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {member.user_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {member.user_name}
                          </span>
                          {member.is_manager && (
                            <Crown className="w-4 h-4 text-yellow-500" title="部门管理者" />
                          )}
                          {member.is_primary && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                              主要部门
                            </span>
                          )}
                          {member.status !== 'active' && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {member.status === 'inactive' ? '已停用' : '已转移'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <span>{member.user_email}</span>
                          {member.position && (
                            <span className="ml-2">• {member.position}</span>
                          )}
                          <span className="ml-2">• 入职: {member.start_date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowMemberModal(true)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                        title="移除"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 初始化加载
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* 页面标题和操作栏 */}
        <div className="flex items-center justify-between p-6 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">组织架构管理</h1>
            <p className="text-muted-foreground mt-2">
              管理公司组织架构、部门层级、权限配置和人员统计
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDepartments}
              disabled={refreshing}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              导入
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新建部门
            </button>
          </div>
        </div>

        {/* 标签页导航 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200">
            <TabsList className="grid w-full grid-cols-9 h-12">
              <TabsTrigger value="structure" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                部门结构
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                权限管理
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                权限模板
              </TabsTrigger>
              <TabsTrigger value="conflicts" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                冲突检测
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                审计日志
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                访问控制
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                组织图
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                可视化图表
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                统计报表
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 标签页内容 */}
          <div className="flex-1 overflow-hidden">
            {/* 部门结构管理 */}
            <TabsContent value="structure" className="h-full m-0">
              <div className="h-full flex">
                {/* 左侧部门树 */}
                <div className="w-1/3 bg-white border-r border-gray-200 overflow-auto">
                  <div className="p-4">
                    {/* 搜索和筛选 */}
                    <div className="space-y-3 mb-4">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="搜索部门名称、编码..."
                          value={searchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value as any);
                            handleFilterChange();
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="all">全部状态</option>
                          <option value="active">正常</option>
                          <option value="inactive">已停用</option>
                        </select>
                        <select
                          value={filterLevel}
                          onChange={(e) => {
                            setFilterLevel(e.target.value);
                            handleFilterChange();
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="all">全部层级</option>
                          <option value="1">一级部门</option>
                          <option value="2">二级部门</option>
                          <option value="3">三级部门</option>
                          <option value="4">四级部门</option>
                          <option value="5">五级部门</option>
                        </select>
                      </div>
                      {searchTerm && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSearchResults([]);
                            setIsSearching(false);
                          }}
                          className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          清除搜索
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      {searchTerm ? `搜索结果 (${searchResults.length})` : '部门结构'}
                    </h3>
                    
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : searchTerm ? (
                      // 搜索结果显示
                      searchResults.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>未找到匹配的部门</p>
                          <p className="text-sm text-gray-400 mt-1">请尝试其他关键词</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {searchResults.map(dept => (
                            <div
                              key={dept.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedDepartment?.id === dept.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => selectDepartment(dept)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Building2 className="w-5 h-5 text-gray-400" />
                                  <div>
                                    <div className="font-medium">{dept.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {dept.code} · 第{dept.level}级 · {dept.member_count || 0}人
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditDepartment(dept);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleManageMembers(dept);
                                    }}
                                    className="p-1 text-gray-400 hover:text-green-600 rounded"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewStats(dept);
                                    }}
                                    className="p-1 text-gray-400 hover:text-purple-600 rounded"
                                  >
                                    <BarChart3 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : departments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>暂无部门数据</p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-2 text-blue-600 hover:text-blue-700"
                        >
                          创建第一个部门
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {departments.map(department => (
                          <DraggableDepartmentNode
                            key={department.id}
                            department={department}
                            level={0}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧成员列表 */}
                <div className="flex-1 flex flex-col">
                  {renderMembersList()}
                </div>
              </div>
            </TabsContent>

            {/* 权限管理 */}
            <TabsContent value="permissions" className="h-full m-0">
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6">
                      <button
                        onClick={() => setPermissionTab('department')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          permissionTab === 'department'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        部门权限
                      </button>
                      <button
                        onClick={() => setPermissionTab('inheritance')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          permissionTab === 'inheritance'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        继承规则
                      </button>
                      <button
                        onClick={() => setPermissionTab('user')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          permissionTab === 'user'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        用户权限
                      </button>
                      <button
                        onClick={() => setPermissionTab('audit')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          permissionTab === 'audit'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        审计日志
                      </button>
                    </nav>
                  </div>
                  
                  <div className="p-6">
                    {permissionTab === 'department' && <DepartmentPermissions />}
                    {permissionTab === 'inheritance' && <PermissionInheritanceManager />}
                    {permissionTab === 'user' && <UserPermissionManager />}
                    {permissionTab === 'audit' && <PermissionAuditLogger />}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 权限模板 */}
            <TabsContent value="templates" className="h-full m-0">
              <PermissionTemplates />
            </TabsContent>

            {/* 冲突检测 */}
            <TabsContent value="conflicts" className="h-full m-0">
              <PermissionConflictResolver />
            </TabsContent>

            {/* 审计日志 */}
            <TabsContent value="audit" className="h-full m-0">
              <PermissionAuditLog />
            </TabsContent>

            {/* 访问控制 */}
            <TabsContent value="access" className="h-full m-0">
              <DataAccessControl />
            </TabsContent>

            {/* 组织图 */}
            <TabsContent value="chart" className="h-full m-0">
              <OrganizationAnimations enableAnimations={true}>
                <div className="h-full flex flex-col">
                  {/* 工具栏 */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold">组织架构可视化</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewMode('tree')}
                          className={`px-3 py-1 rounded text-sm ${
                            viewMode === 'tree'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          树形视图
                        </button>
                        <button
                          onClick={() => setViewMode('chart')}
                          className={`px-3 py-1 rounded text-sm ${
                            viewMode === 'chart'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          组织图
                        </button>
                        <button
                          onClick={() => setViewMode('advanced')}
                          className={`px-3 py-1 rounded text-sm ${
                            viewMode === 'advanced'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          高级视图
                        </button>
                      </div>
                    </div>
                    
                    {/* 导出工具 */}
                    {chartRef.current && (
                      <OrganizationExportTools
                        svgRef={chartRef}
                        departments={departments}
                        title="组织架构图"
                        onExportStart={() => setLoading(true)}
                        onExportComplete={(success) => {
                          setLoading(false);
                          if (success) {
                            toast.success('导出成功');
                          }
                        }}
                      />
                    )}
                  </div>
                  
                  {/* 可视化内容 */}
                  <div className="flex-1 p-4">
                    {loading ? (
                      <LoadingAnimation />
                    ) : (
                      <div className="w-full h-full">
                        {viewMode === 'tree' && (
                          <OrganizationChart 
                            ref={chartRef}
                            departments={departments}
                            onDepartmentClick={selectDepartment}
                            searchTerm={searchTerm}
                          />
                        )}
                        
                        {(viewMode === 'chart' || viewMode === 'advanced') && (
                          <OrganizationChartAdvanced
                            departments={departments}
                            onDepartmentClick={selectDepartment}
                            onDepartmentEdit={handleEditDepartment}
                            onDepartmentMove={handleMoveDepartment}
                            searchTerm={searchTerm}
                            enableAnimations={true}
                            enableDragDrop={viewMode === 'advanced'}
                            className="w-full h-full"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </OrganizationAnimations>
            </TabsContent>

            {/* 统计报表 */}
            <TabsContent value="statistics" className="h-full m-0">
              <DepartmentStatistics departments={departments} />
            </TabsContent>
            
            {/* 可视化图表 */}
            <TabsContent value="visualization" className="h-full m-0">
              <OrgChartVisualization />
            </TabsContent>
            
            <TabsContent value="stats" className="flex-1 p-6">
              <DepartmentStats />
            </TabsContent>
          </div>
        </Tabs>

        {/* 新建部门模态框 */}
        <DepartmentCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleModalSuccess}
          departments={departments}
        />

        {/* 编辑部门模态框 */}
        <DepartmentEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingDepartment(null);
          }}
          onSuccess={handleModalSuccess}
          department={editingDepartment}
          departments={departments}
        />

        {/* 管理成员模态框 */}
        <DepartmentMemberModal
          isOpen={showMemberModal}
          onClose={() => setShowMemberModal(false)}
          onSuccess={handleModalSuccess}
          department={selectedDepartment}
        />

        {/* 部门统计模态框 */}
        <DepartmentStatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          department={selectedDepartment}
        />
      </div>
    </DndProvider>
  );
};

export default OrganizationManagement;