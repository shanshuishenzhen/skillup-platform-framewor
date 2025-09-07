'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  Settings, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move, 
  Eye, 
  EyeOff, 
  Grid, 
  List, 
  Building2, 
  Users, 
  User, 
  Crown, 
  Shield, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Hash, 
  Layers, 
  GitBranch, 
  Target, 
  Activity, 
  Zap, 
  TreePine, 
  Compass, 
  Magnet, 
  BarChart3, 
  PieChart, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Image, 
  Save
} from 'lucide-react';
import { toast } from 'sonner';

// 类型定义
interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  level: number;
  path: string;
  manager_id?: string;
  manager?: User;
  employee_count: number;
  budget?: number;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at?: string;
  children?: Department[];
  employees?: User[];
  position?: { x: number; y: number };
}

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  position?: string;
  department_id?: string;
  department?: Department;
  hire_date?: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'admin' | 'manager' | 'employee';
}

interface ChartNode {
  id: string;
  type: 'department' | 'user';
  data: Department | User;
  x: number;
  y: number;
  width: number;
  height: number;
  children: ChartNode[];
  parent?: ChartNode;
  level: number;
}

interface ChartSettings {
  layout: 'tree' | 'radial' | 'force' | 'hierarchy' | 'compact';
  viewMode: 'departments' | 'employees' | 'mixed';
  showDetails: boolean;
  showConnections: boolean;
  nodeSpacing: number;
  levelSpacing: number;
  nodeSize: 'small' | 'medium' | 'large';
  colorScheme: 'default' | 'department' | 'role' | 'status';
  showLabels: boolean;
  showIcons: boolean;
  animationEnabled: boolean;
}

interface ExportOptions {
  format: 'png' | 'svg' | 'pdf';
  quality: 'low' | 'medium' | 'high';
  includeBackground: boolean;
  paperSize?: 'a4' | 'a3' | 'letter' | 'custom';
  orientation?: 'portrait' | 'landscape';
}

/**
 * 组织图表组件
 * 提供部门树形图和组织图的可视化展示功能
 * 
 * @returns 组织图表界面
 */
const OrganizationChart: React.FC = () => {
  // 状态管理
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [chartNodes, setChartNodes] = useState<ChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<ChartNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // 图表设置
  const [settings, setSettings] = useState<ChartSettings>({
    layout: 'tree',
    viewMode: 'departments',
    showDetails: true,
    showConnections: true,
    nodeSpacing: 150,
    levelSpacing: 200,
    nodeSize: 'medium',
    colorScheme: 'default',
    showLabels: true,
    showIcons: true,
    animationEnabled: true
  });
  
  // 导出选项
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 'high',
    includeBackground: true,
    paperSize: 'a4',
    orientation: 'landscape'
  });
  
  // 引用
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取部门数据
  const fetchDepartments = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/admin/departments?include_employees=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取部门数据失败');
      }

      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('获取部门数据失败:', error);
      toast.error('获取部门数据失败');
    }
  }, []);

  // 获取用户数据
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch('/api/admin/users?include_department=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取用户数据失败');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('获取用户数据失败:', error);
      toast.error('获取用户数据失败');
    }
  }, []);

  // 构建图表节点
  const buildChartNodes = useCallback(() => {
    const nodes: ChartNode[] = [];
    const nodeMap = new Map<string, ChartNode>();
    
    // 根据视图模式构建节点
    if (settings.viewMode === 'departments' || settings.viewMode === 'mixed') {
      // 构建部门节点
      departments.forEach(dept => {
        const node: ChartNode = {
          id: `dept-${dept.id}`,
          type: 'department',
          data: dept,
          x: 0,
          y: 0,
          width: getNodeWidth(),
          height: getNodeHeight(),
          children: [],
          level: dept.level
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      });
      
      // 建立父子关系
      departments.forEach(dept => {
        if (dept.parent_id) {
          const parentNode = nodeMap.get(`dept-${dept.parent_id}`);
          const childNode = nodeMap.get(`dept-${dept.id}`);
          if (parentNode && childNode) {
            parentNode.children.push(childNode);
            childNode.parent = parentNode;
          }
        }
      });
    }
    
    if (settings.viewMode === 'employees' || settings.viewMode === 'mixed') {
      // 构建用户节点
      users.forEach(user => {
        if (settings.viewMode === 'mixed' && user.department_id) {
          // 混合模式下，将用户作为部门的子节点
          const deptNode = nodeMap.get(`dept-${user.department_id}`);
          if (deptNode) {
            const userNode: ChartNode = {
              id: `user-${user.id}`,
              type: 'user',
              data: user,
              x: 0,
              y: 0,
              width: getNodeWidth(),
              height: getNodeHeight(),
              children: [],
              parent: deptNode,
              level: deptNode.level + 1
            };
            deptNode.children.push(userNode);
            nodes.push(userNode);
          }
        } else if (settings.viewMode === 'employees') {
          // 纯员工模式
          const node: ChartNode = {
            id: `user-${user.id}`,
            type: 'user',
            data: user,
            x: 0,
            y: 0,
            width: getNodeWidth(),
            height: getNodeHeight(),
            children: [],
            level: 0
          };
          nodes.push(node);
        }
      });
    }
    
    // 应用布局算法
    applyLayout(nodes);
    
    setChartNodes(nodes);
  }, [departments, users, settings.viewMode, settings.nodeSize, settings.nodeSpacing, settings.levelSpacing]);

  // 获取节点宽度
  const getNodeWidth = () => {
    switch (settings.nodeSize) {
      case 'small': return 120;
      case 'medium': return 160;
      case 'large': return 200;
      default: return 160;
    }
  };

  // 获取节点高度
  const getNodeHeight = () => {
    switch (settings.nodeSize) {
      case 'small': return 60;
      case 'medium': return 80;
      case 'large': return 100;
      default: return 80;
    }
  };

  // 应用布局算法
  const applyLayout = (nodes: ChartNode[]) => {
    switch (settings.layout) {
      case 'tree':
        applyTreeLayout(nodes);
        break;
      case 'radial':
        applyRadialLayout(nodes);
        break;
      case 'force':
        applyForceLayout(nodes);
        break;
      case 'hierarchy':
        applyHierarchyLayout(nodes);
        break;
      case 'compact':
        applyCompactLayout(nodes);
        break;
      default:
        applyTreeLayout(nodes);
    }
  };

  // 树形布局
  const applyTreeLayout = (nodes: ChartNode[]) => {
    const rootNodes = nodes.filter(node => !node.parent);
    let currentY = 0;
    
    rootNodes.forEach(rootNode => {
      layoutTreeNode(rootNode, 0, currentY);
      currentY += getSubtreeHeight(rootNode) + settings.levelSpacing;
    });
  };

  // 布局树节点
  const layoutTreeNode = (node: ChartNode, x: number, y: number) => {
    node.x = x;
    node.y = y;
    
    if (node.children.length === 0) return;
    
    const childrenHeight = node.children.reduce((sum, child) => 
      sum + getSubtreeHeight(child), 0
    ) + (node.children.length - 1) * settings.nodeSpacing;
    
    let currentY = y - childrenHeight / 2;
    
    node.children.forEach(child => {
      const childHeight = getSubtreeHeight(child);
      layoutTreeNode(child, x + settings.levelSpacing, currentY + childHeight / 2);
      currentY += childHeight + settings.nodeSpacing;
    });
  };

  // 获取子树高度
  const getSubtreeHeight = (node: ChartNode): number => {
    if (node.children.length === 0) {
      return node.height;
    }
    
    const childrenHeight = node.children.reduce((sum, child) => 
      sum + getSubtreeHeight(child), 0
    ) + (node.children.length - 1) * settings.nodeSpacing;
    
    return Math.max(node.height, childrenHeight);
  };

  // 径向布局
  const applyRadialLayout = (nodes: ChartNode[]) => {
    const rootNodes = nodes.filter(node => !node.parent);
    const centerX = 400;
    const centerY = 300;
    
    if (rootNodes.length === 1) {
      const rootNode = rootNodes[0];
      rootNode.x = centerX;
      rootNode.y = centerY;
      layoutRadialChildren(rootNode, centerX, centerY, 150, 0, 2 * Math.PI);
    } else {
      rootNodes.forEach((node, index) => {
        const angle = (2 * Math.PI * index) / rootNodes.length;
        const radius = 200;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
        
        const startAngle = angle - Math.PI / rootNodes.length;
        const endAngle = angle + Math.PI / rootNodes.length;
        layoutRadialChildren(node, node.x, node.y, 100, startAngle, endAngle);
      });
    }
  };

  // 布局径向子节点
  const layoutRadialChildren = (
    node: ChartNode, 
    centerX: number, 
    centerY: number, 
    radius: number, 
    startAngle: number, 
    endAngle: number
  ) => {
    if (node.children.length === 0) return;
    
    const angleStep = (endAngle - startAngle) / node.children.length;
    
    node.children.forEach((child, index) => {
      const angle = startAngle + angleStep * (index + 0.5);
      child.x = centerX + Math.cos(angle) * radius;
      child.y = centerY + Math.sin(angle) * radius;
      
      const childStartAngle = startAngle + angleStep * index;
      const childEndAngle = startAngle + angleStep * (index + 1);
      layoutRadialChildren(child, child.x, child.y, radius * 0.7, childStartAngle, childEndAngle);
    });
  };

  // 力导向布局
  const applyForceLayout = (nodes: ChartNode[]) => {
    // 简化的力导向布局实现
    const iterations = 100;
    const repulsionForce = 1000;
    const attractionForce = 0.1;
    
    // 初始化随机位置
    nodes.forEach(node => {
      if (!node.x && !node.y) {
        node.x = Math.random() * 800;
        node.y = Math.random() * 600;
      }
    });
    
    for (let i = 0; i < iterations; i++) {
      // 计算排斥力
      nodes.forEach(node1 => {
        let fx = 0, fy = 0;
        
        nodes.forEach(node2 => {
          if (node1 !== node2) {
            const dx = node1.x - node2.x;
            const dy = node1.y - node2.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsionForce / (distance * distance);
            
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        });
        
        // 计算吸引力（父子关系）
        if (node1.parent) {
          const dx = node1.parent.x - node1.x;
          const dy = node1.parent.y - node1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          fx += dx * attractionForce;
          fy += dy * attractionForce;
        }
        
        node1.children.forEach(child => {
          const dx = child.x - node1.x;
          const dy = child.y - node1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          fx += dx * attractionForce;
          fy += dy * attractionForce;
        });
        
        // 应用力
        node1.x += fx * 0.01;
        node1.y += fy * 0.01;
      });
    }
  };

  // 层次布局
  const applyHierarchyLayout = (nodes: ChartNode[]) => {
    const levels: ChartNode[][] = [];
    
    // 按层级分组
    nodes.forEach(node => {
      if (!levels[node.level]) {
        levels[node.level] = [];
      }
      levels[node.level].push(node);
    });
    
    // 布局每一层
    levels.forEach((levelNodes, level) => {
      const y = level * settings.levelSpacing;
      const totalWidth = levelNodes.length * settings.nodeSpacing;
      const startX = -totalWidth / 2;
      
      levelNodes.forEach((node, index) => {
        node.x = startX + index * settings.nodeSpacing;
        node.y = y;
      });
    });
  };

  // 紧凑布局
  const applyCompactLayout = (nodes: ChartNode[]) => {
    // 简化的紧凑布局，类似于树形布局但间距更小
    const compactSettings = {
      ...settings,
      nodeSpacing: settings.nodeSpacing * 0.7,
      levelSpacing: settings.levelSpacing * 0.8
    };
    
    const originalSettings = settings;
    setSettings(compactSettings);
    applyTreeLayout(nodes);
    setSettings(originalSettings);
  };

  // 获取节点颜色
  const getNodeColor = (node: ChartNode) => {
    switch (settings.colorScheme) {
      case 'department':
        if (node.type === 'department') {
          const dept = node.data as Department;
          return dept.level === 0 ? '#3B82F6' : `hsl(${dept.level * 60}, 70%, 60%)`;
        }
        return '#6B7280';
      
      case 'role':
        if (node.type === 'user') {
          const user = node.data as User;
          switch (user.role) {
            case 'admin': return '#EF4444';
            case 'manager': return '#F59E0B';
            case 'employee': return '#10B981';
            default: return '#6B7280';
          }
        }
        return '#3B82F6';
      
      case 'status':
        const data = node.data as Department | User;
        switch (data.status) {
          case 'active': return '#10B981';
          case 'inactive': return '#6B7280';
          case 'pending': return '#F59E0B';
          default: return '#6B7280';
        }
      
      default:
        return node.type === 'department' ? '#3B82F6' : '#10B981';
    }
  };

  // 获取节点图标
  const getNodeIcon = (node: ChartNode) => {
    if (node.type === 'department') {
      return <Building2 className="w-5 h-5" />;
    } else {
      const user = node.data as User;
      switch (user.role) {
        case 'admin': return <Crown className="w-5 h-5" />;
        case 'manager': return <Shield className="w-5 h-5" />;
        case 'employee': return <User className="w-5 h-5" />;
        default: return <User className="w-5 h-5" />;
      }
    }
  };

  // 导出图表
  const exportChart = async () => {
    if (!svgRef.current) return;
    
    try {
      setExporting(true);
      
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      
      if (exportOptions.format === 'svg') {
        // 直接下载 SVG
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        downloadBlob(blob, 'organization-chart.svg');
      } else {
        // 转换为其他格式
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          const scale = exportOptions.quality === 'high' ? 2 : exportOptions.quality === 'medium' ? 1.5 : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          if (ctx) {
            ctx.scale(scale, scale);
            if (exportOptions.includeBackground) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, img.width, img.height);
            }
            ctx.drawImage(img, 0, 0);
            
            if (exportOptions.format === 'png') {
              canvas.toBlob(blob => {
                if (blob) downloadBlob(blob, 'organization-chart.png');
              }, 'image/png');
            } else if (exportOptions.format === 'pdf') {
              // 简化的 PDF 导出（实际项目中可能需要使用 jsPDF 等库）
              canvas.toBlob(blob => {
                if (blob) downloadBlob(blob, 'organization-chart.png');
              }, 'image/png');
            }
          }
          
          URL.revokeObjectURL(url);
        };
        
        img.src = url;
      }
      
      toast.success('图表导出成功');
    } catch (error) {
      console.error('导出图表失败:', error);
      toast.error('导出图表失败');
    } finally {
      setExporting(false);
      setShowExportDialog(false);
    }
  };

  // 下载文件
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 处理鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 处理缩放
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(3, zoom + delta));
    setZoom(newZoom);
  };

  // 重置视图
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // 切换全屏
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // 渲染节点
  const renderNode = (node: ChartNode) => {
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode === node.id;
    const color = getNodeColor(node);
    
    return (
      <g
        key={node.id}
        transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
        className="cursor-pointer"
        onClick={() => setSelectedNode(node)}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        {/* 节点背景 */}
        <rect
          width={node.width}
          height={node.height}
          rx={8}
          fill={color}
          stroke={isSelected ? '#1F2937' : isHovered ? '#374151' : 'transparent'}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
          opacity={0.9}
        />
        
        {/* 节点内容 */}
        <foreignObject
          width={node.width}
          height={node.height}
          className="pointer-events-none"
        >
          <div className="h-full flex flex-col items-center justify-center p-2 text-white text-center">
            {settings.showIcons && (
              <div className="mb-1">
                {getNodeIcon(node)}
              </div>
            )}
            
            {settings.showLabels && (
              <div className="text-sm font-medium truncate w-full">
                {node.type === 'department' 
                  ? (node.data as Department).name
                  : (node.data as User).full_name
                }
              </div>
            )}
            
            {settings.showDetails && (
              <div className="text-xs opacity-80 truncate w-full">
                {node.type === 'department' 
                  ? `${(node.data as Department).employee_count} 人`
                  : (node.data as User).position || '员工'
                }
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    );
  };

  // 渲染连接线
  const renderConnections = () => {
    if (!settings.showConnections) return null;
    
    const connections: JSX.Element[] = [];
    
    chartNodes.forEach(node => {
      if (node.parent) {
        const startX = node.parent.x;
        const startY = node.parent.y + node.parent.height / 2;
        const endX = node.x;
        const endY = node.y - node.height / 2;
        
        connections.push(
          <line
            key={`${node.parent.id}-${node.id}`}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="#6B7280"
            strokeWidth={2}
            opacity={0.6}
          />
        );
      }
    });
    
    return connections;
  };

  // 渲染设置面板
  const renderSettings = () => {
    if (!showSettings) return null;
    
    return (
      <div className="absolute top-16 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">图表设置</h3>
          <button
            onClick={() => setShowSettings(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* 布局设置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              布局类型
            </label>
            <select
              value={settings.layout}
              onChange={(e) => setSettings(prev => ({ ...prev, layout: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="tree">树形布局</option>
              <option value="radial">径向布局</option>
              <option value="force">力导向布局</option>
              <option value="hierarchy">层次布局</option>
              <option value="compact">紧凑布局</option>
            </select>
          </div>
          
          {/* 视图模式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              视图模式
            </label>
            <select
              value={settings.viewMode}
              onChange={(e) => setSettings(prev => ({ ...prev, viewMode: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="departments">仅部门</option>
              <option value="employees">仅员工</option>
              <option value="mixed">混合视图</option>
            </select>
          </div>
          
          {/* 节点大小 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              节点大小
            </label>
            <select
              value={settings.nodeSize}
              onChange={(e) => setSettings(prev => ({ ...prev, nodeSize: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>
          
          {/* 颜色方案 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              颜色方案
            </label>
            <select
              value={settings.colorScheme}
              onChange={(e) => setSettings(prev => ({ ...prev, colorScheme: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="default">默认</option>
              <option value="department">按部门</option>
              <option value="role">按角色</option>
              <option value="status">按状态</option>
            </select>
          </div>
          
          {/* 显示选项 */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.showDetails}
                onChange={(e) => setSettings(prev => ({ ...prev, showDetails: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">显示详细信息</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.showConnections}
                onChange={(e) => setSettings(prev => ({ ...prev, showConnections: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">显示连接线</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.showLabels}
                onChange={(e) => setSettings(prev => ({ ...prev, showLabels: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">显示标签</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.showIcons}
                onChange={(e) => setSettings(prev => ({ ...prev, showIcons: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">显示图标</span>
            </label>
          </div>
          
          {/* 间距设置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              节点间距: {settings.nodeSpacing}px
            </label>
            <input
              type="range"
              min={50}
              max={300}
              value={settings.nodeSpacing}
              onChange={(e) => setSettings(prev => ({ ...prev, nodeSpacing: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              层级间距: {settings.levelSpacing}px
            </label>
            <input
              type="range"
              min={100}
              max={400}
              value={settings.levelSpacing}
              onChange={(e) => setSettings(prev => ({ ...prev, levelSpacing: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  };

  // 渲染导出对话框
  const renderExportDialog = () => {
    if (!showExportDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">导出图表</h2>
            <button
              onClick={() => setShowExportDialog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出格式
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="png">PNG 图片</option>
                <option value="svg">SVG 矢量图</option>
                <option value="pdf">PDF 文档</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                图片质量
              </label>
              <select
                value={exportOptions.quality}
                onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={exportOptions.format === 'svg'}
              >
                <option value="low">低质量</option>
                <option value="medium">中等质量</option>
                <option value="high">高质量</option>
              </select>
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={exportOptions.includeBackground}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeBackground: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">包含背景</span>
            </label>
          </div>
          
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={() => setShowExportDialog(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
            <button
              onClick={exportChart}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              导出
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染节点详情
  const renderNodeDetails = () => {
    if (!selectedNode) return null;
    
    const data = selectedNode.data;
    const isDepartment = selectedNode.type === 'department';
    
    return (
      <div className="absolute top-16 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {isDepartment ? '部门详情' : '员工详情'}
          </h3>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {isDepartment ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-500">部门名称</label>
                <p className="text-gray-900">{(data as Department).name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">部门代码</label>
                <p className="text-gray-900">{(data as Department).code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">员工数量</label>
                <p className="text-gray-900">{(data as Department).employee_count} 人</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">部门层级</label>
                <p className="text-gray-900">第 {(data as Department).level + 1} 级</p>
              </div>
              {(data as Department).manager && (
                <div>
                  <label className="text-sm font-medium text-gray-500">部门经理</label>
                  <p className="text-gray-900">{(data as Department).manager!.full_name}</p>
                </div>
              )}
              {(data as Department).description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">部门描述</label>
                  <p className="text-gray-900">{(data as Department).description}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-500">姓名</label>
                <p className="text-gray-900">{(data as User).full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">用户名</label>
                <p className="text-gray-900">{(data as User).username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">邮箱</label>
                <p className="text-gray-900">{(data as User).email}</p>
              </div>
              {(data as User).position && (
                <div>
                  <label className="text-sm font-medium text-gray-500">职位</label>
                  <p className="text-gray-900">{(data as User).position}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">角色</label>
                <p className="text-gray-900">
                  {(data as User).role === 'admin' ? '管理员' : 
                   (data as User).role === 'manager' ? '经理' : '员工'}
                </p>
              </div>
              {(data as User).department && (
                <div>
                  <label className="text-sm font-medium text-gray-500">所属部门</label>
                  <p className="text-gray-900">{(data as User).department!.name}</p>
                </div>
              )}
            </>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-500">状态</label>
            <span className={`inline-block px-2 py-1 rounded text-xs ${
              data.status === 'active' ? 'text-green-600 bg-green-100' :
              data.status === 'inactive' ? 'text-gray-600 bg-gray-100' :
              'text-yellow-600 bg-yellow-100'
            }`}>
              {data.status === 'active' ? '活跃' : 
               data.status === 'inactive' ? '非活跃' : '待定'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDepartments(),
        fetchUsers()
      ]);
      setLoading(false);
    };
    
    initializeData();
  }, [fetchDepartments, fetchUsers]);

  // 构建图表节点
  useEffect(() => {
    if (departments.length > 0 || users.length > 0) {
      buildChartNodes();
    }
  }, [buildChartNodes]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载组织图表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`h-full flex flex-col bg-gray-50 relative ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 工具栏 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">组织图表</h2>
            <p className="text-sm text-gray-500 mt-1">
              可视化展示组织架构和部门关系
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 搜索 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索部门或员工..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            
            {/* 缩放控制 */}
            <div className="flex items-center space-x-1 border border-gray-300 rounded-lg">
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.1)}
                className="p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            {/* 重置视图 */}
            <button
              onClick={resetView}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="重置视图"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            {/* 设置 */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            {/* 导出 */}
            <button
              onClick={() => setShowExportDialog(true)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="导出"
            >
              <Download className="w-4 h-4" />
            </button>
            
            {/* 全屏 */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            {/* 刷新 */}
            <button
              onClick={() => {
                fetchDepartments();
                fetchUsers();
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* 图表区域 */}
      <div 
        ref={chartRef}
        className="flex-1 overflow-hidden relative cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {chartNodes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <TreePine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无组织数据</h3>
              <p className="text-gray-500">请先创建部门和添加员工</p>
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="w-full h-full"
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* 连接线 */}
              {renderConnections()}
              
              {/* 节点 */}
              {chartNodes
                .filter(node => {
                  if (!searchTerm) return true;
                  const data = node.data;
                  const searchLower = searchTerm.toLowerCase();
                  
                  if (node.type === 'department') {
                    const dept = data as Department;
                    return dept.name.toLowerCase().includes(searchLower) ||
                           dept.code.toLowerCase().includes(searchLower);
                  } else {
                    const user = data as User;
                    return user.full_name.toLowerCase().includes(searchLower) ||
                           user.username.toLowerCase().includes(searchLower) ||
                           user.email.toLowerCase().includes(searchLower);
                  }
                })
                .map(renderNode)
              }
            </g>
          </svg>
        )}
      </div>
      
      {/* 设置面板 */}
      {renderSettings()}
      
      {/* 节点详情 */}
      {renderNodeDetails()}
      
      {/* 导出对话框 */}
      {renderExportDialog()}
    </div>
  );
};

export default OrganizationChart;