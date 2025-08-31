/**
 * 考试数据导出API路由
 * GET /api/admin/export/exams - 导出考试数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 导出考试数据
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';

    // 模拟考试数据
    const exams = [
      {
        id: 'exam-1',
        title: 'JavaScript基础技能认证',
        category: '前端开发',
        difficulty: 'intermediate',
        duration: 120,
        totalQuestions: 50,
        totalScore: 100,
        passingScore: 60,
        status: 'published',
        registeredCount: 150,
        completedCount: 142,
        passedCount: 101,
        createdAt: '2024-01-10T10:00:00Z',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      },
      {
        id: 'exam-2',
        title: 'Python数据分析认证',
        category: '数据科学',
        difficulty: 'advanced',
        duration: 180,
        totalQuestions: 60,
        totalScore: 120,
        passingScore: 72,
        status: 'published',
        registeredCount: 89,
        completedCount: 85,
        passedCount: 67,
        createdAt: '2024-01-12T14:30:00Z',
        startTime: '2024-01-18T14:00:00Z',
        endTime: '2024-01-18T17:00:00Z'
      }
    ];

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          exams,
          total: exams.length,
          exportTime: new Date().toISOString()
        }
      });
    } else if (format === 'csv') {
      const csvHeaders = [
        'ID',
        '考试名称',
        '分类',
        '难度',
        '时长(分钟)',
        '题目数',
        '总分',
        '及格分',
        '状态',
        '报名人数',
        '完成人数',
        '通过人数',
        '创建时间'
      ];

      const csvRows = exams.map(exam => [
        exam.id,
        exam.title,
        exam.category,
        exam.difficulty,
        exam.duration,
        exam.totalQuestions,
        exam.totalScore,
        exam.passingScore,
        exam.status,
        exam.registeredCount,
        exam.completedCount,
        exam.passedCount,
        exam.createdAt
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="exams_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      const excelData = {
        sheets: [
          {
            name: '考试信息',
            headers: [
              'ID', '考试名称', '分类', '难度', '时长(分钟)', '题目数', '总分', '及格分', 
              '状态', '报名人数', '完成人数', '通过人数', '创建时间'
            ],
            data: exams.map(exam => [
              exam.id,
              exam.title,
              exam.category,
              exam.difficulty,
              exam.duration,
              exam.totalQuestions,
              exam.totalScore,
              exam.passingScore,
              exam.status,
              exam.registeredCount,
              exam.completedCount,
              exam.passedCount,
              exam.createdAt
            ])
          }
        ]
      };

      return NextResponse.json({
        success: true,
        data: excelData,
        filename: `exams_export_${new Date().toISOString().split('T')[0]}.xlsx`
      });
    }

  } catch (error) {
    console.error('导出考试数据失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '导出考试数据失败'
    }, { status: 500 });
  }
}
