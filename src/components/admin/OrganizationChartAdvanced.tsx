'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Download,
  Printer,
  Users,
  Building2,
  Eye,
  Edit,
  Move,
  Maximize2,
  Grid3X3,
  Network,
  TreePine,
  Play,
  Pause,
  Settings,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 部门数据接口定义
 */
interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  level: number;
  sort_order: number;
  manager_id?: string;
  manager_name?: string;
  member_count: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  children?: Department[];
}

/**
 * 动画配置接口
 */
interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: string;
  stagger: number;
}

/**
 * 节点样式配置
 */
interface NodeStyle {
  width: number;
  height: number;
  borderRadius: number;
  fontSize: number;
  spacing: { horizontal: number; vertical: number };
  colors: {
    background: string;
    border: string;
    text: string;
    selected: string;
    hover: string;
  };
}

/**
 * 过滤配置
 */
interface FilterConfig {
  status: 'all' | 'active' | 'inactive';
  level: number | null;
  minMembers: number;
  maxMembers: number;
  hasManager: boolean | null;
}

/**
 * 高级组织架构图组件属性
 */
interface OrganizationChartAdvancedProps {
  departments: Department[];
  onDepartmentSelect?: (department: Department) => void;
  onDepartmentEdit?: (department: Department) => void;
  onDepartmentMove?: (departmentId: string, newParentId: string) => void;
  onDepartmentUpdate?: (departments: Department[]) => void;
  realTimeUpdates?: boolean;
  className?: string;
}

/**
 * 高级组织架构可视化组件
 * 
 * 功能特性：
 * - 高级动画效果和过渡
 * - 拖拽移动部门功能
 * - 实时数据更新
 * - 高级过滤和搜索
 * - 自定义样式配置
 * - 性能优化
 * - 无障碍访问支持
 * 
 * @param departments - 部门数据数组
 * @param onDepartmentSelect - 部门选择回调函数
 * @param onDepartmentEdit - 部门编辑回调函数
 * @param onDepartmentMove - 部门移动回调函数
 * @param onDepartmentUpdate - 部门更新回调函数
 * @param realTimeUpdates - 是否启用实时更新
 * @param className - 自定义样式类名
 */
export default function OrganizationChartAdvanced({
  departments,
  onDepartmentSelect,
  onDepartmentEdit,
  onDepartmentMove,
  onDepartmentUpdate,
  realTimeUpdates = false,
  className = ''
}: OrganizationChartAdvancedProps) {
  // 状态管理
  const [viewMode, setViewMode] = useState<'tree' | 'hierarchy' | 'network'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [hoveredDepartment, setHoveredDepartment] = useState<Department | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedDepartment, setDraggedDepartment] = useState<Department | null>(null);
  const [dropTarget, setDropTarget] = useState<Department | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 配置状态
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>({
    enabled: true,
    duration: 500,
    easing: 'ease-in-out',
    stagger: 50
  });
  
  const [nodeStyle, setNodeStyle] = useState<NodeStyle>({
    width: 200,
    height: 80,
    borderRadius: 8,
    fontSize: 14,
    spacing: { horizontal: 250, vertical: 120 },
    colors: {
      background: '#ffffff',
      border: '#e5e7eb',
      text: '#1f2937',
      selected: '#3b82f6',
      hover: '#f3f4f6'
    }
  });
  
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: 'all',
    level: null,
    minMembers: 0,
    maxMembers: 1000,
    hasManager: null
  });
  
  // 引用
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  /**
   * 过滤部门数据
   */
  const filteredDepartments = useMemo(() => {
    let filtered = departments;
    
    // 搜索过滤
    if (searchTerm.trim()) {
      filtered = filtered.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.manager_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 状态过滤
    if (filterConfig.status !== 'all') {
      filtered = filtered.filter(dept => dept.status === filterConfig.status);
    }
    
    // 层级过滤
    if (filterConfig.level !== null) {
      filtered = filtered.filter(dept => dept.level === filterConfig.level);
    }
    
    // 成员数量过滤
    filtered = filtered.filter(dept => 
      dept.member_count >= filterConfig.minMembers && 
      dept.member_count <= filterConfig.maxMembers
    );
    
    // 管理者过滤
    if (filterConfig.hasManager !== null) {
      filtered = filtered.filter(dept => 
        filterConfig.hasManager ? !!dept.manager_id : !dept.manager_id
      );
    }
    
    return filtered;
  }, [departments, searchTerm, filterConfig]);
  
  /**
   * 构建部门树形结构
   */
  const departmentTree = useMemo(() => {
    const departmentMap = new Map<string, Department>();
    const rootDepartments: Department[] = [];

    // 创建部门映射
    filteredDepartments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    // 构建树形结构
    filteredDepartments.forEach(dept => {
      const department = departmentMap.get(dept.id)!;
      if (dept.parent_id && departmentMap.has(dept.parent_id)) {
        const parent = departmentMap.get(dept.parent_id)!;
        parent.children!.push(department);
      } else {
        rootDepartments.push(department);
      }
    });

    return rootDepartments;
  }, [filteredDepartments]);
  
  /**
   * 计算节点位置（带动画）
   */
  const calculateNodePositions = useCallback((tree: Department[], animate = false) => {
    const positions = new Map<string, { x: number; y: number; targetX: number; targetY: number }>();
    
    const calculateTreePositions = (nodes: Department[], startX: number, startY: number, level: number) => {
      let currentX = startX;
      
      nodes.forEach((node, index) => {
        const x = currentX;
        const y = startY + level * nodeStyle.spacing.vertical;
        
        positions.set(node.id, {
          x: animate ? (positions.get(node.id)?.x ?? x) : x,
          y: animate ? (positions.get(node.id)?.y ?? y) : y,
          targetX: x,
          targetY: y
        });

        if (node.children && node.children.length > 0) {
          const childrenWidth = node.children.length * nodeStyle.spacing.horizontal;
          const childStartX = x - childrenWidth / 2 + nodeStyle.spacing.horizontal / 2;
          calculateTreePositions(node.children, childStartX, startY, level + 1);
        }

        currentX += nodeStyle.spacing.horizontal;
      });
    };
    
    calculateTreePositions(tree, 100, 50, 0);
    
    if (animate && animationConfig.enabled) {
      animateToPositions(positions);
    }
    
    return positions;
  }, [nodeStyle, animationConfig]);
  
  /**
   * 动画到目标位置
   */
  const animateToPositions = useCallback((targetPositions: Map<string, any>) => {
    if (!animationConfig.enabled) return;
    
    setIsAnimating(true);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationConfig.duration, 1);
      
      // 缓动函数
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      targetPositions.forEach((target, id) => {
        const current = targetPositions.get(id)!;
        current.x = current.x + (target.targetX - current.x) * easeProgress;
        current.y = current.y + (target.targetY - current.y) * easeProgress;
      });
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    animate();
  }, [animationConfig]);
  
  /**
   * 处理部门拖拽开始
   */
  const handleDragStart = useCallback((e: React.DragEvent, department: Department) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', department.id);
    setDraggedDepartment(department);
  }, []);
  
  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((e: React.DragEvent, department: Department) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 检查是否可以作为目标
    if (draggedDepartment && draggedDepartment.id !== department.id) {
      // 防止拖拽到自己的子部门
      const isDescendant = (parent: Department, child: Department): boolean => {
        if (parent.id === child.id) return true;
        if (parent.children) {
          return parent.children.some(c => isDescendant(parent, c));
        }
        return false;
      };
      
      if (!isDescendant(draggedDepartment, department)) {
        setDropTarget(department);
      }
    }
  }, [draggedDepartment]);
  
  /**
   * 处理拖拽放置
   */
  const handleDrop = useCallback((e: React.DragEvent, targetDepartment: Department) => {
    e.preventDefault();
    
    if (draggedDepartment && draggedDepartment.id !== targetDepartment.id) {
      onDepartmentMove?.(draggedDepartment.id, targetDepartment.id);
      toast.success(`已将 ${draggedDepartment.name} 移动到 ${targetDepartment.name} 下`);
    }
    
    setDraggedDepartment(null);
    setDropTarget(null);
  }, [draggedDepartment, onDepartmentMove]);
  
  /**
   * 处理拖拽结束
   */
  const handleDragEnd = useCallback(() => {
    setDraggedDepartment(null);
    setDropTarget(null);
  }, []);
  
  /**
   * 实时更新处理
   */
  useEffect(() => {
    if (!realTimeUpdates) return;
    
    const interval = setInterval(() => {
      // 模拟实时数据更新
      // 在实际应用中，这里应该是 WebSocket 或 Server-Sent Events
      console.log('检查实时更新...');
    }, 5000);
    
    return () => clearInterval(interval);
  }, [realTimeUpdates]);
  
  /**
   * 清理动画帧
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  /**
   * 渲染部门节点（高级版本）
   */
  const renderAdvancedDepartmentNode = useCallback((department: Department, position: any) => {
    const isSelected = selectedDepartment?.id === department.id;
    const isHovered = hoveredDepartment?.id === department.id;
    const isDragTarget = dropTarget?.id === department.id;
    const isDragged = draggedDepartment?.id === department.id;
    
    const nodeClass = [
      'department-node',
      'cursor-pointer',
      'transition-all',
      'duration-300',
      isHovered ? 'scale-105' : '',
      isDragged ? 'opacity-50' : '',
      isDragTarget ? 'ring-2 ring-blue-500' : ''
    ].filter(Boolean).join(' ');
    
    return (
      <g
        key={department.id}
        transform={`translate(${position.x}, ${position.y})`}
        className={nodeClass}
        onMouseEnter={() => setHoveredDepartment(department)}
        onMouseLeave={() => setHoveredDepartment(null)}
        onClick={() => {
          setSelectedDepartment(department);
          onDepartmentSelect?.(department);
        }}
      >
        {/* 拖拽区域 */}
        <foreignObject
          x={0}
          y={0}
          width={nodeStyle.width}
          height={nodeStyle.height}
          draggable
          onDragStart={(e) => handleDragStart(e, department)}
          onDragOver={(e) => handleDragOver(e, department)}
          onDrop={(e) => handleDrop(e, department)}
          onDragEnd={handleDragEnd}
        >
          <div
            className={`
              w-full h-full rounded-lg border-2 p-3 bg-white shadow-md
              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
              ${isHovered ? 'shadow-lg' : ''}
              ${isDragTarget ? 'border-blue-400 bg-blue-25' : ''}
              transition-all duration-200
            `}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Building2 className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                <span className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {department.name}
                </span>
              </div>
              <Badge 
                variant={department.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {department.status === 'active' ? '活跃' : '停用'}
              </Badge>
            </div>
            
            {/* 内容 */}
            <div className="space-y-1">
              <div className="text-xs text-gray-500">
                编码: {department.code}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  <Users className="w-3 h-3 inline mr-1" />
                  {department.member_count} 人
                </span>
                {department.manager_name && (
                  <span className="text-gray-500 truncate max-w-20">
                    {department.manager_name}
                  </span>
                )}
              </div>
            </div>
            
            {/* 拖拽指示器 */}
            {isHovered && (
              <div className="absolute top-1 right-1">
                <Move className="w-3 h-3 text-gray-400" />
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    );
  }, [
    selectedDepartment, hoveredDepartment, dropTarget, draggedDepartment,
    nodeStyle, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    onDepartmentSelect
  ]);
  
  /**
   * 渲染连接线（带动画）
   */
  const renderAnimatedConnections = useCallback((positions: Map<string, any>) => {
    const connections: JSX.Element[] = [];
    
    filteredDepartments.forEach(department => {
      if (department.parent_id) {
        const parentPos = positions.get(department.parent_id);
        const childPos = positions.get(department.id);
        
        if (parentPos && childPos) {
          const startX = parentPos.x + nodeStyle.width / 2;
          const startY = parentPos.y + nodeStyle.height;
          const endX = childPos.x + nodeStyle.width / 2;
          const endY = childPos.y;
          
          connections.push(
            <path
              key={`${department.parent_id}-${department.id}`}
              d={`M ${startX} ${startY} Q ${startX} ${(startY + endY) / 2} ${endX} ${endY}`}
              stroke="#6b7280"
              strokeWidth={2}
              fill="none"
              className="connection-line transition-all duration-300"
              style={{
                strokeDasharray: isAnimating ? '5,5' : 'none',
                animation: isAnimating ? 'dash 1s linear infinite' : 'none'
              }}
            />
          );
        }
      }
    });
    
    return connections;
  }, [filteredDepartments, nodeStyle, isAnimating]);
  
  // 计算当前位置
  const currentPositions = useMemo(() => {
    return calculateNodePositions(departmentTree, false);
  }, [departmentTree, calculateNodePositions]);
  
  return (
    <TooltipProvider>
      <div className={`organization-chart-advanced ${className}`}>
        {/* 高级工具栏 */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>高级组织架构图</span>
                {realTimeUpdates && (
                  <Badge variant="outline" className="ml-2">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    实时更新
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center space-x-2">
                {/* 动画控制 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAnimationConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    >
                      {animationConfig.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {animationConfig.enabled ? '禁用动画' : '启用动画'}
                  </TooltipContent>
                </Tooltip>
                
                {/* 过滤器 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                
                {/* 设置 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* 搜索和基本控制 */}
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="搜索部门、编码或负责人..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* 缩放控制 */}
                  <div className="flex items-center space-x-1 border rounded-md">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.1))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="px-2 text-sm font-medium min-w-12 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.1))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setZoomLevel(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* 高级过滤器 */}
              {showFilters && (
                <Card className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium">状态</Label>
                      <Select
                        value={filterConfig.status}
                        onValueChange={(value: any) => setFilterConfig(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          <SelectItem value="active">活跃</SelectItem>
                          <SelectItem value="inactive">停用</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">最小成员数</Label>
                      <Input
                        type="number"
                        value={filterConfig.minMembers}
                        onChange={(e) => setFilterConfig(prev => ({ 
                          ...prev, 
                          minMembers: parseInt(e.target.value) || 0 
                        }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">最大成员数</Label>
                      <Input
                        type="number"
                        value={filterConfig.maxMembers}
                        onChange={(e) => setFilterConfig(prev => ({ 
                          ...prev, 
                          maxMembers: parseInt(e.target.value) || 1000 
                        }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-6">
                      <Switch
                        checked={filterConfig.hasManager === true}
                        onCheckedChange={(checked) => setFilterConfig(prev => ({ 
                          ...prev, 
                          hasManager: checked ? true : null 
                        }))}
                      />
                      <Label className="text-sm">有负责人</Label>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 图表容器 */}
        <Card className="relative overflow-hidden" style={{ height: '600px' }}>
          <div
            ref={containerRef}
            className="w-full h-full"
          >
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'center center'
              }}
            >
              {/* 背景网格 */}
              <defs>
                <pattern
                  id="advanced-grid"
                  width={20}
                  height={20}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth={1}
                  />
                </pattern>
                
                {/* 动画样式 */}
                <style>
                  {`
                    @keyframes dash {
                      to {
                        stroke-dashoffset: -10;
                      }
                    }
                  `}
                </style>
              </defs>
              <rect width="100%" height="100%" fill="url(#advanced-grid)" />
              
              {/* 连接线 */}
              <g className="connections">
                {renderAnimatedConnections(currentPositions)}
              </g>
              
              {/* 部门节点 */}
              <g className="departments">
                {filteredDepartments.map(dept => {
                  const position = currentPositions.get(dept.id);
                  return position ? renderAdvancedDepartmentNode(dept, position) : null;
                })}
              </g>
            </svg>
          </div>
          
          {/* 状态指示器 */}
          {isAnimating && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">动画中...</span>
            </div>
          )}
          
          {/* 拖拽提示 */}
          {draggedDepartment && (
            <div className="absolute bottom-4 left-4 bg-blue-600 text-white rounded-lg shadow-md p-3">
              <div className="flex items-center space-x-2">
                <Move className="w-4 h-4" />
                <span className="text-sm">拖拽 {draggedDepartment.name} 到目标部门</span>
              </div>
            </div>
          )}
        </Card>
        
        {/* 统计信息 */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{filteredDepartments.length}</div>
            <div className="text-sm text-gray-500">部门总数</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredDepartments.filter(d => d.status === 'active').length}
            </div>
            <div className="text-sm text-gray-500">活跃部门</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {filteredDepartments.reduce((sum, d) => sum + d.member_count, 0)}
            </div>
            <div className="text-sm text-gray-500">总成员数</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {Math.max(...filteredDepartments.map(d => d.level), 0)}
            </div>
            <div className="text-sm text-gray-500">最大层级</div>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}