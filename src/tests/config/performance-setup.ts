/**
 * 性能测试设置文件
 * 配置性能测试的环境和工具
 */

// 性能测试全局配置
global.performanceConfig = {
  // 是否启用性能测试
  enabled: process.env.PERFORMANCE_TEST === 'true' || process.argv.includes('--performance'),
  
  // 性能阈值配置
  thresholds: {
    responseTime: {
      fast: 100,      // 快速响应阈值（毫秒）
      acceptable: 500, // 可接受响应阈值（毫秒）
      slow: 1000      // 慢响应阈值（毫秒）
    },
    memory: {
      low: 50,        // 低内存使用阈值（MB）
      medium: 100,    // 中等内存使用阈值（MB）
      high: 200       // 高内存使用阈值（MB）
    },
    concurrency: {
      light: 10,      // 轻量并发数
      medium: 50,     // 中等并发数
      heavy: 100      // 重度并发数
    }
  },
  
  // 测试数据量配置
  dataVolume: {
    small: 100,
    medium: 1000,
    large: 10000
  },
  
  // 性能报告配置
  reporting: {
    enabled: true,
    outputDir: 'performance-results',
    formats: ['json', 'html', 'csv']
  }
};

// 性能测试工具函数
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * 记录性能指标
   * @param metric 性能指标
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    });
  }
  
  /**
   * 获取所有性能指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  /**
   * 清空性能指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }
  
  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const responseTimeMetrics = this.metrics.filter(m => m.type === 'responseTime');
    const memoryMetrics = this.metrics.filter(m => m.type === 'memory');
    const concurrencyMetrics = this.metrics.filter(m => m.type === 'concurrency');
    
    return {
      summary: {
        totalTests: this.metrics.length,
        averageResponseTime: this.calculateAverage(responseTimeMetrics.map(m => m.value)),
        maxMemoryUsage: Math.max(...memoryMetrics.map(m => m.value)),
        maxConcurrency: Math.max(...concurrencyMetrics.map(m => m.value))
      },
      details: {
        responseTime: this.analyzeMetrics(responseTimeMetrics),
        memory: this.analyzeMetrics(memoryMetrics),
        concurrency: this.analyzeMetrics(concurrencyMetrics)
      },
      thresholdViolations: this.findThresholdViolations()
    };
  }
  
  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
  
  private analyzeMetrics(metrics: PerformanceMetric[]): MetricAnalysis {
    const values = metrics.map(m => m.value);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      average: this.calculateAverage(values),
      median: this.calculateMedian(values)
    };
  }
  
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }
  
  private findThresholdViolations(): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];
    const { thresholds } = global.performanceConfig;
    
    this.metrics.forEach(metric => {
      if (metric.type === 'responseTime' && metric.value > thresholds.responseTime.slow) {
        violations.push({
          type: 'responseTime',
          testName: metric.testName,
          value: metric.value,
          threshold: thresholds.responseTime.slow,
          severity: 'high'
        });
      } else if (metric.type === 'memory' && metric.value > thresholds.memory.high) {
        violations.push({
          type: 'memory',
          testName: metric.testName,
          value: metric.value,
          threshold: thresholds.memory.high,
          severity: 'high'
        });
      }
    });
    
    return violations;
  }
}

// 性能测试接口定义
interface PerformanceMetric {
  type: 'responseTime' | 'memory' | 'concurrency';
  testName: string;
  value: number;
  unit: string;
  timestamp?: number;
}

interface MetricAnalysis {
  count: number;
  min: number;
  max: number;
  average: number;
  median: number;
}

interface ThresholdViolation {
  type: string;
  testName: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

interface PerformanceReport {
  summary: {
    totalTests: number;
    averageResponseTime: number;
    maxMemoryUsage: number;
    maxConcurrency: number;
  };
  details: {
    responseTime: MetricAnalysis;
    memory: MetricAnalysis;
    concurrency: MetricAnalysis;
  };
  thresholdViolations: ThresholdViolation[];
}

// 全局性能监控器实例
global.performanceMonitor = PerformanceMonitor.getInstance();

// 性能测试钩子
beforeAll(() => {
  if (global.performanceConfig.enabled) {
    console.log('🚀 启动性能测试监控');
    console.log(`📊 性能阈值配置: ${JSON.stringify(global.performanceConfig.thresholds, null, 2)}`);
    
    // 清空之前的性能指标
    global.performanceMonitor.clearMetrics();
  }
});

afterAll(() => {
  if (global.performanceConfig.enabled) {
    console.log('📈 性能测试完成，生成报告...');
    
    const report = global.performanceMonitor.generateReport();
    
    console.log('\n📊 性能测试报告:');
    console.log('==================');
    console.log(`总测试数: ${report.summary.totalTests}`);
    console.log(`平均响应时间: ${report.summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`最大内存使用: ${report.summary.maxMemoryUsage.toFixed(2)}MB`);
    console.log(`最大并发数: ${report.summary.maxConcurrency}`);
    
    if (report.thresholdViolations.length > 0) {
      console.log('\n⚠️  性能阈值违规:');
      report.thresholdViolations.forEach(violation => {
        console.log(`   ${violation.testName}: ${violation.type} ${violation.value} > ${violation.threshold}`);
      });
    } else {
      console.log('\n✅ 所有性能指标均在阈值范围内');
    }
    
    console.log('==================\n');
    
    // 保存性能报告到文件
    if (global.performanceConfig.reporting.enabled) {
      const fs = require('fs');
      const path = require('path');
      
      const outputDir = global.performanceConfig.reporting.outputDir;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 保存 JSON 格式报告
      const jsonPath = path.join(outputDir, `performance-report-${Date.now()}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      
      console.log(`📁 性能报告已保存到: ${jsonPath}`);
    }
  }
});

// 类型声明
declare global {
  var performanceConfig: {
    enabled: boolean;
    thresholds: {
      responseTime: {
        fast: number;
        acceptable: number;
        slow: number;
      };
      memory: {
        low: number;
        medium: number;
        high: number;
      };
      concurrency: {
        light: number;
        medium: number;
        heavy: number;
      };
    };
    dataVolume: {
      small: number;
      medium: number;
      large: number;
    };
    reporting: {
      enabled: boolean;
      outputDir: string;
      formats: string[];
    };
  };
  
  var performanceMonitor: PerformanceMonitor;
}

// 导出性能测试工具
export {
  PerformanceMonitor,
  type PerformanceMetric,
  type PerformanceReport,
  type ThresholdViolation
};