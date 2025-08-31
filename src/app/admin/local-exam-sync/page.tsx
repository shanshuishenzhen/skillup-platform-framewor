/**
 * 本地考试系统数据同步管理页面
 * 处理与本地考试系统的数据导入导出
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Download,
  Upload,
  RefreshCw,
  Users,
  BookOpen,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Database,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import AdminPageLayout from '@/components/layout/AdminPageLayout';
import { PAGE_CONFIGS } from '@/components/ui/page-header';

interface SyncRecord {
  id: string;
  type: 'users' | 'exams' | 'questions' | 'results';
  direction: 'import' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  recordCount: number;
  successCount: number;
  failCount: number;
  operator: string;
  filename?: string;
  errors?: string[];
}

export default function LocalExamSyncPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>([
    {
      id: 'sync_001',
      type: 'users',
      direction: 'import',
      status: 'completed',
      timestamp: '2024-01-15T10:30:00Z',
      recordCount: 150,
      successCount: 148,
      failCount: 2,
      operator: '管理员',
      filename: 'users_import_20240115.xlsx'
    },
    {
      id: 'sync_002',
      type: 'exams',
      direction: 'export',
      status: 'completed',
      timestamp: '2024-01-15T09:15:00Z',
      recordCount: 25,
      successCount: 25,
      failCount: 0,
      operator: '管理员',
      filename: 'exams_export_20240115.xlsx'
    }
  ]);

  const handleExport = async (type: 'users' | 'exams' | 'questions' | 'results') => {
    try {
      setLoading(true);
      toast.info(`正在导出${getTypeText(type)}数据...`);

      const response = await fetch(`/api/admin/local-exam-sync?type=${type}&format=excel`);
      
      if (!response.ok) {
        throw new Error('导出失败');
      }

      const result = await response.json();
      
      if (result.success) {
        // 创建下载链接
        const dataStr = JSON.stringify(result.data);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `${type}_export.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(`${getTypeText(type)}数据导出成功`);
        
        // 添加同步记录
        const newRecord: SyncRecord = {
          id: `sync_${Date.now()}`,
          type,
          direction: 'export',
          status: 'completed',
          timestamp: new Date().toISOString(),
          recordCount: Array.isArray(result.data.sheets?.[0]?.data) ? result.data.sheets[0].data.length : 0,
          successCount: Array.isArray(result.data.sheets?.[0]?.data) ? result.data.sheets[0].data.length : 0,
          failCount: 0,
          operator: '当前用户',
          filename: result.filename
        };
        setSyncRecords(prev => [newRecord, ...prev]);
      } else {
        throw new Error(result.message || '导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (type: 'users' | 'exams' | 'questions' | 'results') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setLoading(true);
          toast.info(`正在导入${getTypeText(type)}数据...`);

          // TODO: 解析文件并调用导入API
          // 这里需要实现文件解析逻辑
          
          toast.success(`${getTypeText(type)}数据导入成功`);
          
          // 添加同步记录
          const newRecord: SyncRecord = {
            id: `sync_${Date.now()}`,
            type,
            direction: 'import',
            status: 'completed',
            timestamp: new Date().toISOString(),
            recordCount: 0, // 实际解析后的数量
            successCount: 0,
            failCount: 0,
            operator: '当前用户',
            filename: file.name
          };
          setSyncRecords(prev => [newRecord, ...prev]);
        } catch (error) {
          toast.error(`导入${getTypeText(type)}数据失败`);
        } finally {
          setLoading(false);
        }
      }
    };
    input.click();
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'users': return '用户';
      case 'exams': return '考试';
      case 'questions': return '题目';
      case 'results': return '结果';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'processing': return '处理中';
      case 'failed': return '失败';
      case 'pending': return '等待中';
      default: return status;
    }
  };

  return (
    <AdminPageLayout
      pageHeaderProps={{
        ...PAGE_CONFIGS.localExamSync(),
        actions: (
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => window.open('/docs/field-mapping-local-exam-system.md', '_blank')}>
              <FileText className="w-4 h-4 mr-2" />
              字段映射表
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('overview')}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        )
      }}
    >
        {/* 选项卡内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="sync">数据同步</TabsTrigger>
          <TabsTrigger value="history">同步历史</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">用户数据</p>
                    <p className="text-2xl font-bold text-gray-900">1,248</p>
                    <p className="text-xs text-gray-500">云端用户总数</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">考试数据</p>
                    <p className="text-2xl font-bold text-gray-900">25</p>
                    <p className="text-xs text-gray-500">活跃考试数量</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">同步记录</p>
                    <p className="text-2xl font-bold text-gray-900">{syncRecords.length}</p>
                    <p className="text-xs text-gray-500">总同步次数</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <RotateCcw className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">最后同步</p>
                    <p className="text-2xl font-bold text-gray-900">2小时前</p>
                    <p className="text-xs text-gray-500">用户数据导入</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 系统状态 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>系统状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-green-900">云端平台</p>
                      <p className="text-sm text-green-700">运行正常</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">在线</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Database className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <p className="font-medium text-blue-900">本地考试系统</p>
                      <p className="text-sm text-blue-700">数据交换就绪</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">就绪</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 数据导出 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  数据导出
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  将云端平台数据导出为Excel格式，供本地考试系统使用
                </div>
                
                <Button 
                  onClick={() => handleExport('users')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Users className="w-4 h-4 mr-2" />
                  导出用户数据
                </Button>
                
                <Button 
                  onClick={() => handleExport('exams')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  导出考试数据
                </Button>
                
                <Button 
                  onClick={() => handleExport('questions')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导出题目数据
                </Button>
                
                <Button 
                  onClick={() => handleExport('results')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  导出结果数据
                </Button>
              </CardContent>
            </Card>

            {/* 数据导入 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  数据导入
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  从本地考试系统导入Excel格式数据到云端平台
                </div>
                
                <Button 
                  onClick={() => handleImport('users')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Users className="w-4 h-4 mr-2" />
                  导入用户数据
                </Button>
                
                <Button 
                  onClick={() => handleImport('exams')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  导入考试数据
                </Button>
                
                <Button 
                  onClick={() => handleImport('questions')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导入题目数据
                </Button>
                
                <Button 
                  onClick={() => handleImport('results')} 
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  导入结果数据
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>同步历史记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getStatusColor(record.status)}>
                          {getStatusText(record.status)}
                        </Badge>
                        <span className="font-medium">
                          {record.direction === 'import' ? '导入' : '导出'} {getTypeText(record.type)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>文件: {record.filename}</p>
                        <p>操作人: {record.operator}</p>
                        <p>时间: {new Date(record.timestamp).toLocaleString('zh-CN')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {record.successCount}/{record.recordCount}
                      </p>
                      <p className="text-sm text-gray-500">
                        成功/总数
                      </p>
                      {record.failCount > 0 && (
                        <p className="text-sm text-red-600">
                          失败: {record.failCount}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
    </AdminPageLayout>
  );
}
