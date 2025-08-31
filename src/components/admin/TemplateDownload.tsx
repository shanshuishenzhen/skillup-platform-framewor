/**
 * Excel模板下载组件
 * 提供各种数据导入模板的下载功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  FileText,
  Users,
  BookOpen,
  Upload,
  Eye,
  Info,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  type: string;
  name: string;
  filename: string;
  description: string;
  version: string;
  columnCount: number;
  sampleDataCount: number;
}

interface TemplateDownloadProps {
  onTemplateSelect?: (type: string) => void;
  showPreview?: boolean;
  className?: string;
}

export default function TemplateDownload({ 
  onTemplateSelect, 
  showPreview = true,
  className = '' 
}: TemplateDownloadProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/templates?action=list');
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data);
      } else {
        toast.error('获取模板列表失败');
      }
    } catch (error) {
      toast.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: string, filename: string) => {
    try {
      setDownloading(type);
      
      const response = await fetch(`/api/admin/templates?action=download&type=${type}`);
      const result = await response.json();
      
      if (result.success) {
        // 创建下载链接
        const dataStr = JSON.stringify(result.data);
        const dataBlob = new Blob([dataStr], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('模板下载成功');
        
        // 通知父组件模板被选择
        if (onTemplateSelect) {
          onTemplateSelect(type);
        }
      } else {
        toast.error(result.message || '下载失败');
      }
    } catch (error) {
      toast.error('下载失败');
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (type: string) => {
    try {
      const response = await fetch(`/api/admin/templates?action=detail&type=${type}`);
      const result = await response.json();
      
      if (result.success) {
        setPreviewTemplate(result.data);
        setShowPreviewModal(true);
      } else {
        toast.error('获取模板详情失败');
      }
    } catch (error) {
      toast.error('获取模板详情失败');
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'users': return Users;
      case 'exams': return BookOpen;
      case 'resources': return Upload;
      default: return FileText;
    }
  };

  const getTemplateColor = (type: string) => {
    switch (type) {
      case 'users': return 'text-blue-600';
      case 'exams': return 'text-green-600';
      case 'resources': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-600">加载模板列表...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Excel导入模板
          </CardTitle>
          <p className="text-sm text-gray-600">
            下载标准Excel模板，确保数据导入格式正确
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const IconComponent = getTemplateIcon(template.type);
              const iconColor = getTemplateColor(template.type);
              
              return (
                <div
                  key={template.type}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <IconComponent className={`w-6 h-6 mr-2 ${iconColor}`} />
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <Badge variant="outline" className="text-xs mt-1">
                          v{template.version}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="text-xs text-gray-500 mb-4 space-y-1">
                    <div className="flex justify-between">
                      <span>字段数量:</span>
                      <span>{template.columnCount}个</span>
                    </div>
                    <div className="flex justify-between">
                      <span>示例数据:</span>
                      <span>{template.sampleDataCount}条</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleDownload(template.type, template.filename)}
                      disabled={downloading === template.type}
                      className="flex-1"
                    >
                      {downloading === template.type ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      下载
                    </Button>
                    
                    {showPreview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(template.type)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 使用说明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">使用说明</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 下载对应的Excel模板文件</li>
                  <li>• 按照模板格式填写数据，不要修改表头</li>
                  <li>• 红色标记的列为必填项</li>
                  <li>• 填写完成后删除示例数据行</li>
                  <li>• 保存为.xlsx格式后进行导入</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 模板预览弹窗 */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{previewTemplate.name}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreviewModal(false)}
                >
                  ✕
                </Button>
              </div>
              <p className="text-gray-600 mt-1">{previewTemplate.description}</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* 字段列表 */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">字段说明</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">字段名</th>
                        <th className="px-4 py-2 text-left">必填</th>
                        <th className="px-4 py-2 text-left">类型</th>
                        <th className="px-4 py-2 text-left">示例</th>
                        <th className="px-4 py-2 text-left">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTemplate.columns.map((column: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 font-medium">{column.title}</td>
                          <td className="px-4 py-2">
                            {column.required ? (
                              <CheckCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">{column.type}</td>
                          <td className="px-4 py-2 text-gray-600">{column.example}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{column.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* 导入说明 */}
              {previewTemplate.instructions && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">导入说明</h3>
                  <ul className="space-y-2">
                    {previewTemplate.instructions.map((instruction: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{instruction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 示例数据 */}
              {previewTemplate.sampleData && previewTemplate.sampleData.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">示例数据</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {previewTemplate.columns.map((column: any) => (
                            <th key={column.key} className="px-3 py-2 text-left">
                              {column.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewTemplate.sampleData.slice(0, 3).map((row: any, index: number) => (
                          <tr key={index} className="border-t">
                            {previewTemplate.columns.map((column: any) => (
                              <td key={column.key} className="px-3 py-2 text-gray-600">
                                {row[column.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
