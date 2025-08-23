/**
 * API监控统计数据路由
 * 提供API调用统计、端点分析、用户使用情况等数据接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/services/monitoringService';
import { StatsQuery, EndpointStats, UserUsageStats, ExportData } from '@/types/monitoring';
import * as XLSX from 'xlsx';

/**
 * GET /api/monitoring/stats
 * 获取API监控统计数据
 * 
 * 查询参数:
 * - startDate: 开始日期 (ISO字符串)
 * - endDate: 结束日期 (ISO字符串)
 * - endpoint: 端点过滤
 * - method: HTTP方法过滤
 * - userId: 用户ID过滤
 * - groupBy: 分组方式 (hour|day|week|month)
 * - limit: 限制数量
 * - offset: 偏移量
 * - type: 统计类型 (records|endpoints|users|export)
 * - format: 导出格式 (json|csv|xlsx)
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 统计数据响应
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const query: StatsQuery = {
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      endpoint: searchParams.get('endpoint') || undefined,
      method: searchParams.get('method') || undefined,
      userId: searchParams.get('userId') || undefined,
      groupBy: (searchParams.get('groupBy') as 'hour' | 'day' | 'week' | 'month') || 'hour',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0
    };

    const statsType = searchParams.get('type') || 'records';
    const exportFormat = searchParams.get('format') as 'json' | 'csv' | 'xlsx' || 'json';

    // 验证日期范围
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      return NextResponse.json(
        { error: '开始日期不能晚于结束日期' },
        { status: 400 }
      );
    }

    // 设置默认时间范围（最近24小时）
    if (!query.startDate && !query.endDate) {
      query.endDate = new Date();
      query.startDate = new Date(query.endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    let result: EndpointStats[] | UserUsageStats[] | ExportData;

    switch (statsType) {
      case 'records':
        // 获取API调用记录
        result = await monitoringService.queryRecords(query);
        break;

      case 'endpoints':
        // 获取端点统计
        result = await monitoringService.getEndpointStats(query);
        break;

      case 'users':
        // 获取用户使用统计
        result = await monitoringService.getUserUsageStats(query);
        break;

      case 'export':
        // 导出数据
        const exportData = await monitoringService.exportData(query, exportFormat);
        
        // 设置响应头
        const headers = new Headers();
        const timestamp = new Date().toISOString().split('T')[0];
        
        switch (exportFormat) {
          case 'csv':
            headers.set('Content-Type', 'text/csv');
            headers.set('Content-Disposition', `attachment; filename="monitoring-stats-${timestamp}.csv"`);
            return new NextResponse(convertToCSV(exportData.data), { headers });
            
          case 'xlsx':
            headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            headers.set('Content-Disposition', `attachment; filename="monitoring-stats-${timestamp}.xlsx"`);
            const xlsxBuffer = convertToXLSX(exportData.data, exportData.metadata);
            return new NextResponse(xlsxBuffer, { headers });
            
          default:
            headers.set('Content-Type', 'application/json');
            headers.set('Content-Disposition', `attachment; filename="monitoring-stats-${timestamp}.json"`);
            return new NextResponse(JSON.stringify(exportData, null, 2), { headers });
        }

      default:
        return NextResponse.json(
          { error: `不支持的统计类型: ${statsType}` },
          { status: 400 }
        );
    }

    // 添加元数据
    const response = {
      data: result,
      metadata: {
        query,
        totalCount: Array.isArray(result) ? result.length : 1,
        generatedAt: new Date().toISOString(),
        type: statsType
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { 
        error: '获取统计数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/stats
 * 批量查询统计数据或执行复杂查询
 * 
 * 请求体:
 * {
 *   "queries": StatsQuery[], // 多个查询
 *   "operations": string[], // 操作类型数组
 *   "options": { // 额外选项
 *     "includeMetadata": boolean,
 *     "format": string,
 *     "aggregation": string
 *   }
 * }
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 批量查询结果
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { queries, operations, options = {} } = body;

    // 验证请求体
    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的查询数组' },
        { status: 400 }
      );
    }

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的操作数组' },
        { status: 400 }
      );
    }

    if (queries.length !== operations.length) {
      return NextResponse.json(
        { error: '查询数组和操作数组长度必须一致' },
        { status: 400 }
      );
    }

    // 限制批量查询数量
    if (queries.length > 10) {
      return NextResponse.json(
        { error: '批量查询数量不能超过10个' },
        { status: 400 }
      );
    }

    const results = [];

    // 执行批量查询
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const operation = operations[i];

      try {
        // 解析查询中的日期字符串
        if (query.startDate && typeof query.startDate === 'string') {
          query.startDate = new Date(query.startDate);
        }
        if (query.endDate && typeof query.endDate === 'string') {
          query.endDate = new Date(query.endDate);
        }

        let result: EndpointStats[] | UserUsageStats[] | ExportData;

        switch (operation) {
          case 'records':
            result = await monitoringService.queryRecords(query);
            break;
          case 'endpoints':
            result = await monitoringService.getEndpointStats(query);
            break;
          case 'users':
            result = await monitoringService.getUserUsageStats(query);
            break;
          default:
            throw new Error(`不支持的操作类型: ${operation}`);
        }

        results.push({
          query,
          operation,
          data: result,
          success: true,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        results.push({
          query,
          operation,
          error: error instanceof Error ? error.message : '查询失败',
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 构建响应
    const response: Record<string, unknown> = {
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        generatedAt: new Date().toISOString()
      }
    };

    // 添加元数据（如果请求）
    if (options.includeMetadata) {
      response.metadata = {
        options,
        executionTime: Date.now(), // 这里应该计算实际执行时间
        serverInfo: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Batch stats API error:', error);
    return NextResponse.json(
      { 
        error: '批量查询失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitoring/stats
 * 清理旧的监控数据
 * 
 * 查询参数:
 * - days: 保留天数（默认30天）
 * - confirm: 确认删除（必须为'true'）
 * 
 * @param request NextRequest对象
 * @returns Promise<NextResponse> 清理结果
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const confirm = searchParams.get('confirm');

    // 安全检查
    if (confirm !== 'true') {
      return NextResponse.json(
        { error: '请确认删除操作，添加 confirm=true 参数' },
        { status: 400 }
      );
    }

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: '保留天数必须在1-365之间' },
        { status: 400 }
      );
    }

    // 执行清理
    await monitoringService.cleanupOldRecords(days);

    return NextResponse.json({
      message: `成功清理${days}天前的监控数据`,
      retentionDays: days,
      cleanupTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      { 
        error: '清理数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 将数据转换为CSV格式
 * @param data 数据数组
 * @returns CSV字符串
 */
function convertToCSV(data: Record<string, unknown>[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // 获取所有字段名
  const fields = Object.keys(data[0]);
  
  // 创建CSV头部
  const csvHeader = fields.join(',');
  
  // 创建CSV行
  const csvRows = data.map(row => {
    return fields.map(field => {
      const value = row[field];
      
      // 处理特殊字符和日期
      if (value === null || value === undefined) {
        return '';
      }
      
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return String(value);
    }).join(',');
  });
  
  return [csvHeader, ...csvRows].join('\n');
}

/**
 * 验证和清理查询参数
 * @param query 原始查询对象
 * @returns 清理后的查询对象
 */
function sanitizeQuery(query: Record<string, unknown>): StatsQuery {
  const sanitized: StatsQuery = {};
  
  // 验证和转换日期
  if (query.startDate) {
    const startDate = new Date(query.startDate);
    if (!isNaN(startDate.getTime())) {
      sanitized.startDate = startDate;
    }
  }
  
  if (query.endDate) {
    const endDate = new Date(query.endDate);
    if (!isNaN(endDate.getTime())) {
      sanitized.endDate = endDate;
    }
  }
  
  // 验证字符串字段
  if (query.endpoint && typeof query.endpoint === 'string') {
    sanitized.endpoint = query.endpoint.trim();
  }
  
  if (query.method && typeof query.method === 'string') {
    sanitized.method = query.method.toUpperCase().trim();
  }
  
  if (query.userId && typeof query.userId === 'string') {
    sanitized.userId = query.userId.trim();
  }
  
  // 验证枚举字段
  if (query.groupBy && ['hour', 'day', 'week', 'month'].includes(query.groupBy)) {
    sanitized.groupBy = query.groupBy;
  }
  
  // 验证数字字段
  if (query.limit && typeof query.limit === 'number' && query.limit > 0 && query.limit <= 1000) {
    sanitized.limit = Math.floor(query.limit);
  }
  
  if (query.offset && typeof query.offset === 'number' && query.offset >= 0) {
    sanitized.offset = Math.floor(query.offset);
  }
  
  return sanitized;
}

/**
 * 将数据转换为XLSX格式
 * @param data 数据数组
 * @param metadata 元数据
 * @returns XLSX文件的Buffer
 */
function convertToXLSX(data: Record<string, unknown>[], metadata?: Record<string, unknown>): Buffer {
  // 创建工作簿
  const workbook = XLSX.utils.book_new();

  if (!Array.isArray(data) || data.length === 0) {
    // 如果没有数据，创建一个空的工作表
    const emptyWorksheet = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(workbook, emptyWorksheet, 'Data');
  } else {
    // 创建数据工作表
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 设置列宽
    const columnWidths = Object.keys(data[0]).map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => {
          const value = row[key];
          return value ? String(value).length : 0;
        })
      );
      return { wch: Math.min(Math.max(maxLength, 10), 50) };
    });
    worksheet['!cols'] = columnWidths;

    // 添加数据工作表
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring Data');

    // 如果有元数据，创建元数据工作表
    if (metadata) {
      const metadataArray = Object.entries(metadata).map(([key, value]) => ({
        Property: key,
        Value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }));

      const metadataWorksheet = XLSX.utils.json_to_sheet(metadataArray);
      metadataWorksheet['!cols'] = [{ wch: 20 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, metadataWorksheet, 'Metadata');
    }
  }

  // 生成XLSX文件
  const xlsxBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true
  });

  return xlsxBuffer;
}