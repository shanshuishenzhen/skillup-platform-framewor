/**
 * 考试结果导出API路由
 * GET /api/admin/export/results - 导出考试结果
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/rbac';

/**
 * 导出考试结果
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request, ['admin', 'teacher']);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.message || '用户未经授权' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const format = searchParams.get('format') || 'excel'; // excel, csv, json
    const includeDetails = searchParams.get('includeDetails') === 'true';

    if (!examId) {
      return NextResponse.json({
        success: false,
        message: '考试ID不能为空'
      }, { status: 400 });
    }

    // 获取考试信息
    // TODO: 从数据库获取考试信息
    const examInfo = {
      id: examId,
      title: 'JavaScript基础技能认证考试',
      category: '前端开发',
      difficulty: 'intermediate',
      duration: 120,
      totalScore: 100,
      passingScore: 60,
      startTime: '2024-01-15T09:00:00Z',
      endTime: '2024-01-15T11:00:00Z',
      status: 'finished'
    };

    // 获取考试结果
    // TODO: 从数据库获取考试结果
    const results = [
      {
        candidateId: 'user_001',
        candidateName: '张三',
        email: 'zhangsan@example.com',
        registrationNumber: 'T2024001',
        department: '技术部',
        position: '前端工程师',
        startTime: '2024-01-15T09:05:00Z',
        endTime: '2024-01-15T10:45:00Z',
        duration: 100, // 实际用时（分钟）
        score: 85,
        totalScore: 100,
        passingScore: 60,
        passed: true,
        status: 'completed',
        answers: includeDetails ? [
          {
            questionId: 'q1',
            questionTitle: 'JavaScript变量声明',
            questionType: 'single',
            questionScore: 5,
            userAnswer: 'A',
            correctAnswer: 'A',
            isCorrect: true,
            score: 5
          },
          {
            questionId: 'q2', 
            questionTitle: 'JavaScript数据类型',
            questionType: 'multiple',
            questionScore: 10,
            userAnswer: ['A', 'B'],
            correctAnswer: ['A', 'B', 'C'],
            isCorrect: false,
            score: 0
          }
        ] : undefined
      },
      {
        candidateId: 'user_002',
        candidateName: '李四',
        email: 'lisi@example.com',
        registrationNumber: 'T2024002',
        department: '技术部',
        position: '后端工程师',
        startTime: '2024-01-15T09:10:00Z',
        endTime: '2024-01-15T10:30:00Z',
        duration: 80,
        score: 45,
        totalScore: 100,
        passingScore: 60,
        passed: false,
        status: 'completed'
      },
      {
        candidateId: 'user_003',
        candidateName: '王五',
        email: 'wangwu@example.com',
        registrationNumber: 'T2024003',
        department: '产品部',
        position: '产品经理',
        startTime: '2024-01-15T09:15:00Z',
        endTime: null,
        duration: 0,
        score: 0,
        totalScore: 100,
        passingScore: 60,
        passed: false,
        status: 'absent' // 缺考
      }
    ];

    // 计算统计信息
    const stats = {
      totalCandidates: results.length,
      completedCount: results.filter(r => r.status === 'completed').length,
      absentCount: results.filter(r => r.status === 'absent').length,
      passedCount: results.filter(r => r.passed).length,
      failedCount: results.filter(r => r.status === 'completed' && !r.passed).length,
      passRate: results.filter(r => r.status === 'completed').length > 0 
        ? (results.filter(r => r.passed).length / results.filter(r => r.status === 'completed').length * 100).toFixed(2)
        : '0.00',
      averageScore: results.filter(r => r.status === 'completed').length > 0
        ? (results.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.score, 0) / results.filter(r => r.status === 'completed').length).toFixed(2)
        : '0.00',
      averageDuration: results.filter(r => r.status === 'completed').length > 0
        ? (results.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.status === 'completed').length).toFixed(0)
        : '0'
    };

    const exportData = {
      examInfo,
      stats,
      results,
      exportTime: new Date().toISOString(),
      exportedBy: authResult.user.userId
    };

    if (format === 'json') {
      // 返回JSON格式
      return NextResponse.json({
        success: true,
        data: exportData
      });
    } else if (format === 'csv') {
      // 生成CSV格式
      const csvHeaders = [
        '准考证号',
        '姓名', 
        '邮箱',
        '部门',
        '职位',
        '开始时间',
        '结束时间',
        '用时(分钟)',
        '得分',
        '总分',
        '及格分',
        '是否通过',
        '状态'
      ];

      const csvRows = results.map(result => [
        result.registrationNumber,
        result.candidateName,
        result.email,
        result.department || '',
        result.position || '',
        result.startTime || '',
        result.endTime || '',
        result.duration,
        result.score,
        result.totalScore,
        result.passingScore,
        result.passed ? '是' : '否',
        result.status === 'completed' ? '已完成' : 
        result.status === 'absent' ? '缺考' : '进行中'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="exam_results_${examId}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // 默认返回Excel格式的数据结构
      const excelData = {
        sheets: [
          {
            name: '考试概况',
            data: [
              ['考试名称', examInfo.title],
              ['考试分类', examInfo.category],
              ['难度等级', examInfo.difficulty],
              ['考试时长', `${examInfo.duration}分钟`],
              ['总分', examInfo.totalScore],
              ['及格分', examInfo.passingScore],
              ['开始时间', examInfo.startTime],
              ['结束时间', examInfo.endTime],
              [''],
              ['统计信息', ''],
              ['总报名人数', stats.totalCandidates],
              ['实际参考人数', stats.completedCount],
              ['缺考人数', stats.absentCount],
              ['通过人数', stats.passedCount],
              ['未通过人数', stats.failedCount],
              ['通过率', `${stats.passRate}%`],
              ['平均分', stats.averageScore],
              ['平均用时', `${stats.averageDuration}分钟`]
            ]
          },
          {
            name: '考试结果',
            headers: [
              '准考证号', '姓名', '邮箱', '部门', '职位',
              '开始时间', '结束时间', '用时(分钟)', '得分', '总分', '及格分',
              '是否通过', '状态'
            ],
            data: results.map(result => [
              result.registrationNumber,
              result.candidateName,
              result.email,
              result.department || '',
              result.position || '',
              result.startTime || '',
              result.endTime || '',
              result.duration,
              result.score,
              result.totalScore,
              result.passingScore,
              result.passed ? '是' : '否',
              result.status === 'completed' ? '已完成' : 
              result.status === 'absent' ? '缺考' : '进行中'
            ])
          }
        ]
      };

      if (includeDetails) {
        // 添加详细答题情况
        const detailsData = results
          .filter(r => r.answers)
          .flatMap(result => 
            result.answers!.map(answer => [
              result.registrationNumber,
              result.candidateName,
              answer.questionTitle,
              answer.questionType,
              answer.questionScore,
              Array.isArray(answer.userAnswer) ? answer.userAnswer.join(',') : answer.userAnswer,
              Array.isArray(answer.correctAnswer) ? answer.correctAnswer.join(',') : answer.correctAnswer,
              answer.isCorrect ? '正确' : '错误',
              answer.score
            ])
          );

        excelData.sheets.push({
          name: '答题详情',
          headers: [
            '准考证号', '姓名', '题目', '题型', '题目分值',
            '考生答案', '正确答案', '是否正确', '得分'
          ],
          data: detailsData
        });
      }

      return NextResponse.json({
        success: true,
        data: excelData,
        filename: `exam_results_${examId}_${new Date().toISOString().split('T')[0]}.xlsx`
      });
    }

  } catch (error) {
    console.error('导出考试结果失败:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '导出考试结果失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
