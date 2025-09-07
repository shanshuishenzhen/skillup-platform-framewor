'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
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
  X,
  Filter,
  RefreshCw,
  Printer,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import NodeDetailPanel from './NodeDetailPanel';
import { ExportButtons, ChartExporter } from './ExportUtils';
import PrintPreview from './PrintPreview';
import { AnimationManager, ANIMATION_PRESETS } from './AnimationUtils';

// 部门节点数据接口
interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  level: number;
  path: string;
  manager_name?: string;
  member_count: number;
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
  chargeStrength: number;
  centerForce: number;
  collisionRadius: number;
}

// 搜索结果接口
interface SearchResult {
  node: DepartmentNode;
  score: number;
  matchType: 'name' | 'code' | 'manager' | 'description';
}

// 组件属性接口
interface EnhancedOrgChartProps {
  departments: DepartmentNode[];
  onNodeClick?: (node: DepartmentNode) => void;
  onNodeEdit?: (node: DepartmentNode) => void;
  onNodeDelete?: (node: DepartmentNode) => void;
  onNodeAdd?: (parentNode: DepartmentNode) => void;
  className?: string;
  height?: number;
  width?: number;
}

/**
 * 增强的组织架构图表组件
 * 提供缩放、平移、搜索、多种视图模式等高级功能
 * 
 * @param props - 组件属性
 * @param props.departments - 部门数据数组
 * @param props.onNodeClick - 节点点击回调
 * @param props.onNodeEdit - 节点编辑回调
 * @param props.onNodeDelete - 节点删除回调
 * @param props.onNodeAdd - 添加子节点回调
 * @param props.className - CSS类名
 * @param props.height - 图表高度
 * @param props.width - 图表宽度
 * @returns 增强的组织架构图表组件
 */
const EnhancedOrgChart: React.FC<EnhancedOrgChartProps> = ({
  departments,
  onNodeClick,
  onNodeEdit,
  onNodeDelete,
  onNodeAdd,
  className = '',
  height = 600,
  width = 1000
}) => {
  // 引用和状态
  const svgRef = useRef<SVGSVGElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const animationManagerRef = useRef<AnimationManager | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState<'fast' | 'normal' | 'slow'>('normal');
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showMemberCount, setShowMemberCount] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNodeDetail, setShowNodeDetail] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    nodeSize: 60,
    linkDistance: 100,
    chargeStrength: -300,
    centerForce: 0.1,
    collisionRadius: 30
  });

  // D3相关引用
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const simulationRef = useRef<d3.Simulation<DepartmentNode, undefined>>();
  const nodesRef = useRef<DepartmentNode[]>([]);
  const linksRef = useRef<d3.HierarchyLink<DepartmentNode>[]>([]);

  /**
   * 搜索部门节点
   * @param term - 搜索关键词
   * @returns 搜索结果数组
   */
  const searchNodes = useCallback((term: string): SearchResult[] => {
    if (!term.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerm = term.toLowerCase();

    const searchInNodes = (nodes: DepartmentNode[]) => {
      nodes.forEach(node => {
        let score = 0;
        let matchType: SearchResult['matchType'] = 'name';

        // 名称匹配
        if (node.name.toLowerCase().includes(searchTerm)) {
          score += node.name.toLowerCase() === searchTerm ? 100 : 80;
          matchType = 'name';
        }

        // 编码匹配
        if (node.code.toLowerCase().includes(searchTerm)) {
          score += node.code.toLowerCase() === searchTerm ? 90 : 70;
          matchType = 'code';
        }

        // 负责人匹配
        if (node.manager_name?.toLowerCase().includes(searchTerm)) {
          score += 60;
          matchType = 'manager';
        }

        // 描述匹配
        if (node.description?.toLowerCase().includes(searchTerm)) {
          score += 40;
          matchType = 'description';
        }

        if (score > 0) {
          results.push({ node, score, matchType });
        }

        // 递归搜索子节点
        if (node.children) {
          searchInNodes(node.children);
        }
      });
    };

    searchInNodes(departments);
    return results.sort((a, b) => b.score - a.score);
  }, [departments]);

  /**
   * 处理搜索
   * @param term - 搜索关键词
   */
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    const results = searchNodes(term);
    setSearchResults(results);
    
    // 高亮搜索结果
    const highlightIds = new Set(results.map(r => r.node.id));
    setHighlightedNodes(highlightIds);
    
    // 更新可视化
    updateVisualization();
    
    // 为搜索结果添加动画效果
    if (animationEnabled && animationManagerRef.current && results.length > 0) {
      setTimeout(() => {
        const svg = d3.select(svgRef.current);
        const searchNodes = svg.selectAll('.node')
          .filter((d: any) => {
            const node = d.data || d;
            return highlightIds.has(node.id);
          });
        
        if (searchNodes.size() > 0) {
          animationManagerRef.current?.animateSearchResult(searchNodes as any);
        }
      }, 100);
    }
  }, [searchNodes, animationEnabled]);

  /**
   * 处理节点点击事件
   * @param nodeId - 节点ID
   */
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setShowNodeDetail(true);
  }, []);

  /**
   * 处理节点编辑
   * @param nodeId - 节点ID
   * @param data - 编辑数据
   */
  const handleNodeEdit = useCallback((nodeId: string, data: any) => {
    onNodeEdit?.(nodeId, data);
    // 更新可视化
    updateVisualization();
  }, [onNodeEdit]);

  /**
   * 处理节点删除
   * @param nodeId - 节点ID
   */
  const handleNodeDelete = useCallback((nodeId: string) => {
    onNodeDelete?.(nodeId);
    setShowNodeDetail(false);
    setSelectedNodeId(null);
  }, [onNodeDelete]);

  /**
   * 处理添加子节点
   * @param parentId - 父节点ID
   */
  const handleAddChild = useCallback((parentId: string) => {
    onAddChild?.(parentId);
    setShowNodeDetail(false);
  }, [onAddChild]);

  /**
   * 转换部门数据为层次结构
   * @param departments - 部门数据数组
   * @returns D3层次结构
   */
  const transformToHierarchy = useCallback((departments: DepartmentNode[]) => {
    // 创建根节点映射
    const nodeMap = new Map<string, DepartmentNode>();
    departments.forEach(dept => {
      nodeMap.set(dept.id, { ...dept, children: [] });
    });

    // 构建层次结构
    const roots: DepartmentNode[] = [];
    departments.forEach(dept => {
      const node = nodeMap.get(dept.id)!;
      if (dept.parent_id && nodeMap.has(dept.parent_id)) {
        const parent = nodeMap.get(dept.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // 如果有多个根节点，创建虚拟根节点
    if (roots.length > 1) {
      const virtualRoot: DepartmentNode = {
        id: 'virtual-root',
        name: '组织架构',
        code: 'ROOT',
        level: 0,
        path: '',
        member_count: 0,
        status: 'active',
        children: roots
      };
      return d3.hierarchy(virtualRoot);
    }

    return d3.hierarchy(roots[0] || {
      id: 'empty',
      name: '暂无数据',
      code: 'EMPTY',
      level: 0,
      path: '',
      member_count: 0,
      status: 'active'
    });
  }, []);

  /**
   * 创建树形布局
   * @param hierarchy - D3层次结构
   * @returns 布局后的节点和连接
   */
  const createTreeLayout = useCallback((hierarchy: d3.HierarchyNode<DepartmentNode>) => {
    const treeLayout = d3.tree<DepartmentNode>()
      .size([width - 100, height - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2));

    const root = treeLayout(hierarchy);
    const nodes = root.descendants();
    const links = root.links();

    return { nodes, links };
  }, [width, height]);

  /**
   * 创建径向布局
   * @param hierarchy - D3层次结构
   * @returns 布局后的节点和连接
   */
  const createRadialLayout = useCallback((hierarchy: d3.HierarchyNode<DepartmentNode>) => {
    const radius = Math.min(width, height) / 2 - 100;
    const radialLayout = d3.tree<DepartmentNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const root = radialLayout(hierarchy);
    const nodes = root.descendants().map(d => {
      const angle = d.x;
      const radius = d.y;
      return {
        ...d,
        x: radius * Math.cos(angle - Math.PI / 2),
        y: radius * Math.sin(angle - Math.PI / 2)
      };
    });
    const links = root.links();

    return { nodes, links };
  }, [width, height]);

  /**
   * 创建力导向布局
   * @param nodes - 节点数组
   * @returns 力导向仿真
   */
  const createForceLayout = useCallback((nodes: DepartmentNode[]) => {
    const links = nodes
      .filter(d => d.parent_id)
      .map(d => ({
        source: d.parent_id!,
        target: d.id
      }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(layoutConfig.linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(layoutConfig.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(layoutConfig.centerForce))
      .force('collision', d3.forceCollide().radius(layoutConfig.collisionRadius));

    return simulation;
  }, [layoutConfig, width, height]);

  /**
   * 渲染节点
   * @param svg - SVG选择器
   * @param nodes - 节点数组
   */
  const renderNodes = useCallback((svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, nodes: any[]) => {
    const nodeGroup = svg.select('.nodes');
    
    const nodeSelection = nodeGroup.selectAll('.node')
      .data(nodes, (d: any) => d.data?.id || d.id);

    // 移除旧节点
    nodeSelection.exit().remove();

    // 创建新节点组
    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // 添加节点圆圈
    nodeEnter.append('circle')
      .attr('r', layoutConfig.nodeSize / 2)
      .attr('fill', (d: any) => {
        const node = d.data || d;
        if (highlightedNodes.has(node.id)) return '#3b82f6';
        if (selectedNodes.has(node.id)) return '#10b981';
        return node.status === 'active' ? '#6b7280' : '#ef4444';
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // 添加节点标签
    if (showLabels) {
      nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text((d: any) => {
          const node = d.data || d;
          return node.name.length > 8 ? node.name.substring(0, 8) + '...' : node.name;
        });
    }

    // 添加成员数量标签
    if (showMemberCount) {
      nodeEnter.append('text')
        .attr('dy', layoutConfig.nodeSize / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6b7280')
        .attr('font-size', '10px')
        .text((d: any) => {
          const node = d.data || d;
          return `${node.member_count || 0}人`;
        });
    }

    // 合并新旧节点
    const nodeUpdate = nodeEnter.merge(nodeSelection as any);

    // 更新节点位置（使用动画）
    if (animationEnabled && animationManagerRef.current) {
      animationManagerRef.current.animateNodeUpdate(nodeUpdate as any);
    } else {
      nodeUpdate.attr('transform', (d: any) => `translate(${d.x || 0},${d.y || 0})`);
    }

    // 添加事件监听
    nodeUpdate
      .on('click', (event: MouseEvent, d: any) => {
        event.stopPropagation();
        const node = d.data || d;
        
        if (event.ctrlKey || event.metaKey) {
          // 多选模式
          const newSelected = new Set(selectedNodes);
          if (newSelected.has(node.id)) {
            newSelected.delete(node.id);
          } else {
            newSelected.add(node.id);
          }
          setSelectedNodes(newSelected);
        } else {
          // 单选模式
          setSelectedNodes(new Set([node.id]));
          handleNodeClick(node.id);
          onNodeClick?.(node);
        }
        
        updateVisualization();
      })
      .on('dblclick', (event: MouseEvent, d: any) => {
        event.stopPropagation();
        const node = d.data || d;
        onNodeEdit?.(node);
      })
      .on('contextmenu', (event: MouseEvent, d: any) => {
        event.preventDefault();
        const node = d.data || d;
        showContextMenu(event, node);
      });

    return nodeUpdate;
  }, [layoutConfig, highlightedNodes, selectedNodes, showLabels, showMemberCount, onNodeClick, onNodeEdit]);

  /**
   * 渲染连接线
   * @param svg - SVG选择器
   * @param links - 连接数组
   */
  const renderLinks = useCallback((svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, links: any[]) => {
    const linkGroup = svg.select('.links');
    
    const linkSelection = linkGroup.selectAll('.link')
      .data(links, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`);

    // 移除旧连接
    linkSelection.exit().remove();

    // 创建新连接
    const linkEnter = linkSelection.enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2);

    // 合并新旧连接
    const linkUpdate = linkEnter.merge(linkSelection as any);

    // 更新连接路径（使用动画）
    linkUpdate.each(function(d: any) {
      const source = d.source;
      const target = d.target;
      
      if (viewMode === 'tree' || viewMode === 'hierarchy') {
        d.path = `M${source.x},${source.y}C${source.x},${(source.y + target.y) / 2} ${target.x},${(source.y + target.y) / 2} ${target.x},${target.y}`;
      } else {
        d.path = `M${source.x},${source.y}L${target.x},${target.y}`;
      }
    });
    
    if (animationEnabled && animationManagerRef.current) {
      animationManagerRef.current.animateLinkUpdate(linkUpdate as any);
    } else {
      linkUpdate.attr('d', (d: any) => d.path);
    }

    return linkUpdate;
  }, [viewMode]);

  /**
   * 显示上下文菜单
   * @param event - 鼠标事件
   * @param node - 节点数据
   */
  const showContextMenu = useCallback((event: MouseEvent, node: DepartmentNode) => {
    // 这里可以实现上下文菜单逻辑
    console.log('Context menu for node:', node);
  }, []);

  /**
   * 更新可视化
   */
  const updateVisualization = useCallback(() => {
    if (!svgRef.current || departments.length === 0) return;

    const svg = d3.select(svgRef.current);
    
    // 获取现有的节点和连线用于动画
    const existingNodes = svg.selectAll('.node');
    const existingLinks = svg.selectAll('.link');
    const hasExistingContent = existingNodes.size() > 0 || existingLinks.size() > 0;
    
    // 清除现有内容
    svg.selectAll('*').remove();
    
    // 创建组
    svg.append('g').attr('class', 'links');
    svg.append('g').attr('class', 'nodes');
    
    // 根据视图模式创建布局
    const hierarchy = transformToHierarchy(departments);
    
    if (viewMode === 'tree' || viewMode === 'hierarchy') {
      const { nodes, links } = createTreeLayout(hierarchy);
      renderLinks(svg, links);
      const nodeSelection = renderNodes(svg, nodes);
      
      // 如果启用动画且有现有内容，执行视图模式切换动画
      if (animationEnabled && animationManagerRef.current && hasExistingContent) {
        const linkSelection = svg.selectAll('.link');
        animationManagerRef.current.animateViewModeChange(
          nodeSelection as any,
          linkSelection as any
        );
      }
    } else if (viewMode === 'radial') {
      const { nodes, links } = createRadialLayout(hierarchy);
      renderLinks(svg, links);
      const nodeSelection = renderNodes(svg, nodes);
      
      // 如果启用动画且有现有内容，执行视图模式切换动画
      if (animationEnabled && animationManagerRef.current && hasExistingContent) {
        const linkSelection = svg.selectAll('.link');
        animationManagerRef.current.animateViewModeChange(
          nodeSelection as any,
          linkSelection as any
        );
      }
    } else if (viewMode === 'network') {
      const flatNodes = departments.map(d => ({ ...d }));
      const simulation = createForceLayout(flatNodes);
      
      simulation.on('tick', () => {
        const links = simulation.force('link')?.links() || [];
        renderLinks(svg, links);
        renderNodes(svg, flatNodes);
      });
      
      simulationRef.current = simulation;
    }
  }, [departments, viewMode, transformToHierarchy, createTreeLayout, createRadialLayout, createForceLayout, renderLinks, renderNodes, animationEnabled]);

  /**
   * 初始化缩放功能
   */
  const initializeZoom = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        svg.select('g').attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
  }, []);

  /**
   * 缩放控制
   * @param direction - 缩放方向
   */
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;

    if (direction === 'reset') {
      if (animationEnabled && animationManagerRef.current) {
        animationManagerRef.current.animateZoom(
          svg,
          d3.zoomIdentity,
          { duration: 750 }
        );
      } else {
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity
        );
      }
    } else {
      const scaleFactor = direction === 'in' ? 1.5 : 1 / 1.5;
      if (animationEnabled) {
        svg.transition().duration(300).call(
          zoom.scaleBy,
          scaleFactor
        );
      } else {
        svg.call(zoom.scaleBy, scaleFactor);
      }
    }
  }, [animationEnabled]);



  // 初始化动画管理器
  useEffect(() => {
    if (svgRef.current && !animationManagerRef.current) {
      animationManagerRef.current = new AnimationManager(
        svgRef.current,
        ANIMATION_PRESETS[animationSpeed]
      );
    }
  }, [animationSpeed]);

  // 动画速度变化时更新动画管理器
  useEffect(() => {
    if (animationManagerRef.current) {
      const preset = ANIMATION_PRESETS[animationSpeed];
      animationManagerRef.current.setAnimationPreset(preset);
    }
  }, [animationSpeed]);

  // 初始化和更新效果
  useEffect(() => {
    initializeZoom();
    updateVisualization();
  }, [initializeZoom, updateVisualization]);

  // 清理效果
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={`enhanced-org-chart ${className}`} ref={containerRef}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        {/* 左侧控制 */}
        <div className="flex items-center space-x-4">
          {/* 视图模式切换 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">视图模式:</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="tree">树形图</option>
              <option value="hierarchy">层级图</option>
              <option value="network">网络图</option>
              <option value="radial">径向图</option>
            </select>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索部门..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="text-sm text-gray-600">
              找到 {searchResults.length} 个结果
            </div>
          )}
        </div>

        {/* 右侧控制 */}
        <div className="flex items-center space-x-2">
          {/* 缩放控制 */}
          <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
            <button
              onClick={() => handleZoom('in')}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('reset')}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="重置"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* 显示控制 */}
          <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`p-2 transition-colors ${
                showLabels ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="显示/隐藏标签"
            >
              {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowMemberCount(!showMemberCount)}
              className={`p-2 transition-colors ${
                showMemberCount ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="显示/隐藏成员数量"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>

          {/* 动画控制 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAnimationEnabled(!animationEnabled)}
              className={`p-2 border border-gray-300 rounded-md transition-colors ${
                animationEnabled ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="启用/禁用动画"
            >
              <Play className="w-4 h-4" />
            </button>
            {animationEnabled && (
              <select
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(e.target.value as 'fast' | 'normal' | 'slow')}
                className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="动画速度"
              >
                <option value="fast">快速</option>
                <option value="normal">标准</option>
                <option value="slow">慢速</option>
              </select>
            )}
          </div>

          {/* 导出控制 */}
          <ExportButtons
            elementRef={chartContainerRef}
            svgRef={svgRef}
            filename="org-chart"
            dropdown={true}
          />

          {/* 打印预览 */}
          <button
            onClick={() => setShowPrintPreview(true)}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            title="打印预览"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* 全屏控制 */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            title="全屏/退出全屏"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 图表容器 */}
      <div 
        ref={chartContainerRef}
        className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}
      >
        <svg
          ref={svgRef}
          width={isFullscreen ? '100vw' : width}
          height={isFullscreen ? '100vh' : height}
          className="border border-gray-200"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#94a3b8"
              />
            </marker>
          </defs>
          <g></g>
        </svg>

        {/* 加载指示器 */}
        {departments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-500">加载中...</p>
            </div>
          </div>
        )}
      </div>

      {/* 点击外部关闭设置菜单 */}
      {showSettings && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* 节点详细信息面板 */}
      {showNodeDetail && selectedNodeId && (
        <NodeDetailPanel
          nodeId={selectedNodeId}
          onClose={() => setShowNodeDetail(false)}
          onEdit={handleNodeEdit}
          onDelete={handleNodeDelete}
          onAddChild={handleAddChild}
        />
      )}

      {/* 打印预览 */}
      <PrintPreview
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        contentRef={chartContainerRef}
        title="组织架构图"
      />
    </div>
  );
};

export default EnhancedOrgChart;