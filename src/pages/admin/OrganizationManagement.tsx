'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  Search,
  Plus,
  Settings,
  Download,
  Printer,
  Eye,
  Edit,
  Trash2,
  Move,
  BarChart3,
  TreePine,
  Network,
  Target,
  Zap,
  Filter,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';

// 导入组织架构相关组件
import EnhancedOrgChart from '@/components/admin/EnhancedOrgChart';
import NodeDetailPanel from '@/components/admin/NodeDetailPanel';
import OrganizationExportTools from '@/components/admin/OrganizationExportTools';
import PrintPreview from '@/components/admin/PrintPreview';

// 部门数据接口
interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  level: number;
  path: string;
  manager_id?: string;
  manager_name?: string;
  member_count: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  children?: Department[];
}

// 视图模式类型
type ViewMode = 'tree' | 'hierarchy' | 'network' | 'radial';

// 统计数据接口
interface OrganizationStats {
  totalDepartments: number;
  totalEmployees: number;
  maxDepth: number;
  avgMembersPerDept: number;
  activeDepartments: number;
  inactiveDepartments: number;
}

/**
 * 组织架构管理页面组件
 * 
 * 功能特性：
 * - 多种视图模式的组织架构图表
 * - 部门信息的详细展示和编辑
 * - 组织架构的导出和打印功能
 * - 部门搜索和筛选
 * - 组织架构统计分析
 * - 响应式布局和全屏模式
 * 
 * @returns 组织架构管理页面组件
 */
export default function OrganizationManagement() {
  // 状态管理
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stats, setStats] = useState<OrganizationStats>({
    totalDepartments: 0,
    totalEmployees: 0,
    maxDepth: 0,
    avgMembersPerDept: 0,
    activeDepartments: 0,
    inactiveDepartments: 0
  });

  // 引用
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 获取部门数据
   */
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟部门数据
      const mockDepartments: Department[] = [
        {
          id: '1',
          name: '总公司',
          code: 'HQ',
          description: '公司总部',
          level: 0,
          path: '/总公司',
          manager_name: '董事长',
          member_count: 5,
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          children: [
            {
              id: '2',
              name: '技术部',
              code: 'TECH',
              description: '技术研发部门',
              parent_id: '1',
              level: 1,
              path: '/总公司/技术部',
              manager_name: '技术总监',
              member_count: 25,
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              children: [
                {
                  id: '3',
                  name: '前端开发组',
                  code: 'FE',
                  description: '前端开发团队',
                  parent_id: '2',
                  level: 2,
                  path: '/总公司/技术部/前端开发组',
                  manager_name: '前端组长',
                  member_count: 8,
                  status: 'active',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                },
                {
                  id: '4',
                  name: '后端开发组',
                  code: 'BE',
                  description: '后端开发团队',
                  parent_id: '2',
                  level: 2,
                  path: '/总公司/技术部/后端开发组',
                  manager_name: '后端组长',
                  member_count: 12,
                  status: 'active',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                },
                {
                  id: '5',
                  name: '测试组',
                  code: 'QA',
                  description: '质量保证团队',
                  parent_id: '2',
                  level: 2,
                  path: '/总公司/技术部/测试组',
                  manager_name: '测试组长',
                  member_count: 5,
                  status: 'active',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                }
              ]
            },
            {
              id: '6',
              name: '市场部',
              code: 'MKT',
              description: '市场营销部门',
              parent_id: '1',
              level: 1,
              path: '/总公司/市场部',
              manager_name: '市场总监',
              member_count: 15,
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              children: [
                {
                  id: '7',
                  name: '品牌推广组',
                  code: 'BRAND',
                  description: '品牌推广团队',
                  parent_id: '6',
                  level: 2,
                  path: '/总公司/市场部/品牌推广组',
                  manager_name: '品牌经理',
                  member_count: 6,
                  status: 'active',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                },
                {
                  id: '8',
                  name: '销售组',
                  code: 'SALES',
                  description: '销售团队',
                  parent_id: '6',
                  level: 2,
                  path: '/总公司/市场部/销售组',
                  manager_name: '销售经理',
                  member_count: 9,
                  status: 'active',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z'
                }
              ]
            },
            {
              id: '9',
              name: '人事部',
              code: 'HR',
              description: '人力资源部门',
              parent_id: '1',
              level: 1,
              path: '/总公司/人事部',
              manager_name: '人事总监',
              member_count: 8,
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: '10',
              name: '财务部',
              code: 'FIN',
              description: '财务管理部门',
              parent_id: '1',
              level: 1,
              path: '/总公司/财务部',
              manager_name: '财务总监',
              member_count: 6,
              status: 'inactive',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      ];
      
      setDepartments(mockDepartments);
      setFilteredDepartments(mockDepartments);
      
      // 计算统计数据
      calculateStats(mockDepartments);
      
    } catch (error) {
      console.error('获取部门数据失败:', error);
      toast.error('获取部门数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 计算组织架构统计数据
   * @param depts - 部门数据
   */
  const calculateStats = (depts: Department[]) => {
    const flatDepts = flattenDepartments(depts);
    const totalEmployees = flatDepts.reduce((sum, dept) => sum + dept.member_count, 0);
    const maxDepth = Math.max(...flatDepts.map(dept => dept.level));
    const activeDepts = flatDepts.filter(dept => dept.status === 'active').length;
    const inactiveDepts = flatDepts.filter(dept => dept.status === 'inactive').length;
    
    setStats({
      totalDepartments: flatDepts.length,
      totalEmployees,
      maxDepth: maxDepth + 1,
      avgMembersPerDept: Math.round(totalEmployees / flatDepts.length),
      activeDepartments: activeDepts,
      inactiveDepartments: inactiveDepts
    });
  };

  /**
   * 扁平化部门数据
   * @param depts - 部门数据
   * @returns 扁平化的部门数组
   */
  const flattenDepartments = (depts: Department[]): Department[] => {
    const result: Department[] = [];
    
    const flatten = (departments: Department[]) => {
      departments.forEach(dept => {
        result.push(dept);
        if (dept.children) {
          flatten(dept.children);
        }
      });
    };
    
    flatten(depts);
    return result;
  };

  /**
   * 搜索和筛选部门
   */
  const filterDepartments = () => {
    let filtered = [...departments];
    
    // 状态筛选
    if (statusFilter !== 'all') {
      const flatDepts = flattenDepartments(filtered);
      const filteredFlat = flatDepts.filter(dept => dept.status === statusFilter);
      // 重建树形结构
      filtered = rebuildTree(filteredFlat);
    }
    
    // 搜索筛选
    if (searchTerm) {
      const flatDepts = flattenDepartments(filtered);
      const searchedFlat = flatDepts.filter(dept => 
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      filtered = rebuildTree(searchedFlat);
    }
    
    setFilteredDepartments(filtered);
  };

  /**
   * 重建树形结构
   * @param flatDepts - 扁平化的部门数组
   * @returns 树形结构的部门数组
   */
  const rebuildTree = (flatDepts: Department[]): Department[] => {
    const deptMap = new Map<string, Department>();
    const roots: Department[] = [];
    
    // 创建部门映射
    flatDepts.forEach(dept => {
      deptMap.set(dept.id, { ...dept, children: [] });
    });
    
    // 构建树形结构
    flatDepts.forEach(dept => {
      const deptNode = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        const parent = deptMap.get(dept.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(deptNode);
      } else {
        roots.push(deptNode);
      }
    });
    
    return roots;
  };

  /**
   * 处理节点点击
   * @param nodeId - 节点ID
   */
  const handleNodeClick = (nodeId: string) => {
    setSelectedDepartment(nodeId);
    setShowDetailPanel(true);
  };

  /**
   * 处理节点编辑
   * @param nodeId - 节点ID
   * @param data - 编辑数据
   */
  const handleNodeEdit = async (nodeId: string, data: any) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('部门信息更新成功');
      fetchDepartments(); // 重新获取数据
    } catch (error) {
      console.error('更新部门信息失败:', error);
      toast.error('更新部门信息失败');
    }
  };

  /**
   * 处理节点删除
   * @param nodeId - 节点ID
   */
  const handleNodeDelete = async (nodeId: string) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('部门删除成功');
      fetchDepartments(); // 重新获取数据
      setShowDetailPanel(false);
    } catch (error) {
      console.error('删除部门失败:', error);
      toast.error('删除部门失败');
    }
  };

  /**
   * 处理添加子部门
   * @param parentId - 父部门ID
   */
  const handleAddChild = async (parentId: string) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('子部门添加成功');
      fetchDepartments(); // 重新获取数据
    } catch (error) {
      console.error('添加子部门失败:', error);
      toast.error('添加子部门失败');
    }
  };

  /**
   * 处理节点移动
   * @param nodeId - 节点ID
   * @param newParentId - 新父节点ID
   */
  const handleNodeMove = async (nodeId: string, newParentId: string) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('部门移动成功');
      fetchDepartments(); // 重新获取数据
    } catch (error) {
      console.error('移动部门失败:', error);
      toast.error('移动部门失败');
    }
  };

  /**
   * 切换全屏模式
   */
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  /**
   * 刷新数据
   */
  const refreshData = () => {
    fetchDepartments();
  };

  // 副作用
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterDepartments();
  }, [searchTerm, statusFilter, departments]);

  // 渲染统计卡片
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">总部门数</p>
              <p className="text-lg font-semibold">{stats.totalDepartments}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">总员工数</p>
              <p className="text-lg font-semibold">{stats.totalEmployees}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">组织层级</p>
              <p className="text-lg font-semibold">{stats.maxDepth}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">平均人数</p>
              <p className="text-lg font-semibold">{stats.avgMembersPerDept}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">活跃部门</p>
              <p className="text-lg font-semibold">{stats.activeDepartments}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">停用部门</p>
              <p className="text-lg font-semibold">{stats.inactiveDepartments}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染工具栏
  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* 搜索和筛选 */}
      <div className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索部门名称、编码或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-32">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="inactive">停用</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* 视图模式选择 */}
      <div className="flex gap-2">
        <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tree">
              <div className="flex items-center">
                <TreePine className="h-4 w-4 mr-2" />
                树形图
              </div>
            </SelectItem>
            <SelectItem value="hierarchy">
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                层级图
              </div>
            </SelectItem>
            <SelectItem value="network">
              <div className="flex items-center">
                <Network className="h-4 w-4 mr-2" />
                网络图
              </div>
            </SelectItem>
            <SelectItem value="radial">
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-2" />
                径向图
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={refreshData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
        
        <Button variant="outline" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 mr-2" />
          ) : (
            <Maximize2 className="h-4 w-4 mr-2" />
          )}
          {isFullscreen ? '退出全屏' : '全屏'}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载组织架构数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}`}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">组织架构管理</h1>
          <p className="text-gray-600">管理公司组织架构，查看部门层级关系</p>
        </div>
        
        <div className="flex gap-2">
          <OrganizationExportTools
            svgRef={svgRef}
            departments={flattenDepartments(filteredDepartments)}
            title="组织架构图"
          />
          
          <Button
            variant="outline"
            onClick={() => setShowPrintPreview(true)}
          >
            <Printer className="h-4 w-4 mr-2" />
            打印预览
          </Button>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新建部门
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {renderStatsCards()}

      {/* 工具栏 */}
      {renderToolbar()}

      {/* 组织架构图表 */}
      <Card className="min-h-[600px]">
        <CardContent className="p-6" ref={containerRef}>
          <EnhancedOrgChart
            ref={svgRef}
            departments={filteredDepartments}
            viewMode={viewMode}
            onNodeClick={handleNodeClick}
            onNodeEdit={handleNodeEdit}
            onNodeDelete={handleNodeDelete}
            onAddChild={handleAddChild}
            onNodeMove={handleNodeMove}
            className="w-full h-full"
          />
        </CardContent>
      </Card>

      {/* 节点详细信息面板 */}
      <NodeDetailPanel
        nodeId={selectedDepartment}
        isOpen={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        onEdit={handleNodeEdit}
        onDelete={handleNodeDelete}
        onAddChild={handleAddChild}
        onMove={handleNodeMove}
      />

      {/* 打印预览对话框 */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>打印预览</DialogTitle>
          </DialogHeader>
          <PrintPreview
            svgRef={svgRef}
            title="组织架构图"
            onClose={() => setShowPrintPreview(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}