'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Calendar,
  Mail,
  FileText,
  Play,
  Pause,
  Trash2,
  Edit,
  MoreHorizontal,
  Clock,
  Users,
  Filter,
  Download,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 定期报表管理组件
 * 提供报表配置、调度和管理功能
 */

interface ScheduledReportsProps {
  className?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'personnel' | 'performance' | 'budget' | 'overview' | 'custom';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule_config: {
    time: string;
    day_of_week?: number;
    day_of_month?: number;
    timezone: string;
  };
  recipients: Array<{
    email: string;
    name?: string;
    role?: string;
  }>;
  filters?: {
    department_ids?: string[];
    date_range?: {
      relative?: string;
    };
    include_sub_departments?: boolean;
  };
  format: 'pdf' | 'excel' | 'csv';
  is_active: boolean;
  next_execution?: string;
  last_execution?: string;
  created_at: string;
  created_by: {
    full_name: string;
    email: string;
  };
  executions?: Array<{
    id: string;
    execution_time: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    file_url?: string;
  }>;
}

interface ReportFormData {
  name: string;
  description: string;
  report_type: string;
  schedule_type: string;
  schedule_config: {
    time: string;
    day_of_week: number;
    day_of_month: number;
    timezone: string;
  };
  recipients: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  filters: {
    department_ids: string[];
    date_range: {
      relative: string;
    };
    include_sub_departments: boolean;
  };
  format: string;
  is_active: boolean;
}

const REPORT_TYPES = [
  { value: 'overview', label: '概览报表' },
  { value: 'personnel', label: '人员报表' },
  { value: 'performance', label: '绩效报表' },
  { value: 'budget', label: '预算报表' },
  { value: 'custom', label: '自定义报表' }
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'yearly', label: '每年' }
];

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' }
];

const WEEKDAYS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' }
];

const DATE_RANGES = [
  { value: 'last_week', label: '上周' },
  { value: 'last_month', label: '上月' },
  { value: 'last_quarter', label: '上季度' },
  { value: 'last_year', label: '去年' }
];

export default function ScheduledReports({ className }: ScheduledReportsProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    report_type: '',
    schedule_type: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const [formData, setFormData] = useState<ReportFormData>({
    name: '',
    description: '',
    report_type: 'overview',
    schedule_type: 'weekly',
    schedule_config: {
      time: '09:00',
      day_of_week: 1,
      day_of_month: 1,
      timezone: 'Asia/Shanghai'
    },
    recipients: [{ email: '', name: '', role: 'viewer' }],
    filters: {
      department_ids: [],
      date_range: {
        relative: 'last_month'
      },
      include_sub_departments: true
    },
    format: 'pdf',
    is_active: true
  });

  /**
   * 加载定期报表列表
   */
  const loadReports = async () => {
    setLoading(true);
    try {
      // 设置默认定期报表数据
      const mockReports: ScheduledReport[] = [
        {
          id: '1',
          name: '月度部门绩效报表',
          description: '每月生成的部门绩效统计报表',
          report_type: 'performance',
          schedule_type: 'monthly',
          schedule_config: {
            time: '09:00',
            day_of_month: 1,
            timezone: 'Asia/Shanghai'
          },
          recipients: [
            { email: 'admin@company.com', name: '管理员', role: 'admin' },
            { email: 'hr@company.com', name: 'HR部门', role: 'manager' }
          ],
          format: 'pdf',
          is_active: true,
          next_execution: '2024-02-01T09:00:00Z',
          last_execution: '2024-01-01T09:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          created_by: {
            full_name: '系统管理员',
            email: 'admin@company.com'
          },
          executions: [
            {
              id: '1',
              execution_time: '2024-01-01T09:00:00Z',
              status: 'completed',
              file_url: '/reports/monthly-performance-202401.pdf'
            }
          ]
        },
        {
          id: '2',
          name: '周度人员统计报表',
          description: '每周生成的人员统计报表',
          report_type: 'personnel',
          schedule_type: 'weekly',
          schedule_config: {
            time: '08:00',
            day_of_week: 1,
            timezone: 'Asia/Shanghai'
          },
          recipients: [
            { email: 'hr@company.com', name: 'HR部门', role: 'manager' }
          ],
          format: 'excel',
          is_active: true,
          next_execution: '2024-01-15T08:00:00Z',
          last_execution: '2024-01-08T08:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          created_by: {
            full_name: 'HR经理',
            email: 'hr@company.com'
          },
          executions: [
            {
              id: '2',
              execution_time: '2024-01-08T08:00:00Z',
              status: 'completed',
              file_url: '/reports/weekly-personnel-20240108.xlsx'
            }
          ]
        }
      ];

      setReports(mockReports);
      setPagination(prev => ({
        ...prev,
        total: mockReports.length
      }));
    } catch (error) {
      console.error('加载定期报表失败:', error);
      toast.error('加载定期报表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载部门列表
   */
  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      const result = await response.json();
      if (result.success) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('加载部门列表失败:', error);
    }
  };

  /**
   * 创建或更新定期报表
   */
  const handleSubmit = async () => {
    try {
      // 验证表单数据
      if (!formData.name.trim()) {
        toast.error('请输入报表名称');
        return;
      }

      if (formData.recipients.some(r => !r.email.trim())) {
        toast.error('请填写所有收件人邮箱');
        return;
      }

      // 模拟创建或更新报表
      const newReport: ScheduledReport = {
        id: editingReport?.id || Date.now().toString(),
        name: formData.name,
        description: formData.description,
        report_type: formData.report_type as any,
        schedule_type: formData.schedule_type as any,
        schedule_config: formData.schedule_config,
        recipients: formData.recipients,
        filters: formData.filters,
        format: formData.format as any,
        is_active: formData.is_active,
        next_execution: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: editingReport?.created_at || new Date().toISOString(),
        created_by: {
          full_name: '当前用户',
          email: 'user@company.com'
        }
      };

      if (editingReport) {
        setReports(prev => prev.map(r => r.id === editingReport.id ? newReport : r));
        toast.success('报表更新成功');
      } else {
        setReports(prev => [...prev, newReport]);
        toast.success('报表创建成功');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('提交失败:', error);
      toast.error('操作失败');
    }
  };

  /**
   * 批量操作
   */
  const handleBatchAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedReports.length === 0) {
      toast.error('请选择要操作的报表');
      return;
    }

    try {
      // 模拟批量操作
      if (action === 'delete') {
        setReports(prev => prev.filter(r => !selectedReports.includes(r.id)));
        toast.success('批量删除成功');
      } else {
        const isActive = action === 'activate';
        setReports(prev => prev.map(r => 
          selectedReports.includes(r.id) 
            ? { ...r, is_active: isActive }
            : r
        ));
        toast.success(isActive ? '批量启用成功' : '批量停用成功');
      }

      setSelectedReports([]);
    } catch (error) {
      console.error('批量操作失败:', error);
      toast.error('操作失败');
    }
  };

  /**
   * 立即执行报表
   */
  const handleExecuteNow = async (reportId: string) => {
    try {
      // 模拟执行报表
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      // 更新报表的最后执行时间
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { 
              ...r, 
              last_execution: new Date().toISOString(),
              executions: [
                {
                  id: Date.now().toString(),
                  execution_time: new Date().toISOString(),
                  status: 'completed',
                  file_url: `/reports/${report.name}-${Date.now()}.${report.format}`
                },
                ...(r.executions || [])
              ]
            }
          : r
      ));

      toast.success('报表执行成功');
    } catch (error) {
      console.error('执行报表失败:', error);
      toast.error('执行失败');
    }
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      report_type: 'overview',
      schedule_type: 'weekly',
      schedule_config: {
        time: '09:00',
        day_of_week: 1,
        day_of_month: 1,
        timezone: 'Asia/Shanghai'
      },
      recipients: [{ email: '', name: '', role: 'viewer' }],
      filters: {
        department_ids: [],
        date_range: {
          relative: 'last_month'
        },
        include_sub_departments: true
      },
      format: 'pdf',
      is_active: true
    });
    setEditingReport(null);
  };

  /**
   * 编辑报表
   */
  const handleEdit = (report: ScheduledReport) => {
    setFormData({
      name: report.name,
      description: report.description || '',
      report_type: report.report_type,
      schedule_type: report.schedule_type,
      schedule_config: report.schedule_config,
      recipients: report.recipients,
      filters: report.filters || {
        department_ids: [],
        date_range: { relative: 'last_month' },
        include_sub_departments: true
      },
      format: report.format,
      is_active: report.is_active
    });
    setEditingReport(report);
    setDialogOpen(true);
  };

  /**
   * 添加收件人
   */
  const addRecipient = () => {
    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, { email: '', name: '', role: 'viewer' }]
    }));
  };

  /**
   * 删除收件人
   */
  const removeRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  /**
   * 更新收件人
   */
  const updateRecipient = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.map((recipient, i) => 
        i === index ? { ...recipient, [field]: value } : recipient
      )
    }));
  };

  /**
   * 格式化下次执行时间
   */
  const formatNextExecution = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  /**
   * 获取状态徽章
   */
  const getStatusBadge = (report: ScheduledReport) => {
    if (!report.is_active) {
      return <Badge variant="secondary">已停用</Badge>;
    }
    
    const lastExecution = report.executions?.[0];
    if (!lastExecution) {
      return <Badge variant="outline">未执行</Badge>;
    }
    
    switch (lastExecution.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">正常</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      case 'running':
        return <Badge variant="secondary">运行中</Badge>;
      default:
        return <Badge variant="outline">等待中</Badge>;
    }
  };

  useEffect(() => {
    loadReports();
    loadDepartments();
  }, [pagination.page, filters]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">定期报表</h2>
          <p className="text-muted-foreground">配置和管理自动生成的定期报表</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedReports.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('activate')}
              >
                <Play className="h-4 w-4 mr-2" />
                批量启用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('deactivate')}
              >
                <Pause className="h-4 w-4 mr-2" />
                批量停用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('delete')}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                批量删除
              </Button>
            </>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                新建报表
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReport ? '编辑定期报表' : '新建定期报表'}
                </DialogTitle>
                <DialogDescription>
                  配置报表的生成规则、调度时间和收件人信息
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 基本信息 */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">报表名称 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入报表名称"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">报表描述</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="输入报表描述"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>报表类型</Label>
                      <Select
                        value={formData.report_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, report_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REPORT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>导出格式</Label>
                      <Select
                        value={formData.format}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMATS.map(format => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* 调度配置 */}
                <div className="space-y-4">
                  <div>
                    <Label>调度频率</Label>
                    <Select
                      value={formData.schedule_type}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        schedule_type: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>执行时间</Label>
                      <Input
                        type="time"
                        value={formData.schedule_config.time}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          schedule_config: {
                            ...prev.schedule_config,
                            time: e.target.value
                          }
                        }))}
                      />
                    </div>
                    
                    {formData.schedule_type === 'weekly' && (
                      <div>
                        <Label>星期几</Label>
                        <Select
                          value={formData.schedule_config.day_of_week.toString()}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            schedule_config: {
                              ...prev.schedule_config,
                              day_of_week: parseInt(value)
                            }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.map(day => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {formData.schedule_type === 'monthly' && (
                      <div>
                        <Label>每月几号</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.schedule_config.day_of_month}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            schedule_config: {
                              ...prev.schedule_config,
                              day_of_month: parseInt(e.target.value)
                            }
                          }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 收件人配置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>收件人配置</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加收件人
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.recipients.map((recipient, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <Input
                          placeholder="邮箱地址"
                          value={recipient.email}
                          onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                        />
                        <Input
                          placeholder="姓名"
                          value={recipient.name}
                          onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                        />
                        <Select
                          value={recipient.role}
                          onValueChange={(value) => updateRecipient(index, 'role', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">管理员</SelectItem>
                            <SelectItem value="manager">经理</SelectItem>
                            <SelectItem value="viewer">查看者</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.recipients.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 筛选条件 */}
              <div className="space-y-4">
                <Label>筛选条件</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>数据范围</Label>
                    <Select
                      value={formData.filters.date_range.relative}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        filters: {
                          ...prev.filters,
                          date_range: { relative: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_RANGES.map(range => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="include_sub_departments"
                      checked={formData.filters.include_sub_departments}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        filters: {
                          ...prev.filters,
                          include_sub_departments: checked as boolean
                        }
                      }))}
                    />
                    <Label htmlFor="include_sub_departments">包含子部门</Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmit}>
                  {editingReport ? '更新' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">已启用</SelectItem>
                  <SelectItem value="inactive">已停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select
              value={filters.report_type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, report_type: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="报表类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部类型</SelectItem>
                {REPORT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.schedule_type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, schedule_type: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="频率" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部频率</SelectItem>
                {SCHEDULE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 报表列表 */}
      <Card>
        <CardHeader>
          <CardTitle>定期报表列表</CardTitle>
          <CardDescription>
            共 {pagination.total} 个报表
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedReports.length === reports.length && reports.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedReports(reports.map(r => r.id));
                      } else {
                        setSelectedReports([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>报表名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>频率</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>下次执行</TableHead>
                <TableHead>收件人</TableHead>
                <TableHead>创建者</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    暂无定期报表
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReports.includes(report.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedReports(prev => [...prev, report.id]);
                          } else {
                            setSelectedReports(prev => prev.filter(id => id !== report.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        {report.description && (
                          <div className="text-sm text-muted-foreground">
                            {report.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {REPORT_TYPES.find(t => t.value === report.report_type)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {SCHEDULE_TYPES.find(t => t.value === report.schedule_type)?.label}
                    </TableCell>
                    <TableCell>{getStatusBadge(report)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatNextExecution(report.next_execution)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {report.recipients.length} 人
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{report.created_by.full_name}</div>
                        <div className="text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(report)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExecuteNow(report.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            立即执行
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            查看历史
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBatchAction(report.is_active ? 'deactivate' : 'activate')}
                          >
                            {report.is_active ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                停用
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                启用
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setSelectedReports([report.id]);
                              handleBatchAction('delete');
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}