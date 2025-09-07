import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Eye, Edit, Trash2 } from 'lucide-react';

interface Grade {
  id: string;
  student_id: string;
  student_name: string;
  exam_id: string;
  exam_title: string;
  score: number;
  max_score: number;
  submitted_at: string;
  status: 'submitted' | 'graded' | 'pending';
}

export default function AdminGradeManagement() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('');

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      // 模拟API调用
      const mockGrades: Grade[] = [
        {
          id: '1',
          student_id: 'S001',
          student_name: '张三',
          exam_id: 'E001',
          exam_title: '数学期中考试',
          score: 85,
          max_score: 100,
          submitted_at: '2024-01-15T10:30:00Z',
          status: 'graded'
        },
        {
          id: '2',
          student_id: 'S002',
          student_name: '李四',
          exam_id: 'E001',
          exam_title: '数学期中考试',
          score: 92,
          max_score: 100,
          submitted_at: '2024-01-15T11:15:00Z',
          status: 'graded'
        }
      ];
      setGrades(mockGrades);
    } catch (error) {
      console.error('获取成绩失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGrades = grades.filter(grade => 
    grade.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grade.exam_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Grade['status']) => {
    const statusConfig = {
      submitted: { label: '已提交', variant: 'secondary' as const },
      graded: { label: '已评分', variant: 'default' as const },
      pending: { label: '待评分', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const exportGrades = () => {
    console.log('导出成绩功能待实现');
  };

  const viewGradeDetail = (gradeId: string) => {
    console.log('查看成绩详情:', gradeId);
  };

  const editGrade = (gradeId: string) => {
    console.log('编辑成绩:', gradeId);
  };

  const deleteGrade = (gradeId: string) => {
    console.log('删除成绩:', gradeId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">成绩管理</h1>
        <Button onClick={exportGrades} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          导出成绩
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>成绩列表</CardTitle>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名或考试名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">学生</th>
                  <th className="text-left p-4">考试</th>
                  <th className="text-left p-4">分数</th>
                  <th className="text-left p-4">状态</th>
                  <th className="text-left p-4">提交时间</th>
                  <th className="text-left p-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map((grade) => (
                  <tr key={grade.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{grade.student_name}</div>
                        <div className="text-sm text-muted-foreground">{grade.student_id}</div>
                      </div>
                    </td>
                    <td className="p-4">{grade.exam_title}</td>
                    <td className="p-4">
                      <span className="font-medium">{grade.score}</span>
                      <span className="text-muted-foreground">/{grade.max_score}</span>
                    </td>
                    <td className="p-4">{getStatusBadge(grade.status)}</td>
                    <td className="p-4">
                      {new Date(grade.submitted_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewGradeDetail(grade.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editGrade(grade.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteGrade(grade.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredGrades.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无成绩数据
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}