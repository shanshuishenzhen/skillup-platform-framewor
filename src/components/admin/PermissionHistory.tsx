/**
 * 权限变更历史记录组件
 * 提供权限变更历史的查看、过滤、搜索和清理功能
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  History, 
  Search, 
  Filter,
  Calendar as CalendarIcon,
  Download,
  Trash2,
  RefreshCw,
  User,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// 类型定义
interface PermissionHistoryRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  operator_id: string;
  operator_name: string;
  operation_type: 'assign' | 'revoke' | 'batch_assign' | 'batch_revoke' | 'template_apply' | 'conflict_resolve';
  permission_id?: string;
  permission_name?: string;
  permission_category?: string;
  template_id?: string;
  template_name?: string;
  reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface PermissionHistoryStats {
  total_records: number;
  operation_stats: Record<string, number>;
  daily_stats: Array<{
    date: string;
    count: number;
  }>;
  top_operators: Array<{
    operator_id: string;
    operator_name: string;
    count: number;
  }>;
}

interface PermissionHistoryQuery {
  user_id?: string;
  operator_id?: string;
  operation_type?: string;
  permission_id?: string;
  template_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface PermissionHistoryProps {
  userId?: string; // 如果指定用户ID，则只显示该用户的历史记录
  onRecordSelect?: (record: PermissionHistoryRecord) => void;
}

export default function PermissionHistory({ userId, onRecordSelect }: PermissionHistoryProps) {
  // 状态管理
  const [records, setRecords] = useState<PermissionHistoryRecord[]>([]);
  const [stats, setStats] = useState<PermissionHistoryStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PermissionHistoryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  
  // 查询参数
  const [query, setQuery] = useState<PermissionHistoryQuery>({
    user_id: userId,
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  
  // 分页信息
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current_page: 1,
    per_page: 20
  });
  
  // 日期选择
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  
  // 清理设置
  const [cleanupDays, setCleanupDays] = useState(90);

  // 获取权限变更历史记录
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/admin/permission-history?${params}`);
      if (!response.ok) throw new Error('获取权限历史记录失败');
      
      const data = await response.json();
      setRecords(data.data.records || []);
      setPagination(data.data.pagination || {
        total: 0,
        pages: 0,
        current_page: 1,
        per_page: 20
      });
      setStats(data.data.stats || null);
    } catch (error) {
      console.error('获取权限历史记录失败:', error);
      toast.error('获取权限历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('获取用户列表失败');
      const data = await response.json();
      setUsers(data.data.users || []);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast.error('获取用户列表失败');
    }
  }, []);

  // 清理历史记录
  const cleanupHistory = async () => {
    if (!confirm(`确定要清理 ${cleanupDays} 天前的历史记录吗？此操作不可撤销。`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/permission-history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days_to_keep: cleanupDays }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '清理历史记录失败');
      }

      const data = await response.json();
      toast.success(data.message || '历史记录清理成功');
      
      setShowCleanupDialog(false);
      await fetchHistory();
    } catch (error) {
      console.error('清理历史记录失败:', error);
      toast.error(error instanceof Error ? error.message : '清理历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出历史记录
  const exportHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'limit') {
          params.append(key, value.toString());
        }
      });
      
      params.append('export', 'true');
      
      const response = await fetch(`/api/admin/permission-history?${params}`);
      if (!response.ok) throw new Error('导出历史记录失败');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `permission-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('历史记录导出成功');
    } catch (error) {
      console.error('导出历史记录失败:', error);
      toast.error('导出历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新查询参数
  const updateQuery = (updates: Partial<PermissionHistoryQuery>) => {
    setQuery(prev => ({ ...prev, ...updates, page: 1 }));
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setQuery(prev => ({ ...prev, page }));
  };

  // 处理日期范围变化
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    updateQuery({
      start_date: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      end_date: range.to ? format(range.to, 'yyyy-MM-dd') : undefined
    });
  };

  // 查看记录详情
  const viewRecordDetail = (record: PermissionHistoryRecord) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
    onRecordSelect?.(record);
  };

  // 获取操作类型显示文本
  const getOperationTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      assign: '分配权限',
      revoke: '撤销权限',
      batch_assign: '批量分配',
      batch_revoke: '批量撤销',
      template_apply: '应用模板',
      conflict_resolve: '解决冲突'
    };
    return typeMap[type] || type;
  };

  // 获取操作类型图标
  const getOperationTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      assign: <Plus className="h-4 w-4 text-green-600" />,
      revoke: <Minus className="h-4 w-4 text-red-600" />,
      batch_assign: <Plus className="h-4 w-4 text-blue-600" />,
      batch_revoke: <Minus className="h-4 w-4 text-orange-600" />,
      template_apply: <Shield className="h-4 w-4 text-purple-600" />,
      conflict_resolve: <RotateCcw className="h-4 w-4 text-yellow-600" />
    };
    return iconMap[type] || <Shield className="h-4 w-4" />;
  };

  // 获取操作类型颜色
  const getOperationTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      assign: 'default',
      revoke: 'destructive',
      batch_assign: 'secondary',
      batch_revoke: 'destructive',
      template_apply: 'outline',
      conflict_resolve: 'secondary'
    };
    return variantMap[type] || 'outline';
  };

  // 初始化数据
  useEffect(() => {
    fetchHistory();
    if (!userId) {
      fetchUsers();
    }
  }, [fetchHistory, fetchUsers, userId]);

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              权限变更历史
              {userId && (
                <Badge variant="outline">用户专属</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStatsDialog(true)}
                disabled={loading}
              >
                <Eye className="h-4 w-4 mr-2" />
                统计信息
              </Button>
              <Button
                variant="outline"
                onClick={exportHistory}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCleanupDialog(true)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清理
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div>
              <Label>搜索</Label>
              <Input
                placeholder="搜索用户、操作者、权限..."
                value={query.search || ''}
                onChange={(e) => updateQuery({ search: e.target.value })}
              />
            </div>
            
            {/* 用户选择 */}
            {!userId && (
              <div>
                <Label>用户</Label>
                <Select
                  value={query.user_id || ''}
                  onValueChange={(value) => updateQuery({ user_id: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择用户" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部用户</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* 操作类型 */}
            <div>
              <Label>操作类型</Label>
              <Select
                value={query.operation_type || ''}
                onValueChange={(value) => updateQuery({ operation_type: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  <SelectItem value="assign">分配权限</SelectItem>
                  <SelectItem value="revoke">撤销权限</SelectItem>
                  <SelectItem value="batch_assign">批量分配</SelectItem>
                  <SelectItem value="batch_revoke">批量撤销</SelectItem>
                  <SelectItem value="template_apply">应用模板</SelectItem>
                  <SelectItem value="conflict_resolve">解决冲突</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 日期范围 */}
            <div>
              <Label>日期范围</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "yyyy-MM-dd")} -{" "}
                          {format(dateRange.to, "yyyy-MM-dd")}
                        </>
                      ) : (
                        format(dateRange.from, "yyyy-MM-dd")
                      )
                    ) : (
                      "选择日期范围"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => handleDateRangeChange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              共 {pagination.total} 条记录
            </div>
            <Button
              variant="outline"
              onClick={fetchHistory}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 历史记录列表 */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => viewRecordDetail(record)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getOperationTypeIcon(record.operation_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{record.user_name}</span>
                          <Badge variant={getOperationTypeBadgeVariant(record.operation_type)}>
                            {getOperationTypeText(record.operation_type)}
                          </Badge>
                          {record.permission_name && (
                            <Badge variant="outline">{record.permission_name}</Badge>
                          )}
                          {record.template_name && (
                            <Badge variant="secondary">{record.template_name}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          操作者: {record.operator_name} | {record.user_email}
                        </div>
                        {record.reason && (
                          <div className="text-sm text-muted-foreground mb-1">
                            原因: {record.reason}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(record.created_at).toLocaleString()}
                          </div>
                          {record.ip_address && (
                            <div>IP: {record.ip_address}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewRecordDetail(record);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {records.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无权限变更历史记录</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            第 {pagination.current_page} 页，共 {pagination.pages} 页
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page >= pagination.pages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 统计信息对话框 */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>权限变更统计</DialogTitle>
          </DialogHeader>
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.total_records}
                    </div>
                    <div className="text-sm text-muted-foreground">总记录数</div>
                  </CardContent>
                </Card>
                {Object.entries(stats.operation_stats).map(([type, count]) => (
                  <Card key={type}>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">
                        {count}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getOperationTypeText(type)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {stats.top_operators.length > 0 && (
                <div>
                  <h5 className="font-medium mb-3">活跃操作者</h5>
                  <div className="space-y-2">
                    {stats.top_operators.map((operator, index) => (
                      <div key={operator.operator_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{operator.operator_name}</span>
                        </div>
                        <Badge>{operator.count} 次操作</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 记录详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>权限变更详情</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>用户信息</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{selectedRecord.user_name}</div>
                    <div className="text-sm text-muted-foreground">{selectedRecord.user_email}</div>
                  </div>
                </div>
                <div>
                  <Label>操作者</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{selectedRecord.operator_name}</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>操作类型</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getOperationTypeIcon(selectedRecord.operation_type)}
                    <Badge variant={getOperationTypeBadgeVariant(selectedRecord.operation_type)}>
                      {getOperationTypeText(selectedRecord.operation_type)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>操作时间</Label>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {new Date(selectedRecord.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {selectedRecord.permission_name && (
                <div>
                  <Label>权限信息</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{selectedRecord.permission_name}</div>
                    {selectedRecord.permission_category && (
                      <Badge variant="outline" className="mt-1">
                        {selectedRecord.permission_category}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {selectedRecord.template_name && (
                <div>
                  <Label>模板信息</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{selectedRecord.template_name}</div>
                  </div>
                </div>
              )}
              
              {selectedRecord.reason && (
                <div>
                  <Label>操作原因</Label>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedRecord.reason}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {selectedRecord.ip_address && (
                  <div>
                    <Label>IP 地址</Label>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {selectedRecord.ip_address}
                    </div>
                  </div>
                )}
                {selectedRecord.user_agent && (
                  <div>
                    <Label>用户代理</Label>
                    <div className="p-3 bg-muted rounded-lg text-sm truncate">
                      {selectedRecord.user_agent}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedRecord.metadata && Object.keys(selectedRecord.metadata).length > 0 && (
                <div>
                  <Label>附加信息</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedRecord.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清理历史记录对话框 */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清理历史记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                此操作将永久删除指定天数之前的所有权限变更历史记录，且无法恢复。
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="cleanup-days">保留天数</Label>
              <Input
                id="cleanup-days"
                type="number"
                min="1"
                max="365"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(parseInt(e.target.value) || 90)}
                placeholder="输入要保留的天数"
              />
              <div className="text-sm text-muted-foreground mt-1">
                将删除 {cleanupDays} 天前的所有历史记录
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={cleanupHistory} disabled={loading}>
              确认清理
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}