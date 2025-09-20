/**
 * 用户考试管理页面
 * 管理员可以查看和管理特定用户的考试权限、报名状态等
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  User, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Award,
  Target,
  Users,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

// 类型定义
interface UserInfo {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  department: string;
  position: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface ExamPermission {
  id: string;
  examId: string;
  examTitle: string;
  examCategory: string;
  permission: 'allowed' | 'denied' | 'restricted';
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  notes?: string;
}

interface ExamRegistration {
  id: string;
  examId: string;
  examTitle: string;
  examCategory: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  registeredAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvedBy?: string;
}

interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  attemptNumber: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'completed';
  startTime?: string;
  endTime?: string;
  totalScore: number;
  maxScore: number;
  isPassed: boolean;
  createdAt: string;
}

export default function UserExamsPage() {
  const params = useParams();
  const userId = params.id as string;

  // 状态管理
  const [user, setUser] = useState<UserInfo | null>(null);
  const [examPermissions, setExamPermissions] = useState<ExamPermission[]>([]);
  const [examRegistrations, setExamRegistrations] = useState<ExamRegistration[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'permissions' | 'registrations' | 'attempts'>('permissions');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [editingPermission, setEditingPermission] = useState<ExamPermission | null>(null);

  // 模拟数据
  const mockUser: UserInfo = {
    id: userId,
    username: 'john_doe',
    email: 'john.doe@company.com',
    fullName: '张三',
    avatar: '/avatars/john.jpg',
    department: '技术部',
    position: '前端开发工程师',
    status: 'active'
  };

  const mockExamPermissions: ExamPermission[] = [
    {
      id: 'perm-1',
      examId: 'exam-1',
      examTitle: 'JavaScript 基础认证考试',
      examCategory: '前端开发',
      permission: 'allowed',
      grantedBy: 'admin',
      grantedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: '基础技能考试，必须通过'
    },
    {
      id: 'perm-2',
      examId: 'exam-2',
      examTitle: 'React 高级开发认证',
      examCategory: '前端框架',
      permission: 'restricted',
      grantedBy: 'manager',
      grantedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: '需要完成JavaScript基础考试后才能参加'
    }
  ];

  const mockExamRegistrations: ExamRegistration[] = [
    {
      id: 'reg-1',
      examId: 'exam-1',
      examTitle: 'JavaScript 基础认证考试',
      examCategory: '前端开发',
      status: 'approved',
      registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      approvedBy: 'admin'
    },
    {
      id: 'reg-2',
      examId: 'exam-2',
      examTitle: 'React 高级开发认证',
      examCategory: '前端框架',
      status: 'pending',
      registeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const mockExamAttempts: ExamAttempt[] = [
    {
      id: 'attempt-1',
      examId: 'exam-1',
      examTitle: 'JavaScript 基础认证考试',
      attemptNumber: 1,
      status: 'completed',
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
      totalScore: 65,
      maxScore: 100,
      isPassed: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'attempt-2',
      examId: 'exam-1',
      examTitle: 'JavaScript 基础认证考试',
      attemptNumber: 2,
      status: 'completed',
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 80 * 60 * 1000).toISOString(),
      totalScore: 85,
      maxScore: 100,
      isPassed: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 初始化数据
  useEffect(() => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setUser(mockUser);
      setExamPermissions(mockExamPermissions);
      setExamRegistrations(mockExamRegistrations);
      setExamAttempts(mockExamAttempts);
      setLoading(false);
    }, 1000);
  }, [id]);

  // 处理权限操作
  const handleGrantPermission = (examId: string, permission: 'allowed' | 'denied' | 'restricted') => {
    // 实现权限授予逻辑
    toast.success('权限设置成功');
  };

  const handleRevokePermission = (permissionId: string) => {
    // 实现权限撤销逻辑
    toast.success('权限已撤销');
  };

  // 处理报名审批
  const handleApproveRegistration = (registrationId: string) => {
    // 实现报名审批逻辑
    toast.success('报名已通过');
  };

  const handleRejectRegistration = (registrationId: string, reason: string) => {
    // 实现报名拒绝逻辑
    toast.success('报名已拒绝');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">用户不存在</h2>
          <p className="text-gray-600">抱歉，您访问的用户不存在或已被删除。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 用户信息卡片 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">{user.department} - {user.position}</span>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status === 'active' ? '活跃' : '非活跃'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 标签页导航 */}
      <div className="flex space-x-1 mb-6">
        <Button
          variant={activeTab === 'permissions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('permissions')}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          考试权限
        </Button>
        <Button
          variant={activeTab === 'registrations' ? 'default' : 'outline'}
          onClick={() => setActiveTab('registrations')}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          报名记录
        </Button>
        <Button
          variant={activeTab === 'attempts' ? 'default' : 'outline'}
          onClick={() => setActiveTab('attempts')}
          className="flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          考试记录
        </Button>
      </div>

      {/* 考试权限管理 */}
      {activeTab === 'permissions' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>考试权限管理</CardTitle>
              <Button onClick={() => setShowPermissionDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                添加权限
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>考试名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>权限状态</TableHead>
                  <TableHead>授权人</TableHead>
                  <TableHead>授权时间</TableHead>
                  <TableHead>过期时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examPermissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">{permission.examTitle}</TableCell>
                    <TableCell>{permission.examCategory}</TableCell>
                    <TableCell>
                      <Badge variant={
                        permission.permission === 'allowed' ? 'default' :
                        permission.permission === 'restricted' ? 'secondary' : 'destructive'
                      }>
                        {permission.permission === 'allowed' ? '允许' :
                         permission.permission === 'restricted' ? '受限' : '拒绝'}
                      </Badge>
                    </TableCell>
                    <TableCell>{permission.grantedBy}</TableCell>
                    <TableCell>{new Date(permission.grantedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {permission.expiresAt ? new Date(permission.expiresAt).toLocaleDateString() : '永久'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingPermission(permission)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRevokePermission(permission.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 报名记录 */}
      {activeTab === 'registrations' && (
        <Card>
          <CardHeader>
            <CardTitle>报名记录</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>考试名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>报名状态</TableHead>
                  <TableHead>报名时间</TableHead>
                  <TableHead>审批时间</TableHead>
                  <TableHead>审批人</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examRegistrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">{registration.examTitle}</TableCell>
                    <TableCell>{registration.examCategory}</TableCell>
                    <TableCell>
                      <Badge variant={
                        registration.status === 'approved' ? 'default' :
                        registration.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {registration.status === 'approved' ? '已通过' :
                         registration.status === 'pending' ? '待审核' :
                         registration.status === 'rejected' ? '已拒绝' : '已取消'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(registration.registeredAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {registration.approvedAt ? new Date(registration.approvedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{registration.approvedBy || '-'}</TableCell>
                    <TableCell>
                      {registration.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleApproveRegistration(registration.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            通过
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectRegistration(registration.id, '不符合要求')}>
                            <XCircle className="w-3 h-3 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 考试记录 */}
      {activeTab === 'attempts' && (
        <Card>
          <CardHeader>
            <CardTitle>考试记录</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>考试名称</TableHead>
                  <TableHead>尝试次数</TableHead>
                  <TableHead>考试状态</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>结束时间</TableHead>
                  <TableHead>得分</TableHead>
                  <TableHead>是否通过</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.examTitle}</TableCell>
                    <TableCell>第 {attempt.attemptNumber} 次</TableCell>
                    <TableCell>
                      <Badge variant={
                        attempt.status === 'completed' ? 'default' :
                        attempt.status === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {attempt.status === 'completed' ? '已完成' :
                         attempt.status === 'in_progress' ? '进行中' :
                         attempt.status === 'submitted' ? '已提交' : '未开始'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attempt.startTime ? new Date(attempt.startTime).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {attempt.endTime ? new Date(attempt.endTime).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={attempt.isPassed ? 'text-green-600 font-semibold' : 'text-red-600'}>
                        {attempt.totalScore}/{attempt.maxScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={attempt.isPassed ? 'default' : 'destructive'}>
                        {attempt.isPassed ? '通过' : '未通过'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}