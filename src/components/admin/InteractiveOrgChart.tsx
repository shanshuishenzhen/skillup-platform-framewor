'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Download,
  Settings,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Users,
  Building2,
  Edit,
  Plus,
  Trash2,
  Move,
  Info,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// 部门节点数据接口
interface DepartmentNode {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  user_count: number;
  manager_name?: string;
  description?: string;
  status: 'active' | 'inactive';
  children?: DepartmentNode[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// 视图模式类型
type ViewMode = 'tree' | 'hierarchy' | 'network' | 'radial';

// 布局配置
interface LayoutConfig {
  nodeSize: number;
  linkDistance: number;
  nodeSpacing: number;
  levelSpacing: number;
  showLabels: boolean;
  showUserCount: boolean;
  showConnections: boolean;
  animationDuration: number;
}

// 组件属性接口
interface InteractiveOrgChartProps {
  departments: DepartmentNode[];
  onNodeClick?: (node: DepartmentNode) => void;
  onNodeEdit?: (node: DepartmentNode) => void;
  onNodeDelete?: (node: DepartmentNode) => void;
  onNodeAdd?: (parentNode: DepartmentNode) => void;
  className?: string;
}

/**
 * 交互式组织架构图表组件
 * @component InteractiveOrgChart
 * @description 提供多种视图模式的交互式组织架构可视化，支持缩放、平移、搜索等功能
 * @param {InteractiveOrgChartProps} props - 组件属性
 * @returns {JSX.Element} 交互式组织架构图表组件
 */
export const InteractiveOrgChart: React.FC<InteractiveOrgChartProps> = ({
  departments,
  onNodeClick,
  onNodeEdit,
  onNodeDelete,
  onNodeAdd,
  className = ''
}) => {
  // 状态管理
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<DepartmentNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  
  // 布局配置状态
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    nodeSize: 60,
    linkDistance: 100,
    nodeSpacing: 120,
    levelSpacing: 150,
    showLabels: true,
    showUserCount: true,
    showConnections: true,
    animationDuration: 750
  });

  // DOM引用
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  // D3选择器引用
  const svgSelection = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const gSelection = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  /**
   * 构建层级数据结构
   * @function buildHierarchy
   * @param {DepartmentNode[]} data - 部门数据数组
   * @returns {DepartmentNode[]} 层级结构的部门数据
   */
  const buildHierarchy = useCallback((data: DepartmentNode[]): DepartmentNode[] => {
    const nodeMap = new Map<string, DepartmentNode>();
    const roots: DepartmentNode[] = [];

    // 创建节点映射
    data.forEach(dept => {
      nodeMap.set(dept.id, { ...dept, children: [] });
    });

    // 构建父子关系
    data.forEach(dept => {
      const node = nodeMap.get(dept.id)!;
      if (dept.parent_id && nodeMap.has(dept.parent_id)) {
        const parent = nodeMap.get(dept.parent_id)!;
        parent.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, []);

  /**
   * 搜索节点
   * @function searchNodes
   * @param {string} term - 搜索词
   * @returns {DepartmentNode[]} 匹配的节点数组
   */
  const searchNodes = useCallback((term: string): DepartmentNode[] => {
    if (!term.trim()) return [];
    
    const lowerTerm = term.toLowerCase();
    return departments.filter(dept => 
      dept.name.toLowerCase().includes(lowerTerm) ||
      dept.manager_name?.toLowerCase().includes(lowerTerm) ||
      dept.description?.toLowerCase().includes(lowerTerm)
    );
  }, [departments]);

  /**
   * 高亮搜索结果
   * @function highlightSearchResults
   * @param {string} term - 搜索词
   */
  const highlightSearchResults = useCallback((term: string) => {
    const matchedNodes = searchNodes(term);
    const nodeIds = new Set(matchedNodes.map(node => node.id));
    setHighlightedNodes(nodeIds);
    
    if (matchedNodes.length > 0) {
      // 缩放到第一个匹配的节点
      const firstMatch = matchedNodes[0];
      if (firstMatch.x !== undefined && firstMatch.y !== undefined && zoomRef.current && svgSelection.current) {
        const transform = d3.zoomIdentity
          .translate(400 - firstMatch.x, 300 - firstMatch.y)
          .scale(1.5);
        
        svgSelection.current
          .transition()
          .duration(layoutConfig.animationDuration)
          .call(zoomRef.current.transform, transform);
      }
    }
  }, [searchNodes, layoutConfig.animationDuration]);

  /**
   * 创建树形布局
   * @function createTreeLayout
   * @param {DepartmentNode[]} hierarchyData - 层级数据
   * @returns {d3.HierarchyPointNode<DepartmentNode>[]} D3层级节点数组
   */
  const createTreeLayout = useCallback((hierarchyData: DepartmentNode[]) => {
    const root = d3.hierarchy({ id: 'root', name: 'Root', level: 0, parent_id: null, user_count: 0, status: 'active' as const, children: hierarchyData });
    
    const treeLayout = d3.tree<DepartmentNode>()
      .size([800, 600])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2));
    
    const treeRoot = treeLayout(root);
    return treeRoot.descendants().slice(1); // 移除根节点
  }, []);

  /**
   * 创建力导向布局
   * @function createForceLayout
   * @param {DepartmentNode[]} nodes - 节点数组
   * @returns {d3.Simulation<DepartmentNode, undefined>} D3力导向仿真
   */
  const createForceLayout = useCallback((nodes: DepartmentNode[]) => {
    const links = nodes
      .filter(node => node.parent_id)
      .map(node => ({
        source: node.parent_id!,
        target: node.id
      }));

    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(layoutConfig.linkDistance))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(400, 300))
      .force('collision', d3.forceCollide().radius(layoutConfig.nodeSize / 2 + 10));
  }, [layoutConfig.linkDistance, layoutConfig.nodeSize]);

  /**
   * 创建径向布局
   * @function createRadialLayout
   * @param {DepartmentNode[]} hierarchyData - 层级数据
   * @returns {d3.HierarchyPointNode<DepartmentNode>[]} D3层级节点数组
   */
  const createRadialLayout = useCallback((hierarchyData: DepartmentNode[]) => {
    const root = d3.hierarchy({ id: 'root', name: 'Root', level: 0, parent_id: null, user_count: 0, status: 'active' as const, children: hierarchyData });
    
    const radialLayout = d3.tree<DepartmentNode>()
      .size([2 * Math.PI, 200])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
    
    const radialRoot = radialLayout(root);
    
    // 转换极坐标到笛卡尔坐标
    radialRoot.each((d: any) => {
      d.x = d.y * Math.cos(d.x - Math.PI / 2) + 400;
      d.y = d.y * Math.sin(d.x - Math.PI / 2) + 300;
    });
    
    return radialRoot.descendants().slice(1);
  }, []);

  /**
   * 渲染节点
   * @function renderNodes
   * @param {any[]} nodes - 节点数据
   */
  const renderNodes = useCallback((nodes: any[]) => {
    if (!gSelection.current) return;

    const nodeSelection = gSelection.current
      .selectAll('.node')
      .data(nodes, (d: any) => d.data?.id || d.id);

    // 移除旧节点
    nodeSelection.exit()
      .transition()
      .duration(layoutConfig.animationDuration)
      .style('opacity', 0)
      .remove();

    // 创建新节点组
    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .style('opacity', 0)
      .style('cursor', 'pointer');

    // 添加节点圆形
    nodeEnter.append('circle')
      .attr('r', layoutConfig.nodeSize / 2)
      .attr('fill', (d: any) => {
        const node = d.data || d;
        if (highlightedNodes.has(node.id)) return '#3B82F6';
        if (node.status === 'inactive') return '#9CA3AF';
        return '#10B981';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    // 添加节点图标
    nodeEnter.append('text')
      .attr('class', 'node-icon')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-family', 'Font Awesome 5 Free')
      .style('font-weight', '900')
      .style('font-size', '16px')
      .style('fill', '#fff')
      .text('🏢');

    // 添加节点标签
    if (layoutConfig.showLabels) {
      nodeEnter.append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', layoutConfig.nodeSize / 2 + 20)
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#374151')
        .text((d: any) => (d.data || d).name);
    }

    // 添加用户数量标签
    if (layoutConfig.showUserCount) {
      nodeEnter.append('text')
        .attr('class', 'user-count')
        .attr('text-anchor', 'middle')
        .attr('dy', layoutConfig.nodeSize / 2 + (layoutConfig.showLabels ? 35 : 20))
        .style('font-size', '10px')
        .style('fill', '#6B7280')
        .text((d: any) => `${(d.data || d).user_count} 人`);
    }

    // 合并新旧节点
    const nodeUpdate = nodeEnter.merge(nodeSelection as any);

    // 更新节点位置
    nodeUpdate
      .transition()
      .duration(layoutConfig.animationDuration)
      .style('opacity', 1)
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    // 添加节点交互事件
    nodeUpdate
      .on('click', (event: MouseEvent, d: any) => {
        event.stopPropagation();
        const node = d.data || d;
        setSelectedNode(node);
        onNodeClick?.(node);
      })
      .on('contextmenu', (event: MouseEvent, d: any) => {
        event.preventDefault();
        const node = d.data || d;
        // 显示上下文菜单
        showContextMenu(event, node);
      })
      .on('mouseover', (event: MouseEvent, d: any) => {
        // 显示工具提示
        showTooltip(event, d.data || d);
      })
      .on('mouseout', () => {
        hideTooltip();
      });

  }, [layoutConfig, highlightedNodes, onNodeClick]);

  /**
   * 渲染连接线
   * @function renderLinks
   * @param {any[]} links - 连接线数据
   */
  const renderLinks = useCallback((links: any[]) => {
    if (!gSelection.current || !layoutConfig.showConnections) return;

    const linkSelection = gSelection.current
      .selectAll('.link')
      .data(links, (d: any) => `${d.source.id}-${d.target.id}`);

    // 移除旧连接线
    linkSelection.exit()
      .transition()
      .duration(layoutConfig.animationDuration)
      .style('opacity', 0)
      .remove();

    // 创建新连接线
    const linkEnter = linkSelection.enter()
      .append('path')
      .attr('class', 'link')
      .style('fill', 'none')
      .style('stroke', '#D1D5DB')
      .style('stroke-width', 2)
      .style('opacity', 0);

    // 合并新旧连接线
    const linkUpdate = linkEnter.merge(linkSelection as any);

    // 更新连接线路径
    linkUpdate
      .transition()
      .duration(layoutConfig.animationDuration)
      .style('opacity', 1)
      .attr('d', (d: any) => {
        const source = d.source;
        const target = d.target;
        
        if (viewMode === 'tree' || viewMode === 'hierarchy') {
          // 直角连接线
          return `M${source.x},${source.y}L${source.x},${(source.y + target.y) / 2}L${target.x},${(source.y + target.y) / 2}L${target.x},${target.y}`;
        } else {
          // 直线连接
          return `M${source.x},${source.y}L${target.x},${target.y}`;
        }
      });

  }, [layoutConfig.showConnections, layoutConfig.animationDuration, viewMode]);

  /**
   * 显示上下文菜单
   * @function showContextMenu
   * @param {MouseEvent} event - 鼠标事件
   * @param {DepartmentNode} node - 节点数据
   */
  const showContextMenu = useCallback((event: MouseEvent, node: DepartmentNode) => {
    // 这里可以实现上下文菜单的显示逻辑
    console.log('Context menu for node:', node);
  }, []);

  /**
   * 显示工具提示
   * @function showTooltip
   * @param {MouseEvent} event - 鼠标事件
   * @param {DepartmentNode} node - 节点数据
   */
  const showTooltip = useCallback((event: MouseEvent, node: DepartmentNode) => {
    // 这里可以实现工具提示的显示逻辑
    console.log('Tooltip for node:', node);
  }, []);

  /**
   * 隐藏工具提示
   * @function hideTooltip
   */
  const hideTooltip = useCallback(() => {
    // 这里可以实现工具提示的隐藏逻辑
  }, []);

  /**
   * 更新图表
   * @function updateChart
   */
  const updateChart = useCallback(() => {
    if (!svgSelection.current || !gSelection.current || departments.length === 0) return;

    const hierarchyData = buildHierarchy(departments);
    let nodes: any[] = [];
    let links: any[] = [];

    switch (viewMode) {
      case 'tree':
      case 'hierarchy': {
        const treeNodes = createTreeLayout(hierarchyData);
        nodes = treeNodes;
        links = treeNodes.slice(1).map(d => ({
          source: d.parent,
          target: d
        }));
        break;
      }
      case 'radial': {
        const radialNodes = createRadialLayout(hierarchyData);
        nodes = radialNodes;
        links = radialNodes.slice(1).map(d => ({
          source: d.parent,
          target: d
        }));
        break;
      }
      case 'network': {
        nodes = departments.map(d => ({ ...d }));
        const simulation = createForceLayout(nodes);
        
        simulation.on('tick', () => {
          renderNodes(nodes);
          renderLinks(links);
        });
        
        links = departments
          .filter(node => node.parent_id)
          .map(node => {
            const source = nodes.find(n => n.id === node.parent_id);
            const target = nodes.find(n => n.id === node.id);
            return { source, target };
          })
          .filter(link => link.source && link.target);
        
        return; // 力导向布局会自动更新
      }
    }

    renderLinks(links);
    renderNodes(nodes);
  }, [departments, viewMode, buildHierarchy, createTreeLayout, createRadialLayout, createForceLayout, renderNodes, renderLinks]);

  /**
   * 缩放控制
   * @function handleZoom
   * @param {number} scaleFactor - 缩放因子
   */
  const handleZoom = useCallback((scaleFactor: number) => {
    if (!zoomRef.current || !svgSelection.current) return;
    
    svgSelection.current
      .transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, scaleFactor);
  }, []);

  /**
   * 重置视图
   * @function resetView
   */
  const resetView = useCallback(() => {
    if (!zoomRef.current || !svgSelection.current) return;
    
    svgSelection.current
      .transition()
      .duration(layoutConfig.animationDuration)
      .call(zoomRef.current.transform, d3.zoomIdentity);
    
    setHighlightedNodes(new Set());
    setSelectedNode(null);
  }, [layoutConfig.animationDuration]);

  /**
   * 导出图表
   * @function exportChart
   * @param {string} format - 导出格式
   */
  const exportChart = useCallback((format: 'png' | 'svg' | 'pdf') => {
    if (!svgRef.current) return;

    try {
      const svgElement = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      
      if (format === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `org-chart-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'png') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          canvas.toBlob(blob => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `org-chart-${Date.now()}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
      
      toast.success(`图表已导出为 ${format.toUpperCase()} 格式`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  }, []);

  // 初始化SVG和缩放
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svgSelection.current = svg;

    // 清除之前的内容
    svg.selectAll('*').remove();

    // 创建主要的g元素
    const g = svg.append('g');
    gSelection.current = g;

    // 设置缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // 添加背景点击事件
    svg.on('click', () => {
      setSelectedNode(null);
    });

  }, []);

  // 更新图表
  useEffect(() => {
    updateChart();
  }, [updateChart]);

  // 搜索处理
  useEffect(() => {
    if (searchTerm) {
      highlightSearchResults(searchTerm);
    } else {
      setHighlightedNodes(new Set());
    }
  }, [searchTerm, highlightSearchResults]);

  return (
    <div className={`relative bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} ref={containerRef}>
      {/* 工具栏 */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
        {/* 视图模式选择 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex space-x-1">
            {[
              { key: 'tree', label: '树形图', icon: '🌳' },
              { key: 'hierarchy', label: '层级图', icon: '📊' },
              { key: 'network', label: '网络图', icon: '🕸️' },
              { key: 'radial', label: '径向图', icon: '🎯' }
            ].map(mode => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key as ViewMode)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  viewMode === mode.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={mode.label}
              >
                <span className="mr-1">{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索部门..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 px-2 py-1 text-sm border-none outline-none"
            />
          </div>
        </div>
      </div>

      {/* 右侧工具栏 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        {/* 缩放控制 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => handleZoom(1.5)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="放大"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleZoom(0.75)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="缩小"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={resetView}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="重置视图"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 功能按钮 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏显示'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="设置"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => exportChart('png')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="导出图片"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">显示设置</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">显示标签</label>
              <button
                onClick={() => setLayoutConfig(prev => ({ ...prev, showLabels: !prev.showLabels }))}
                className={`p-1 rounded-md transition-colors ${
                  layoutConfig.showLabels ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {layoutConfig.showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">显示用户数</label>
              <button
                onClick={() => setLayoutConfig(prev => ({ ...prev, showUserCount: !prev.showUserCount }))}
                className={`p-1 rounded-md transition-colors ${
                  layoutConfig.showUserCount ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {layoutConfig.showUserCount ? <Users className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">显示连接线</label>
              <button
                onClick={() => setLayoutConfig(prev => ({ ...prev, showConnections: !prev.showConnections }))}
                className={`p-1 rounded-md transition-colors ${
                  layoutConfig.showConnections ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {layoutConfig.showConnections ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            
            <div>
              <label className="text-sm text-gray-600 block mb-1">节点大小</label>
              <input
                type="range"
                min="40"
                max="100"
                value={layoutConfig.nodeSize}
                onChange={(e) => setLayoutConfig(prev => ({ ...prev, nodeSize: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600 block mb-1">动画速度</label>
              <input
                type="range"
                min="200"
                max="2000"
                value={layoutConfig.animationDuration}
                onChange={(e) => setLayoutConfig(prev => ({ ...prev, animationDuration: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* 节点信息面板 */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">部门信息</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">部门名称</span>
              <p className="text-sm font-medium text-gray-900">{selectedNode.name}</p>
            </div>
            
            <div>
              <span className="text-xs text-gray-500">层级</span>
              <p className="text-sm text-gray-700">第 {selectedNode.level} 级</p>
            </div>
            
            <div>
              <span className="text-xs text-gray-500">用户数量</span>
              <p className="text-sm text-gray-700">{selectedNode.user_count} 人</p>
            </div>
            
            {selectedNode.manager_name && (
              <div>
                <span className="text-xs text-gray-500">负责人</span>
                <p className="text-sm text-gray-700">{selectedNode.manager_name}</p>
              </div>
            )}
            
            {selectedNode.description && (
              <div>
                <span className="text-xs text-gray-500">描述</span>
                <p className="text-sm text-gray-700">{selectedNode.description}</p>
              </div>
            )}
            
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => onNodeEdit?.(selectedNode)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => onNodeAdd?.(selectedNode)}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
              >
                添加子部门
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SVG画布 */}
      <svg
        ref={svgRef}
        className={`w-full ${isFullscreen ? 'h-screen' : 'h-96'} bg-gray-50`}
        style={{ minHeight: '600px' }}
      />
    </div>
  );
};

export default InteractiveOrgChart;