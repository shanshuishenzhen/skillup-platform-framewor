/**
 * DeepSeek功能测试API接口
 * GET /api/test-deepseek
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIDataGeneratorService } from '@/services/aiDataGeneratorService';

/**
 * 测试DeepSeek功能接口
 * @param request HTTP请求对象
 * @returns 测试结果
 */
export async function GET(request: NextRequest) {
  try {
    const aiService = new AIDataGeneratorService();
    
    // 初始化DeepSeek服务
    await aiService.initialize();
    
    // 测试生成简单的课程数据
    const testCourses = await aiService.generateCourses(1);
    
    return NextResponse.json({
      success: true,
      message: 'DeepSeek功能测试成功',
      data: {
        service: 'DeepSeek',
        timestamp: new Date().toISOString(),
        testResult: testCourses
      }
    });
  } catch (error) {
    console.error('DeepSeek测试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: 'DeepSeek功能测试失败',
      error: error instanceof Error ? error.message : '未知错误',
      data: {
        service: 'DeepSeek',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

/**
 * 测试DeepSeek连接状态
 * POST /api/test-deepseek
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({
        success: false,
        message: '请提供测试提示词'
      }, { status: 400 });
    }
    
    const aiService = new AIDataGeneratorService();
    await aiService.initialize();
    
    // 测试自定义提示词
    const result = await aiService.generateWithAI(prompt, 'test');
    
    return NextResponse.json({
      success: true,
      message: 'DeepSeek自定义测试成功',
      data: {
        service: 'DeepSeek',
        prompt,
        result,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('DeepSeek自定义测试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: 'DeepSeek自定义测试失败',
      error: error instanceof Error ? error.message : '未知错误',
      data: {
        service: 'DeepSeek',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}