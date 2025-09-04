'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, UserPlus, FileText, Users, Download } from 'lucide-react';
import { userService } from '@/services/userService';
import { examService } from '@/services/examService';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  id_card?: string;
  employee_id?: string;
  department?: string;
  position?: string;
  organization?: string;
  role: string;
  status: string;
  assigned_exam_id?: string;
  exam_assignment_status?: string;
  exam_assignment_date?: string;
  created_at: string;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  status: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // 加载用户列表
  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await userService.getUsers({
        page: currentPage,
        limit: pageSize,
        search: searchTerm
      });
      setUsers(result.users || []);
      setTotalPages(result.totalPages || 0);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载考试列表
  const loadExams = async () => {
    try {
      const result = await examService.getExams({
        page: 1,
        limit: 100,
        status: 'published'
      });
      setExams(result.exams || []);
    } catch (error) {
      console.error('加载考试列表失败:', error);
      toast.error('加载考试列表失败');
    }
  };

  // 批量分配试卷
  const handleBatchAssignExam = async () => {
    if (!selectedExam || selectedUsers.length === 0) {
      toast.error('请选择试卷和用户');
      return;
    }

    try {
      await userService.batchAssignExam(selectedUsers, selectedExam);
      toast.success(`成功为 ${selectedUsers.length} 个用户分配试卷`);
      setSelectedUsers([]);
      setSelectedExam('');
      setAssignDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('批量分配试卷失败:', error);
      toast.error('批量分配试卷失败');
    }
  };

  // 搜索用户
  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  // 选择/取消选择用户
  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // 获取分配状态显示
  const getAssignmentStatusBadge = (status?: string) => {
    const statusMap = {
      assigned: { label: '已分配', variant: 'secondary' as const },
      started: { label: '已开始', variant: 'default' as const },
      completed: { label: '已完成', variant: 'default' as const },
      expired: { label: '已过期', variant: 'destructive' as const }
    };
    
    if (!status) return null;
    const config = statusMap[status as keyof typeof statusMap];
    return config ? <Badge variant={config.variant}>{config.label}</Badge> : null;
  };

  useEffect(() => {
    loadUsers();
    loadExams();
  }, [currentPage]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">用户管理</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出用户
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            添加用户
          </Button>
        </div>
      </div>

      {/* 搜索和操作栏 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="搜索用户姓名、手机号、工号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                搜索
              </Button>
            </div>
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={selectedUsers.length === 0}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  批量分配试卷 ({selectedUsers.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>批量分配试卷</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">选择试卷</label>
                    <Select value={selectedExam} onValueChange={setSelectedExam}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择要分配的试卷" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      将为 {selectedUsers.length} 个用户分配试卷
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleBatchAssignExam}>
                      确认分配
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              用户列表
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedUsers.length === users.length && users.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">全选</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleUserSelect(user.id, checked as boolean)}
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="font-medium">{user.name || '未设置'}</p>
                        <p className="text-sm text-gray-600">{user.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="text-gray-600">工号:</span> {user.employee_id || '未设置'}
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">部门:</span> {user.department || '未设置'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="text-gray-600">职位:</span> {user.position || '未设置'}
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">机构:</span> {user.organization || '未设置'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status === 'active' ? '活跃' : '非活跃'}
                        </Badge>
                        {getAssignmentStatusBadge(user.exam_assignment_status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无用户数据
                </div>
              )}
            </div>
          )}
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                上一页
              </Button>
              <span className="flex items-center px-4">
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}