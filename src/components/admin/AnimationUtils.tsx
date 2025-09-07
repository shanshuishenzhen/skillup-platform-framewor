import * as d3 from 'd3';
import { DepartmentNode } from './EnhancedOrgChart';

/**
 * 动画配置接口
 */
interface AnimationConfig {
  /** 动画持续时间（毫秒） */
  duration: number;
  /** 缓动函数 */
  easing: d3.EasingFunction;
  /** 延迟时间（毫秒） */
  delay?: number;
}

/**
 * 节点动画状态
 */
interface NodeAnimationState {
  /** 节点ID */
  id: string;
  /** 起始位置 */
  startPosition: { x: number; y: number };
  /** 目标位置 */
  targetPosition: { x: number; y: number };
  /** 起始大小 */
  startSize: number;
  /** 目标大小 */
  targetSize: number;
  /** 起始透明度 */
  startOpacity: number;
  /** 目标透明度 */
  targetOpacity: number;
}

/**
 * 连线动画状态
 */
interface LinkAnimationState {
  /** 连线ID */
  id: string;
  /** 起始路径 */
  startPath: string;
  /** 目标路径 */
  targetPath: string;
  /** 起始透明度 */
  startOpacity: number;
  /** 目标透明度 */
  targetOpacity: number;
}

/**
 * 动画管理器类
 * 负责管理组织架构图表的各种动画效果
 */
export class AnimationManager {
  private svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private defaultConfig: AnimationConfig;
  private activeAnimations: Set<string> = new Set();

  /**
   * 构造函数
   * @param svgElement - SVG元素
   * @param config - 默认动画配置
   */
  constructor(
    svgElement: SVGSVGElement,
    config: Partial<AnimationConfig> = {}
  ) {
    this.svgSelection = d3.select(svgElement);
    this.defaultConfig = {
      duration: 750,
      easing: d3.easeCubicInOut,
      delay: 0,
      ...config
    };
  }

  /**
   * 节点进入动画
   * 新节点从小到大、从透明到不透明的动画效果
   * 
   * @param nodes - 节点选择器
   * @param config - 动画配置
   */
  animateNodeEnter(
    nodes: d3.Selection<SVGGElement, DepartmentNode, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, ...config };
    const animationId = `node-enter-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      nodes
        .style('opacity', 0)
        .attr('transform', (d: any) => `translate(${d.x},${d.y}) scale(0)`)
        .transition()
        .duration(animConfig.duration)
        .delay(animConfig.delay || 0)
        .ease(animConfig.easing)
        .style('opacity', 1)
        .attr('transform', (d: any) => `translate(${d.x},${d.y}) scale(1)`)
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
    });
  }

  /**
   * 节点退出动画
   * 节点从大到小、从不透明到透明的动画效果
   * 
   * @param nodes - 节点选择器
   * @param config - 动画配置
   */
  animateNodeExit(
    nodes: d3.Selection<SVGGElement, DepartmentNode, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, ...config };
    const animationId = `node-exit-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      nodes
        .transition()
        .duration(animConfig.duration)
        .delay(animConfig.delay || 0)
        .ease(animConfig.easing)
        .style('opacity', 0)
        .attr('transform', (d: any) => `translate(${d.x},${d.y}) scale(0)`)
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        })
        .remove();
    });
  }

  /**
   * 节点更新动画
   * 节点位置和大小的平滑过渡
   * 
   * @param nodes - 节点选择器
   * @param config - 动画配置
   */
  animateNodeUpdate(
    nodes: d3.Selection<SVGGElement, DepartmentNode, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, ...config };
    const animationId = `node-update-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      nodes
        .transition()
        .duration(animConfig.duration)
        .delay(animConfig.delay || 0)
        .ease(animConfig.easing)
        .attr('transform', (d: any) => `translate(${d.x},${d.y}) scale(1)`)
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
    });
  }

  /**
   * 连线进入动画
   * 连线从起点到终点的绘制动画
   * 
   * @param links - 连线选择器
   * @param config - 动画配置
   */
  animateLinkEnter(
    links: d3.Selection<SVGPathElement, any, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, ...config };
    const animationId = `link-enter-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      links
        .style('opacity', 0)
        .style('stroke-dasharray', function() {
          const length = (this as SVGPathElement).getTotalLength();
          return `${length} ${length}`;
        })
        .style('stroke-dashoffset', function() {
          return (this as SVGPathElement).getTotalLength();
        })
        .transition()
        .duration(animConfig.duration)
        .delay(animConfig.delay || 0)
        .ease(animConfig.easing)
        .style('opacity', 1)
        .style('stroke-dashoffset', 0)
        .on('end', function() {
          d3.select(this).style('stroke-dasharray', 'none');
        })
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
    });
  }

  /**
   * 连线退出动画
   * 连线从终点到起点的消失动画
   * 
   * @param links - 连线选择器
   * @param config - 动画配置
   */
  animateLinkExit(
    links: d3.Selection<SVGPathElement, any, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, ...config };
    const animationId = `link-exit-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      links
        .style('stroke-dasharray', function() {
          const length = (this as SVGPathElement).getTotalLength();
          return `${length} ${length}`;
        })
        .style('stroke-dashoffset', 0)
        .transition()
        .duration(animConfig.duration)
        .delay(animConfig.delay || 0)
        .ease(animConfig.easing)
        .style('opacity', 0)
        .style('stroke-dashoffset', function() {
          return (this as SVGPathElement).getTotalLength();
        })
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        })
        .remove();
    });
  }

  /**
   * 连线更新动画
   * 连线路径的平滑过渡
   * 
   * @param links - 连线选择器
   * @param config - 动画配置
   */
  animateLinkUpdate(
    links: d3.Selection<SVGPathElement, any, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, ...config };
    const animationId = `link-update-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      links
        .transition()
        .duration(animConfig.duration)
        .delay(animConfig.delay || 0)
        .ease(animConfig.easing)
        .attr('d', (d: any) => d.path)
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
    });
  }

  /**
   * 高亮动画
   * 节点的脉冲高亮效果
   * 
   * @param nodes - 节点选择器
   * @param config - 动画配置
   */
  animateHighlight(
    nodes: d3.Selection<SVGGElement, DepartmentNode, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, duration: 300, ...config };
    const animationId = `highlight-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      nodes
        .select('rect, circle')
        .transition()
        .duration(animConfig.duration / 2)
        .ease(d3.easeQuadOut)
        .attr('transform', 'scale(1.1)')
        .style('filter', 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3))')
        .transition()
        .duration(animConfig.duration / 2)
        .ease(d3.easeQuadIn)
        .attr('transform', 'scale(1)')
        .style('filter', 'none')
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
    });
  }

  /**
   * 搜索结果动画
   * 搜索到的节点的闪烁效果
   * 
   * @param nodes - 节点选择器
   * @param config - 动画配置
   */
  animateSearchResult(
    nodes: d3.Selection<SVGGElement, DepartmentNode, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, duration: 1000, ...config };
    const animationId = `search-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      const pulseCount = 3;
      let currentPulse = 0;

      const pulse = () => {
        nodes
          .select('rect, circle')
          .transition()
          .duration(animConfig.duration / (pulseCount * 2))
          .ease(d3.easeQuadOut)
          .style('stroke', '#f59e0b')
          .style('stroke-width', '3px')
          .transition()
          .duration(animConfig.duration / (pulseCount * 2))
          .ease(d3.easeQuadIn)
          .style('stroke', '#e5e7eb')
          .style('stroke-width', '1px')
          .on('end', () => {
            currentPulse++;
            if (currentPulse < pulseCount) {
              pulse();
            } else {
              this.activeAnimations.delete(animationId);
              resolve();
            }
          });
      };

      pulse();
    });
  }

  /**
   * 视图模式切换动画
   * 整个图表的重新布局动画
   * 
   * @param nodes - 节点选择器
   * @param links - 连线选择器
   * @param config - 动画配置
   */
  animateViewModeChange(
    nodes: d3.Selection<SVGGElement, DepartmentNode, SVGGElement, unknown>,
    links: d3.Selection<SVGPathElement, any, SVGGElement, unknown>,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, duration: 1000, ...config };
    const animationId = `view-mode-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      // 先淡出所有元素
      const fadeOut = Promise.all([
        new Promise<void>((fadeResolve) => {
          nodes
            .transition()
            .duration(animConfig.duration / 3)
            .ease(d3.easeQuadIn)
            .style('opacity', 0.3)
            .on('end', () => fadeResolve());
        }),
        new Promise<void>((fadeResolve) => {
          links
            .transition()
            .duration(animConfig.duration / 3)
            .ease(d3.easeQuadIn)
            .style('opacity', 0.3)
            .on('end', () => fadeResolve());
        })
      ]);

      fadeOut.then(() => {
        // 重新布局并淡入
        Promise.all([
          new Promise<void>((fadeInResolve) => {
            nodes
              .transition()
              .duration((animConfig.duration * 2) / 3)
              .ease(d3.easeQuadOut)
              .attr('transform', (d: any) => `translate(${d.x},${d.y}) scale(1)`)
              .style('opacity', 1)
              .on('end', () => fadeInResolve());
          }),
          new Promise<void>((fadeInResolve) => {
            links
              .transition()
              .duration((animConfig.duration * 2) / 3)
              .ease(d3.easeQuadOut)
              .attr('d', (d: any) => d.path)
              .style('opacity', 1)
              .on('end', () => fadeInResolve());
          })
        ]).then(() => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
      });
    });
  }

  /**
   * 缩放动画
   * 平滑的缩放过渡效果
   * 
   * @param zoomSelection - 缩放选择器
   * @param transform - 目标变换
   * @param config - 动画配置
   */
  animateZoom(
    zoomSelection: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    transform: d3.ZoomTransform,
    config: Partial<AnimationConfig> = {}
  ): Promise<void> {
    const animConfig = { ...this.defaultConfig, duration: 500, ...config };
    const animationId = `zoom-${Date.now()}`;
    this.activeAnimations.add(animationId);

    return new Promise((resolve) => {
      zoomSelection
        .transition()
        .duration(animConfig.duration)
        .ease(animConfig.easing)
        .call(
          d3.zoom<SVGSVGElement, unknown>().transform as any,
          transform
        )
        .on('end', () => {
          this.activeAnimations.delete(animationId);
          resolve();
        });
    });
  }

  /**
   * 停止所有动画
   */
  stopAllAnimations(): void {
    this.svgSelection.selectAll('*').interrupt();
    this.activeAnimations.clear();
  }

  /**
   * 检查是否有活跃的动画
   */
  hasActiveAnimations(): boolean {
    return this.activeAnimations.size > 0;
  }

  /**
   * 获取活跃动画数量
   */
  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * 更新默认配置
   */
  updateDefaultConfig(config: Partial<AnimationConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

/**
 * 预定义的动画配置
 */
export const ANIMATION_PRESETS = {
  /** 快速动画 */
  fast: {
    duration: 300,
    easing: d3.easeQuadOut
  },
  /** 标准动画 */
  normal: {
    duration: 750,
    easing: d3.easeCubicInOut
  },
  /** 慢速动画 */
  slow: {
    duration: 1200,
    easing: d3.easeQuadInOut
  },
  /** 弹性动画 */
  elastic: {
    duration: 1000,
    easing: d3.easeElasticOut
  },
  /** 反弹动画 */
  bounce: {
    duration: 800,
    easing: d3.easeBounceOut
  }
} as const;

export default AnimationManager;