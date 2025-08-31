'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function TestTemplatesPage() {
  const templates = [
    {
      name: '测试模板（无权限）',
      url: '/api/admin/test-template',
      description: '简单的测试模板，不需要权限验证'
    },
    {
      name: '测试模板（带权限）',
      url: '/api/admin/test-template-auth',
      description: '带权限验证的测试模板'
    },
    {
      name: '用户导入模板',
      url: '/api/admin/users/import/template',
      description: '用于批量导入用户信息的Excel模板'
    },
    {
      name: '考试导入模板',
      url: '/api/admin/exams/import/template',
      description: '用于批量导入考试信息的CSV模板'
    },
    {
      name: '题库导入模板',
      url: '/api/admin/questions/import/template',
      description: '用于批量导入试题的CSV模板'
    },
    {
      name: '考试结果导入模板',
      url: '/api/admin/results/import/template',
      description: '用于批量导入考试结果的CSV模板'
    },
    {
      name: '课程导入模板',
      url: '/api/admin/courses/import/template',
      description: '用于批量导入课程信息的CSV模板'
    }
  ];

  const downloadTemplate = async (template: any) => {
    try {
      toast.info(`正在下载${template.name}...`);
      
      const response = await fetch(template.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'test-token'}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = template.name + '.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${template.name}下载完成！`);
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">模板下载测试</h1>
          <p className="text-gray-600 mt-2">测试各种导入模板的下载功能</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  {template.name}
                </CardTitle>
                <CardDescription>
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>API路径:</strong> {template.url}
                  </p>
                  <Button
                    onClick={() => downloadTemplate(template)}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载模板
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">测试说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 点击"下载模板"按钮测试各个模板的下载功能</li>
            <li>• 检查下载的文件格式和内容是否正确</li>
            <li>• 确保文件名包含中文字符能正常显示</li>
            <li>• 验证CSV文件的编码是否支持中文</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
