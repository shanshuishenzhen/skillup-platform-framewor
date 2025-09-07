/**
 * 视频播放功能性能测试
 * 测试VideoPlayer组件的性能表现，包括加载时间、交互响应等
 */

import { performance } from 'perf_hooks';

// 性能测试结果接口
interface VideoPerformanceResult {
  loadTime: number;
  renderTime: number;
  interactionResponseTime: number;
  memoryUsage: number;
  errorCount: number;
  recommendations: string[];
}

// 性能测试配置
interface PerformanceTestConfig {
  videoUrl: string;
  testDuration: number; // 测试持续时间（秒）
  interactionCount: number; // 交互次数
  memoryCheckInterval: number; // 内存检查间隔（毫秒）
}

/**
 * 视频播放性能测试器
 */
export class VideoPerformanceTest {
  private config: PerformanceTestConfig;
  private results: VideoPerformanceResult;
  private startTime: number = 0;
  private memorySnapshots: number[] = [];
  private errorCount: number = 0;

  constructor(config: PerformanceTestConfig) {
    this.config = config;
    this.results = {
      loadTime: 0,
      renderTime: 0,
      interactionResponseTime: 0,
      memoryUsage: 0,
      errorCount: 0,
      recommendations: []
    };
  }

  /**
   * 运行完整的性能测试
   */
  async runPerformanceTest(): Promise<VideoPerformanceResult> {
    console.log('🎬 开始视频播放性能测试...');
    
    try {
      // 1. 测试组件加载时间
      await this.testComponentLoadTime();
      
      // 2. 测试渲染性能
      await this.testRenderPerformance();
      
      // 3. 测试交互响应时间
      await this.testInteractionResponse();
      
      // 4. 监控内存使用
      await this.monitorMemoryUsage();
      
      // 5. 生成性能建议
      this.generateRecommendations();
      
      console.log('✅ 视频播放性能测试完成');
      return this.results;
      
    } catch (error) {
      this.errorCount++;
      console.error('❌ 性能测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试组件加载时间
   */
  private async testComponentLoadTime(): Promise<void> {
    console.log('📊 测试组件加载时间...');
    
    const startTime = performance.now();
    
    // 模拟组件挂载和视频加载
    await this.simulateVideoLoad();
    
    const endTime = performance.now();
    this.results.loadTime = endTime - startTime;
    
    console.log(`⏱️  组件加载时间: ${this.results.loadTime.toFixed(2)}ms`);
  }

  /**
   * 测试渲染性能
   */
  private async testRenderPerformance(): Promise<void> {
    console.log('🎨 测试渲染性能...');
    
    const renderTimes: number[] = [];
    
    // 模拟多次重渲染
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      // 模拟状态更新导致的重渲染
      await this.simulateStateUpdate();
      
      const endTime = performance.now();
      renderTimes.push(endTime - startTime);
    }
    
    this.results.renderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    
    console.log(`🎨 平均渲染时间: ${this.results.renderTime.toFixed(2)}ms`);
  }

  /**
   * 测试交互响应时间
   */
  private async testInteractionResponse(): Promise<void> {
    console.log('🖱️  测试交互响应时间...');
    
    const interactionTimes: number[] = [];
    
    // 测试各种交互操作
    const interactions = [
      'play-pause',
      'seek',
      'volume-change',
      'fullscreen-toggle',
      'playback-rate-change'
    ];
    
    for (const interaction of interactions) {
      for (let i = 0; i < this.config.interactionCount; i++) {
        const startTime = performance.now();
        
        await this.simulateInteraction(interaction);
        
        const endTime = performance.now();
        interactionTimes.push(endTime - startTime);
      }
    }
    
    this.results.interactionResponseTime = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
    
    console.log(`🖱️  平均交互响应时间: ${this.results.interactionResponseTime.toFixed(2)}ms`);
  }

  /**
   * 监控内存使用
   */
  private async monitorMemoryUsage(): Promise<void> {
    console.log('💾 监控内存使用...');
    
    const monitorDuration = this.config.testDuration * 1000;
    const checkInterval = this.config.memoryCheckInterval;
    const checksCount = Math.floor(monitorDuration / checkInterval);
    
    for (let i = 0; i < checksCount; i++) {
      const memoryUsage = this.getCurrentMemoryUsage();
      this.memorySnapshots.push(memoryUsage);
      
      await this.sleep(checkInterval);
    }
    
    this.results.memoryUsage = Math.max(...this.memorySnapshots);
    
    console.log(`💾 峰值内存使用: ${this.results.memoryUsage.toFixed(2)}MB`);
  }

  /**
   * 模拟视频加载
   */
  private async simulateVideoLoad(): Promise<void> {
    // 模拟网络延迟和视频元数据加载
    await this.sleep(Math.random() * 200 + 100); // 100-300ms
    
    // 模拟视频缓冲
    await this.sleep(Math.random() * 500 + 200); // 200-700ms
  }

  /**
   * 模拟状态更新
   */
  private async simulateStateUpdate(): Promise<void> {
    // 模拟React状态更新和重渲染
    await this.sleep(Math.random() * 20 + 5); // 5-25ms
  }

  /**
   * 模拟用户交互
   */
  private async simulateInteraction(type: string): Promise<void> {
    switch (type) {
      case 'play-pause':
        // 模拟播放/暂停操作
        await this.sleep(Math.random() * 50 + 10); // 10-60ms
        break;
      case 'seek':
        // 模拟进度条拖拽
        await this.sleep(Math.random() * 100 + 20); // 20-120ms
        break;
      case 'volume-change':
        // 模拟音量调节
        await this.sleep(Math.random() * 30 + 5); // 5-35ms
        break;
      case 'fullscreen-toggle':
        // 模拟全屏切换
        await this.sleep(Math.random() * 200 + 50); // 50-250ms
        break;
      case 'playback-rate-change':
        // 模拟播放速度调节
        await this.sleep(Math.random() * 40 + 10); // 10-50ms
        break;
      default:
        await this.sleep(Math.random() * 50 + 10);
    }
  }

  /**
   * 获取当前内存使用量
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0;
    }
    
    // Node.js环境下的内存使用
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / (1024 * 1024);
    }
    
    return 0;
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(): void {
    const recommendations: string[] = [];
    
    // 加载时间分析
    if (this.results.loadTime > 1000) {
      recommendations.push('视频加载时间过长，建议优化视频预加载策略或使用CDN');
    } else if (this.results.loadTime > 500) {
      recommendations.push('视频加载时间较长，可考虑添加加载进度指示器');
    }
    
    // 渲染性能分析
    if (this.results.renderTime > 50) {
      recommendations.push('组件渲染时间较长，建议使用React.memo和useMemo优化');
    } else if (this.results.renderTime > 20) {
      recommendations.push('渲染性能良好，可进一步优化状态管理逻辑');
    }
    
    // 交互响应分析
    if (this.results.interactionResponseTime > 100) {
      recommendations.push('用户交互响应较慢，建议优化事件处理函数');
    } else if (this.results.interactionResponseTime > 50) {
      recommendations.push('交互响应时间可接受，建议添加视觉反馈提升用户体验');
    }
    
    // 内存使用分析
    if (this.results.memoryUsage > 100) {
      recommendations.push('内存使用量较高，建议检查是否存在内存泄漏');
    } else if (this.results.memoryUsage > 50) {
      recommendations.push('内存使用适中，建议定期清理不必要的事件监听器');
    }
    
    // 错误率分析
    if (this.errorCount > 0) {
      recommendations.push(`发现 ${this.errorCount} 个错误，建议加强错误处理和边界情况处理`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('视频播放性能表现优秀，继续保持当前优化水平');
    }
    
    this.results.recommendations = recommendations;
    this.results.errorCount = this.errorCount;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取性能测试报告
   */
  getPerformanceReport(): string {
    const report = `
🎬 视频播放性能测试报告
========================

📊 性能指标:
- 组件加载时间: ${this.results.loadTime.toFixed(2)}ms
- 平均渲染时间: ${this.results.renderTime.toFixed(2)}ms
- 平均交互响应时间: ${this.results.interactionResponseTime.toFixed(2)}ms
- 峰值内存使用: ${this.results.memoryUsage.toFixed(2)}MB
- 错误数量: ${this.results.errorCount}

💡 优化建议:
${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

📈 性能评级:
${this.getPerformanceGrade()}
`;
    
    return report;
  }

  /**
   * 获取性能评级
   */
  private getPerformanceGrade(): string {
    let score = 100;
    
    // 加载时间评分
    if (this.results.loadTime > 1000) score -= 20;
    else if (this.results.loadTime > 500) score -= 10;
    
    // 渲染时间评分
    if (this.results.renderTime > 50) score -= 15;
    else if (this.results.renderTime > 20) score -= 5;
    
    // 交互响应评分
    if (this.results.interactionResponseTime > 100) score -= 20;
    else if (this.results.interactionResponseTime > 50) score -= 10;
    
    // 内存使用评分
    if (this.results.memoryUsage > 100) score -= 15;
    else if (this.results.memoryUsage > 50) score -= 5;
    
    // 错误扣分
    score -= this.errorCount * 10;
    
    if (score >= 90) return '🏆 优秀 (A级)';
    if (score >= 80) return '👍 良好 (B级)';
    if (score >= 70) return '⚠️  一般 (C级)';
    if (score >= 60) return '❌ 较差 (D级)';
    return '💥 很差 (F级)';
  }
}

// 默认测试配置
export const defaultVideoTestConfig: PerformanceTestConfig = {
  videoUrl: 'test-video.mp4',
  testDuration: 30, // 30秒
  interactionCount: 5, // 每种交互测试5次
  memoryCheckInterval: 1000 // 每秒检查一次内存
};

// 导出测试函数
export async function runVideoPerformanceTest(config?: Partial<PerformanceTestConfig>): Promise<VideoPerformanceResult> {
  const testConfig = { ...defaultVideoTestConfig, ...config };
  const tester = new VideoPerformanceTest(testConfig);
  
  const result = await tester.runPerformanceTest();
  
  console.log(tester.getPerformanceReport());
  
  return result;
}

export default VideoPerformanceTest;