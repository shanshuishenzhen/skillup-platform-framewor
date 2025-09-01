'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  Users,
  BarChart3,
  FileSpreadsheet,
  FileImage,
  Printer
} from 'lucide-react';
import { ExamService } from '@/services/examService';
import { toast } from 'sonner';

interface ExamReportsProps {
  examId?: string;
}

interface ReportConfig {
  type: 'summary' | 'detailed' | 'individual' | 'comparative';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    status?: string[];
    scoreRange?: { min: number; max: number };
    includeQuestions?: boolean;
    includeAnswers?: boolean;
    includeStatistics?: boolean;
  };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportConfig['type'];
  config: Partial<ReportConfig>;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'exam_summary',
    name: '考试总结报告',
    description: '包含考试基本信息、参与统计、通过率等概览数据',
    type: 'summary',
    config: {
      format: 'pdf',
      filters: {
        includeStatistics: true
      }
    }
  },
  {
    id: 'detailed_analysis',
    name: '详细分析报告',
    description: '包含题目分析、分数分布、时间分析等详细数据',
    type: 'detailed',
    config: {
      format: 'excel',
      filters: {
        includeQuestions: true,
        includeStatistics: true
      }
    }
  },
  {
    id: 'individual_results',
    name: '个人成绩报告',
    description: '每个考生的详细答题情况和成绩分析',
    type: 'individual',
    config: {
      format: 'pdf',
      filters: {
        includeQuestions: true,
        includeAnswers: true
      }
    }
  },
  {
    id: 'comparative_report',
    name: '对比分析报告',
    description: '多次考试或不同群体的对比分析',
    type: 'comparative',
    config: {
      format: 'excel',
      filters: {
        includeStatistics: true
      }
    }
  }
];

/**
 * 考试报表组件
 * 提供多种格式的考试报表生成和导出功能
 */
export default function ExamReports({ examId }: ExamReportsProps) {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'summary',
    format: 'pdf',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    filters: {
      includeStatistics: true
    }
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  /**
   * 加载考试列表
   */
  const loadExams = async () => {
    try {
      // 模拟考试数据（实际项目中应从API获取）
      const mockExams = [
        { id: '1', title: 'JavaScript基础考试', category: '前端开发', status: 'published' },
        { id: '2', title: 'React进阶考试', category: '前端开发', status: 'published' },
        { id: '3', title: 'Node.js后端考试', category: '后端开发', status: 'draft' }
      ];
      setExams(mockExams);
    } catch (error) {
      console.error('加载考试列表失败:', error);
      toast.error('加载考试列表失败');
    }
  };

  /**
   * 应用报表模板
   */
  const applyTemplate = (templateId: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setReportConfig(prev => ({
        ...prev,
        type: template.type,
        ...template.config
      }));
      setSelectedTemplate(templateId);
      toast.success(`已应用模板: ${template.name}`);
    }
  };

  /**
   * 生成报表
   */
  const generateReport = async () => {
    try {
      setLoading(true);
      
      // 验证配置
      if (!examId && reportConfig.type !== 'comparative') {
        toast.error('请选择考试');
        return;
      }
      
      // 模拟报表生成过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 根据格式生成不同类型的报表
      switch (reportConfig.format) {
        case 'pdf':
          generatePDFReport();
          break;
        case 'excel':
          generateExcelReport();
          break;
        case 'csv':
          generateCSVReport();
          break;
        case 'json':
          generateJSONReport();
          break;
      }
      
      toast.success('报表生成成功');
    } catch (error) {
      console.error('生成报表失败:', error);
      toast.error('生成报表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 生成PDF报表
   */
  const generatePDFReport = () => {
    // 模拟PDF生成
    const content = generateReportContent();
    const blob = new Blob([content], { type: 'application/pdf' });
    downloadFile(blob, `exam_report_${Date.now()}.pdf`);
  };

  /**
   * 生成Excel报表
   */
  const generateExcelReport = () => {
    // 模拟Excel生成
    const content = generateReportContent();
    const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadFile(blob, `exam_report_${Date.now()}.xlsx`);
  };

  /**
   * 生成CSV报表
   */
  const generateCSVReport = () => {
    const csvContent = [
      ['考试报表'],
      ['生成时间', new Date().toLocaleString()],
      ['报表类型', getReportTypeName(reportConfig.type)],
      ['时间范围', `${reportConfig.dateRange.start} 至 ${reportConfig.dateRange.end}`],
      [''],
      ['考试ID', '考试名称', '参与人数', '通过率', '平均分'],
      ['1', 'JavaScript基础考试', '150', '78%', '82.5'],
      ['2', 'React进阶考试', '120', '65%', '75.2'],
      ['3', 'Node.js后端考试', '90', '72%', '79.8']
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `exam_report_${Date.now()}.csv`);
  };

  /**
   * 生成JSON报表
   */
  const generateJSONReport = () => {
    const jsonData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: reportConfig.type,
        dateRange: reportConfig.dateRange,
        filters: reportConfig.filters
      },
      data: {
        exams: [
          {
            id: '1',
            title: 'JavaScript基础考试',
            participants: 150,
            passRate: 78,
            averageScore: 82.5,
            statistics: {
              totalQuestions: 50,
              averageDuration: 45,
              difficultyDistribution: {
                easy: 20,
                medium: 20,
                hard: 10
              }
            }
          }
        ]
      }
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    downloadFile(blob, `exam_report_${Date.now()}.json`);
  };

  /**
   * 生成报表内容
   */
  const generateReportContent = () => {
    return `考试报表\n生成时间: ${new Date().toLocaleString()}\n报表类型: ${getReportTypeName(reportConfig.type)}\n时间范围: ${reportConfig.dateRange.start} 至 ${reportConfig.dateRange.end}`;
  };

  /**
   * 获取报表类型名称
   */
  const getReportTypeName = (type: ReportConfig['type']) => {
    const names = {
      summary: '总结报告',
      detailed: '详细分析',
      individual: '个人成绩',
      comparative: '对比分析'
    };
    return names[type];
  };

  /**
   * 下载文件
   */
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * 获取格式图标
   */
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      case 'csv': return <FileSpreadsheet className="h-4 w-4" />;
      case 'json': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">考试报表</h2>
          <p className="text-gray-600">生成和导出各种格式的考试报表</p>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          生成报表
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 报表模板 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>报表模板</CardTitle>
              <CardDescription>选择预设的报表模板快速生成</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {REPORT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {getReportTypeName(template.type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{template.description}</p>
                </div>
              ))}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCustomConfig(!showCustomConfig)}
              >
                <Filter className="h-4 w-4 mr-2" />
                自定义配置
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 报表配置 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>报表配置</CardTitle>
              <CardDescription>配置报表的详细参数</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="basic">基础设置</TabsTrigger>
                  <TabsTrigger value="filters">筛选条件</TabsTrigger>
                  <TabsTrigger value="content">内容选项</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reportType">报表类型</Label>
                      <Select
                        value={reportConfig.type}
                        onValueChange={(value: ReportConfig['type']) =>
                          setReportConfig(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">总结报告</SelectItem>
                          <SelectItem value="detailed">详细分析</SelectItem>
                          <SelectItem value="individual">个人成绩</SelectItem>
                          <SelectItem value="comparative">对比分析</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="format">导出格式</Label>
                      <Select
                        value={reportConfig.format}
                        onValueChange={(value: ReportConfig['format']) =>
                          setReportConfig(prev => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              PDF
                            </div>
                          </SelectItem>
                          <SelectItem value="excel">
                            <div className="flex items-center">
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Excel
                            </div>
                          </SelectItem>
                          <SelectItem value="csv">
                            <div className="flex items-center">
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              CSV
                            </div>
                          </SelectItem>
                          <SelectItem value="json">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              JSON
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">开始日期</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={reportConfig.dateRange.start}
                        onChange={(e) =>
                          setReportConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, start: e.target.value }
                          }))
                        }
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="endDate">结束日期</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={reportConfig.dateRange.end}
                        onChange={(e) =>
                          setReportConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, end: e.target.value }
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="filters" className="space-y-4">
                  <div>
                    <Label>分数范围</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="最低分"
                        value={reportConfig.filters.scoreRange?.min || ''}
                        onChange={(e) =>
                          setReportConfig(prev => ({
                            ...prev,
                            filters: {
                              ...prev.filters,
                              scoreRange: {
                                ...prev.filters.scoreRange,
                                min: parseInt(e.target.value) || 0
                              }
                            }
                          }))
                        }
                      />
                      <Input
                        type="number"
                        placeholder="最高分"
                        value={reportConfig.filters.scoreRange?.max || ''}
                        onChange={(e) =>
                          setReportConfig(prev => ({
                            ...prev,
                            filters: {
                              ...prev.filters,
                              scoreRange: {
                                ...prev.filters.scoreRange,
                                max: parseInt(e.target.value) || 100
                              }
                            }
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeQuestions"
                        checked={reportConfig.filters.includeQuestions || false}
                        onCheckedChange={(checked) =>
                          setReportConfig(prev => ({
                            ...prev,
                            filters: { ...prev.filters, includeQuestions: checked as boolean }
                          }))
                        }
                      />
                      <Label htmlFor="includeQuestions">包含题目详情</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeAnswers"
                        checked={reportConfig.filters.includeAnswers || false}
                        onCheckedChange={(checked) =>
                          setReportConfig(prev => ({
                            ...prev,
                            filters: { ...prev.filters, includeAnswers: checked as boolean }
                          }))
                        }
                      />
                      <Label htmlFor="includeAnswers">包含答案详情</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeStatistics"
                        checked={reportConfig.filters.includeStatistics || false}
                        onCheckedChange={(checked) =>
                          setReportConfig(prev => ({
                            ...prev,
                            filters: { ...prev.filters, includeStatistics: checked as boolean }
                          }))
                        }
                      />
                      <Label htmlFor="includeStatistics">包含统计分析</Label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 报表预览 */}
      <Card>
        <CardHeader>
          <CardTitle>报表预览</CardTitle>
          <CardDescription>当前配置的报表预览</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getFormatIcon(reportConfig.format)}
                <span className="font-medium">
                  {getReportTypeName(reportConfig.type)} - {reportConfig.format.toUpperCase()}
                </span>
              </div>
              <Badge variant="outline">
                {reportConfig.dateRange.start} 至 {reportConfig.dateRange.end}
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 包含内容: {[
                reportConfig.filters.includeQuestions && '题目详情',
                reportConfig.filters.includeAnswers && '答案详情',
                reportConfig.filters.includeStatistics && '统计分析'
              ].filter(Boolean).join(', ') || '基础信息'}</p>
              
              {reportConfig.filters.scoreRange && (
                <p>• 分数范围: {reportConfig.filters.scoreRange.min || 0} - {reportConfig.filters.scoreRange.max || 100}分</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}