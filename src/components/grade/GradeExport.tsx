/**
 * 成绩导出组件
 * 用于导出考试成绩数据
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

interface GradeExportProps {
  examId: string;
  examTitle: string;
  grades: any[];
}

export function GradeExport({ examId, examTitle, grades }: GradeExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      // CSV导出逻辑
      const csvContent = generateCSV(grades);
      downloadFile(csvContent, `${examTitle}_成绩.csv`, 'text/csv');
    } catch (error) {
      console.error('CSV导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Excel导出逻辑
      console.log('Excel导出功能待实现');
    } catch (error) {
      console.error('Excel导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = (data: any[]) => {
    const headers = ['学号', '姓名', '分数', '提交时间', '状态'];
    const csvRows = [headers.join(',')];
    
    data.forEach(grade => {
      const row = [
        grade.student_id || '',
        grade.student_name || '',
        grade.score || 0,
        grade.submitted_at || '',
        grade.status || ''
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          导出成绩
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            onClick={exportToCSV}
            disabled={isExporting || grades.length === 0}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            导出CSV
          </Button>
          <Button
            onClick={exportToExcel}
            disabled={isExporting || grades.length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            导出Excel
          </Button>
        </div>
        {grades.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            暂无成绩数据可导出
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// 默认导出
export default GradeExport;