/**
 * 健康检查API路由
 * GET /api/health
 * 
 * 用于部署验证和系统监控
 * 检查应用程序、数据库和关键服务的健康状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 健康检查接口
 * @param request NextRequest对象
 * @returns 健康状态响应
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // 基础健康检查
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        application: true,
        database: false,
        memory: false,
        disk: false
      },
      responseTime: 0
    };

    // 检查数据库连接
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      health.checks.database = !error;
    } catch (error) {
      console.warn('数据库健康检查失败:', error);
      health.checks.database = false;
    }

    // 检查内存使用情况
    try {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal;
      const usedMem = memUsage.heapUsed;
      const memUsagePercent = (usedMem / totalMem) * 100;
      
      health.checks.memory = memUsagePercent < 90; // 内存使用率低于90%为健康
    } catch (error) {
      console.warn('内存检查失败:', error);
      health.checks.memory = false;
    }

    // 检查磁盘空间（简化版）
    try {
      // 在生产环境中，这里可以添加更详细的磁盘空间检查
      health.checks.disk = true;
    } catch (error) {
      console.warn('磁盘检查失败:', error);
      health.checks.disk = false;
    }

    // 计算响应时间
    health.responseTime = Date.now() - startTime;

    // 确定整体健康状态
    const allChecksHealthy = Object.values(health.checks).every(check => check === true);
    health.status = allChecksHealthy ? 'healthy' : 'degraded';

    // 根据健康状态返回适当的HTTP状态码
    const statusCode = allChecksHealthy ? 200 : 503;

    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('健康检查失败:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : '未知错误',
      checks: {
        application: false,
        database: false,
        memory: false,
        disk: false
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

/**
 * HEAD方法支持
 * 用于简单的存活检查
 */
export async function HEAD(request: NextRequest) {
  try {
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}